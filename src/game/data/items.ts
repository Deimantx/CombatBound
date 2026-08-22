import { deepFreeze } from "./freeze";
import type { DefensiveProficiencyId, WeaponProficiencyId } from "../progression/progressionTypes";
import type { EquipmentSlotKind } from "../equipment/equipmentTypes";
import type { ItemInventoryMode, ItemStats } from "../items/itemTypes";
import type { LootContainerId } from "../loot/lootTypes";
import type { WeaponArchetypeId, WeaponFamilyId } from "./gear/weaponArchetypes";
import type { ItemUpgradeTreeId } from "../items/itemUpgradeTypes";
import type { ProfessionSkillId } from "../professions/professionTypes";
import { deepWoodsItemDefinitions } from "./deepWoodsItems";
import { ironDefensiveGearDefinitions } from "./gear/ironDefensiveGear";

export type ItemCategory = "weapon" | "armor" | "accessory" | "material" | "consumable" | "currency" | "tool";
export type ItemRarity = "common" | "uncommon" | "rare";
export type ItemPurpose = "equipment" | "consumable" | "crafting" | "sell-only" | "loot-container" | "future";
export type GearMaterialTierId = "iron";
export type ProfessionToolKind = "pickaxe";
export interface ProfessionToolStats { miningDamage: number }

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
  professionToolKind?: ProfessionToolKind;
  requiredProfessionSkillId?: ProfessionSkillId;
  requiredProfessionLevel?: number;
  professionToolStats?: ProfessionToolStats;
  stats?: ItemStats;
}

const authoredItemDefinitions: ItemDefinition[] = [
  {
    id: "item.iron-sword", name: "Iron Sword", category: "weapon", rarity: "common",
    description: "A reliable iron longsword. Consecutive Basic hits build Duelist Rhythm; successful Blocks prepare Riposte.",
    icon: "sword", inventoryMode: "instance", purpose: "equipment", requiredHunterRank: 1,
    weaponProficiencyId: "one-handed-sword", requiredProficiencyLevel: 1, equipmentSlotKind: "weapon",
    weaponFamilyId: "sword", weaponArchetypeId: "weapon-archetype.longsword", materialTierId: "iron",
    upgradeTreeId: "upgrade-tree.iron-sword",
    stats: { baseDamageMin: 24, baseDamageMax: 32, baseAttackTime: 2.35, accuracyRating: 8, criticalStrikeChance: 0.02, blockChance: 0.02 },
  },
  ...ironDefensiveGearDefinitions,
  {
    id: "item.iron-axe", name: "Iron Axe", category: "weapon", rarity: "common",
    description: "An aggressive iron war axe. Successful attacks Wound the target and build Momentum, while weakened enemies become easier to finish.",
    icon: "axe", inventoryMode: "instance", purpose: "equipment", requiredHunterRank: 1,
    weaponProficiencyId: "one-handed-axe", requiredProficiencyLevel: 1, equipmentSlotKind: "weapon",
    weaponFamilyId: "axe", weaponArchetypeId: "weapon-archetype.war-axe", materialTierId: "iron", upgradeTreeId: "upgrade-tree.iron-axe",
    stats: { baseDamageMin: 29, baseDamageMax: 39, baseAttackTime: 2.75, accuracyRating: 2, criticalStrikeChance: 0.03, criticalStrikeMultiplier: 0.15 },
  },
  {
    id: "item.iron-mace", name: "Iron Mace", category: "weapon", rarity: "common",
    description: "A heavy flanged iron mace. Repeated impacts Crush enemy defenses and build toward powerful guard-breaking strikes.",
    icon: "mace", inventoryMode: "instance", purpose: "equipment", requiredHunterRank: 1,
    weaponProficiencyId: "one-handed-mace", requiredProficiencyLevel: 1, equipmentSlotKind: "weapon",
    weaponFamilyId: "mace", weaponArchetypeId: "weapon-archetype.flanged-mace", materialTierId: "iron", upgradeTreeId: "upgrade-tree.iron-mace",
    stats: { baseDamageMin: 30, baseDamageMax: 40, baseAttackTime: 2.90, blockChance: 0.01 },
  },
  {
    id: "item.iron-dagger", name: "Iron Dagger", category: "weapon", rarity: "common",
    description: "A fast iron combat dagger. Consecutive hits build Combo, enabling Flurries and rewarding opportunistic attacks.",
    icon: "dagger", inventoryMode: "instance", purpose: "equipment", requiredHunterRank: 1,
    weaponProficiencyId: "dagger", requiredProficiencyLevel: 1, equipmentSlotKind: "weapon",
    weaponFamilyId: "dagger", weaponArchetypeId: "weapon-archetype.combat-dagger", materialTierId: "iron", upgradeTreeId: "upgrade-tree.iron-dagger",
    stats: { baseDamageMin: 13, baseDamageMax: 19, baseAttackTime: 1.35, accuracyRating: 12, criticalStrikeChance: 0.06 },
  },
  {
    id: "item.iron-greatsword", name: "Iron Greatsword", category: "weapon", rarity: "common",
    description: "A controlled two-handed iron blade. Heavy Rhythm builds through clean swings and culminates in a Perfect Swing.",
    icon: "greatsword", inventoryMode: "instance", purpose: "equipment", requiredHunterRank: 1,
    weaponProficiencyId: "two-handed-sword", requiredProficiencyLevel: 1, equipmentSlotKind: "weapon",
    weaponFamilyId: "greatsword", weaponArchetypeId: "weapon-archetype.greatsword", materialTierId: "iron", upgradeTreeId: "upgrade-tree.iron-greatsword",
    stats: { baseDamageMin: 42, baseDamageMax: 56, baseAttackTime: 3.85, accuracyRating: 5, criticalStrikeChance: 0.03, criticalStrikeMultiplier: 0.15 },
  },
  {
    id: "item.iron-great-axe", name: "Iron Great Axe", category: "weapon", rarity: "common",
    description: "A brutal two-handed iron axe. It grows deadlier against weakened targets and critical hits trigger Bloodlust.",
    icon: "great-axe", inventoryMode: "instance", purpose: "equipment", requiredHunterRank: 1,
    weaponProficiencyId: "two-handed-axe", requiredProficiencyLevel: 1, equipmentSlotKind: "weapon",
    weaponFamilyId: "great-axe", weaponArchetypeId: "weapon-archetype.executioner-great-axe", materialTierId: "iron", upgradeTreeId: "upgrade-tree.iron-great-axe",
    stats: { baseDamageMin: 46, baseDamageMax: 62, baseAttackTime: 4.25, accuracyRating: -4, criticalStrikeChance: 0.05, criticalStrikeMultiplier: 0.30 },
  },
  {
    id: "item.iron-warhammer", name: "Iron Warhammer", category: "weapon", rarity: "common",
    description: "A massive iron warhammer. Repeated blows Shatter defenses and build toward a devastating Charged Impact.",
    icon: "warhammer", inventoryMode: "instance", purpose: "equipment", requiredHunterRank: 1,
    weaponProficiencyId: "two-handed-hammer", requiredProficiencyLevel: 1, equipmentSlotKind: "weapon",
    weaponFamilyId: "warhammer", weaponArchetypeId: "weapon-archetype.great-warhammer", materialTierId: "iron", upgradeTreeId: "upgrade-tree.iron-warhammer",
    stats: { baseDamageMin: 52, baseDamageMax: 68, baseAttackTime: 4.80, accuracyRating: -6 },
  },
  {
    id: "item.iron-spear", name: "Iron Spear", category: "weapon", rarity: "common",
    description: "A precise iron hunting spear. Clean strikes Mark the target, build Precision, and create Counter-Thrust opportunities.",
    icon: "spear", inventoryMode: "instance", purpose: "equipment", requiredHunterRank: 1,
    weaponProficiencyId: "spear", requiredProficiencyLevel: 1, equipmentSlotKind: "weapon",
    weaponFamilyId: "spear", weaponArchetypeId: "weapon-archetype.hunting-spear", materialTierId: "iron", upgradeTreeId: "upgrade-tree.iron-spear",
    stats: { baseDamageMin: 31, baseDamageMax: 41, baseAttackTime: 2.90, accuracyRating: 12, criticalStrikeChance: 0.04 },
  },
  {
    id: "item.iron-bar", name: "Iron Bar", category: "material", rarity: "common",
    description: "A refined iron bar smelted from Iron Ore and used to smith Iron equipment.",
    icon: "cube", inventoryMode: "stackable", purpose: "crafting",
  },
  { id: "item.worn-pickaxe", name: "Worn Pickaxe", category: "tool", rarity: "common", description: "A battered starter pickaxe. Crude, but enough to begin working an Iron Vein.", icon: "pickaxe", inventoryMode: "instance", purpose: "equipment", equipmentSlotKind: "tool", professionToolKind: "pickaxe", requiredProfessionSkillId: "mining", requiredProfessionLevel: 1, professionToolStats: { miningDamage: 10 } },
  { id: "item.iron-pickaxe", name: "Iron Pickaxe", category: "tool", rarity: "common", description: "A reliable iron pickaxe with a stronger head that removes more material with every swing.", icon: "pickaxe", inventoryMode: "instance", purpose: "equipment", equipmentSlotKind: "tool", materialTierId: "iron", professionToolKind: "pickaxe", requiredProfessionSkillId: "mining", requiredProfessionLevel: 10, professionToolStats: { miningDamage: 18 } },
  { id: "item.healing-potion", name: "Healing Potion", category: "consumable", rarity: "common", description: "Restores health during combat.", icon: "cross", inventoryMode: "stackable", purpose: "consumable" },
  { id: "item.wolf-fang", name: "Wolf Fang", category: "material", rarity: "common", description: "A hardened wolf fang used in weapon crafting.", icon: "target", inventoryMode: "stackable", purpose: "crafting" },
  { id: "item.wolf-pelt", name: "Wolf Pelt", category: "material", rarity: "common", description: "A wolf pelt intended for future sale only.", icon: "cube", inventoryMode: "stackable", purpose: "sell-only" },
  { id: "item.bandit-scrap", name: "Bandit Scrap", category: "material", rarity: "common", description: "Recovered from a bandit camp.", icon: "cube", inventoryMode: "stackable" },
  { id: "item.coin-pouch", name: "Coin Pouch", category: "currency", rarity: "uncommon", description: "A small purse of prototype gold.", icon: "coin", inventoryMode: "stackable" },
  ...deepWoodsItemDefinitions,
];

export const itemDefinitions = deepFreeze<ItemDefinition[]>(authoredItemDefinitions);
export const itemById = Object.fromEntries(itemDefinitions.map((item) => [item.id, item])) as Record<string, ItemDefinition>;
export const equipmentDefinitions = itemDefinitions.filter((item) => Boolean(item.equipmentSlotKind));
