import { itemById } from "../data/items";
import { calculateHunterCombatStats, type HunterCombatStats } from "../equipment/derivedStats";
import { getEquippedItems } from "../equipment/defensiveEquipment";
import type { CombatStatKey } from "../combat/combatTypes";
import type { GameState } from "../gameState";

export interface StatContribution {
  sourceType: "base" | "equipment" | "perk" | "stance" | "technique" | "effect" | "derived";
  sourceId: string;
  label: string;
  operation: "flat" | "addPercent" | "multiply" | "remainder";
  before: number;
  amount: number;
  after: number;
}

export interface StatBreakdown {
  stat: CombatStatKey;
  finalValue: number;
  contributions: StatContribution[];
}

function itemStat(item: ReturnType<typeof getEquippedItems>[number], stat: CombatStatKey) {
  if (stat === "attackPower") return (item.stats?.attackPower ?? 0) + (item.stats?.attack ?? 0);
  if (stat === "armor") return (item.stats?.armor ?? 0) + (item.stats?.defense ?? 0);
  return item.stats?.[stat as keyof NonNullable<typeof item.stats>] ?? 0;
}

export function buildStatBreakdown(game: GameState, stat: CombatStatKey): StatBreakdown {
  const finalValue = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques)[stat] as number;
  const contributions: StatContribution[] = [];
  let directTotal = 0;
  for (const [slot, itemId] of Object.entries(game.equipment.slots)) {
    const item = itemId ? itemById[itemId] : undefined;
    const amount = item ? itemStat(item, stat) : 0;
    if (!item || !amount) continue;
    directTotal += amount;
    contributions.push({ sourceType: "equipment", sourceId: `${slot}:${item.id}`, label: `${item.name} (${slot})`, operation: "flat", before: 0, amount, after: 0 });
  }
  for (const [perkId, rank] of Object.entries(game.progression.purchasedPerks)) {
    if (rank > 0) contributions.push({ sourceType: "perk", sourceId: perkId, label: `${perkId} rank ${rank}`, operation: "remainder", before: 0, amount: 0, after: 0 });
  }
  for (const techniqueId of Object.entries(game.combat.techniques).filter(([, enabled]) => enabled).map(([id]) => id))
    contributions.push({ sourceType: "technique", sourceId: techniqueId, label: `${techniqueId} technique`, operation: "remainder", before: 0, amount: 0, after: 0 });
  for (const effect of game.combat.playerEffects)
    contributions.push({ sourceType: "effect", sourceId: effect.effectId, label: `${effect.effectId} active effect`, operation: "remainder", before: 0, amount: 0, after: 0 });
  const base = finalValue - directTotal;
  let current = base;
  for (const contribution of contributions) {
    contribution.before = current;
    current += contribution.amount;
    contribution.after = current;
  }
  if (game.combat.stance !== "mid") contributions.push({ sourceType: "stance", sourceId: game.combat.stance, label: `${game.combat.stance} stance and canonical modifiers`, operation: "remainder", before: current, amount: finalValue - current, after: finalValue });
  else if (current !== finalValue) contributions.push({ sourceType: "derived", sourceId: "canonical-derived-stats", label: "Canonical derived modifiers", operation: "remainder", before: current, amount: finalValue - current, after: finalValue });
  return { stat, finalValue, contributions: [{ sourceType: "base", sourceId: "combat-balance", label: "Combat base and normalized defaults", operation: "flat", before: 0, amount: base, after: base }, ...contributions] };
}

export function buildAllStatBreakdowns(game: GameState): Record<CombatStatKey, StatBreakdown> {
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques);
  const keys = Object.keys(stats).filter((key): key is CombatStatKey => key !== "resistances" && key !== "attack" && key !== "defense" && key !== "dodge" && key !== "parry" && key !== "block" && key !== "weaponProficiencyId");
  return Object.fromEntries(keys.map((key) => [key, buildStatBreakdown(game, key)])) as Record<CombatStatKey, StatBreakdown>;
}

export type { HunterCombatStats };
