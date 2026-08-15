import type { ItemDefinition } from "../data/items";
import type { EquipmentSlotKind } from "../equipment/equipmentTypes";
import type { WeaponProficiencyId } from "../progression/progressionTypes";
import { proficiencyById } from "../data/proficiencies";

export interface ItemCatalogueNode {
  id: string;
  label: string;
  icon: string;
  items: ItemDefinition[];
  children: ItemCatalogueNode[];
}

interface WeaponTaxonomyEntry {
  handling: "one-handed" | "two-handed" | "ranged";
  family: string;
  label: string;
}

export const weaponCatalogueByProficiencyId = {
  "one-handed-sword": { handling: "one-handed", family: "one-handed-swords", label: "One-Handed Swords" },
  "one-handed-axe": { handling: "one-handed", family: "one-handed-axes", label: "One-Handed Axes" },
  "one-handed-mace": { handling: "one-handed", family: "one-handed-maces", label: "One-Handed Maces" },
  dagger: { handling: "one-handed", family: "daggers", label: "Daggers" },
  "two-handed-sword": { handling: "two-handed", family: "two-handed-swords", label: "Two-Handed Swords" },
  "two-handed-axe": { handling: "two-handed", family: "two-handed-axes", label: "Two-Handed Axes" },
  "two-handed-hammer": { handling: "two-handed", family: "two-handed-hammers", label: "Two-Handed Hammers" },
  spear: { handling: "two-handed", family: "spears", label: "Spears" },
  shortbow: { handling: "ranged", family: "shortbows", label: "Shortbows" },
  longbow: { handling: "ranged", family: "longbows", label: "Longbows" },
  crossbow: { handling: "ranged", family: "crossbows", label: "Crossbows" },
} satisfies Record<WeaponProficiencyId, WeaponTaxonomyEntry>;

const equipmentSlots: Array<{ slot: EquipmentSlotKind; label: string }> = [
  { slot: "head", label: "Head" },
  { slot: "armor", label: "Armor" },
  { slot: "gloves", label: "Gloves" },
  { slot: "boots", label: "Boots" },
];
const accessorySlots: Array<{ slot: EquipmentSlotKind; label: string }> = [
  { slot: "belt", label: "Belts" },
  { slot: "cape", label: "Capes" },
  { slot: "necklace", label: "Necklaces" },
  { slot: "ring", label: "Rings" },
  { slot: "earring", label: "Earrings" },
];

function leaf(id: string, label: string, items: ItemDefinition[], icon = "cube"): ItemCatalogueNode | null {
  return items.length ? { id, label, icon, items, children: [] } : null;
}

function branch(id: string, label: string, children: Array<ItemCatalogueNode | null>, icon = "cube"): ItemCatalogueNode | null {
  const present = children.filter((child): child is ItemCatalogueNode => Boolean(child));
  return present.length ? { id, label, icon, items: [], children: present } : null;
}

function equipmentTree(items: ItemDefinition[]): ItemCatalogueNode | null {
  const weapons = items.filter((item) => item.equipmentSlotKind === "weapon");
  const oneHanded = new Map<string, ItemDefinition[]>();
  const twoHanded = new Map<string, ItemDefinition[]>();
  const ranged = new Map<string, ItemDefinition[]>();
  const otherWeapons: ItemDefinition[] = [];
  for (const item of weapons) {
    const taxonomy = item.weaponProficiencyId ? weaponCatalogueByProficiencyId[item.weaponProficiencyId] : undefined;
    if (!taxonomy) {
      otherWeapons.push(item);
      continue;
    }
    const target = taxonomy.handling === "one-handed" ? oneHanded : taxonomy.handling === "two-handed" ? twoHanded : ranged;
    target.set(taxonomy.family, [...(target.get(taxonomy.family) ?? []), item]);
  }
  const weaponLeaves = (handling: "one-handed" | "two-handed" | "ranged", entries: Map<string, ItemDefinition[]>) => [...entries.entries()].map(([family, familyItems]) => {
    const proficiencyId = familyItems[0]?.weaponProficiencyId;
    const taxonomy = proficiencyId ? weaponCatalogueByProficiencyId[proficiencyId] : undefined;
    return leaf(`debug.items.equipment.weapons.${handling}.${family}`, taxonomy?.label ?? "Other Weapons", familyItems, familyItems[0]?.icon ?? "sword");
  });
  const weaponGroups = [
    branch("debug.items.equipment.weapons.one-handed", "One-Handed", weaponLeaves("one-handed", oneHanded), "sword"),
    branch("debug.items.equipment.weapons.two-handed", "Two-Handed", weaponLeaves("two-handed", twoHanded), "swords"),
    branch("debug.items.equipment.weapons.ranged", "Ranged", weaponLeaves("ranged", ranged), "bow"),
    leaf("debug.items.equipment.weapons.other", "Other Weapons", otherWeapons, "sword"),
  ];
  const offhands = leaf("debug.items.equipment.offhands.shields", "Shields", items.filter((item) => item.equipmentSlotKind === "offhand" && item.defensiveProficiencyId === "shield"), "shield");
  const otherOffhands = leaf("debug.items.equipment.offhands.other", "Other Offhands", items.filter((item) => item.equipmentSlotKind === "offhand" && item.defensiveProficiencyId !== "shield"), "shield");
  const armor = equipmentSlots.map(({ slot, label }) => leaf(`debug.items.equipment.armor.${slot}`, label, items.filter((item) => item.equipmentSlotKind === slot), items.find((item) => item.equipmentSlotKind === slot)?.icon));
  const accessories = accessorySlots.map(({ slot, label }) => leaf(`debug.items.equipment.accessories.${slot}`, label, items.filter((item) => item.equipmentSlotKind === slot), items.find((item) => item.equipmentSlotKind === slot)?.icon));
  return branch("debug.items.equipment", "Equipment", [
    branch("debug.items.equipment.weapons", "Weapons", weaponGroups, "sword"),
    branch("debug.items.equipment.offhands", "Offhands", [offhands, otherOffhands], "shield"),
    branch("debug.items.equipment.armor", "Armor", armor, "shield"),
    branch("debug.items.equipment.accessories", "Accessories", accessories, "ring"),
  ], "sword");
}

export function buildItemCatalogue(items: ItemDefinition[]): ItemCatalogueNode[] {
  const nodes: ItemCatalogueNode[] = [];
  const equipment = equipmentTree(items.filter((item) => Boolean(item.equipmentSlotKind)));
  if (equipment) nodes.push(equipment);
  for (const category of ["consumable", "material", "currency"] as const) {
    const categoryItems = items.filter((item) => item.category === category);
    const label = category === "consumable" ? "Consumables" : category === "material" ? "Materials" : "Currency";
    const node = leaf(`debug.items.${category}`, label, categoryItems, category === "currency" ? "coin" : "cube");
    if (node) nodes.push(node);
  }
  return nodes;
}

export function itemSearchText(item: ItemDefinition): string {
  const proficiency = item.weaponProficiencyId ? proficiencyById[item.weaponProficiencyId]?.name ?? item.weaponProficiencyId : "";
  const defensive = item.defensiveProficiencyId ? proficiencyById[item.defensiveProficiencyId]?.name ?? item.defensiveProficiencyId : "";
  return [item.id, item.name, item.description, item.category, item.equipmentSlotKind, item.rarity, item.requiredMasteryLevel, proficiency, defensive, ...Object.keys(item.stats ?? {}), ...Object.values(item.stats ?? {})].join(" ").toLowerCase();
}

export function nodeItemCount(node: ItemCatalogueNode): number {
  return node.items.length + node.children.reduce((sum, child) => sum + nodeItemCount(child), 0);
}

export function nodeMatchesSearch(node: ItemCatalogueNode, query: string): boolean {
  if (!query) return true;
  return node.items.some((item) => itemSearchText(item).includes(query)) || node.children.some((child) => nodeMatchesSearch(child, query));
}
