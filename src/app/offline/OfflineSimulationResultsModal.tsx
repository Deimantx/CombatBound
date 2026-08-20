import { BarChart3, Coins, Package, Swords, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { PlaceholderArt } from "../components/PlaceholderArt";
import { combatLocationById } from "../../game/data/world/combatLocations";
import { itemById } from "../../game/data/items";
import { formatDuration } from "../../game/profiles/profileFormatting";
import { perHour } from "../../game/offline/offlineResultMetrics";
import type { CombatHuntOfflineSummary } from "../../game/offline/offlineCombatSimulation";
import { useGameStore } from "../../state/gameStore";
import { useOfflineActivityRuntimeStore } from "../../state/offlineActivityRuntimeStore";

function resultLabel(reason: string): string {
  switch (reason) {
    case "requested-time-complete": return "Time Complete";
    case "death": return "Hunter Defeated";
    case "activity-ended": return "Activity Ended";
    case "requirements-lost": return "Requirements Lost";
    default: return "Simulation Invalid";
  }
}

function rateText(amount: number, requestedSeconds: number, decimals = 0): string {
  const rate = perHour(amount, requestedSeconds);
  return `${rate.toLocaleString(undefined, { maximumFractionDigits: decimals })}/h`;
}

export function OfflineSimulationResultsModal() {
  const activeProfileId = useGameStore((state) => state.activeProfileId);
  const runtime = useOfflineActivityRuntimeStore();
  const closeResults = runtime.closeResults;
  const continueRef = useRef<HTMLButtonElement>(null);
  const result = runtime.lastResult?.profileId === activeProfileId ? runtime.lastResult : null;
  const simulation = result?.simulation;
  const summary = simulation?.summary as CombatHuntOfflineSummary | undefined;
  const state = simulation?.state as { combat?: { combatLocationId?: string | null; inventory?: unknown } } | undefined;
  const location = state?.combat?.combatLocationId ? combatLocationById[state.combat.combatLocationId] : undefined;

  const lootRows = useMemo(() => {
    if (!summary) return [];
    return Object.entries(summary.lootGained)
      .map(([itemId, quantity]) => ({ definition: itemById[itemId], quantity }))
      .filter((entry): entry is { definition: NonNullable<typeof entry.definition>; quantity: number } => Boolean(entry.definition) && entry.quantity > 0)
      .sort((a, b) => {
        const equipmentA = ["weapon", "armor", "accessory"].includes(a.definition.category) ? 1 : 0;
        const equipmentB = ["weapon", "armor", "accessory"].includes(b.definition.category) ? 1 : 0;
        return equipmentB - equipmentA || b.quantity - a.quantity || a.definition.name.localeCompare(b.definition.name);
      });
  }, [summary]);

  useEffect(() => {
    if (!runtime.resultsOpen || !result) return;
    continueRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeResults();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeResults, result, runtime.resultsOpen]);

  if (!runtime.resultsOpen || !result || !simulation || !summary) return null;

  return (
    <div className="dialog-backdrop offline-results-backdrop" role="presentation" data-debug-kind="offline-results-backdrop">
      <div className="offline-results-modal" role="dialog" aria-modal="true" aria-labelledby="offline-results-title" data-debug-kind="offline-results-modal">
        <header className="offline-results-header">
          <div>
            <span className="eyebrow">TIME SKIP RESULTS</span>
            <h2 id="offline-results-title">{location?.name ?? "Combat Hunt"}</h2>
            <p>{formatDuration(simulation.requestedSeconds)} skipped</p>
          </div>
          <button type="button" className="icon-button" aria-label="Close results" onClick={closeResults}>
            <X size={17} />
          </button>
        </header>

        <div className={`offline-results-outcome outcome-${simulation.stopReason}`} data-debug-kind="offline-results-outcome">
          <Trophy size={18} />
          <div><span className="eyebrow">RESULT</span><strong>{resultLabel(simulation.stopReason)}</strong></div>
        </div>

        <div className="offline-results-time-grid" data-debug-kind="offline-results-time-summary">
          <div><span>Time Skipped</span><strong>{formatDuration(simulation.bankSpentSeconds)}</strong></div>
          <div><span>Active Activity Time</span><strong>{formatDuration(simulation.activitySeconds)}</strong></div>
          <div><span>Wasted Time</span><strong className={simulation.wastedSeconds > 0 ? "text-warning" : ""}>{formatDuration(simulation.wastedSeconds)}</strong></div>
        </div>

        <div className="offline-results-body">
          <div className="offline-results-column">
            <section className="offline-results-section" data-debug-kind="offline-results-progression">
              <div className="offline-results-section-heading"><BarChart3 size={15} /><h3>Combat Progression</h3></div>
              <div className="offline-results-table-wrap">
                <table className="offline-results-table">
                  <thead><tr><th>Skill</th><th>XP Gained</th><th>XP / Hour</th><th>Level</th></tr></thead>
                  <tbody>{summary.progressionRows.map((row) => <tr key={row.progressionId} className={row.xpGained === 0 ? "result-row-muted" : ""}>
                    <td>{row.name}</td><td>+{Math.floor(row.xpGained).toLocaleString()} XP</td><td>{Math.floor(row.xpPerHour).toLocaleString()}</td><td>{row.levelBefore} → {row.levelAfter}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </section>

            <section className="offline-results-section" data-debug-kind="offline-results-combat-summary">
              <div className="offline-results-section-heading"><Swords size={15} /><h3>Combat Summary</h3></div>
              <div className="offline-results-stat-grid">
                <div><span>Enemies Defeated</span><strong>{summary.enemiesDefeated.toLocaleString()} <small>{rateText(summary.enemiesDefeated, simulation.requestedSeconds, 1)}</small></strong></div>
                <div><span>Damage Dealt</span><strong>{Math.floor(summary.damageDealt).toLocaleString()}</strong></div>
                <div><span>Damage Taken</span><strong>{Math.floor(summary.damageTaken).toLocaleString()}</strong></div>
                <div><span>Healing</span><strong>{Math.floor(summary.healing).toLocaleString()}</strong></div>
                <div><span>Highest Hit</span><strong>{Math.floor(summary.highestHit).toLocaleString()}</strong></div>
              </div>
            </section>
          </div>

          <div className="offline-results-column">
            <section className="offline-results-section" data-debug-kind="offline-results-gold">
              <div className="offline-results-section-heading"><Coins size={15} /><h3>Gold</h3></div>
              <div className="offline-results-highlight"><strong>+{summary.gold.toLocaleString()}</strong><span>{rateText(summary.gold, simulation.requestedSeconds)} Gold / Hour</span></div>
            </section>

            <section className="offline-results-section" data-debug-kind="offline-results-loot">
              <div className="offline-results-section-heading"><Package size={15} /><h3>Loot</h3><span className="offline-results-count">{lootRows.length} types</span></div>
              {lootRows.length === 0 ? <p className="muted-copy">No items gained during this skip.</p> : <div className="offline-results-loot-list">{lootRows.map(({ definition, quantity }) => <div className="offline-results-loot-row" key={definition.id}>
                <PlaceholderArt icon={definition.icon} label="" size="small" variant={definition.rarity === "rare" ? "gold" : definition.rarity === "uncommon" ? "blue" : "muted"} />
                <span><strong>{definition.name}</strong><small>{definition.category}</small></span><b>×{quantity.toLocaleString()}</b>
              </div>)}</div>}
            </section>
          </div>
        </div>

        <footer className="offline-results-footer"><small>Rates use the full skipped duration, including wasted time.</small><button ref={continueRef} type="button" className="button button-primary" onClick={closeResults}>CONTINUE</button></footer>
      </div>
    </div>
  );
}
