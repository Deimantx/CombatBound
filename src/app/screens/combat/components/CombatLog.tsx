import { useState } from "react";
import type { GameState } from "../../../../game/gameState";
import { DisclosureChevron } from "../../../components/DisclosureChevron";

export function CombatLog({ log }: { log: GameState["combat"]["log"] }) {
  const [open, setOpen] = useState(false);
  const contentId = "live-combat-log-content";
  return <div className={`combat-log ${open ? "is-expanded" : "is-collapsed"}`} data-debug-kind="combat-log">
    <button type="button" className="combat-log-heading" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={contentId}><DisclosureChevron open={open} size={12} /><span className="tiny-label">COMBAT LOG</span><span>{log.length} events</span></button>
    {open && <div id={contentId} className="combat-log-list combatbound-scroll">{log.slice(0, 30).map((entry) => <div className={`combat-log-entry log-${entry.type}`} key={entry.id} data-debug-event-type={entry.type}><time>{entry.time}</time><span>{entry.text}</span></div>)}</div>}
  </div>;
}
