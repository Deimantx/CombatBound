import { deepFreeze } from "./freeze";
import type { DefensiveProficiencyId, WeaponProficiencyId } from "../progression/progressionTypes";
import type { EquipmentSlotKind } from "../equipment/equipmentTypes";
import type { ItemInventoryMode, ItemStats } from "../items/itemTypes";
import type { LootContainerId } from "../loot/lootTypes";
import type { WeaponArchetypeId, WeaponFamilyId } from "./gear/weaponArchetypes";
import type { ItemUpgradeTreeId } from "../items/itemUpgradeTypes";
import { deepWoodsItemDefinitions } from "./deepWoodsItems";

export type ItemCategory = "weapon" | "armor" | "accessory" | "material" | "consumable" | "currency";
export type ItemRarity = "common" | "uncommon" | "rare";
export type ItemPurpose = "equipment" | "consumable" | "crafting" | "sell-only" | "loot-container" | "future";
export type GearMaterialTierId = "iron";

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  icon: string;
  inventoryMode: ItemInventoryMode;
  purpose?: ItemPurpose;
  lootContainerId?: LootContainerId;
  requiredHunterRank?: number;
  weaponProficiencyId?: WeaponProficiencyId;
  requiredProficiencyLevel?: number;
  equipmentSlotKind?: EquipmentSlotKind;
  defensiveProficiencyId?: DefensiveProficiencyId;
  weaponFamilyId?: WeaponFamilyId;
  weaponArchetypeId?: WeaponArchetypeId;
  materialTierId?: GearMaterialTierId;
  upgradeTreeId?: ItemUpgradeTreeId;
  stats?: ItemStats;
}

const authoredItemDefinitions: ItemDefinition[] = [
  {
    id: "item.iron-sword", name: "Iron Sword", category: "weapon", rarity: "common",
    description: "A fixed-authored iron longsword. Consecutive Basic hits build Duelist Rhythm; blocking prepares Riposte.",
    icon: "sword", inventoryMode: "instance", purpose: "equipment", requiredHunterRank: 1,
    weaponProficiencyId: "one-handed-sword", requiredProficiencyLevel: 1, equipmentSlotKind: "weapon",
    weaponFamilyId: "sword", weaponArchetypeId: "weapon-archetype.longsword", materialTierId: "iron",
    upgradeTreeId: "upgrade-tree.iron-sword",
    stats: { baseDamageMin: 24, baseDamageMax: 32, baseAttackTime: 2.35, accuracyRating: 8, criticalStrikeChance: 0.02, blockChance: 0.02 },
  },
  {
    id: "item.iron-bar", name: "Iron Bar", category: "material", rarity: "common",
    description: "A refined Blacksmithing material. Its normal source will be Iron Ore after smelting is implemented.",
    icon: "cube", inventoryMode: "stackable", purpose: "crafting",
  },
  { id: "item.healing-potion", name: "Healing Potion", category: "consumable", rarity: "common", description: "Restores health during combat.", icon: "cross", inventoryMode: "stackable", purpose: "consumable" },
  { id: "item.wolf-fang", name: "Wolf Fang", category: "material", rarity: "common", description: "A hardened wolf fang used in weapon crafting.", icon: "target", inventoryMode: "stackable", purpose: "crafting" },
  { id: "item.wolf-pelt", name: "Wolf Pelt", category: "material", rarity: "common", description: "A wolf pelt intended for future sale only.", icon: "cube", inventoryMode: "stackable", purpose: "sell-only" },
  { id: "item.bandit-scrap", name: "Bandit Scrap", category: "material", rarity: "common", description: "Recovered from a bandit camp.", icon: "cube", inventoryMode: "stackable" },
  { id: "item.coin-pouch", name: "Coin Pouch", category: "currency", rarity: "uncommon", description: "A small purse of prototype gold.", icon: "coin", inventoryMode: "stackable" },
  ...deepWoodsItemDefinitions,
];

export const itemDefinitions = deepFreeze<ItemDefinition[]>(authoredItemDefinitions);
export const itemById = Object.fromEntries(itemDefinitions.map((item) => [item.id, item])) as Record<string, ItemDefinition>;
export const prototypeEquipmentDefinitions = itemDefinitions.filter((item) => Boolean(item.equipmentSlotKind));
