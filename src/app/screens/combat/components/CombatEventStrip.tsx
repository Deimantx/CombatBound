import type { GameState } from "../../../../game/gameState";

export function CombatEventStrip({ log }: { log: GameState["combat"]["log"] }) {
  const latest = log.slice(0, 3);
  return <div className="combat-event-strip" data-debug-kind="combat-event-strip" aria-live="polite">
    {latest.length > 0 ? latest.map((entry) => <div key={entry.id} className={`combat-event-item event-${entry.type}`} data-debug-event-type={entry.type}><span className="combat-event-tone" /><span>{entry.text}</span></div>) : <span className="combat-event-empty">Combat events will appear here.</span>}
  </div>;
}
