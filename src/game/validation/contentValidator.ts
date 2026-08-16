import { effectDefinitions, effectById } from "../data/effects";
import { enemyDefinitions, enemyById } from "../data/enemies";
import { itemDefinitions } from "../data/items";
import { perkById, proficiencyPerkDefinitions } from "../data/proficiencyPerks";
import { spellDefinitions } from "../data/spells";
import { weaponSkillDefinitions } from "../data/weaponSkills";
import { combatLocationDefinitions } from "../data/world/combatLocations";
import { validateEquipmentDefinitions } from "../data/validation/itemValidation";
import type { CombatStatKey, DamageType } from "../combat/combatTypes";
import { COMBAT_STAT_REGISTRY } from "../presentation/combatStatRegistry";

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
  ids(itemDefinitions, "item"); ids(spellDefinitions, "spell"); ids(effectDefinitions, "effect"); ids(weaponSkillDefinitions, "weaponSkill"); ids(enemyDefinitions, "enemy"); ids(combatLocationDefinitions, "location");
  for (const message of validateEquipmentDefinitions(itemDefinitions).errors) {
    const separator = message.indexOf(": ");
    const entityId = separator > 0 ? message.slice(0, separator) : "catalogue";
    addIssue(issues, "item", entityId, "INVALID_ITEM_STAT", separator > 0 ? message.slice(separator + 2) : message);
  }
  for (const item of itemDefinitions) if (!item.icon) issues.push({ severity: "warning", code: "UNKNOWN_ICON", entityType: "item", entityId: item.id, message: "Item has no icon key." });
  for (const spell of spellDefinitions) {
    for (const reference of [...(spell.applyEffects ?? []).map((entry) => entry.effectId), ...(spell.barrierEffectId ? [spell.barrierEffectId] : [])]) if (!effectById[reference]) issues.push({ severity: "error", code: "MISSING_EFFECT_REFERENCE", entityType: "spell", entityId: spell.id, message: `Missing effect reference: ${reference}` });
  }
  for (const location of combatLocationDefinitions) for (const entry of location.enemyPool) if (!enemyById[entry.enemyId]) issues.push({ severity: "error", code: "MISSING_ENEMY_REFERENCE", entityType: "location", entityId: location.id, message: `Missing enemy in location: ${entry.enemyId}` });
  for (const enemy of enemyDefinitions) visitEffectReferences(enemy.actions, (effectId) => { if (!effectById[effectId]) addIssue(issues, "enemy", enemy.id, "MISSING_EFFECT_REFERENCE", `Missing effect reference: ${effectId}`); });
  for (const enemy of enemyDefinitions) visitEffectReferences(enemy.phases, (effectId) => { if (!effectById[effectId]) addIssue(issues, "enemy", enemy.id, "MISSING_EFFECT_REFERENCE", `Missing effect reference: ${effectId}`); });
  for (const skill of weaponSkillDefinitions) visitEffectReferences(skill, (effectId) => { if (!effectById[effectId]) addIssue(issues, "weaponSkill", skill.id, "MISSING_EFFECT_REFERENCE", `Missing effect reference: ${effectId}`); });
  for (const perk of proficiencyPerkDefinitions) for (const rule of perk.prerequisiteRules ?? []) for (const requirement of rule.requirements) if (!perkById[requirement.perkId]) issues.push({ severity: "error", code: "MISSING_PERK_PREREQUISITE", entityType: "perk", entityId: perk.id, message: `Missing prerequisite: ${requirement.perkId}` });

  for (const spell of spellDefinitions) {
    if (spell.damageType && !canonicalDamageTypes.has(spell.damageType)) addIssue(issues, "spell", spell.id, "NON_CANONICAL_DAMAGE_TYPE", `Unknown damage type: ${spell.damageType}`);
    if (!Number.isFinite(spell.baseDamageMin) || !Number.isFinite(spell.baseDamageMax) || spell.baseDamageMin > spell.baseDamageMax)
      addIssue(issues, "spell", spell.id, "INVALID_DAMAGE_RANGE", "Spell baseDamageMin/baseDamageMax must be finite and ordered.");
  }

  for (const effect of effectDefinitions) {
    for (const modifier of effect.statModifiers ?? []) {
      if (!modifiableStatKeys.has(modifier.stat)) addIssue(issues, "effect", effect.id, "INVALID_STAT_MODIFIER", `Stat modifier targets a derived or unknown stat: ${modifier.stat}`);
    }
    for (const modifier of effect.resistanceModifiers ?? []) {
      if (!canonicalDamageTypes.has(modifier.damageType)) addIssue(issues, "effect", effect.id, "NON_CANONICAL_DAMAGE_TYPE", `Unknown resistance damage type: ${modifier.damageType}`);
      if (effect.tags.includes("exposure") && modifier.damageType === "physical") addIssue(issues, "effect", effect.id, "INVALID_EXPOSURE_TYPE", "Exposure cannot target Physical resistance.");
    }
    const periodicDamage = effect.periodic?.operation.type === "damage" ? effect.periodic.operation.damageType : undefined;
    if (periodicDamage && !canonicalDamageTypes.has(periodicDamage)) addIssue(issues, "effect", effect.id, "NON_CANONICAL_DAMAGE_TYPE", `Unknown periodic damage type: ${periodicDamage}`);
    if (effect.tags.includes("elemental-ailment") && !effect.tags.includes("ailment")) addIssue(issues, "effect", effect.id, "INVALID_AILMENT_TAXONOMY", "Elemental Ailment effects must also be tagged ailment.");
    if (effect.tags.includes("physical-ailment") && !effect.tags.includes("ailment")) addIssue(issues, "effect", effect.id, "INVALID_AILMENT_TAXONOMY", "Physical Ailment effects must also be tagged ailment.");
    if ((effect.tags.includes("damaging-ailment") || effect.tags.includes("non-damaging-ailment")) && !effect.tags.includes("ailment")) addIssue(issues, "effect", effect.id, "INVALID_AILMENT_TAXONOMY", "Ailment subtype tags require the ailment tag.");
    if (effect.tags.includes("exposure") && !(effect.resistanceModifiers ?? []).length) addIssue(issues, "effect", effect.id, "INVALID_EXPOSURE", "Exposure effects must reduce a resistance.");
    if (effect.id === "effect.shocked") {
      if (!effect.statModifiers?.some((modifier) => modifier.stat === "increasedDamageTaken")) addIssue(issues, "effect", effect.id, "INVALID_SHOCK", "Shock must modify increasedDamageTaken.");
      if (effect.statModifiers?.some((modifier) => modifier.stat === "evasionRating") || (effect.resistanceModifiers ?? []).length) addIssue(issues, "effect", effect.id, "INVALID_SHOCK", "Shock must not modify Evasion or Resistance.");
    }
    if (effect.id === "effect.off-balance" && effect.tags.includes("exposure")) addIssue(issues, "effect", effect.id, "INVALID_OFF_BALANCE", "Off-Balance cannot use the reserved Exposure taxonomy.");
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
  return issues;
}
