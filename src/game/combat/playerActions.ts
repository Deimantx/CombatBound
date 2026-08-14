import type { HunterCombatStats } from "../equipment/derivedStats";
import { getDefensiveEquipmentContext } from "../equipment/defensiveEquipment";
import type { GameState } from "../gameState";
import { calculateEffectiveSpell } from "../progression/spellProgression";
import { combatBalance } from "./combatBalance";
import type {
  CombatContext,
  ActionValidationReason,
  PlayerActionDefinition,
} from "./combatTypes";
import { getBarrierAmount } from "./combatEffects";
import { isCombatAbilityLoadoutActionKind } from "../combatAbilities/combatAbilityTypes";
import { weaponSkillDefinitions } from "../data/weaponSkills";
import { getEquippedWeaponProficiency } from "../progression/progressionSelectors";
import { getProficiencyLevel } from "../progression/proficiencyProgression";

export const defensiveActionDefinitions: PlayerActionDefinition[] = [
  {
    id: "defense.guard",
    kind: "defensive",
    name: "Guard",
    description: "Raise your shield to improve Block chance and Block power.",
    icon: "shield",
    targetMode: "self",
    cooldown: 4,
    globalCooldown: "standard",
    resourceCost: { stamina: 20 },
    requirements: { requiresShield: true },
  },
  {
    id: "defense.evasive-step",
    kind: "defensive",
    name: "Evasive Step",
    description:
      "A short movement window that improves Evasion and Dodge chance.",
    icon: "footprints",
    targetMode: "self",
    cooldown: 4,
    globalCooldown: "standard",
    resourceCost: { stamina: 20 },
    requirements: { minimumLightMediumArmorPieces: 2 },
  },
  {
    id: "defense.brace",
    kind: "defensive",
    name: "Brace",
    description:
      "Brace behind your armor to improve Armor and Status Resistance.",
    icon: "shield-check",
    targetMode: "self",
    cooldown: 5,
    globalCooldown: "standard",
    resourceCost: { stamina: 25 },
    requirements: { minimumHeavyArmorPieces: 2 },
  },
];

export const basicAttackAction: PlayerActionDefinition = {
  id: "basic.weapon-attack",
  kind: "basic-attack",
  name: "Weapon Attack",
  description: "Background attack performed by the equipped weapon.",
  icon: "sword",
  targetMode: "selected-enemy",
  cooldown: 0,
  globalCooldown: "none",
};
export const potionAction: PlayerActionDefinition = {
  id: "consumable.healing-potion",
  kind: "consumable",
  name: "Healing Potion",
  description: "Restore health during combat.",
  icon: "heart",
  targetMode: "self",
  cooldown: 5,
  globalCooldown: "none",
  sourceItemId: "item.healing-potion",
};

export const weaponSkillActionDefinitions: PlayerActionDefinition[] =
  weaponSkillDefinitions.map((skill) => ({
    id: skill.id,
    kind: "weapon-skill" as const,
    name: skill.name,
    description: skill.description,
    icon: skill.icon,
    targetMode: "selected-enemy" as const,
    cooldown: skill.cooldownSeconds,
    globalCooldown: skill.globalCooldown,
    resourceCost: { stamina: skill.staminaCost },
    sourceWeaponSkillId: skill.id,
  }));

export function getActiveAbilityActionDefinitions() {
  return [...defensiveActionDefinitions, ...weaponSkillActionDefinitions];
}

export function getPlayerActionDefinitions(
  game: GameState,
  context: CombatContext,
): PlayerActionDefinition[] {
  const spells = Object.values(context.spells).map((spell) => ({
    id: spell.id,
    kind: "spell" as const,
    name: spell.name,
    description: spell.description,
    icon: spell.icon,
    targetMode:
      spell.targetMode === "self"
        ? ("self" as const)
        : ("selected-enemy" as const),
    cooldown: spell.cooldownSeconds,
    globalCooldown: "standard" as const,
    resourceCost: { mana: spell.manaCost },
    sourceSpellId: spell.id,
  }));
  return [
    basicAttackAction,
    ...spells,
    ...getActiveAbilityActionDefinitions(),
    potionAction,
  ];
}

export function getActionById(
  game: GameState,
  actionId: string,
  context: CombatContext,
) {
  return getPlayerActionDefinitions(game, context).find(
    (action) => action.id === actionId,
  );
}

export function isCombatAbilityLoadoutAction(action: PlayerActionDefinition) {
  return isCombatAbilityLoadoutActionKind(action.kind);
}

export interface ActionValidationResult {
  valid: boolean;
  reason?: ActionValidationReason;
  action?: PlayerActionDefinition;
  targetId?: string;
}

export interface EffectiveActionCost {
  mana: number;
  stamina: number;
}

/** The one target/build context used by spell validation, execution and UI. */
export function buildEffectiveSpellContext(
  game: GameState,
  _spell: NonNullable<CombatContext["spells"][string]>,
): Parameters<typeof calculateEffectiveSpell>[2] {
  const target = _spell.targetMode === "selectedEnemy"
    ? game.combat.enemies.find(
        (enemy) =>
          enemy.instanceId === game.combat.selectedEnemyInstanceId &&
          !enemy.defeated,
      )
    : undefined;
  return {
    targetHpFraction: target
      ? target.currentHealth / Math.max(1, target.maxHealth)
      : undefined,
    targetEffects: target?.effects,
    manaFraction:
      game.combat.maxMana > 0 ? game.combat.mana / game.combat.maxMana : 1,
    equipmentContext: getDefensiveEquipmentContext(game.equipment),
  };
}

export function getEffectivePlayerActionCost(
  game: GameState,
  action: PlayerActionDefinition,
  _stats: HunterCombatStats,
  context: CombatContext,
): EffectiveActionCost {
  if (!action.sourceSpellId)
    return {
      mana: action.resourceCost?.mana ?? 0,
      stamina: action.resourceCost?.stamina ?? 0,
    };
  const spell = context.spells[action.sourceSpellId];
  if (!spell)
    return {
      mana: action.resourceCost?.mana ?? 0,
      stamina: action.resourceCost?.stamina ?? 0,
    };
  const effectiveSpell = calculateEffectiveSpell(
    spell,
    game.progression,
    buildEffectiveSpellContext(game, spell),
  );
  return { mana: effectiveSpell.manaCost, stamina: 0 };
}

export function validatePlayerAction(
  game: GameState,
  actionId: string,
  stats: HunterCombatStats,
  context: CombatContext,
): ActionValidationResult {
  const action = getActionById(game, actionId, context);
  const combat = game.combat;
  if (combat.phase !== "active")
    return { valid: false, reason: "combat-inactive", action };
  if (!action) return { valid: false, reason: "combat-inactive" };
  if (
    isCombatAbilityLoadoutAction(action) &&
    !game.combatAbilities.activeSlots.includes(action.id)
  )
    return { valid: false, reason: "ability-not-equipped", action };
  if (action.sourceWeaponSkillId) {
    const skill = weaponSkillDefinitions.find(
      (candidate) => candidate.id === action.sourceWeaponSkillId,
    );
    if (!skill) return { valid: false, reason: "weapon-requirement", action };
    if (getEquippedWeaponProficiency(game.equipment) !== skill.proficiencyId)
      return { valid: false, reason: "weapon-requirement", action };
    if (
      combatBalance.enforceWeaponSkillLevelRequirements &&
      getProficiencyLevel(game.progression, skill.unlock.proficiencyId) <
        skill.unlock.level
    )
      return {
        valid: false,
        reason: "proficiency-level-requirement",
        action,
      };
  }
  if (action.kind === "spell") {
    if (!game.spellbook.knownSpellIds.includes(action.id))
      return { valid: false, reason: "spell-not-known", action };
    if (!game.spellbook.equippedSpellSlots.includes(action.id))
      return { valid: false, reason: "spell-not-equipped", action };
  }
  if (combat.globalCooldownRemaining > 0 && action.globalCooldown !== "none")
    return { valid: false, reason: "global-cooldown", action };
  if ((combat.actionCooldowns[action.id] ?? 0) > 0)
    return { valid: false, reason: "action-cooldown", action };
  const cost = getEffectivePlayerActionCost(game, action, stats, context);
  const mana = cost.mana;
  const stamina = cost.stamina;
  if (combat.mana < mana)
    return { valid: false, reason: "insufficient-mana", action };
  if (combat.stamina < stamina)
    return { valid: false, reason: "insufficient-stamina", action };
  const target = combat.enemies.find(
    (enemy) => enemy.instanceId === combat.selectedEnemyInstanceId,
  );
  if (action.targetMode === "selected-enemy" && !target)
    return { valid: false, reason: "no-target", action };
  if (action.targetMode === "selected-enemy" && target?.defeated)
    return {
      valid: false,
      reason: "target-defeated",
      action,
      targetId: target.instanceId,
    };
  if (action.id === "spell.disrupting-pulse") {
    const interruptible = target?.currentAction
      ? context.enemies[target.enemyId]?.actions.find(
          (candidate) => candidate.id === target.currentAction?.actionId,
        )?.interruptible
      : false;
    if (!interruptible)
      return {
        valid: false,
        reason: "no-interruptible-action",
        action,
        targetId: target?.instanceId,
      };
  }
  if (action.id === potionAction.id) {
    if ((game.inventory.quantities[potionAction.sourceItemId!] ?? 0) <= 0)
      return { valid: false, reason: "consumable-missing", action };
    if (combat.playerHp >= stats.maxHealth)
      return { valid: false, reason: "full-health", action };
  }
  if (action.requirements) {
    const equipment = getDefensiveEquipmentContext(game.equipment);
    if (action.requirements.requiresShield && !equipment.shieldEquipped)
      return { valid: false, reason: "equipment-requirement", action };
    if (
      (action.requirements.minimumLightMediumArmorPieces ?? 0) >
      equipment.lightArmorPieces + equipment.mediumArmorPieces
    )
      return { valid: false, reason: "equipment-requirement", action };
    if (
      (action.requirements.minimumHeavyArmorPieces ?? 0) >
      equipment.heavyArmorPieces
    )
      return { valid: false, reason: "equipment-requirement", action };
  }
  return { valid: true, action, targetId: target?.instanceId };
}

export function getActionManaCost(
  game: GameState,
  action: PlayerActionDefinition,
  context: CombatContext,
) {
  return getEffectivePlayerActionCost(
    game,
    action,
    {} as HunterCombatStats,
    context,
  ).mana;
}

export function getSpellActionView(
  game: GameState,
  spellId: string,
  stats: HunterCombatStats,
  context: CombatContext,
) {
  const spell = context.spells[spellId];
  const action = spell ? getActionById(game, spellId, context) : undefined;
  const effectiveSpell = spell
    ? calculateEffectiveSpell(
        spell,
        game.progression,
        buildEffectiveSpellContext(game, spell),
      )
    : undefined;
  return {
    spell,
    effectiveSpell,
    effectiveManaCost: effectiveSpell?.manaCost ?? 0,
    cooldownRemaining: game.combat.actionCooldowns[spellId] ?? 0,
    validation: action
      ? validatePlayerAction(game, action.id, stats, context)
      : { valid: false as const, reason: "combat-inactive" as const },
  };
}

export const standardGlobalCooldown = combatBalance.standardGlobalCooldown;

export function reasonLabel(reason?: ActionValidationReason) {
  if (reason === "weapon-requirement") return "REQUIRES ONE-HANDED SWORD";
  if (reason === "proficiency-level-requirement") return "REQUIRES PROFICIENCY LEVEL";
  return reason ? reason.replaceAll("-", " ").toUpperCase() : "READY";
}

export function actionBarrier(game: GameState, context: CombatContext) {
  return getBarrierAmount(game.combat.playerEffects, context.effects);
}
