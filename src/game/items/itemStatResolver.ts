import type { ItemDefinition } from "../data/items";
import { itemAffixById } from "../data/itemAffixes";
import type {
  ItemAffixDefinition,
  ItemStatContribution,
  LocalItemModifierTarget,
} from "./itemModifierTypes";
import type { ItemInstance, ItemStats } from "./itemTypes";
import { itemQualityContributions } from "./itemQuality";
import { itemUpgradeContributions } from "./itemUpgradeRules";

function cloneStats(stats: ItemStats | undefined): ItemStats {
  return { ...(stats ?? {}) };
}

function applyLocalContributions(stats: ItemStats, contributions: ItemStatContribution[]) {
  const targets: LocalItemModifierTarget[] = ["physicalDamage", "attackSpeed", "criticalChance", "armour", "evasion"];
  for (const target of targets) {
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
    } else if (target === "criticalChance") {
      if (stats.baseCritChance !== undefined) stats.baseCritChance = (stats.baseCritChance + flats) * multiplier;
    } else if (target === "armour") {
      if (stats.armour !== undefined) stats.armour = (stats.armour + flats) * multiplier;
    } else if (stats.evasionRating !== undefined) {
      stats.evasionRating = (stats.evasionRating + flats) * multiplier;
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

function affixContributions(instance: ItemInstance, definition: ItemDefinition, affixes: Record<string, ItemAffixDefinition>) {
  const contributions: ItemStatContribution[] = [];
  for (const affixInstance of instance.affixes) {
    const affix = affixes[affixInstance.affixId];
    const tier = affix?.tiers.find((entry) => entry.id === affixInstance.tierId);
    if (!affix || !tier) continue;
    for (const modifier of tier.modifiers) {
      const value = affixInstance.rolls[modifier.id];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const target = modifier.scope === "local" ? modifier.target : modifier.stat;
      contributions.push({ sourceType: "affix", sourceId: affix.id, sourceLabel: `${affix.name} (${definition.name})`, scope: modifier.scope, target, operation: modifier.operation, value });
    }
  }
  return contributions;
}

export function resolveItemStats(
  definition: ItemDefinition,
  instance: ItemInstance,
  affixes: Record<string, ItemAffixDefinition> = itemAffixById,
) {
  const baseStats = cloneStats(definition.stats);
  const contributions = [
    ...itemQualityContributions(definition, baseStats, instance.quality),
    ...itemUpgradeContributions(definition, baseStats, instance.upgradeLevel),
    ...affixContributions(instance, definition, affixes),
  ];
  const effectiveStats = cloneStats(baseStats);
  applyLocalContributions(effectiveStats, contributions);
  applyGlobalContributions(effectiveStats, contributions);
  return { baseStats, effectiveStats, contributions };
}
