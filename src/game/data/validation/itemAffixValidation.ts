import type { ItemAffixDefinition } from "../../items/itemModifierTypes";

export interface ItemAffixValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateItemAffixDefinitions(affixes: readonly ItemAffixDefinition[]): ItemAffixValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  for (const affix of affixes) {
    if (ids.has(affix.id)) errors.push(`${affix.id}: duplicate affix id`);
    ids.add(affix.id);
    if (!affix.tiers.length) errors.push(`${affix.id}: must define at least one tier`);
    const tierIds = new Set<string>();
    for (const tier of affix.tiers) {
      if (tierIds.has(tier.id)) errors.push(`${affix.id}: duplicate tier id ${tier.id}`);
      tierIds.add(tier.id);
      if (!tier.modifiers.length) errors.push(`${affix.id}/${tier.id}: must define at least one modifier`);
      const modifierIds = new Set<string>();
      for (const modifier of tier.modifiers) {
        if (modifierIds.has(modifier.id)) errors.push(`${affix.id}/${tier.id}: duplicate modifier id ${modifier.id}`);
        modifierIds.add(modifier.id);
        if (!Number.isFinite(modifier.roll.min) || !Number.isFinite(modifier.roll.max) || modifier.roll.min > modifier.roll.max)
          errors.push(`${affix.id}/${tier.id}/${modifier.id}: invalid roll range`);
        if (modifier.roll.step !== undefined && (!Number.isFinite(modifier.roll.step) || modifier.roll.step <= 0))
          errors.push(`${affix.id}/${tier.id}/${modifier.id}: roll step must be positive`);
      }
    }
  }
  return { errors, warnings };
}
