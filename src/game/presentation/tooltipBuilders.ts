import type {
  ActiveEffectInstance,
  EffectDefinition,
  DamageType,
  EnemyDefinition,
  PlayerActionDefinition,
} from "../combat/combatTypes";
import type { ItemDefinition } from "../data/items";
import type { ResolvedItemInstance } from "../items/itemTypes";
import { combatStatReferenceById } from "../data/combatGlossary";
import { effectById } from "../data/effects";
import type { SpellDefinition } from "../data/spells";
import { stanceDefinitions } from "../data/stances";
import type { TechniqueId } from "../combat/combatTypes";
import type { ProgressionState } from "../progression/progressionTypes";
import { calculateEffectiveSpell, type SpellCalculationContext } from "../progression/spellProgression";
import { techniqueDefinitions } from "../data/techniques";
import { proficiencyById } from "../data/proficiencies";
import { ARMOR_TRAINING_SLOT_IDS, equipmentSlotKindLabel } from "../equipment/equipmentTypes";
import { weaponSkillById } from "../data/weaponSkills";
import {
  formatCombatStatValue,
  formatCompactDecimal,
  formatDamageRange,
  formatItemStats,
  formatPercent,
  formatSeconds,
  formatSignedNumber,
  labelForStatKey,
  type DamageRange,
} from "./statFormatting";
import type { DefensiveEquipmentContext } from "../equipment/defensiveEquipment";
import type { TooltipModel, TooltipRow, TooltipTone } from "./tooltipTypes";
import type { CombatAbilityCatalogueEntry } from "../combatAbilities/combatAbilityTypes";
import type { CombatAbilityAvailability } from "../combatAbilities/combatAbilitySelectors";

const damageLabels: Record<DamageType, string> = {
  physical: "Physical",
  fire: "Fire",
  cold: "Cold",
  lightning: "Lightning",
  chaos: "Chaos",
};
const kindLabels: Record<EffectDefinition["kind"], string> = {
  buff: "Buff",
  debuff: "Debuff",
  status: "Status",
  barrier: "Barrier",
};
const categoryLabels: Record<ItemDefinition["category"], string> = {
  weapon: "Weapon",
  armor: "Armor",
  accessory: "Accessory",
  material: "Material",
  consumable: "Consumable",
  currency: "Currency",
};
const rarityLabels: Record<ItemDefinition["rarity"], string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
};

const toneForValue = (value: number): TooltipTone =>
  value > 0 ? "green" : value < 0 ? "red" : "default";

export function buildItemTooltip(
  item: ItemDefinition,
  options: {
    quantity?: number;
    equipped?: boolean;
    defensiveContext?: DefensiveEquipmentContext;
    masteryLevel?: number;
  } = {},
): TooltipModel {
  const rows = formatItemStats(item.stats ?? {}).map((row) => ({
    label: row.label,
    value: row.value,
    tone: row.tone,
  }));
  if (item.weaponProficiencyId)
    rows.unshift({
      label: "Proficiency",
      value:
        proficiencyById[item.weaponProficiencyId]?.name ??
        item.weaponProficiencyId,
      tone: "blue" as TooltipTone,
    });
  if (item.equipmentSlotKind)
    rows.unshift({
      label: "Equipment Type",
      value: equipmentSlotKindLabel(item.equipmentSlotKind),
      tone: "default" as TooltipTone,
    });
  if (item.requiredMasteryLevel !== undefined) {
    rows.unshift({
      label: "Required Mastery",
      value: `Lv ${item.requiredMasteryLevel}`,
      tone: "gold" as TooltipTone,
    });
    if (options.masteryLevel !== undefined)
      rows.unshift({
        label: "Requirement",
        value: options.masteryLevel >= item.requiredMasteryLevel ? "Met" : "Locked",
        tone: options.masteryLevel >= item.requiredMasteryLevel ? "green" : "red",
      });
  }
  if (item.defensiveProficiencyId) {
    rows.unshift({
      label: "Training",
      value:
        item.defensiveProficiencyId === "shield"
          ? "1.00× Shield XP per defensive event"
          : `${(1 / ARMOR_TRAINING_SLOT_IDS.length).toFixed(2)}× per matching armor piece`,
      tone: "green" as TooltipTone,
    });
    rows.unshift({
      label: "Proficiency",
      value:
        proficiencyById[item.defensiveProficiencyId]?.name ??
        item.defensiveProficiencyId,
      tone: "blue" as TooltipTone,
    });
    if (item.equipmentSlotKind)
      rows.unshift({
        label: "Slot",
        value: equipmentSlotKindLabel(item.equipmentSlotKind),
        tone: "default" as TooltipTone,
      });
    if (options.defensiveContext) {
      const context = options.defensiveContext;
      const pieces =
        item.defensiveProficiencyId === "light-armor"
          ? context.lightArmorPieces
          : item.defensiveProficiencyId === "medium-armor"
            ? context.mediumArmorPieces
            : item.defensiveProficiencyId === "heavy-armor"
              ? context.heavyArmorPieces
              : context.shieldEquipped
                ? 1
                : 0;
      rows.unshift({
        label: "Current training",
        value:
          item.defensiveProficiencyId === "shield"
            ? `${pieces > 0 ? "1.00" : "0.00"}×`
            : `${(pieces / ARMOR_TRAINING_SLOT_IDS.length).toFixed(2)}×`,
        tone: "gold" as TooltipTone,
      });
    }
  }
  return {
    id: item.id,
    icon: item.icon,
    title: item.name,
    subtitle: `${categoryLabels[item.category]} · ${rarityLabels[item.rarity]}`,
    tone:
      item.rarity === "rare"
        ? "gold"
        : item.rarity === "uncommon"
          ? "blue"
          : "default",
    description: item.description,
    rows,
    notes: [
      options.quantity !== undefined ? `Owned: ${options.quantity}` : "",
      options.equipped ? "Currently equipped" : "",
    ].filter(Boolean),
  };
}

/** Owned-item tooltip entry point. Phase 1 resolves base stats unchanged. */
export function buildItemInstanceTooltip(
  resolved: ResolvedItemInstance,
  options: {
    equipped?: boolean;
    defensiveContext?: DefensiveEquipmentContext;
    masteryLevel?: number;
  } = {},
): TooltipModel {
  const tooltip = buildItemTooltip(
    { ...resolved.definition, stats: resolved.effectiveStats },
    options,
  );
  return { ...tooltip, id: `item-instance.${resolved.instance.id}` };
}

export function buildStatTooltip(
  key: string,
  value: number,
  detail?: string,
  range?: DamageRange,
): TooltipModel {
  const reference =
    combatStatReferenceById[key as keyof typeof combatStatReferenceById];
  const label = reference?.label ?? labelForStatKey(key);
  const rows: TooltipRow[] = key === "attackDamage" && range
    ? [
        { label: "Current range", value: formatDamageRange(range.min, range.max), tone: "gold" },
        { label: "Average", value: formatCombatStatValue(key, value), tone: toneForValue(value) },
      ]
    : [{ label: "Current value", value: formatCombatStatValue(key, value), tone: toneForValue(value) }];
  if (detail) rows.push({ label: "Context", value: detail, tone: "blue" });
  return {
    id: `stat.${key}`,
    title: label,
    subtitle: reference
      ? `${reference.category[0].toUpperCase()}${reference.category.slice(1)} combat stat`
      : "Combat stat",
    tone:
      reference?.category === "resistances" ? toneForValue(value) : "default",
    description:
      key === "attackDamage" && range
        ? "A weapon hit rolls a base value within this range before Critical Strikes and defensive mitigation."
        : reference?.fullDescription ?? `Current combat value for ${label}.`,
    rows,
    notes: [reference?.formula, ...(reference?.notes ?? [])].filter(
      (note): note is string => Boolean(note),
    ),
  };
}

export function buildProficiencyTooltip(
  proficiency:
    | keyof typeof proficiencyById
    | (typeof proficiencyById)[keyof typeof proficiencyById],
): TooltipModel {
  const definition =
    typeof proficiency === "string"
      ? proficiencyById[proficiency]
      : proficiency;
  return {
    id: `proficiency.${definition.id}`,
    icon: definition.icon,
    title: definition.name,
    subtitle: `${definition.category === "magic" ? "Magic" : definition.category === "melee" ? "Melee" : definition.category === "ranged" ? "Ranged" : "Defense"} proficiency`,
    description: definition.description,
    rows: [
      { label: "Maximum level", value: `${definition.maxLevel}`, tone: "gold" },
      {
        label: "Perks authored",
        value: `${definition.perkIds.length}`,
        tone: "blue",
      },
    ],
  };
}

export function buildEffectTooltip(
  instance: ActiveEffectInstance,
  definition: EffectDefinition = effectById[instance.effectId],
): TooltipModel {
  const duration =
    instance.remainingSeconds === null
      ? "Permanent while active"
      : formatSeconds(Math.max(0, instance.remainingSeconds));
  const rows: TooltipRow[] = [
    {
      label: "Kind",
      value: kindLabels[definition.kind],
      tone:
        definition.kind === "debuff" || definition.kind === "status"
          ? "red"
          : definition.kind === "barrier"
            ? "blue"
            : "green",
    },
    { label: "Remaining", value: duration, tone: "blue" },
    {
      label: "Stacks",
      value: `${instance.stacks}${definition.stacking.maxStacks > 1 ? ` / ${definition.stacking.maxStacks}` : ""}`,
      tone: instance.stacks > 1 ? "gold" : "default",
    },
    {
      label: "Source",
      value:
        instance.source.kind === "player"
          ? "Hunter"
          : `Enemy ${instance.source.instanceId}`,
      tone: "default",
    },
  ];
  if (definition.periodic) {
    const operation = definition.periodic.operation;
    rows.push({
      label:
        operation.type === "damage" ? "Periodic damage" : "Periodic healing",
      value:
        operation.type === "damage"
          ? `${formatSignedNumber(operation.baseAmount * instance.stacks)} ${damageLabels[operation.damageType]} every ${formatSeconds(definition.periodic.intervalSeconds)}`
          : `${operation.baseAmount * instance.stacks} every ${formatSeconds(definition.periodic.intervalSeconds)}`,
      tone: operation.type === "damage" ? "red" : "green",
    });
  }
  for (const modifier of definition.statModifiers ?? [])
    rows.push({
      label: labelForStatKey(modifier.stat),
      value:
        modifier.operation === "flat"
          ? formatSignedNumber(modifier.value * instance.stacks)
          : `${modifier.value > 0 ? "+" : ""}${Math.round(modifier.value * 100)}%`,
      tone: toneForValue(modifier.value),
    });
  for (const modifier of definition.outgoingDamageModifiers ?? []) {
    const damageLabel = modifier.damageType ? damageLabels[modifier.damageType] : "All";
    const sourceLabel = modifier.sourceKind === "spell" ? " Spell" : modifier.sourceKind === "attack" ? " Attack" : "";
    const value = modifier.value * instance.stacks;
    rows.push({
      label: `${damageLabel}${sourceLabel} Damage`,
      value: modifier.operation === "increased" ? formatPercent(value, true) : `×${formatCompactDecimal(1 + value, 2)}`,
      tone: toneForValue(value),
    });
  }
  if (definition.kind === "barrier")
    rows.push({
      label: "Remaining absorption",
      value: `${Math.floor(instance.runtimeValues?.absorbRemaining ?? definition.barrierAmount ?? 0)}`,
      tone: "blue",
    });
  const notes = [
    `Stacking: ${definition.stacking.mode.replace("-", " ")}`,
    `Persistence: ${definition.persistence.replace("-", " ")}`,
  ];
  return {
    id: `${definition.id}.${instance.instanceId}`,
    icon: definition.icon,
    title: definition.name,
    subtitle: `${kindLabels[definition.kind]} · ${definition.tags.join(" · ")}`,
    tone:
      definition.kind === "debuff" || definition.kind === "status"
        ? "red"
        : definition.kind === "barrier"
          ? "blue"
          : "green",
    description: definition.description,
    rows,
    notes,
  };
}

export function buildEffectDefinitionTooltip(definition: EffectDefinition): TooltipModel {
  const rows: TooltipRow[] = [
    { label: "Kind", value: kindLabels[definition.kind], tone: definition.kind === "barrier" ? "blue" : definition.kind === "buff" ? "green" : "red" },
    { label: "Duration", value: definition.durationSeconds === null ? "Permanent" : formatSeconds(definition.durationSeconds), tone: "blue" },
    { label: "Stacking", value: definition.stacking.mode.replaceAll("-", " "), tone: "default" },
    { label: "Max stacks", value: `${definition.stacking.maxStacks}`, tone: "gold" },
    { label: "Persistence", value: definition.persistence.replaceAll("-", " "), tone: "default" },
  ];
  if (definition.periodic) {
    const operation = definition.periodic.operation;
    rows.push({ label: operation.type === "damage" ? "Periodic damage" : "Periodic healing", value: operation.type === "damage" ? `${operation.baseAmount} ${damageLabels[operation.damageType]}` : `${operation.baseAmount}`, tone: operation.type === "damage" ? "red" : "green" });
    rows.push({ label: "Tick interval", value: formatSeconds(definition.periodic.intervalSeconds), tone: "blue" });
  }
  if (definition.barrierAmount !== undefined) rows.push({ label: "Barrier amount", value: `${definition.barrierAmount}`, tone: "blue" });
  for (const modifier of definition.statModifiers ?? []) rows.push({ label: labelForStatKey(modifier.stat), value: modifier.operation === "flat" ? formatSignedNumber(modifier.value) : `${modifier.value > 0 ? "+" : ""}${Math.round(modifier.value * 100)}%`, tone: toneForValue(modifier.value) });
  for (const modifier of definition.outgoingDamageModifiers ?? []) {
    const damageLabel = modifier.damageType ? damageLabels[modifier.damageType] : "All";
    const sourceLabel = modifier.sourceKind === "spell" ? " Spell" : modifier.sourceKind === "attack" ? " Attack" : "";
    rows.push({ label: `${damageLabel}${sourceLabel} Damage`, value: modifier.operation === "increased" ? formatPercent(modifier.value, true) : `×${formatCompactDecimal(1 + modifier.value, 2)}`, tone: toneForValue(modifier.value) });
  }
  for (const modifier of definition.resistanceModifiers ?? []) rows.push({ label: `${damageLabels[modifier.damageType]} resistance`, value: modifier.operation === "flat" ? formatSignedNumber(modifier.value) : `${modifier.value > 0 ? "+" : ""}${Math.round(modifier.value * 100)}%`, tone: toneForValue(modifier.value) });
  return {
    id: `effect-definition.${definition.id}`,
    icon: definition.icon,
    title: definition.name,
    subtitle: `${kindLabels[definition.kind]} - ${definition.tags.join(" - ")}`,
    tone: definition.kind === "barrier" ? "blue" : definition.kind === "buff" ? "green" : "red",
    description: definition.description,
    rows,
    notes: [definition.tags.length ? `Tags: ${definition.tags.join(", ")}` : "", definition.beneficial === undefined ? "" : definition.beneficial ? "Beneficial" : "Harmful", definition.cleanseTags?.length ? `Cleanse tags: ${definition.cleanseTags.join(", ")}` : ""].filter(Boolean),
  };
}

export function buildEnemyDefinitionTooltip(enemy: EnemyDefinition, options: { defeats?: number; sourceLocations?: string[] } = {}): TooltipModel {
  const rows: TooltipRow[] = [
    { label: "Family", value: enemy.family, tone: "gold" },
    { label: "Max Life", value: `${enemy.maxLife}`, tone: "green" },
    { label: "Attack Damage", value: formatDamageRange(enemy.baseAttackDamageMin, enemy.baseAttackDamageMax), tone: "red" },
    { label: "Accuracy Rating", value: `${enemy.accuracyRating}`, tone: "gold" },
    { label: "Armour", value: `${enemy.armour}`, tone: "blue" },
    { label: "Evasion Rating", value: `${enemy.evasionRating}`, tone: "blue" },
    { label: "Attack Interval", value: formatSeconds(enemy.baseAttackTime), tone: "blue" },
    { label: "Attack Block", value: formatPercent(enemy.attackBlockChance ?? 0, true), tone: "blue" },
    { label: "Spell Block", value: formatPercent(enemy.spellBlockChance ?? 0, true), tone: "blue" },
    { label: "Spell Suppression", value: formatPercent(enemy.spellSuppressionChance ?? 0, true), tone: "blue" },
  ];
  rows.push(...Object.entries(enemy.resistances).map(([damageType, value]) => ({ label: `${damageType} resistance`, value: formatPercent(value, true), tone: toneForValue(value) } satisfies TooltipRow)));
  if (options.defeats !== undefined) rows.push({ label: "Collection defeats", value: `${options.defeats}`, tone: "gold" });
  return {
    id: `enemy-definition.${enemy.id}`,
    icon: enemy.icon,
    title: enemy.name,
    subtitle: `${enemy.family} - ${enemy.id}`,
    tone: enemy.accent,
    rows,
    notes: [enemy.traits.length ? `Traits: ${enemy.traits.map((trait) => trait.name).join(", ")}` : "", enemy.actions.length ? `Actions: ${enemy.actions.map((action) => action.name).join(", ")}` : "", options.sourceLocations?.length ? `Source locations: ${options.sourceLocations.join(", ")}` : ""].filter(Boolean),
  };
}

export function buildSpellTooltip(
  spell: SpellDefinition,
  progression?: ProgressionState,
  context?: SpellCalculationContext,
): TooltipModel {
  const effective = progression
    ? calculateEffectiveSpell(spell, progression, context)
    : spell;
  const rows: TooltipRow[] = [
    {
      label: "Proficiency",
      value:
        proficiencyById[spell.magicProficiencyId]?.name ??
        spell.magicProficiencyId,
      tone: "blue",
    },
    { label: "Mana cost", value: `${effective.manaCost}`, tone: "gold" },
    {
      label: "Cooldown",
      value: formatSeconds(effective.cooldownSeconds),
      tone: "blue",
    },
    {
      label: "Target",
      value:
        spell.targetMode === "self"
          ? "Self"
          : spell.targetMode === "allEnemies"
            ? "All enemies"
            : "Selected enemy",
    },
  ];
  if (spell.baseDamageMin > 0)
    rows.push({
      label: `${damageLabels[spell.damageType ?? "physical"]} Damage`,
      value: formatDamageRange(effective.baseDamageMin, effective.baseDamageMax),
      tone: "red",
    });
  if (effective.barrierAmount)
    rows.push({
      label: "Barrier",
      value: `${effective.barrierAmount}`,
      tone: "blue",
    });
  if (spell.applyEffects?.length)
    rows.push({
      label: "Applies",
      value: spell.applyEffects
        .map(
          ({ effectId, chance }) =>
            `${effectById[effectId]?.name ?? effectId}${chance < 1 ? ` (${formatPercent(chance)})` : ""}`,
        )
        .join(", "),
      tone: "red",
    });
  if (spell.interruptsAction)
    rows.push({
      label: "Utility",
      value: "Interrupts a selected enemy special action",
      tone: "blue",
    });
  return {
    id: spell.id,
    icon: spell.icon,
    title: spell.name,
    subtitle: "Combat spell",
    tone:
      spell.damageType === "fire"
        ? "red"
        : spell.barrierAmount
          ? "blue"
          : "gold",
    description: spell.description,
    rows,
  };
}

export function buildTechniqueTooltip(id: TechniqueId): TooltipModel {
  const technique = techniqueDefinitions[id];
  const rows: TooltipRow[] = [
    {
      label: "Stamina drain",
      value: `${technique.staminaDrainPerSecond.toFixed(1)} / sec`,
      tone: "blue",
    },
  ];
  if (technique.accuracyRating)
    rows.push({
      label: "Accuracy Rating",
      value: formatSignedNumber(technique.accuracyRating),
      tone: "gold",
    });
  if (technique.evasionRating)
    rows.push({
      label: "Evasion Rating",
      value: formatSignedNumber(technique.evasionRating),
      tone: "green",
    });
  return {
    id: `technique.${id}`,
    icon: "spark",
    title: technique.name,
    subtitle: "Sustained Technique",
    description: technique.description,
    rows,
    notes: ["Automatically deactivates when Stamina reaches zero."],
  };
}

export function buildCombatAbilityTooltip(
  entry: CombatAbilityCatalogueEntry,
  options: {
    action?: PlayerActionDefinition;
    availability?: CombatAbilityAvailability;
    equippedSlot: number;
    currentStaminaRegen?: number;
  },
): TooltipModel {
  if (entry.kind === "core")
    return {
      id: `combat-ability.${entry.id}`,
      icon: entry.icon,
      title: entry.name,
      subtitle: "Core Combat · Always Available",
      description: entry.description,
      rows: [
        { label: "Resource", value: "None" },
        { label: "Loadout", value: "Does not use a slot", tone: "gold" },
      ],
    };
  if (entry.kind === "technique") {
    const technique = techniqueDefinitions[entry.techniqueId];
    return {
      id: `combat-ability.${entry.techniqueId}`,
      icon: entry.icon,
      title: entry.name,
      subtitle: "Sustained Technique",
      description: entry.description,
      rows: [
        { label: "Stamina drain", value: `${technique.staminaDrainPerSecond.toFixed(1)} / sec`, tone: "blue" },
        { label: "Equipped slot", value: options.equippedSlot >= 0 ? `Technique ${options.equippedSlot + 1}` : "Not equipped" },
        ...(options.currentStaminaRegen !== undefined ? [{ label: "Current Regen", value: `${options.currentStaminaRegen.toFixed(1)} / sec`, tone: "gold" as const }] : []),
      ],
      notes: ["Toggle during Combat. Automatically shuts down at zero Stamina."],
    };
  }
  const action = options.action;
  const skill = action?.sourceWeaponSkillId
    ? weaponSkillById[action.sourceWeaponSkillId]
    : undefined;
  const skillRows: TooltipRow[] = skill
    ? [
        {
          label: "Proficiency",
          value: proficiencyById[skill.proficiencyId]?.name ?? skill.proficiencyId,
          tone: "blue",
        },
        {
          label: "Planned unlock",
          value: `${proficiencyById[skill.unlock.proficiencyId]?.name ?? skill.unlock.proficiencyId} Lv ${skill.unlock.level}`,
          tone: "default",
        },
        { label: "Prototype", value: "Unlocked for testing", tone: "green" },
        {
          label: "Damage",
          value: `${Math.round(skill.damageMultiplier * 100)}% weapon damage`,
          tone: "red",
        },
        {
          label: "Accuracy",
          value: `${skill.accuracyModifier >= 0 ? "+" : ""}${skill.accuracyModifier}`,
          tone: "gold",
        },
        ...(skill.selfEffectId
          ? [{ label: "Effect", value: effectById[skill.selfEffectId]?.name ?? skill.selfEffectId, tone: "green" as const }]
          : []),
        ...(skill.targetEffectId
          ? [{ label: "Target effect", value: effectById[skill.targetEffectId]?.name ?? skill.targetEffectId, tone: "red" as const }]
          : []),
        ...(skill.cleave
          ? [{ label: "Cleave", value: `Up to ${skill.cleave.maxSecondaryTargets} additional targets at ${Math.round(skill.cleave.primaryResolvedDamageFraction * 100)}% resolved primary damage`, tone: "blue" as const }]
          : []),
      ]
    : [];
  return {
    id: `combat-ability.${entry.actionId}`,
    icon: entry.icon,
    title: entry.name,
    subtitle: entry.category === "active-defense" ? "Active Defense" : "Weapon Skill",
    description: entry.description,
    rows: [
      ...skillRows,
      { label: "Stamina cost", value: `${action?.resourceCost?.stamina ?? 0}`, tone: "gold" },
      { label: "Cooldown", value: `${action?.cooldown.toFixed(1) ?? "0.0"}s`, tone: "blue" },
      { label: "Global Cooldown", value: action?.globalCooldown === "none" ? "No" : "Yes" },
      { label: "Requirement", value: options.availability?.requirement ?? "None" },
      { label: "Equipped slot", value: options.equippedSlot >= 0 ? `Active ${options.equippedSlot + 1}` : "Not equipped" },
    ],
  };
}

export function buildStanceTooltip(
  id: keyof typeof stanceDefinitions,
): TooltipModel {
  const stance = stanceDefinitions[id];
  const rows: TooltipRow[] = [];
  const addMultiplier = (label: string, value: number, note?: string) => {
    if (value !== 1)
      rows.push({
        label,
        value: `${value > 1 ? "+" : ""}${Math.round((value - 1) * 100)}%${note ? ` (${note})` : ""}`,
        tone: toneForValue(value - 1),
      });
  };
  addMultiplier("Attack Damage", stance.damageMultiplier);
  addMultiplier("Armour", stance.armourMultiplier);
  addMultiplier("Accuracy Rating", stance.accuracyMultiplier);
  addMultiplier(
    "Attack Interval",
    stance.attackIntervalMultiplier,
    stance.attackIntervalMultiplier < 1 ? "faster" : "slower",
  );
  if (stance.evasionRating)
    rows.push({
      label: "Evasion Rating",
      value: formatSignedNumber(stance.evasionRating),
      tone: "green",
    });
  addMultiplier("Stamina Regeneration", stance.staminaRegenMultiplier);
  addMultiplier("Stamina Drain", stance.staminaDrainMultiplier);
  return {
    id: `stance.${id}`,
    icon: "shield",
    title: stance.name,
    subtitle: "Combat stance",
    tone: id === "high" ? "red" : id === "low" ? "blue" : "default",
    description: stance.description,
    rows,
  };
}
