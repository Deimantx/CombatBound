import type { ItemDefinition } from "../data/items";
import type { CombatProficiencyId } from "../progression/progressionTypes";

export interface ItemProficiencyRequirement {
  proficiencyId: CombatProficiencyId;
  requiredLevel: number;
  kind: "weapon" | "defensive";
}

/** Returns the one authored proficiency gate for an item, if it has one. */
export function getItemProficiencyRequirement(definition: ItemDefinition): ItemProficiencyRequirement | null {
  if (definition.weaponProficiencyId)
    return { proficiencyId: definition.weaponProficiencyId, requiredLevel: definition.requiredProficiencyLevel ?? 0, kind: "weapon" };
  if (definition.defensiveProficiencyId)
    return { proficiencyId: definition.defensiveProficiencyId, requiredLevel: definition.requiredProficiencyLevel ?? 0, kind: "defensive" };
  return null;
}

export function itemDefinesConflictingProficiencies(definition: ItemDefinition) {
  return Boolean(definition.weaponProficiencyId && definition.defensiveProficiencyId);
}
