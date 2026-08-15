import { useMemo, useState } from "react";
import { buildAllStatBreakdowns } from "../../../../game/presentation/statBreakdown";
import { DEBUG_STAT_DEFINITIONS, type DebugStatCategory } from "../../../../game/presentation/debugStatRegistry";
import { formatCombatStatValue } from "../../../../game/presentation/statFormatting";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

const categoryLabels: Record<DebugStatCategory, string> = { offense: "OFFENSE", defense: "DEFENSE", resources: "RESOURCES & REGEN", resistances: "RESISTANCES" };
const categoryDefaults: Record<DebugStatCategory, boolean> = { offense: true, defense: true, resources: false, resistances: false };

export function DebugStatsTab({ game }: DebugTabProps) {
  const [mode, setMode] = useState<"build" | "effective">(game.combat.phase === "active" || game.combat.phase === "recovery" ? "effective" : "build");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const breakdowns = useMemo(() => buildAllStatBreakdowns(game, mode), [game, mode]);
  const query = search.trim().toLowerCase();
  const groups = (Object.keys(categoryLabels) as DebugStatCategory[]).map((category) => ({ category, definitions: DEBUG_STAT_DEFINITIONS.filter((definition) => definition.category === category && (!query || `${definition.id} ${definition.label}`.toLowerCase().includes(query))) })).filter((group) => group.definitions.length);
  return <div className="debug-tab-content debug-column"><DebugSection title="Complete Stat Inspector" subtitle="Every canonical Combat stat and current resistance is shown, including zero values."><div className="debug-stat-toolbar"><label>MODE <select value={mode} onChange={(event) => setMode(event.target.value as "build" | "effective")}><option value="build">BUILD</option><option value="effective">EFFECTIVE</option></select></label><input className="debug-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stats..." aria-label="Search stats" /></div></DebugSection>{groups.map(({ category, definitions }) => { const groupOpen = query ? true : (expanded.has(category) || (!expanded.size && categoryDefaults[category])); return <DebugSection key={category} title={categoryLabels[category]} subtitle={`${definitions.length} stats`} collapsible open={groupOpen} onToggle={() => setExpanded((current) => { const next = new Set(current); if (next.has(category)) next.delete(category); else next.add(category); return next; })}>{groupOpen && <div className="debug-stat-inspector-list">{definitions.map((definition) => { const breakdown = breakdowns[definition.id]; const statOpen = expanded.has(definition.id); return <div key={definition.id} className="debug-stat-inspector-row" data-debug-kind="stat-breakdown" data-debug-stat-id={definition.id} data-debug-mode={mode} data-debug-final-value={breakdown.finalValue}><button type="button" className="debug-stat-row-toggle" onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(definition.id)) next.delete(definition.id); else next.add(definition.id); return next; })} aria-expanded={statOpen}><span>{definition.label}</span><strong>{formatValue(definition.id, breakdown.finalValue)}</strong></button>{statOpen && <div className="debug-stat-contribution-list">{breakdown.contributions.length ? breakdown.contributions.map((entry) => <div key={`${entry.sourceType}-${entry.sourceId}`} data-debug-kind="stat-contribution" data-debug-stat-id={definition.id} data-debug-source-type={entry.sourceType} data-debug-source-id={entry.sourceId} data-debug-operation={entry.operation}><span>{entry.sourceLabel}</span><small>{formatValue(definition.id, entry.before)} → {formatValue(definition.id, entry.after)} ({entry.value >= 0 ? "+" : ""}{formatValue(definition.id, entry.value)})</small></div>) : <small>No modifying sources.</small>}</div>}</div>; })}</div>}</DebugSection>; })}</div>;
}

function formatValue(id: string, value: number) {
  if (id.startsWith("resistance:")) return `${(value * 100).toFixed(1)}%`;
  return formatCombatStatValue(id, value);
}

