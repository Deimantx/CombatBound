import type { ItemRarity } from "../data/items";

/** Shared visual vocabulary for item rarity surfaces. */
export function itemRarityClass(rarity: ItemRarity) {
  return `rarity-${rarity}`;
}

export function itemRarityArtVariant(rarity: ItemRarity): "muted" | "blue" | "gold" {
  if (rarity === "rare") return "gold";
  if (rarity === "uncommon") return "blue";
  return "muted";
}
