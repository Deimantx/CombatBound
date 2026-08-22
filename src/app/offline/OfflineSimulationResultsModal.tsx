import { BarChart3, Hammer, Coins, Package, Pickaxe, Swords, Trophy, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { PlaceholderArt } from "../components/PlaceholderArt";
import { combatLocationById } from "../../game/data/world/combatLocations";
import { itemById } from "../../game/data/items";
import { formatDuration } from "../../game/profiles/profileFormatting";
import { perHour } from "../../game/offline/offlineResultMetrics";
import type { CombatHuntOfflineSummary } from "../../game/offline/offlineCombatSimulation";
import type { MiningOfflineSummary } from "../../game/offline/miningActivity";
import type { BlacksmithingOfflineSummary } from "../../game/offline/blacksmithingActivity";
import type { OfflineActivitySimulationResult } from "../../game/offline/offlineActivityContract";
import type { GameState } from "../../game/gameState";
import { useGameStore } from "../../state/gameStore";
import { useOfflineActivityRuntimeStore } from "../../state/offlineActivityRuntimeStore";
import { isBlacksmithingOfflineSummary, isCombatHuntOfflineSummary, isMiningOfflineSummary } from "./offlineActivityTypes";

function resultLabel(reason: string): string {
  switch (reason) {
    case "requested-time-complete": return "Time Complete";
    case "death": return "Hunter Defeated";
    case "activity-ended": return "Activity Ended";
    case "requirements-lost": return "Requirements Lost";
    case "safety-limit": return "Simulation Limit Reached";
    default: return "Simulation Invalid";
  }
}

function rateText(amount: number, seconds: number, decimals = 0): string {
  const rate = perHour(amount, Math.max(1, seconds));
  return `${rate.toLocaleString(undefined, { maximumFractionDigits: decimals })}/h`;
}

function TimeSummary({ simulation }: { simulation: OfflineActivitySimulationResult<GameState, unknown> }) {
  return <div className="offline-results-time-grid" data-debug-kind="offline-results-time-summary">
    <div><span>Time Skipped</span><strong>{formatDuration(simulation.bankSpentSeconds)}</strong></div>
    <div><span>Active Activity Time</span><strong>{formatDuration(simulation.activitySeconds)}</strong></div>
    <div><span>Wasted Time</span><strong className={simulation.wastedSeconds > 0 ? "text-warning" : ""}>{formatDuration(simulation.wastedSeconds)}</strong></div>
  </div>;
}

function CloseResultsButton({ onClose }: { onClose: () => void }) {
  return <button type="button" className="icon-button offline-results-close" aria-label="Close results" onClick={onClose}><X size={17} /></button>;
}

function CombatOfflineResults({ simulation, onClose }: { simulation: OfflineActivitySimulationResult<GameState, CombatHuntOfflineSummary>; onClose: () => void }) {
  const summary = simulation.summary;
  const location = simulation.state.combat.combatLocationId ? combatLocationById[simulation.state.combat.combatLocationId] : undefined;
  const lootRows = useMemo(() => Object.entries(summary.lootGained)
    .map(([itemId, quantity]) => ({ definition: itemById[itemId], quantity }))
    .filter((entry): entry is { definition: NonNullable<typeof entry.definition>; quantity: number } => Boolean(entry.definition) && entry.quantity > 0)
    .sort((a, b) => {
      const equipmentA = ["weapon", "armor", "accessory"].includes(a.definition.category) ? 1 : 0;
      const equipmentB = ["weapon", "armor", "accessory"].includes(b.definition.category) ? 1 : 0;
      return equipmentB - equipmentA || b.quantity - a.quantity || a.definition.name.localeCompare(b.definition.name);
    }), [summary]);

  return <>
    <header className="offline-results-header"><div><span className="eyebrow">TIME SKIP RESULTS</span><h2 id="offline-results-title">{location?.name ?? "Combat Hunt"}</h2><p>{formatDuration(simulation.requestedSeconds)} skipped</p></div><CloseResultsButton onClose={onClose} /></header>
    <div className={`offline-results-outcome outcome-${simulation.stopReason}`} data-debug-kind="offline-results-outcome"><Trophy size={18} /><div><span className="eyebrow">RESULT</span><strong>{resultLabel(simulation.stopReason)}</strong></div></div>
    <TimeSummary simulation={simulation} />
    <div className="offline-results-body">
      <div className="offline-results-column">
        <section className="offline-results-section" data-debug-kind="offline-results-progression"><div className="offline-results-section-heading"><BarChart3 size={15} /><h3>Combat Progression</h3></div><div className="offline-results-table-wrap"><table className="offline-results-table"><thead><tr><th>Skill</th><th>XP Gained</th><th>XP / Hour</th><th>Level</th></tr></thead><tbody>{summary.progressionRows.map((row) => <tr key={row.progressionId} className={row.xpGained === 0 ? "result-row-muted" : ""}><td>{row.name}</td><td>+{Math.floor(row.xpGained).toLocaleString()} XP</td><td>{Math.floor(row.xpPerHour).toLocaleString()}</td><td>{row.levelBefore} -&gt; {row.levelAfter}</td></tr>)}</tbody></table></div></section>
        <section className="offline-results-section" data-debug-kind="offline-results-combat-summary"><div className="offline-results-section-heading"><Swords size={15} /><h3>Combat Summary</h3></div><div className="offline-results-stat-grid"><div><span>Enemies Defeated</span><strong>{summary.enemiesDefeated.toLocaleString()} <small>{rateText(summary.enemiesDefeated, simulation.requestedSeconds, 1)}</small></strong></div><div><span>Damage Dealt</span><strong>{Math.floor(summary.damageDealt).toLocaleString()}</strong></div><div><span>Damage Taken</span><strong>{Math.floor(summary.damageTaken).toLocaleString()}</strong></div><div><span>Healing</span><strong>{Math.floor(summary.healing).toLocaleString()}</strong></div><div><span>Highest Hit</span><strong>{Math.floor(summary.highestHit).toLocaleString()}</strong></div></div></section>
      </div>
      <div className="offline-results-column">
        <section className="offline-results-section" data-debug-kind="offline-results-gold"><div className="offline-results-section-heading"><Coins size={15} /><h3>Gold</h3></div><div className="offline-results-highlight"><strong>+{summary.gold.toLocaleString()}</strong><span>{rateText(summary.gold, simulation.requestedSeconds)} Gold / Hour</span></div></section>
        <section className="offline-results-section" data-debug-kind="offline-results-loot"><div className="offline-results-section-heading"><Package size={15} /><h3>Loot</h3><span className="offline-results-count">{lootRows.length} types</span></div>{lootRows.length === 0 ? <p className="muted-copy">No items gained during this skip.</p> : <div className="offline-results-loot-list">{lootRows.map(({ definition, quantity }) => <div className="offline-results-loot-row" key={definition.id}><PlaceholderArt icon={definition.icon} label="" size="small" variant={definition.rarity === "rare" ? "gold" : definition.rarity === "uncommon" ? "blue" : "muted"} /><span><strong>{definition.name}</strong><small>{definition.category}</small></span><b>x{quantity.toLocaleString()}</b></div>)}</div>}</section>
      </div>
    </div>
  </>;
}

function MiningOfflineResults({ simulation, onClose }: { simulation: OfflineActivitySimulationResult<GameState, MiningOfflineSummary>; onClose: () => void }) {
  const summary = simulation.summary;
  const seconds = Math.max(1, simulation.activitySeconds);
  return <>
    <header className="offline-results-header"><div><span className="eyebrow">TIME SKIP RESULTS</span><h2 id="offline-results-title">Mining / Iron Vein</h2><p>{formatDuration(simulation.requestedSeconds)} skipped</p></div><CloseResultsButton onClose={onClose} /></header>
    <div className={`offline-results-outcome outcome-${simulation.stopReason}`} data-debug-kind="offline-results-outcome"><Trophy size={18} /><div><span className="eyebrow">RESULT</span><strong>{resultLabel(simulation.stopReason)}</strong></div></div>
    <TimeSummary simulation={simulation} />
    <div className="offline-results-body" data-debug-kind="offline-results-mining">
      <div className="offline-results-column">
        <section className="offline-results-section" data-debug-kind="offline-results-mining-progression"><div className="offline-results-section-heading"><BarChart3 size={15} /><h3>Mining Progression</h3></div><div className="offline-results-stat-grid"><div><span>Mining XP</span><strong>+{Math.floor(summary.miningXp).toLocaleString()} <small>{rateText(summary.miningXp, seconds)} / hour</small></strong></div><div><span>Mining Level</span><strong>{summary.miningLevelBefore} -&gt; {summary.miningLevelAfter}</strong></div><div><span>Iron Vein Mastery XP</span><strong>+{Math.floor(summary.masteryXp).toLocaleString()} <small>{rateText(summary.masteryXp, seconds)} / hour</small></strong></div><div><span>Mastery Level</span><strong>{summary.masteryLevelBefore} -&gt; {summary.masteryLevelAfter}</strong></div></div></section>
        <section className="offline-results-section" data-debug-kind="offline-results-mining-summary"><div className="offline-results-section-heading"><Pickaxe size={15} /><h3>Mining Summary</h3></div><div className="offline-results-stat-grid"><div><span>Swings</span><strong>{summary.swings.toLocaleString()} <small>{rateText(summary.swings, seconds, 1)}</small></strong></div><div><span>Stages Broken</span><strong>{summary.stagesBroken.toLocaleString()}</strong></div><div><span>Deposits Completed</span><strong>{summary.deposits.toLocaleString()}</strong></div><div><span>Rest Time</span><strong>{formatDuration(summary.restSeconds)}</strong></div></div></section>
      </div>
      <div className="offline-results-column">
        <section className="offline-results-section" data-debug-kind="offline-results-production"><div className="offline-results-section-heading"><Package size={15} /><h3>Production</h3></div><div className="offline-results-stat-grid"><div><span>Iron Ore</span><strong>{summary.ironOre.toLocaleString()} <small>{summary.ironOrePerHour.toLocaleString(undefined, { maximumFractionDigits: 1 })}/h</small></strong></div><div><span>Rough Gem</span><strong>{summary.roughGems.toLocaleString()} <small>{summary.roughGemPerHour.toLocaleString(undefined, { maximumFractionDigits: 2 })}/h expected</small></strong></div><div><span>Black Stone</span><strong>{summary.blackStones.toLocaleString()} <small>{summary.blackStonePerHour.toLocaleString(undefined, { maximumFractionDigits: 2 })}/h expected</small></strong></div></div></section>
      </div>
    </div>
  </>;
}

function UnknownOfflineResults({ onClose }: { onClose: () => void }) {
  return <>
    <header className="offline-results-header"><div><span className="eyebrow">TIME SKIP RESULTS</span><h2 id="offline-results-title">Result Unavailable</h2></div><CloseResultsButton onClose={onClose} /></header>
    <div className="offline-results-body"><p className="muted-copy">Unable to display this activity result.</p></div>
  </>;
}

function BlacksmithingOfflineResults({ simulation, onClose }: { simulation: OfflineActivitySimulationResult<GameState, BlacksmithingOfflineSummary>; onClose: () => void }) {
  const summary = simulation.summary;
  return <><header className="offline-results-header"><div><span className="eyebrow">TIME SKIP RESULTS</span><h2 id="offline-results-title">Blacksmithing</h2><p>{formatDuration(simulation.requestedSeconds)} skipped</p></div><CloseResultsButton onClose={onClose} /></header><div className={`offline-results-outcome outcome-${simulation.stopReason}`} data-debug-kind="offline-results-outcome"><Trophy size={18} /><div><span className="eyebrow">RESULT</span><strong>{resultLabel(simulation.stopReason)}</strong></div></div><TimeSummary simulation={simulation} /><div className="offline-results-body" data-debug-kind="offline-results-blacksmithing"><div className="offline-results-column"><section className="offline-results-section"><div className="offline-results-section-heading"><BarChart3 size={15} /><h3>Blacksmithing Progression</h3></div><div className="offline-results-stat-grid"><div><span>Blacksmithing XP</span><strong>+{Math.floor(summary.blacksmithingXp).toLocaleString()} <small>{Math.floor(summary.blacksmithingXpPerHour).toLocaleString()} / hour</small></strong></div><div><span>Level</span><strong>{summary.blacksmithingLevelBefore} -&gt; {summary.blacksmithingLevelAfter}</strong></div><div><span>Rest Time</span><strong>{formatDuration(summary.restSeconds)}</strong></div></div></section><section className="offline-results-section"><div className="offline-results-section-heading"><Hammer size={15} /><h3>Forge Summary</h3></div><div className="offline-results-stat-grid"><div><span>Operations</span><strong>{summary.operationsCompleted.toLocaleString()}</strong></div><div><span>Smelts</span><strong>{summary.smeltsCompleted.toLocaleString()}</strong></div><div><span>Smiths</span><strong>{summary.smithsCompleted.toLocaleString()}</strong></div></div></section></div><div className="offline-results-column"><section className="offline-results-section"><div className="offline-results-section-heading"><Package size={15} /><h3>Production</h3></div>{Object.entries(summary.outputsGained).map(([itemId, quantity]) => <div className="offline-results-loot-row" key={itemId}><span><strong>{itemById[itemId]?.name ?? itemId}</strong></span><b>x{quantity}</b></div>)}</section></div></div></>;
}

export function OfflineSimulationResultsModal() {
  const activeProfileId = useGameStore((state) => state.activeProfileId);
  const runtime = useOfflineActivityRuntimeStore();
  const closeResults = runtime.closeResults;
  const continueRef = useRef<HTMLButtonElement>(null);
  const result = runtime.lastResult?.profileId === activeProfileId ? runtime.lastResult : null;
  const renderableResult = result && (
    (result.activityType === "combat-hunt" && isCombatHuntOfflineSummary(result.simulation.summary)) ||
    (result.activityType === "mining-iron-vein" && isMiningOfflineSummary(result.simulation.summary)) ||
    (result.activityType === "blacksmithing" && isBlacksmithingOfflineSummary(result.simulation.summary))
  ) ? result : null;

  useEffect(() => {
    if (!runtime.resultsOpen || !result) return;
    continueRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeResults(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeResults, result, runtime.resultsOpen]);

  if (!runtime.resultsOpen || !result) return null;

  return <div className="dialog-backdrop offline-results-backdrop" role="presentation" data-debug-kind="offline-results-backdrop"><div className="offline-results-modal" role="dialog" aria-modal="true" aria-labelledby="offline-results-title" data-debug-kind="offline-results-modal">
    {renderableResult?.activityType === "combat-hunt" ? <CombatOfflineResults simulation={renderableResult.simulation} onClose={closeResults} /> : renderableResult?.activityType === "mining-iron-vein" ? <MiningOfflineResults simulation={renderableResult.simulation} onClose={closeResults} /> : renderableResult?.activityType === "blacksmithing" ? <BlacksmithingOfflineResults simulation={renderableResult.simulation} onClose={closeResults} /> : <UnknownOfflineResults onClose={closeResults} />}
    <footer className="offline-results-footer"><small>Rates use the active simulated duration.</small><button ref={continueRef} type="button" className="button button-primary" onClick={closeResults}>CONTINUE</button></footer>
  </div></div>;
}
