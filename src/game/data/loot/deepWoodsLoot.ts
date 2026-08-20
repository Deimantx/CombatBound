import { deepFreeze } from "../freeze";
import type { ArenaSharedLootEntry, LootEntry } from "../../loot/lootTypes";
import { deepWoodsLootTuning, standardArenaSellQuantityOverrides } from "./deepWoodsLootTuning";

const t = deepWoodsLootTuning;

function drop(itemId: string, chance: number, minQuantity = 1, maxQuantity = 1): LootEntry {
  return { itemId, chance, minQuantity, maxQuantity };
}

function arenaSharedLoot(targetIds: readonly string[], guaranteedItemId: string, entries: readonly LootEntry[]): ArenaSharedLootEntry[] {
  return [
    {
      itemId: guaranteedItemId,
      chance: 1,
      minQuantity: 1,
      maxQuantity: 1,
      targetQuantityOverrides: standardArenaSellQuantityOverrides(targetIds),
    },
    ...entries.filter((entry) => entry.itemId !== guaranteedItemId),
  ];
}

export const deepWoodsSharedLoot = deepFreeze({
  wolfscarHollow: (targetIds: readonly string[]) => arenaSharedLoot(targetIds, "item.wolf-pelt", [
    drop("item.wolf-fang", t.commonMaterialChance),
    drop("item.wolf-bone", t.commonMaterialChance),
    drop("item.wolf-rugged-hide", t.uncommonMaterialChance),
    drop("item.wolf-pristine-hide", t.rareMaterialChance),
    drop("item.wolf-blood-vial", t.uncommonMaterialChance),
    drop("item.wolf-sinew", t.uncommonMaterialChance),
    drop("item.trace-of-nature", t.traceChance),
    drop("item.magic-crystal-minor-assault", t.minorCrystalChance),
    drop("item.black-stone", t.blackStoneChance),
  ]),
  ironbackRiverbed: (targetIds: readonly string[]) => arenaSharedLoot(targetIds, "item.mineralized-carapace", [
    drop("item.iron-ore", t.commonMaterialChance, 1, 2),
    drop("item.copper-ore", t.commonMaterialChance),
    drop("item.mineralized-shell-plate", t.uncommonMaterialChance),
    drop("item.rough-metal-fragment", t.commonMaterialChance, 1, 2),
    drop("item.rough-gem", t.uncommonMaterialChance),
    drop("item.mineral-salts", t.uncommonMaterialChance),
    drop("item.trace-of-earth", t.traceChance),
    drop("item.magic-crystal-minor-health", t.minorCrystalChance),
    drop("item.black-stone", t.blackStoneChance),
  ]),
  fallenWatchRuins: (targetIds: readonly string[]) => arenaSharedLoot(targetIds, "item.scavenged-rusty-insignia", [
    drop("item.weapon-scrap", t.commonMaterialChance),
    drop("item.ore-box", t.rareMaterialChance),
    drop("item.frayed-cloth", t.commonMaterialChance),
    drop("item.leather-straps", t.commonMaterialChance),
    drop("item.metal-scraps", t.uncommonMaterialChance),
    drop("item.magic-crystal-minor-precision", t.minorCrystalChance),
    drop("item.magic-crystal-box", t.rareMaterialChance),
    drop("item.black-stone", t.blackStoneChance),
  ]),
  blackrootCemetery: (targetIds: readonly string[]) => arenaSharedLoot(targetIds, "item.tarnished-old-rags", [
    drop("item.bone-fragment", t.commonMaterialChance),
    drop("item.gravebound-bone", t.uncommonMaterialChance),
    drop("item.burial-cloth", t.commonMaterialChance),
    drop("item.grave-dust", t.commonMaterialChance),
    drop("item.blackroot-dust", t.uncommonMaterialChance),
    drop("item.trace-of-death", t.traceChance),
    drop("item.magic-crystal-minor-mana", t.minorCrystalChance),
    drop("item.black-stone", t.blackStoneChance),
  ]),
  blightedGrove: (targetIds: readonly string[]) => arenaSharedLoot(targetIds, "item.blighted-husk", [
    drop("item.blighted-bark", t.commonMaterialChance),
    drop("item.thornhide-strip", t.uncommonMaterialChance),
    drop("item.corrupted-sap", t.uncommonMaterialChance),
    drop("item.dark-root", t.uncommonMaterialChance),
    drop("item.fungal-matter", t.commonMaterialChance),
    drop("item.trace-of-corruption", t.traceChance),
    drop("item.magic-crystal-minor-recovery", t.minorCrystalChance),
    drop("item.black-stone", t.blackStoneChance),
  ]),
  hollowBellTemple: (targetIds: readonly string[]) => arenaSharedLoot(targetIds, "item.faded-spirit-token", [
    drop("item.spirit-ash", t.commonMaterialChance),
    drop("item.dark-essence", t.uncommonMaterialChance),
    drop("item.broken-relic", t.uncommonMaterialChance),
    drop("item.wraith-residue", t.uncommonMaterialChance),
    drop("item.dark-spirits-dust", t.commonMaterialChance),
    drop("item.trace-of-unholy", t.traceChance),
    drop("item.magic-crystal-minor-ward", t.minorCrystalChance),
    drop("item.black-stone", t.blackStoneChance),
  ]),
});
