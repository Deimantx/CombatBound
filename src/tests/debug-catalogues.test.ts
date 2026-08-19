
import { describe, expect, it } from "vitest";
import { effectDefinitions } from "../game/data/effects";
import { itemDefinitions } from "../game/data/items";
import { spellDefinitions } from "../game/data/spells";
import { buildCollectionGrouping, collectionNodeCount, type CollectionGroupNode } from "../game/presentation/collectionGrouping";
import { buildEffectCatalogue, classifyEffect } from "../game/presentation/effectCatalogue";
import { buildItemCatalogue, itemSearchText, nodeItemCount, type ItemCatalogueNode } from "../game/presentation/itemCatalogue";
import { buildEffectDefinitionTooltip, buildEnemyDefinitionTooltip, buildItemTooltip, buildSpellTooltip } from "../game/presentation/tooltipBuilders";
import { enemyById } from "../game/data/enemies";
import { getMagicSchoolPresentation, magicSchoolOrder } from "../game/presentation/magicSchool";

function findNode(nodes: ItemCatalogueNode[], id: string): ItemCatalogueNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children, id);
    if (child) return child;
  }
  return undefined;
}

function findWorldNode(nodes: CollectionGroupNode[], text: string): CollectionGroupNode | undefined {
  for (const node of nodes) {
    if (node.label === text) return node;
    const child = findWorldNode(node.children, text);
    if (child) return child;
  }
  return undefined;
}

describe("debug catalogue presentation", () => {
  it("derives the nested item taxonomy without losing definitions", () => {
    const nodes = buildItemCatalogue(itemDefinitions);
    expect(nodes.reduce((sum, node) => sum + nodeItemCount(node), 0)).toBe(itemDefinitions.length);
    expect(findNode(nodes, "debug.items.equipment.weapons.one-handed.one-handed-swords")?.items.map((item) => item.name)).toEqual(["Training Sword", "Hunter Sword", "Vanguard Sword"]);
    expect(findNode(nodes, "debug.items.equipment.offhands.shields")?.items).toHaveLength(3);
    expect(findNode(nodes, "debug.items.equipment.armor.head.light-armor")?.items).toHaveLength(1);
    expect(findNode(nodes, "debug.items.equipment.armor.head.medium-armor")?.items).toHaveLength(1);
    expect(findNode(nodes, "debug.items.equipment.armor.head.heavy-armor")?.items).toHaveLength(1);
    expect(findNode(nodes, "debug.items.equipment.accessories.ring")?.items.some((item) => item.name === "Ring of Precision")).toBe(true);
    expect(itemSearchText(itemDefinitions.find((item) => item.name === "Ring of Precision")!)).toContain("precision");
  });

  it("builds the canonical world hierarchy and keeps enemy source locations", () => {
    const nodes = buildCollectionGrouping();
    expect(nodes.reduce((sum, node) => sum + collectionNodeCount(node), 0)).toBe(enemyById["enemy.grey-wolf"] ? 8 : 0);
    expect(findWorldNode(nodes, "Greenvale")?.children.some((region) => region.label === "Northwood")).toBe(true);
    expect(findWorldNode(nodes, "Wolf Den")?.enemies.some((entry) => entry.enemy.name === "Grey Wolf")).toBe(true);
    expect(findWorldNode(nodes, "Bandit Camp")?.enemies.some((entry) => entry.enemy.family === "Bandits")).toBe(true);
  });

  it("classifies effect definitions and exposes static tooltip content", () => {
    expect(classifyEffect(effectDefinitions.find((effect) => effect.name === "Ignite")!)).toBe("dot");
    expect(classifyEffect(effectDefinitions.find((effect) => effect.name === "Bleed")!)).toBe("dot");
    expect(classifyEffect(effectDefinitions.find((effect) => effect.name === "Earthen Ward")!)).toBe("barriers");
    expect(classifyEffect(effectDefinitions.find((effect) => effect.name === "Crushed")!)).toBe("harmful");
    const ignite = buildEffectDefinitionTooltip(effectDefinitions.find((effect) => effect.name === "Ignite")!);
    expect(ignite.description).toContain("periodic Fire damage");
    expect(ignite.rows?.map((row) => row.label)).toEqual(expect.arrayContaining(["Kind", "Duration", "Stacking", "Persistence", "Periodic damage", "Tick interval"]));
    expect(buildEffectCatalogue(effectDefinitions).some((group) => group.id === "defense")).toBe(true);
  });

  it("uses canonical tooltip builders for item, enemy, and spell identities", () => {
    const item = itemDefinitions.find((entry) => entry.name === "Vanguard Plate")!;
    const itemTooltip = buildItemTooltip(item, { quantity: 2, hunterRank: 10, equipped: true });
    expect(itemTooltip.title).toBe("Vanguard Plate");
    expect(itemTooltip.description).toContain("heavy torso");
    expect(itemTooltip.rows?.map((row) => row.label)).toEqual(expect.arrayContaining(["Quantity", "Hunter Rank", "Max Life", "Life Regen", "Armour"]));
    const enemyTooltip = buildEnemyDefinitionTooltip(enemyById["enemy.grey-wolf"], { defeats: 3, sourceLocations: ["Wolf Den"] });
    expect(enemyTooltip.title).toBe("Grey Wolf");
    expect(enemyTooltip.rows?.map((row) => row.label)).toEqual(expect.arrayContaining(["Family", "Max Life", "Attack Damage", "Accuracy Rating", "Armour", "Evasion Rating"]));
    expect(enemyTooltip.notes?.join(" ")).toContain("Wolf Den");
    const spell = spellDefinitions.find((entry) => entry.name === "Flame Blast")!;
    const spellTooltip = buildSpellTooltip(spell);
    expect(spellTooltip.description).toContain("Ignite");
    expect(spellTooltip.rows?.map((row) => row.value).join(" ")).toContain(getMagicSchoolPresentation("fire-magic").fullLabel);
    expect(magicSchoolOrder).toEqual(["fire-magic", "water-magic", "air-magic", "earth-magic", "darkness-magic"]);
  });
});
