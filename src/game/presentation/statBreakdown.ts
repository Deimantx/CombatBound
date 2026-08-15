import { calculateEffectiveCombatStats } from "../combat/combatStats";
import { combatBalance } from "../combat/combatBalance";
import { effectById } from "../data/effects";
import { itemById } from "../data/items";
import { calculateHunterCombatStats, type HunterCombatStats } from "../equipment/derivedStats";
import { getEquippedItems } from "../equipment/defensiveEquipment";
import type { CombatStatContribution, CombatStatKey } from "../combat/combatTypes";
import type { GameState } from "../gameState";
import { COMBAT_STAT_KEYS, DEBUG_STAT_DEFINITIONS, type DebugStatInspectionId } from "./debugStatRegistry";

export type StatBreakdownMode = "build" | "effective";
export interface StatContribution {
  stat: DebugStatInspectionId;
  sourceType: "base" | "equipment" | "perk" | "stance" | "technique" | "effect" | "other";
  sourceId: string;
  sourceLabel: string;
  operation: "flat" | "addPercent" | "multiply";
  before: number;
  value: number;
  after: number;
  /** Compatibility display alias. */
  amount: number;
  label: string;
}

export interface StatBreakdown {
  stat: DebugStatInspectionId;
  mode: StatBreakdownMode;
  finalValue: number;
  contributions: StatContribution[];
}

function itemStat(item: ReturnType<typeof getEquippedItems>[number], stat: DebugStatInspectionId) {
  if (stat.startsWith("resistance:")) return Number(item.stats?.[`${stat.slice(12)}Resistance` as keyof NonNullable<typeof item.stats>] ?? 0);
  if (stat === "attackPower") return Number(item.stats?.attackPower ?? 0) + Number(item.stats?.attack ?? 0);
  if (stat === "armor") return Number(item.stats?.armor ?? 0) + Number(item.stats?.defense ?? 0);
  return Number(item.stats?.[stat as keyof NonNullable<typeof item.stats>] ?? 0);
}

function baseStatValue(stat: DebugStatInspectionId) {
  if (stat.startsWith("resistance:")) return Number(combatBalance[`base${stat.slice(12, 13).toUpperCase()}${stat.slice(13)}Resistance` as keyof typeof combatBalance] ?? 0);
  const map: Partial<Record<CombatStatKey, number>> = { maxHealth: combatBalance.baseMaxHealth, attackPower: combatBalance.baseAttack, accuracy: combatBalance.baseAccuracy, attackInterval: combatBalance.baseAttackInterval, armor: combatBalance.baseArmor, evasion: combatBalance.baseEvasion, critChance: combatBalance.baseCritChance, critDamage: combatBalance.baseCritDamage, dodgeChance: combatBalance.baseDodgeChance, parryChance: combatBalance.baseParryChance, blockChance: combatBalance.baseBlockChance, blockPower: combatBalance.baseBlockPower, maxStamina: combatBalance.baseMaxStamina, staminaRegen: combatBalance.baseStaminaRegen, maxMana: combatBalance.baseMaxMana, manaRegen: combatBalance.baseManaRegen, statusResistance: combatBalance.baseStatusResistance, healthRegen: 0 };
  return Number(map[stat as CombatStatKey] ?? 0);
}

function readValue(stats: HunterCombatStats, stat: DebugStatInspectionId) { return Number(stat.startsWith("resistance:") ? stats.resistances[stat.slice(12) as keyof typeof stats.resistances] ?? 0 : stats[stat as CombatStatKey]); }
function readEffectiveValue(stats: ReturnType<typeof calculateEffectiveCombatStats>, stat: DebugStatInspectionId) { return Number(stat.startsWith("resistance:") ? stats.resistances[stat.slice(12) as keyof typeof stats.resistances] ?? 0 : stats[stat as CombatStatKey]); }

function pushContribution(contributions: StatContribution[], stat: DebugStatInspectionId, sourceType: StatContribution["sourceType"], sourceId: string, sourceLabel: string, operation: StatContribution["operation"], before: number, after: number) {
  const value = after - before;
  if (Math.abs(value) < 1e-9) return;
  contributions.push({ stat, sourceType, sourceId, sourceLabel, operation, before, value, after, amount: value, label: sourceLabel });
}

export function buildStatBreakdown(game: GameState, stat: DebugStatInspectionId, mode: StatBreakdownMode = game.combat.phase === "active" || game.combat.phase === "recovery" ? "effective" : "build"): StatBreakdown {
  const canonicalContributions: CombatStatContribution[] = [];
  const buildStats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques, itemById, { record: (contribution) => canonicalContributions.push(contribution) });
  const effectiveStats = calculateEffectiveCombatStats(buildStats, game.combat.playerEffects, effectById);
  const finalValue = Number(mode === "effective" ? readEffectiveValue(effectiveStats, stat) : readValue(buildStats, stat));
  const contributions: StatContribution[] = [];
  let current = baseStatValue(stat);
  pushContribution(contributions, stat, "base", "combat-balance", "Combat base", "flat", 0, current);
  for (const [slot, itemId] of Object.entries(game.equipment.slots)) {
    const item = itemId ? itemById[itemId] : undefined;
    const value = item ? itemStat(item, stat) : 0;
    if (!item || !value) continue;
    const before = current;
    current += value;
    pushContribution(contributions, stat, "equipment", `${slot}:item.${item.id}`, `${item.name} (${slot})`, "flat", before, current);
  }
  if (stat === "accuracy" && game.combat.techniques["heightened-reflexes"]) { const before = current; current += 5; pushContribution(contributions, stat, "technique", "technique.heightened-reflexes", "Heightened Reflexes", "flat", before, current); }
  if ((stat === "dodgeChance" || stat === "parryChance") && game.combat.techniques["careful-positioning"]) { const before = current; current += 0.02; pushContribution(contributions, stat, "technique", "technique.careful-positioning", "Careful Positioning", "flat", before, current); }
  const buildStageRecords = canonicalContributions.filter((entry) => entry.stat === stat && (entry.sourceType === "stance" || entry.sourceType === "perk"));
  if (buildStageRecords.length) for (const entry of buildStageRecords) { const before = current; current += entry.value; pushContribution(contributions, stat, entry.sourceType, entry.sourceId, entry.sourceLabel, entry.operation, before, current); }
  else { const buildDelta = readValue(buildStats, stat) - current; if (Math.abs(buildDelta) > 1e-9) { const before = current; current += buildDelta; pushContribution(contributions, stat, "other", "canonical-normalization", "Canonical stat normalization", "flat", before, current); } }
  if (mode === "effective") {
    let effectiveCurrent = current;
    let runningStats: ReturnType<typeof calculateEffectiveCombatStats> = buildStats;
    for (const effect of game.combat.playerEffects) {
      const definition = effectById[effect.effectId];
      if (!definition) continue;
      const next = calculateEffectiveCombatStats(runningStats, [effect], effectById);
      const after = readEffectiveValue(next, stat);
      const before = effectiveCurrent;
      effectiveCurrent = after;
      runningStats = next;
      pushContribution(contributions, stat, "effect", `effect.${effect.instanceId}`, `${definition.name} (${effect.instanceId})`, "flat", before, after);
    }
    if (Math.abs(finalValue - effectiveCurrent) > 1e-9) pushContribution(contributions, stat, "other", "effective-normalization", "Effective stat normalization", "flat", effectiveCurrent, finalValue);
  }
  if (Math.abs(finalValue - current) > 1e-9 && mode === "build") pushContribution(contributions, stat, "other", "canonical-normalization", "Canonical stat normalization", "flat", current, finalValue);
  return { stat, mode, finalValue, contributions };
}

export function buildAllStatBreakdowns(game: GameState, mode?: StatBreakdownMode): Record<DebugStatInspectionId, StatBreakdown> {
  return Object.fromEntries(DEBUG_STAT_DEFINITIONS.map((definition) => [definition.id, buildStatBreakdown(game, definition.id, mode)])) as Record<DebugStatInspectionId, StatBreakdown>;
}

export { COMBAT_STAT_KEYS };
export type { HunterCombatStats };
