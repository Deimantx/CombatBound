import { itemById } from "../items";
import type { LootContainerDefinition } from "../../loot/lootTypes";

export interface LootContainerValidationResult {
  errors: string[];
  warnings: string[];
}

export function validateLootContainerDefinitions(definitions: readonly LootContainerDefinition[]): LootContainerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();
  for (const definition of definitions) {
    if (ids.has(definition.id)) errors.push(`Duplicate Loot Container ID ${definition.id}.`);
    ids.add(definition.id);
    if (!definition.id.startsWith("loot-container.")) errors.push(`${definition.id}: invalid container namespace.`);
    if (!Number.isInteger(definition.rolls) || definition.rolls < 1) errors.push(`${definition.id}: rolls must be a positive integer.`);
    if (!definition.entries.length) errors.push(`${definition.id}: must contain at least one entry.`);
    for (const entry of definition.entries) {
      if (!itemById[entry.itemId]) errors.push(`${definition.id}: missing item ${entry.itemId}.`);
      if (!(entry.weight > 0) || !Number.isFinite(entry.weight)) errors.push(`${definition.id}: ${entry.itemId} weight must be positive.`);
      if (!Number.isInteger(entry.minQuantity) || entry.minQuantity < 1) errors.push(`${definition.id}: ${entry.itemId} min quantity must be at least 1.`);
      if (!Number.isInteger(entry.maxQuantity) || entry.maxQuantity < entry.minQuantity) errors.push(`${definition.id}: ${entry.itemId} has invalid quantity range.`);
      if (itemById[entry.itemId]?.lootContainerId === definition.id) errors.push(`${definition.id}: direct self-container recursion is forbidden.`);
    }
  }
  return { errors, warnings };
}
