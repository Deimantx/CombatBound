import { useState } from "react";
import { buildStatBreakdown } from "../../../../game/presentation/statBreakdown";
import type { CombatStatKey } from "../../../../game/combat/combatTypes";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

const stats: CombatStatKey[] = ["maxHealth", "attackPower", "accuracy", "attackInterval", "armor", "evasion", "critChance", "critDamage", "dodgeChance", "parryChance", "blockChance", "maxStamina", "maxMana"];

export function DebugStatsTab({ game }: DebugTabProps) {
  const [stat, setStat] = useState<CombatStatKey>("accuracy");
  const breakdown = buildStatBreakdown(game, stat);
  return <div className="debug-tab-content debug-column"><DebugSection title="Stat Breakdown" subtitle="Final value is read from the same canonical gameplay calculation used by Combat."><div className="debug-inline-control"><label>STAT <select value={stat} onChange={(event) => setStat(event.target.value as CombatStatKey)}>{stats.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label><strong>{breakdown.finalValue.toFixed(3)}</strong></div><div className="debug-stat-breakdown" data-debug-kind="stat-breakdown" data-debug-stat={stat} data-debug-final-value={breakdown.finalValue}>{breakdown.contributions.map((entry) => <div key={`${entry.sourceType}-${entry.sourceId}`} data-debug-kind="stat-contribution" data-debug-source-type={entry.sourceType} data-debug-source-id={entry.sourceId} data-debug-operation={entry.operation}><span>{entry.label}</span><small>{entry.before.toFixed(2)} → {entry.after.toFixed(2)} ({entry.amount >= 0 ? "+" : ""}{entry.amount.toFixed(2)})</small></div>)}</div></DebugSection></div>;
}
