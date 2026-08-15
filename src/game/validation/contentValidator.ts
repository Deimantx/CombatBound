import { effectDefinitions, effectById } from "../data/effects";
import { enemyDefinitions, enemyById } from "../data/enemies";
import { itemDefinitions } from "../data/items";
import { perkById, proficiencyPerkDefinitions } from "../data/proficiencyPerks";
import { spellDefinitions } from "../data/spells";
import { weaponSkillDefinitions } from "../data/weaponSkills";
import { combatLocationDefinitions } from "../data/world/combatLocations";

export type ValidationSeverity = "error" | "warning";
export interface ContentValidationIssue {
  severity: ValidationSeverity;
  code: string;
  entityType: string;
  entityId: string;
  message: string;
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
  for (const item of itemDefinitions) if (!item.icon) issues.push({ severity: "warning", code: "UNKNOWN_ICON", entityType: "item", entityId: item.id, message: "Item has no icon key." });
  for (const spell of spellDefinitions) {
    for (const reference of [...(spell.applyEffects ?? []).map((entry) => entry.effectId), ...(spell.barrierEffectId ? [spell.barrierEffectId] : [])]) if (!effectById[reference]) issues.push({ severity: "error", code: "MISSING_EFFECT_REFERENCE", entityType: "spell", entityId: spell.id, message: `Missing effect reference: ${reference}` });
  }
  for (const location of combatLocationDefinitions) for (const entry of location.enemyPool) if (!enemyById[entry.enemyId]) issues.push({ severity: "error", code: "MISSING_ENEMY_REFERENCE", entityType: "location", entityId: location.id, message: `Missing enemy in location: ${entry.enemyId}` });
  for (const perk of proficiencyPerkDefinitions) for (const rule of perk.prerequisiteRules ?? []) for (const requirement of rule.requirements) if (!perkById[requirement.perkId]) issues.push({ severity: "error", code: "MISSING_PERK_PREREQUISITE", entityType: "perk", entityId: perk.id, message: `Missing prerequisite: ${requirement.perkId}` });
  return issues;
}
