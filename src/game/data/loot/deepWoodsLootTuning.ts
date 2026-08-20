/**
 * Deep Woods content tuning is intentionally provisional. The source defines
 * the item identities and relative behavior, but not final economy or drop
 * rates. [TUNING]
 */
export const deepWoodsLootTuning = {
  commonMaterialChance: 0.35,
  uncommonMaterialChance: 0.18,
  rareMaterialChance: 0.08,
  traceChance: 0.06,
  minorCrystalChance: 0.03,
  blackStoneChance: 0.01,
  signatureDropChance: 0.04,
  veryRareSignatureChance: 0.02,
} as const;

export const STANDARD_ARENA_SELL_QUANTITIES = {
  target1: { minQuantity: 1, maxQuantity: 1 },
  target2: { minQuantity: 1, maxQuantity: 2 },
  target3: { minQuantity: 2, maxQuantity: 3 },
  target4: { minQuantity: 3, maxQuantity: 5 },
} as const;

export function standardArenaSellQuantityOverrides(targetIds: readonly string[]) {
  const ranges = [
    STANDARD_ARENA_SELL_QUANTITIES.target1,
    STANDARD_ARENA_SELL_QUANTITIES.target2,
    STANDARD_ARENA_SELL_QUANTITIES.target3,
    STANDARD_ARENA_SELL_QUANTITIES.target4,
  ];
  return Object.fromEntries(targetIds.map((targetId, index) => [targetId, ranges[index] ?? ranges[ranges.length - 1]]));
}
