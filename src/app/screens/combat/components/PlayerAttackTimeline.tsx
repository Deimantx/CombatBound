import { Swords } from "lucide-react";
import type { CombatMatchupView } from "../../../../game/combat/combatSelectors";
import type { EnemyCombatInstance } from "../../../../game/combat/combatTypes";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import { ProgressBar } from "../../../components/ProgressBar";
import { combatTimerLabel, formatPercent, useSmoothCombatProgress } from "./combatUi";

export function PlayerAttackTimeline({ phase, timer, interval, selectedEnemy, matchup, stats }: { phase: "inactive" | "active" | "recovery" | "defeat" | "stopped"; timer: number; interval: number; selectedEnemy?: EnemyCombatInstance; matchup?: CombatMatchupView; stats: HunterCombatStats }) {
  const progress = useSmoothCombatProgress(timer, interval);
  return <div className="player-attack-progress" data-debug-kind="player-attack">
    <div className="player-attack-heading"><span><Swords size={11} /> YOUR ATTACK</span><strong>{phase === "active" ? combatTimerLabel(timer, interval) : phase === "recovery" ? "Paused during recovery" : "Waiting for target"}</strong></div>
    <ProgressBar value={phase === "active" ? progress.value : 0} variant="attack" className={`player-attack-bar ${progress.isResetting ? "is-attack-resetting" : ""}`} ariaLabel="Player attack progress" />
    <small>{selectedEnemy && !selectedEnemy.defeated ? `Target: ${selectedEnemy.displayName} - Hit ${matchup ? formatPercent(matchup.playerHitChance) : "-"} - Crit ${matchup ? formatPercent(matchup.playerCritChance) : formatPercent(stats.criticalStrikeChance ?? 0)}` : "Select an enemy target"}</small>
    {matchup && <div className="combat-matchup-quick" data-debug-kind="combat-matchup-quick"><span>YOUR HIT <strong>{formatPercent(matchup.playerHitChance)}</strong></span><span>THEIR HIT <strong>{formatPercent(matchup.enemyHitChance)}</strong></span></div>}
    {selectedEnemy && <span className="sr-only"><ProgressBar value={(selectedEnemy.currentHealth / selectedEnemy.maxHealth) * 100} variant="health" ariaLabel={`Selected target ${selectedEnemy.displayName} health`} /></span>}
  </div>;
}
