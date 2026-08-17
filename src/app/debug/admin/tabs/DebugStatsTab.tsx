import { useMemo, useState } from "react";
import { buildAllStatBreakdowns, type StatInspectionContext } from "../../../../game/presentation/statBreakdown";
import { DEBUG_STAT_DEFINITIONS, type DebugStatCategory, type DebugStatInspectionId } from "../../../../game/presentation/debugStatRegistry";
import { buildStatBreakdownTooltip, formatStatContribution } from "../../../../game/presentation/debugStatTooltip";
import { formatCombatStatValue } from "../../../../game/presentation/statFormatting";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { DisclosureChevron } from "../../../components/DisclosureChevron";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";
import { useGameStore } from "../../../../state/gameStore";

const categoryLabels: Record<DebugStatCategory, string> = { offense: "OFFENSE", defense: "DEFENSE", resources: "RESOURCES & REGEN", resistances: "RESISTANCES" };
const categoryDefaults: Record<DebugStatCategory, boolean> = { offense: true, defense: true, resources: false, resistances: false };

export function DebugStatsTab(_props: DebugTabProps) {
  const equipment = useGameStore((state) => state.game.equipment);
  const inventory = useGameStore((state) => state.game.inventory);
  const progression = useGameStore((state) => state.game.progression);
  const techniques = useGameStore((state) => state.game.combat.techniques);
  const playerEffects = useGameStore((state) => state.game.combat.playerEffects);
  const combatPhase = useGameStore((state) => state.game.combat.phase);
  const [mode, setMode] = useState<"build" | "effective">(combatPhase === "active" || combatPhase === "recovery" ? "effective" : "build");
  const [search, setSearch] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<DebugStatCategory, boolean>>(categoryDefaults);
  const [openStats, setOpenStats] = useState<Set<DebugStatInspectionId>>(new Set());
  const inspectionContext = useMemo<StatInspectionContext>(() => ({ equipment, inventory, progression, techniques, playerEffects, combatPhase }), [equipment, inventory, progression, techniques, playerEffects, combatPhase]);
  const breakdowns = useMemo(() => buildAllStatBreakdowns(inspectionContext, mode), [inspectionContext, mode]);
  const tooltips = useMemo(() => Object.fromEntries(DEBUG_STAT_DEFINITIONS.map((definition) => [definition.id, buildStatBreakdownTooltip(definition, breakdowns[definition.id])])), [breakdowns]);
  const query = search.trim().toLowerCase();
  const groups = (Object.keys(categoryLabels) as DebugStatCategory[]).map((category) => ({ category, definitions: DEBUG_STAT_DEFINITIONS.filter((definition) => definition.category === category && (!query || `${definition.id} ${definition.label}`.toLowerCase().includes(query))) })).filter((group) => group.definitions.length);
  return <div className="debug-tab-content debug-column"><DebugSection title="Complete Stat Inspector" subtitle="Every canonical Combat stat and current resistance is shown, including zero values."><div className="debug-stat-toolbar"><label>MODE <select value={mode} onChange={(event) => setMode(event.target.value as "build" | "effective")}><option value="build">BUILD</option><option value="effective">EFFECTIVE</option></select></label><input className="debug-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search stats..." aria-label="Search stats" /></div></DebugSection>{groups.map(({ category, definitions }) => { const groupOpen = Boolean(query) || openCategories[category]; return <DebugSection key={category} id={`debug.stats.category.${category}`} title={categoryLabels[category]} subtitle={`${definitions.length} stats`} collapsible open={groupOpen} onToggle={() => setOpenCategories((current) => ({ ...current, [category]: !current[category] }))}>{groupOpen && <div className="debug-stat-inspector-list">{definitions.map((definition) => { const breakdown = breakdowns[definition.id]; const statOpen = openStats.has(definition.id); const contentId = `debug-stat-${definition.id.replace(/[^a-zA-Z0-9_-]/g, "-")}-content`; return <div key={definition.id} className="debug-stat-inspector-row" data-debug-kind="stat-breakdown" data-debug-stat-id={definition.id} data-debug-mode={mode} data-debug-final-value={breakdown.finalValue}><GameTooltip content={tooltips[definition.id]} targetId={definition.id} label={definition.label}><button type="button" className="debug-stat-row-toggle" onClick={() => setOpenStats((current) => { const next = new Set(current); if (next.has(definition.id)) next.delete(definition.id); else next.add(definition.id); return next; })} aria-expanded={statOpen} aria-controls={contentId} data-debug-id={`debug.stats.stat.${definition.id}`}><span>{definition.label}</span><strong>{formatValue(definition.id, breakdown.finalValue)}</strong><DisclosureChevron open={statOpen} /></button></GameTooltip>{statOpen && <div id={contentId} className="debug-stat-contribution-list">{breakdown.contributions.length ? breakdown.contributions.map((entry) => <div key={`${entry.sourceType}-${entry.sourceId}`} data-debug-kind="stat-contribution" data-debug-stat-id={definition.id} data-debug-source-type={entry.sourceType} data-debug-source-id={entry.sourceId} data-debug-operation={entry.operation}><span>{entry.sourceLabel}</span><small>{formatValue(definition.id, entry.before)} → {formatValue(definition.id, entry.after)} ({formatStatContribution(definition, entry)})</small></div>) : <small>No modifying sources.</small>}</div>}</div>; })}</div>}</DebugSection>; })}</div>;
}

function formatValue(id: string, value: number) {
  if (id.startsWith("resistance:")) return `${(value * 100).toFixed(1)}%`;
  return formatCombatStatValue(id, value);
}
