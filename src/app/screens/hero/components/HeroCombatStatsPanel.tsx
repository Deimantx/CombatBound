import { Swords } from "lucide-react";
import { useId, useState } from "react";
import type { EquipmentPreviewState } from "../../../../game/equipment/equipmentPreview";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import { combatStatGroups, type CombatStatGroupId } from "../../../../game/presentation/combatStatGroups";
import { COMBAT_STAT_EPSILON, formatCombatStatDelta, formatCombatStatValue, formatDamageRange, getCombatStatDisplaySpec, labelForStatKey } from "../../../../game/presentation/statFormatting";
import { useGameStore } from "../../../../state/gameStore";
import { DisclosureChevron } from "../../../components/DisclosureChevron";
import { StatLine } from "../../../components/StatLine";
import { getItemDefinitionForInstance } from "../../../../game/items/itemResolver";
import { EquipmentBuildSnapshot } from "./equipment/EquipmentBuildSnapshot";

const HERO_STATS_STORAGE_KEY = "combatbound-hero-stats-v1";
const DEFAULT_PREFERENCES: HeroStatsPreferences = {
  panel: true,
  offense: true,
  defense: true,
  resources: false,
  resistances: false,
};

type HeroStatsPreferences = { panel: boolean } & Record<CombatStatGroupId, boolean>;

function readPreferences(): HeroStatsPreferences {
  try {
    const raw = JSON.parse(window.localStorage.getItem(HERO_STATS_STORAGE_KEY) ?? "null") as Partial<Record<string, unknown>> | null;
    if (!raw || typeof raw !== "object") return DEFAULT_PREFERENCES;
    return {
      panel: typeof raw.panel === "boolean" ? raw.panel : DEFAULT_PREFERENCES.panel,
      offense: typeof raw.offense === "boolean" ? raw.offense : DEFAULT_PREFERENCES.offense,
      defense: typeof raw.defense === "boolean" ? raw.defense : DEFAULT_PREFERENCES.defense,
      resources: typeof raw.resources === "boolean" ? raw.resources : DEFAULT_PREFERENCES.resources,
      resistances: typeof raw.resistances === "boolean" ? raw.resistances : DEFAULT_PREFERENCES.resistances,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function persistPreferences(preferences: HeroStatsPreferences) {
  try {
    window.localStorage.setItem(HERO_STATS_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences are optional; the current component state remains usable.
  }
}

export function HeroCombatStatsPanel({ previewState }: { previewState: EquipmentPreviewState }) {
  const game = useGameStore((state) => state.game);
  const selectedEquipmentSlot = useGameStore((state) => state.selectedEquipmentSlot);
  const [preferences, setPreferences] = useState(readPreferences);
  const instanceId = useId().replace(/:/g, "");
  const stats = previewState.currentStats;
  const activePreview = previewState.request?.slotId === selectedEquipmentSlot ? previewState.request : null;
  const previewStats = activePreview ? previewState.previewStats ?? null : null;
  const rangeFor = (source = stats) => ({ min: source.attackDamageMin ?? source.attackDamage, max: source.attackDamageMax ?? source.attackDamage });
  const panelContentId = `hero-combat-stats-content-${instanceId}`;
  const valueFor = (key: string, source = stats) => {
    if (key.endsWith("Resistance")) {
      return Number(source[key as keyof typeof source] ?? 0);
    }
    return Number(source[key as keyof typeof source] ?? 0);
  };
  const toggle = (key: "panel" | CombatStatGroupId) => {
    setPreferences((current) => {
      const next = { ...current, [key]: !current[key] };
      persistPreferences(next);
      return next;
    });
  };

  return (
    <aside className={`hero-combat-stats ${preferences.panel ? "is-open" : "is-collapsed"}`} data-debug-kind="hero-combat-stats" data-debug-expanded={preferences.panel ? "true" : "false"} data-debug-preview-instance-id={activePreview?.instanceId} data-debug-preview-item-id={activePreview ? getItemDefinitionForInstance(game.inventory, activePreview.instanceId)?.id : undefined} data-debug-preview-slot-id={activePreview?.slotId}>
      <button type="button" className="hero-stats-parent-toggle" onClick={() => toggle("panel")} aria-expanded={preferences.panel} aria-controls={panelContentId}>
        <span className="hero-stats-title"><span className="panel-icon"><Swords size={16} /></span><span><strong>COMBAT STATS</strong><small>Live values used by combat</small></span></span>
        <DisclosureChevron open={preferences.panel} />
      </button>
      <div id={panelContentId} className="hero-combat-stats-content" hidden={!preferences.panel}>
        <EquipmentBuildSnapshot current={stats} preview={previewStats ?? undefined} />
        <div className="hero-stat-groups">
          {combatStatGroups.map((group) => <HeroStatCategory key={group.id} group={group} open={preferences[group.id]} onToggle={() => toggle(group.id)} valueFor={valueFor} rangeFor={rangeFor} previewStats={previewStats} />)}
        </div>
      </div>
    </aside>
  );
}

function HeroStatCategory({ group, open, onToggle, valueFor, rangeFor, previewStats }: { group: (typeof combatStatGroups)[number]; open: boolean; onToggle: () => void; valueFor: (key: string, source?: HunterCombatStats) => number; rangeFor: (source?: HunterCombatStats) => { min: number; max: number }; previewStats: HunterCombatStats | null }) {
  const id = useId().replace(/:/g, "");
  const contentId = `hero-stat-category-${group.id}-${id}`;
  return (
    <section className={`hero-stat-category ${open ? "is-open" : "is-collapsed"}`} data-debug-kind="hero-stat-category" data-debug-category={group.id} data-debug-expanded={open ? "true" : "false"} data-debug-count={group.keys.length}>
      <button type="button" className="hero-stat-category-toggle" onClick={onToggle} aria-expanded={open} aria-controls={contentId}><span><strong>{group.title}</strong></span><DisclosureChevron open={open} size={14} /></button>
      <div id={contentId} className={group.id === "resistances" ? "hero-stat-resistance-grid" : "hero-stat-list"} hidden={!open}>
        {group.keys.map((key) => {
          const value = valueFor(key);
          const range = key === "attackDamage" ? rangeFor() : undefined;
          const previewValue = previewStats ? valueFor(key, previewStats) : undefined;
          const previewRange = previewStats && range ? rangeFor(previewStats) : undefined;
          const delta = previewValue === undefined ? undefined : previewValue - value;
          const changed = delta !== undefined && Math.abs(delta) > COMBAT_STAT_EPSILON;
          const direction = getCombatStatDisplaySpec(key)?.comparisonDirection;
          const deltaKind = !changed || direction === "neutral" ? "neutral" : direction === "lower-is-better" ? delta! < 0 ? "better" : "worse" : delta! > 0 ? "better" : "worse";
          return <div key={key} className="hero-stat-row" data-debug-kind="hero-stat-row" data-debug-stat={key} data-debug-value={value} data-debug-current-value={previewStats ? value : undefined} data-debug-preview-value={changed ? previewValue : undefined} data-debug-delta={changed ? delta : undefined} data-debug-delta-kind={previewStats ? deltaKind : undefined}><StatLine label={labelForStatKey(key)} value={<StatValue statKey={key} current={value} currentDisplay={range ? formatDamageRange(range.min, range.max) : undefined} preview={changed ? previewValue : undefined} previewDisplay={changed && previewRange ? formatDamageRange(previewRange.min, previewRange.max) : undefined} delta={changed ? delta : undefined} deltaKind={deltaKind} />} detail={key === "attackInterval" ? `${(1 / Math.max(0.01, value)).toFixed(2)} attacks/sec` : undefined} accent={key.endsWith("Resistance") ? value > 0 ? "green" : value < 0 ? "red" : undefined : key === "attackDamage" ? "gold" : undefined} statKey={key} statValue={value} statRange={range} /></div>;
        })}
      </div>
    </section>
  );
}

function StatValue({ statKey, current, currentDisplay, preview, previewDisplay, delta, deltaKind }: { statKey: string; current: number; currentDisplay?: string; preview?: number; previewDisplay?: string; delta?: number; deltaKind: "better" | "worse" | "neutral" }) {
  const changed = preview !== undefined && delta !== undefined;
  if (currentDisplay) return <span className="hero-stat-value-comparison"><span>{currentDisplay}</span>{changed && <><span className="hero-stat-arrow">→</span><strong className="hero-stat-preview-value">{previewDisplay ?? formatCombatStatValue(statKey, preview, "comparison")}</strong><em className={`hero-stat-delta is-${deltaKind}`}>{formatCombatStatDelta(statKey, delta)}</em></>}</span>;
  return <span className="hero-stat-value-comparison"><span>{formatCombatStatValue(statKey, current, changed ? "comparison" : "normal")}</span>{changed && <><span className="hero-stat-arrow">→</span><strong className="hero-stat-preview-value">{formatCombatStatValue(statKey, preview, "comparison")}</strong><em className={`hero-stat-delta is-${deltaKind}`}>{formatCombatStatDelta(statKey, delta)}</em></>}</span>;
}
