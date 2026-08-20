import { effectDefinitions, effectById } from "../data/effects";
import { enemyDefinitions, enemyById } from "../data/enemies";
import { itemDefinitions } from "../data/items";
import { perkById, proficiencyPerkDefinitions } from "../data/proficiencyPerks";
import { magicArtDefinitions } from "../data/magicArts";
import { weaponSkillDefinitions } from "../data/weaponSkills";
import { proficiencyDefinitions } from "../data/proficiencies";
import { combatLocationDefinitions } from "../data/world/combatLocations";
import { validateEquipmentDefinitions } from "../data/validation/itemValidation";
import { itemAffixDefinitions } from "../data/itemAffixes";
import { validateItemAffixDefinitions } from "../data/validation/itemAffixValidation";
import type { CombatStatKey, DamageType } from "../combat/combatTypes";
import { COMBAT_STAT_REGISTRY } from "../presentation/combatStatRegistry";
import { enemyTraitDefinitions } from "../data/enemyTraits";
import { validateEnemyTraitAssignments, validateEnemyTraitDefinitions } from "../data/validation/enemyTraitValidation";
import { validateEnemyCombatAbilities } from "../data/validation/enemyCombatAbilityValidation";
import { validateLootContainerDefinitions } from "../data/validation/lootContainerValidation";
import { lootContainerDefinitions } from "../data/loot/lootContainers";
import { validateWorldContent } from "../world/worldValidation";

export type ValidationSeverity = "error" | "warning";
export interface ContentValidationIssue {
  severity: ValidationSeverity;
  code: string;
  entityType: string;
  entityId: string;
  message: string;
}

const canonicalDamageTypes = new Set<DamageType>(["physical", "fire", "cold", "lightning", "chaos"]);
const canonicalStatKeys = new Set<CombatStatKey>(COMBAT_STAT_REGISTRY.map((entry) => entry.id));
const derivedStatKeys = new Set<CombatStatKey>(["attackInterval", "attacksPerSecond", "castTime", "castsPerSecond"]);
const modifiableStatKeys = new Set([...canonicalStatKeys].filter((key) => !derivedStatKeys.has(key)));

function addIssue(issues: ContentValidationIssue[], entityType: string, entityId: string, code: string, message: string, severity: ValidationSeverity = "error") {
  issues.push({ severity, code, entityType, entityId, message });
}

function visitEffectReferences(value: unknown, callback: (effectId: string) => void) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const entry of value) visitEffectReferences(entry, callback);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "effectId" && typeof child === "string") callback(child);
    else visitEffectReferences(child, callback);
  }
}

function visitStrings(value: unknown, callback: (text: string) => void) {
  if (typeof value === "string") { callback(value); return; }
  if (!value || typeof value !== "object") return;
  for (const child of Object.values(value)) visitStrings(child, callback);
}

const deprecatedLiveContentPattern = /\bmystic\b|mystic[-_ ]?(?:damage|resistance|magic)|nature[-_ ]?(?:damage|resistance|magic)|\b(?:nature|light)\s+(?:damage|resistance)|light-magic|warding-magic/i;

export function validateContent(): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  const ids = (values: Array<{ id: string }>, entityType: string) => {
    const seen = new Set<string>();
    for (const value of values) {
      if (seen.has(value.id)) issues.push({ severity: "error", code: "DUPLICATE_ID", entityType, entityId: value.id, message: `Duplicate ${entityType} id.` });
      seen.add(value.id);
      if (!value.id || !value.id.trim()) issues.push({ severity: "error", code: "MISSING_ID", entityType, entityId: value.id, message: "Definition has no id." });
    }
  };
  ids(itemDefinitions, "item"); ids(itemAffixDefinitions, "itemAffix"); ids(magicArtDefinitions, "magicArt"); ids(effectDefinitions, "effect"); ids(weaponSkillDefinitions, "weaponSkill"); ids(enemyDefinitions, "enemy"); ids(combatLocationDefinitions, "location");
  for (const message of validateWorldContent()) addIssue(issues, "world", "catalogue", "INVALID_WORLD_CONTENT", message);
  const traitValidation = validateEnemyTraitDefinitions(enemyTraitDefinitions, effectById);
  for (const message of traitValidation.errors) addIssue(issues, "enemyTrait", "catalogue", "INVALID_TRAIT", message);
  for (const enemy of enemyDefinitions) for (const message of validateEnemyTraitAssignments(enemy).errors) addIssue(issues, "enemy", enemy.id, "INVALID_TRAIT_ASSIGNMENT", message);
  for (const message of validateEnemyCombatAbilities().errors) addIssue(issues, "enemyAbility", "catalogue", "INVALID_ENEMY_ABILITY", message);
  for (const message of validateLootContainerDefinitions(lootContainerDefinitions).errors) addIssue(issues, "lootContainer", "catalogue", "INVALID_LOOT_CONTAINER", message);
  for (const message of validateEquipmentDefinitions(itemDefinitions).errors) {
    const separator = message.indexOf(": ");
    const entityId = separator > 0 ? message.slice(0, separator) : "catalogue";
    addIssue(issues, "item", entityId, "INVALID_ITEM_STAT", separator > 0 ? message.slice(separator + 2) : message);
  }
  for (const message of validateItemAffixDefinitions(itemAffixDefinitions).errors)
    addIssue(issues, "itemAffix", "catalogue", "INVALID_ITEM_AFFIX", message);
  for (const item of itemDefinitions) if (!item.icon) issues.push({ severity: "warning", code: "UNKNOWN_ICON", entityType: "item", entityId: item.id, message: "Item has no icon key." });
  for (const art of magicArtDefinitions) if (art.barrier && !effectById[art.barrier.effectId]) addIssue(issues, "magicArt", art.id, "MISSING_EFFECT_REFERENCE", `Missing effect reference: ${art.barrier.effectId}`);
  for (const location of combatLocationDefinitions) for (const entry of location.targets) if (!enemyById[entry.enemyId]) issues.push({ severity: "error", code: "MISSING_ENEMY_REFERENCE", entityType: "location", entityId: location.id, message: `Missing enemy in location: ${entry.enemyId}` });
  for (const enemy of enemyDefinitions) {
    if (!Number.isFinite(enemy.baseAttackDamageMin) || !Number.isFinite(enemy.baseAttackDamageMax) || enemy.baseAttackDamageMin > enemy.baseAttackDamageMax)
      addIssue(issues, "enemy", enemy.id, "INVALID_DAMAGE_RANGE", "Enemy baseAttackDamageMin/baseAttackDamageMax must be finite and ordered.");
  }
  for (const enemy of enemyDefinitions) visitEffectReferences(enemy.phases, (effectId) => { if (!effectById[effectId]) addIssue(issues, "enemy", enemy.id, "MISSING_EFFECT_REFERENCE", `Missing effect reference: ${effectId}`); });
  for (const skill of weaponSkillDefinitions) visitEffectReferences(skill, (effectId) => { if (!effectById[effectId]) addIssue(issues, "weaponSkill", skill.id, "MISSING_EFFECT_REFERENCE", `Missing effect reference: ${effectId}`); });
  for (const perk of proficiencyPerkDefinitions) for (const rule of perk.prerequisiteRules ?? []) for (const requirement of rule.requirements) if (!perkById[requirement.perkId]) issues.push({ severity: "error", code: "MISSING_PERK_PREREQUISITE", entityType: "perk", entityId: perk.id, message: `Missing prerequisite: ${requirement.perkId}` });

  for (const effect of effectDefinitions) {
    for (const modifier of effect.statModifiers ?? []) {
      if (!modifiableStatKeys.has(modifier.stat)) addIssue(issues, "effect", effect.id, "INVALID_STAT_MODIFIER", `Stat modifier targets a derived or unknown stat: ${modifier.stat}`);
    }
    for (const modifier of effect.resistanceModifiers ?? []) {
      if (!canonicalDamageTypes.has(modifier.damageType)) addIssue(issues, "effect", effect.id, "NON_CANONICAL_DAMAGE_TYPE", `Unknown resistance damage type: ${modifier.damageType}`);
    }
    for (const modifier of effect.outgoingDamageModifiers ?? []) {
      if (modifier.damageType && !canonicalDamageTypes.has(modifier.damageType)) addIssue(issues, "effect", effect.id, "NON_CANONICAL_DAMAGE_TYPE", `Unknown outgoing damage type: ${modifier.damageType}`);
      if (!Number.isFinite(modifier.value)) addIssue(issues, "effect", effect.id, "INVALID_DAMAGE_MODIFIER", "Outgoing damage modifiers must be finite.");
    }
    const periodicDamage = effect.periodic?.operation.type === "damage" ? effect.periodic.operation.damageType : undefined;
    if (periodicDamage && !canonicalDamageTypes.has(periodicDamage)) addIssue(issues, "effect", effect.id, "NON_CANONICAL_DAMAGE_TYPE", `Unknown periodic damage type: ${periodicDamage}`);
    if (effect.tags.includes("elemental-ailment") && !effect.tags.includes("ailment")) addIssue(issues, "effect", effect.id, "INVALID_AILMENT_TAXONOMY", "Elemental Ailment effects must also be tagged ailment.");
    if (effect.tags.includes("physical-ailment") && !effect.tags.includes("ailment")) addIssue(issues, "effect", effect.id, "INVALID_AILMENT_TAXONOMY", "Physical Ailment effects must also be tagged ailment.");
    if ((effect.tags.includes("damaging-ailment") || effect.tags.includes("non-damaging-ailment")) && !effect.tags.includes("ailment")) addIssue(issues, "effect", effect.id, "INVALID_AILMENT_TAXONOMY", "Ailment subtype tags require the ailment tag.");
    if (effect.id === "effect.shocked") {
      if (!effect.incomingDamageModifiers?.length) addIssue(issues, "effect", effect.id, "INVALID_SHOCK", "Shock must modify incoming damage.");
      if (effect.statModifiers?.some((modifier) => modifier.stat === "evasionRating") || (effect.resistanceModifiers ?? []).length) addIssue(issues, "effect", effect.id, "INVALID_SHOCK", "Shock must not modify Evasion or Resistance.");
    }
  }

  for (const perk of proficiencyPerkDefinitions) {
    for (const effect of perk.effects) {
      const stat = "stat" in effect && typeof effect.stat === "string" ? effect.stat : undefined;
      if (stat && !modifiableStatKeys.has(stat as CombatStatKey)) addIssue(issues, "perk", perk.id, "INVALID_STAT_MODIFIER", `Perk targets a derived or unknown stat: ${stat}`);
      visitEffectReferences(effect, (effectId) => {
        if (!effectById[effectId]) addIssue(issues, "perk", perk.id, "MISSING_EFFECT_REFERENCE", `Missing effect reference: ${effectId}`);
      });
    }
  }
  const liveContent: Array<{ entityType: string; values: unknown[] }> = [
    { entityType: "item", values: itemDefinitions },
    { entityType: "magicArt", values: magicArtDefinitions },
    { entityType: "effect", values: effectDefinitions },
    { entityType: "weaponSkill", values: weaponSkillDefinitions },
    { entityType: "enemy", values: enemyDefinitions },
    { entityType: "perk", values: proficiencyPerkDefinitions },
    { entityType: "proficiency", values: proficiencyDefinitions },
    { entityType: "location", values: combatLocationDefinitions },
  ];
  for (const group of liveContent) for (const value of group.values) {
    const entityId = value && typeof value === "object" && "id" in value && typeof value.id === "string" ? value.id : "catalogue";
    let reported = false;
    visitStrings(value, (text) => {
      if (!reported && deprecatedLiveContentPattern.test(text)) {
        reported = true;
        addIssue(issues, group.entityType, entityId, "DEPRECATED_LIVE_CONTENT", `Removed combat taxonomy appears in live content: ${text}`);
      }
    });
  }
  return issues;
}
