import type { ItemDefinition } from "../data/items";
import { itemUpgradeNodeById } from "../data/gear/itemUpgradeTrees";
import type { ItemInstance, ItemStats, ItemStatContribution } from "./itemTypes";

function cloneStats(stats: ItemStats | undefined): ItemStats { return { ...(stats ?? {}) }; }

function applyLocalContributions(stats: ItemStats, contributions: ItemStatContribution[]) {
  for (const target of ["physicalDamage", "attackSpeed", "criticalChance"] as const) {
    const entries = contributions.filter((entry) => entry.scope === "local" && entry.target === target);
    if (!entries.length) continue;
    const flats = entries.filter((entry) => entry.operation === "flat").reduce((sum, entry) => sum + entry.value, 0);
    const increased = entries.filter((entry) => entry.operation === "increased").reduce((sum, entry) => sum + entry.value, 0);
    const more = entries.filter((entry) => entry.operation === "more").reduce((product, entry) => product * (1 + entry.value), 1);
    const multiplier = (1 + increased) * more;
    if (target === "physicalDamage") {
      if (stats.baseDamageMin !== undefined) stats.baseDamageMin = (stats.baseDamageMin + flats) * multiplier;
      if (stats.baseDamageMax !== undefined) stats.baseDamageMax = (stats.baseDamageMax + flats) * multiplier;
    } else if (target === "attackSpeed") {
      if (stats.baseAttackTime !== undefined) stats.baseAttackTime = (stats.baseAttackTime + flats) / multiplier;
    } else if (stats.criticalStrikeChance !== undefined) {
      stats.criticalStrikeChance = (stats.criticalStrikeChance + flats) * multiplier;
    }
  }
}

function applyGlobalContributions(stats: ItemStats, contributions: ItemStatContribution[]) {
  for (const contribution of contributions) {
    if (contribution.scope !== "global" || contribution.operation !== "flat") continue;
    const target = contribution.target as keyof ItemStats;
    stats[target] = (stats[target] ?? 0) + contribution.value;
  }
}

export function resolveItemStats(definition: ItemDefinition, instance: ItemInstance) {
  const baseStats = cloneStats(definition.stats);
  const contributions: ItemStatContribution[] = [];
  for (const nodeId of instance.unlockedUpgradeNodeIds ?? []) {
    const node = itemUpgradeNodeById[nodeId];
    if (!node) continue;
    for (const effect of node.effects) {
      if (effect.type === "localStat") contributions.push({ sourceType: "upgrade-node", sourceId: node.id, sourceLabel: node.name, scope: "local", target: effect.target, operation: effect.operation, value: effect.value });
      else if (effect.type === "globalStat") contributions.push({ sourceType: "upgrade-node", sourceId: node.id, sourceLabel: node.name, scope: "global", target: effect.stat, operation: effect.operation, value: effect.value });
    }
  }
  const effectiveStats = cloneStats(baseStats);
  applyLocalContributions(effectiveStats, contributions);
  applyGlobalContributions(effectiveStats, contributions);
  return { baseStats, effectiveStats, contributions };
}
