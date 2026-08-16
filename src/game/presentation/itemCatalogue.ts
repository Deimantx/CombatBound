import { itemById, type ItemDefinition } from "../data/items";
import {
  buildItemTaxonomy,
  findItemTaxonomyNode,
  itemDefinitionSearchText,
  weaponCatalogueByProficiencyId,
  type ItemTaxonomyNode,
} from "./itemTaxonomy";

/** Compatibility shape for older catalogue consumers. New UI uses ItemTaxonomyNode. */
export interface ItemCatalogueNode {
  id: string;
  label: string;
  icon: string;
  items: ItemDefinition[];
  children: ItemCatalogueNode[];
}

export { weaponCatalogueByProficiencyId };

function asLegacyNode(node: ItemTaxonomyNode, id = node.id.replace(/^items/, "debug.items")): ItemCatalogueNode {
  return {
    id,
    label: node.label,
    icon: node.icon ?? "cube",
    items: node.children.length ? [] : node.definitionIds.map((definitionId) => itemById[definitionId]).filter(Boolean),
    children: node.children.map((child) => asLegacyNode(child)),
  };
}

function legacyArmorTree(root: ItemTaxonomyNode) {
  const armor = findItemTaxonomyNode(root, "items.equipment.armor");
  if (!armor) return undefined;
  const weights = armor.children.filter((child) => child.id !== "items.equipment.armor.unclassified");
  const slots = ["head", "armor", "gloves", "boots"] as const;
  const slotLabels = { head: "Head", armor: "Armor", gloves: "Gloves", boots: "Boots" };
  const slotNodes = slots.map((slot): ItemCatalogueNode | null => {
    const weightChildren = weights.map((weight) => {
      const leaf = weight.children.find((child) => child.id.endsWith(`.${slot}`));
      return leaf ? asLegacyNode(leaf, `debug.items.equipment.armor.${slot}.${weight.id.split(".").at(-1)}`) : null;
    }).filter((child): child is ItemCatalogueNode => Boolean(child));
    return weightChildren.length ? { id: `debug.items.equipment.armor.${slot}`, label: slotLabels[slot], icon: "shield", items: [], children: weightChildren } : null;
  }).filter((child): child is ItemCatalogueNode => Boolean(child));
  return { id: "debug.items.equipment.armor", label: "Armor", icon: armor.icon ?? "shield", items: [], children: slotNodes };
}

export function buildItemCatalogue(items: ItemDefinition[]): ItemCatalogueNode[] {
  const root = buildItemTaxonomy(items);
  const equipment = findItemTaxonomyNode(root, "items.equipment");
  const nodes: ItemCatalogueNode[] = [];
  if (equipment) {
    const children = equipment.children.map((child) => child.id === "items.equipment.armor" ? legacyArmorTree(root) : asLegacyNode(child));
    nodes.push({ id: "debug.items.equipment", label: "Equipment", icon: equipment.icon ?? "sword", items: [], children: children.filter((child): child is ItemCatalogueNode => Boolean(child)) });
  }
  for (const id of ["items.consumables", "items.materials", "items.currency"]) {
    const category = findItemTaxonomyNode(root, id);
    if (category) nodes.push(asLegacyNode(category));
  }
  return nodes;
}

export function itemSearchText(item: ItemDefinition) {
  return itemDefinitionSearchText(item);
}

export function nodeItemCount(node: ItemCatalogueNode): number {
  return node.items.length + node.children.reduce((sum, child) => sum + nodeItemCount(child), 0);
}

export function nodeMatchesSearch(node: ItemCatalogueNode, query: string): boolean {
  if (!query) return true;
  return node.items.some((item) => itemSearchText(item).includes(query)) || node.children.some((child) => nodeMatchesSearch(child, query));
}
