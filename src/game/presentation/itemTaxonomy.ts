import { itemById } from "../data/items";
import { proficiencyById } from "../data/proficiencies";
import type { ItemDefinition } from "../data/items";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { WeaponProficiencyId } from "../progression/progressionTypes";

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
} satisfies Record<WeaponProficiencyId, { handling: "one-handed" | "two-handed" | "ranged"; family: string; label: string }>;

export interface ItemTaxonomyNode {
  id: string;
  label: string;
  icon?: string;
  children: ItemTaxonomyNode[];
  definitionIds: string[];
}

type TaxonomySpec = { id: string; label: string; icon?: string; definitions?: ItemDefinition[]; children?: Array<TaxonomySpec | null> };

function node(spec: TaxonomySpec): ItemTaxonomyNode {
  const children = (spec.children ?? []).filter((child): child is TaxonomySpec => Boolean(child)).map(node);
  const directIds = (spec.definitions ?? []).map((definition) => definition.id);
  const definitionIds = [...new Set([...directIds, ...children.flatMap((child) => child.definitionIds)])];
  return { id: spec.id, label: spec.label, ...(spec.icon ? { icon: spec.icon } : {}), children, definitionIds };
}

function leaf(id: string, label: string, definitions: ItemDefinition[], icon?: string) {
  return definitions.length ? { id, label, icon: icon ?? definitions[0]?.icon, definitions } : null;
}

function branch(id: string, label: string, children: Array<TaxonomySpec | null>, icon?: string) {
  return children.some(Boolean) ? { id, label, icon, children } : null;
}

function categoryRoot(id: string, label: string, definitions: ItemDefinition[], icon: string) {
  return definitions.length ? branch(id, label, definitions.map((definition) => leaf(`${id}.${definition.id}`, definition.name, [definition], definition.icon)), icon) : null;
}

function equipmentTaxonomy(items: ItemDefinition[]) {
  const equipment = items.filter((item) => Boolean(item.equipmentSlotKind));
  const weapons = equipment.filter((item) => item.equipmentSlotKind === "weapon");
  const weaponFamilies = (handling: "one-handed" | "two-handed" | "ranged") => Object.entries(weaponCatalogueByProficiencyId)
    .filter(([, taxonomy]) => taxonomy.handling === handling)
    .map(([proficiencyId, taxonomy]) => leaf(
      `items.equipment.weapons.${handling}.${taxonomy.family}`,
      taxonomy.label,
      weapons.filter((item) => item.weaponProficiencyId === proficiencyId),
      weapons.find((item) => item.weaponProficiencyId === proficiencyId)?.icon,
    ));
  const otherWeapons = weapons.filter((item) => !item.weaponProficiencyId || !weaponCatalogueByProficiencyId[item.weaponProficiencyId]);

  const offhands = equipment.filter((item) => item.equipmentSlotKind === "offhand");
  const armor = equipment.filter((item) => ["head", "armor", "gloves", "boots"].includes(item.equipmentSlotKind ?? ""));
  const armorSlots: Array<{ kind: "head" | "armor" | "gloves" | "boots"; label: string }> = [
    { kind: "head", label: "Head" }, { kind: "armor", label: "Body" }, { kind: "gloves", label: "Gloves" }, { kind: "boots", label: "Boots" },
  ];
  const armorWeights: Array<{ id: "light-armor" | "medium-armor" | "heavy-armor"; label: string }> = [
    { id: "light-armor", label: "Light Armor" }, { id: "medium-armor", label: "Medium Armor" }, { id: "heavy-armor", label: "Heavy Armor" },
  ];
  const armorWeightBranches = armorWeights.map((weight) => branch(
    `items.equipment.armor.${weight.id}`,
    weight.label,
    armorSlots.map((slot) => leaf(
      `items.equipment.armor.${weight.id}.${slot.kind}`,
      slot.label,
      armor.filter((item) => item.defensiveProficiencyId === weight.id && item.equipmentSlotKind === slot.kind),
      armor.find((item) => item.defensiveProficiencyId === weight.id && item.equipmentSlotKind === slot.kind)?.icon,
    )),
    armor.find((item) => item.defensiveProficiencyId === weight.id)?.icon,
  ));
  const unclassifiedArmor = armor.filter((item) => !armorWeights.some((weight) => item.defensiveProficiencyId === weight.id));
  const accessories: Array<{ kind: "necklace" | "ring" | "earring" | "belt" | "cape"; label: string }> = [
    { kind: "necklace", label: "Necklaces" }, { kind: "ring", label: "Rings" }, { kind: "earring", label: "Earrings" }, { kind: "belt", label: "Belts" }, { kind: "cape", label: "Capes" },
  ];
  const accessoryItems = equipment.filter((item) => accessories.some((accessory) => accessory.kind === item.equipmentSlotKind));

  return branch("items.equipment", "Equipment", [
    branch("items.equipment.weapons", "Weapons", [
      branch("items.equipment.weapons.one-handed", "One-Handed", weaponFamilies("one-handed"), "sword"),
      branch("items.equipment.weapons.two-handed", "Two-Handed", weaponFamilies("two-handed"), "swords"),
      branch("items.equipment.weapons.ranged", "Ranged", weaponFamilies("ranged"), "bow"),
      leaf("items.equipment.weapons.other-weapons", "Other Weapons", otherWeapons, "sword"),
    ], "sword"),
    branch("items.equipment.offhands", "Offhands", [
      leaf("items.equipment.offhands.shields", "Shields", offhands.filter((item) => item.defensiveProficiencyId === "shield"), "shield"),
      leaf("items.equipment.offhands.other-offhands", "Other Offhands", offhands.filter((item) => item.defensiveProficiencyId !== "shield"), "shield"),
    ], "shield"),
    branch("items.equipment.armor", "Armor", [
      ...armorWeightBranches,
      leaf("items.equipment.armor.unclassified", "Unclassified", unclassifiedArmor, "shield"),
    ], "shield"),
    branch("items.equipment.accessories", "Accessories", accessories.map((accessory) => leaf(
      `items.equipment.accessories.${accessory.kind}`,
      accessory.label,
      accessoryItems.filter((item) => item.equipmentSlotKind === accessory.kind),
      accessoryItems.find((item) => item.equipmentSlotKind === accessory.kind)?.icon,
    )), "ring"),
  ], "sword");
}

export function buildItemTaxonomy(items: ItemDefinition[]): ItemTaxonomyNode {
  const roots = [
    equipmentTaxonomy(items),
    categoryRoot("items.consumables", "Consumables", items.filter((item) => item.category === "consumable"), "cross"),
    categoryRoot("items.materials", "Materials", items.filter((item) => item.category === "material"), "cube"),
    categoryRoot("items.currency", "Currency", items.filter((item) => item.category === "currency"), "coin"),
  ];
  return node({ id: "items", label: "Items", icon: "cube", children: roots });
}

export function findItemTaxonomyNode(root: ItemTaxonomyNode, id: string): ItemTaxonomyNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findItemTaxonomyNode(child, id);
    if (found) return found;
  }
  return undefined;
}

export function getDefinitionIdsUnderNode(root: ItemTaxonomyNode, id: string) {
  return new Set(findItemTaxonomyNode(root, id)?.definitionIds ?? []);
}

export function getItemTaxonomyPath(root: ItemTaxonomyNode, id: string): ItemTaxonomyNode[] {
  if (root.id === id) return [root];
  for (const child of root.children) {
    const path = getItemTaxonomyPath(child, id);
    if (path.length) return [root, ...path];
  }
  return [];
}

/**
 * Counts visible owned entries for every taxonomy node in one ownership pass.
 * Instance gear contributes one entry per copy; stackables contribute one
 * entry per non-empty stack, regardless of quantity in that stack.
 */
export function buildOwnedItemTaxonomyCounts(inventory: InventoryState, root: ItemTaxonomyNode) {
  const ownedByDefinition = new Map<string, number>();
  for (const instance of Object.values(inventory.instances)) {
    ownedByDefinition.set(instance.definitionId, (ownedByDefinition.get(instance.definitionId) ?? 0) + 1);
  }
  for (const [definitionId, quantity] of Object.entries(inventory.stackables)) {
    if (quantity > 0) ownedByDefinition.set(definitionId, 1);
  }

  const counts = new Map<string, number>();
  const visit = (current: ItemTaxonomyNode): number => {
    const count = current.children.length
      ? current.children.reduce((total, child) => total + visit(child), 0)
      : current.definitionIds.reduce((total, definitionId) => total + (ownedByDefinition.get(definitionId) ?? 0), 0);
    counts.set(current.id, count);
    return count;
  };
  visit(root);
  return counts;
}

export function filterItemTaxonomy(root: ItemTaxonomyNode, definitionIds: ReadonlySet<string>): ItemTaxonomyNode | null {
  const children = root.children.map((child) => filterItemTaxonomy(child, definitionIds)).filter((child): child is ItemTaxonomyNode => Boolean(child));
  const directIds = root.definitionIds.filter((id) => definitionIds.has(id));
  if (!children.length && !directIds.length) return null;
  return { ...root, children, definitionIds: [...new Set([...directIds, ...children.flatMap((child) => child.definitionIds)])] };
}

export function itemDefinitionSearchText(item: ItemDefinition) {
  const proficiency = item.weaponProficiencyId ? proficiencyById[item.weaponProficiencyId]?.name ?? item.weaponProficiencyId : "";
  const defensive = item.defensiveProficiencyId ? proficiencyById[item.defensiveProficiencyId]?.name ?? item.defensiveProficiencyId : "";
  return [item.id, item.name, item.description, item.category, item.equipmentSlotKind, item.rarity, item.requiredMasteryLevel, proficiency, defensive, ...Object.keys(item.stats ?? {}), ...Object.values(item.stats ?? {})].join(" ").toLowerCase();
}

export function itemTaxonomyNodeCount(node: ItemTaxonomyNode) {
  return node.definitionIds.length;
}

export function itemTaxonomyNodeMatchesSearch(node: ItemTaxonomyNode, query: string, definitions: Record<string, ItemDefinition> = itemById) {
  if (!query) return true;
  return node.definitionIds.some((id) => itemDefinitionSearchText(definitions[id]).includes(query));
}
