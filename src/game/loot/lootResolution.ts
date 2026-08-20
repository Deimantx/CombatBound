import type { ArenaSharedLootEntry, LootEntry, LootQuantityRange } from "./lootTypes";

export function resolveSharedLootEntryForTarget(
  drop: ArenaSharedLootEntry,
  targetEnemyId: string | undefined,
): LootEntry {
  const override = targetEnemyId ? drop.targetQuantityOverrides?.[targetEnemyId] : undefined;
  return {
    itemId: drop.itemId,
    chance: drop.chance,
    ...(override ?? { minQuantity: drop.minQuantity, maxQuantity: drop.maxQuantity }),
  };
}

export function lootQuantityLabel(range: LootQuantityRange) {
  return range.minQuantity === range.maxQuantity
    ? `x${range.minQuantity}`
    : `x${range.minQuantity}-${range.maxQuantity}`;
}
