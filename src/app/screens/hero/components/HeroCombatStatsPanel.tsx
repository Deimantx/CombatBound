import { Swords } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { calculateArmorMitigation } from "../../../../game/combat/combatMath";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import { combatStatGroups, type CombatStatGroupId } from "../../../../game/presentation/combatStatGroups";
import { COMBAT_STAT_EPSILON, formatCombatStatDelta, formatCombatStatValue, getCombatStatDisplaySpec, labelForStatKey } from "../../../../game/presentation/statFormatting";
import { useGameStore } from "../../../../state/gameStore";
import { DisclosureChevron } from "../../../components/DisclosureChevron";
import { StatLine } from "../../../components/StatLine";
import type { HeroEquipmentPreview } from "./HeroEquipmentWorkspace";

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

export function HeroCombatStatsPanel({ preview, hoveredPreview }: { preview: HeroEquipmentPreview | null; hoveredPreview: HeroEquipmentPreview | null }) {
  const equipment = useGameStore((state) => state.game.equipment);
  const progression = useGameStore((state) => state.game.progression);
  const stance = useGameStore((state) => state.game.combat.stance);
  const techniques = useGameStore((state) => state.game.combat.techniques);
  const selectedEquipmentSlot = useGameStore((state) => state.selectedEquipmentSlot);
  const [preferences, setPreferences] = useState(readPreferences);
  const instanceId = useId().replace(/:/g, "");
  const stats = useMemo(() => calculateHunterCombatStats(equipment, progression, stance, techniques), [equipment, progression, stance, techniques]);
  const requestedPreview = hoveredPreview ?? preview;
  const activePreview = requestedPreview?.slotId === selectedEquipmentSlot ? requestedPreview : null;
  const previewStats = useMemo(() => {
    if (!activePreview) return null;
    const previewEquipment = { ...equipment, slots: { ...equipment.slots, [activePreview.slotId]: activePreview.itemId } };
    return calculateHunterCombatStats(previewEquipment, progression, stance, techniques);
  }, [activePreview, equipment, progression, stance, techniques]);
  const panelContentId = `hero-combat-stats-content-${instanceId}`;
  const valueFor = (key: string, source = stats) => {
    if (key === "physicalDirectMitigation") return calculateArmorMitigation(source.armor);
    if (key === "statusResistance") return source.statusResistance;
    if (key.endsWith("Resistance")) {
      const resistanceKey = key.replace("Resistance", "").toLowerCase() as keyof typeof source.resistances;
      return source.resistances[resistanceKey] ?? 0;
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
    <aside className={`hero-combat-stats ${preferences.panel ? "is-open" : "is-collapsed"}`} data-debug-kind="hero-combat-stats" data-debug-expanded={preferences.panel ? "true" : "false"} data-debug-preview-item-id={activePreview?.itemId} data-debug-preview-slot-id={activePreview?.slotId}>
      <button type="button" className="hero-stats-parent-toggle" onClick={() => toggle("panel")} aria-expanded={preferences.panel} aria-controls={panelContentId}>
        <span className="hero-stats-title"><span className="panel-icon"><Swords size={16} /></span><span><strong>COMBAT STATS</strong><small>Live values used by combat</small></span></span>
        <DisclosureChevron open={preferences.panel} />
      </button>
      <div id={panelContentId} className="hero-combat-stats-content" hidden={!preferences.panel}>
        <div className="hero-stats-summary"><span>Attack <strong>{formatCombatStatValue("attackPower", stats.attackPower)}</strong></span><span>Armor <strong>{formatCombatStatValue("armor", stats.armor)}</strong></span><span>Max HP <strong>{formatCombatStatValue("maxHealth", stats.maxHealth)}</strong></span></div>
        <div className="hero-stat-groups">
          {combatStatGroups.map((group) => <HeroStatCategory key={group.id} group={group} open={preferences[group.id]} onToggle={() => toggle(group.id)} valueFor={valueFor} previewStats={previewStats} />)}
        </div>
      </div>
    </aside>
  );
}

function HeroStatCategory({ group, open, onToggle, valueFor, previewStats }: { group: (typeof combatStatGroups)[number]; open: boolean; onToggle: () => void; valueFor: (key: string, source?: ReturnType<typeof calculateHunterCombatStats>) => number; previewStats: ReturnType<typeof calculateHunterCombatStats> | null }) {
  const id = useId().replace(/:/g, "");
  const contentId = `hero-stat-category-${group.id}-${id}`;
  return (
    <section className={`hero-stat-category ${open ? "is-open" : "is-collapsed"}`} data-debug-kind="hero-stat-category" data-debug-category={group.id} data-debug-expanded={open ? "true" : "false"} data-debug-count={group.keys.length}>
      <button type="button" className="hero-stat-category-toggle" onClick={onToggle} aria-expanded={open} aria-controls={contentId}><span><strong>{group.title}</strong></span><DisclosureChevron open={open} size={14} /></button>
      <div id={contentId} className={group.id === "resistances" ? "hero-stat-resistance-grid" : "hero-stat-list"} hidden={!open}>
        {group.keys.map((key) => {
          const value = valueFor(key);
          const previewValue = previewStats ? valueFor(key, previewStats) : undefined;
          const delta = previewValue === undefined ? undefined : previewValue - value;
          const changed = delta !== undefined && Math.abs(delta) > COMBAT_STAT_EPSILON;
          const direction = getCombatStatDisplaySpec(key)?.comparisonDirection;
          const deltaKind = !changed || direction === "neutral" ? "neutral" : direction === "lower-is-better" ? delta! < 0 ? "better" : "worse" : delta! > 0 ? "better" : "worse";
          return <div key={key} className="hero-stat-row" data-debug-kind="hero-stat-row" data-debug-stat={key} data-debug-value={value} data-debug-current-value={previewStats ? value : undefined} data-debug-preview-value={changed ? previewValue : undefined} data-debug-delta={changed ? delta : undefined} data-debug-delta-kind={previewStats ? deltaKind : undefined}><StatLine label={labelForStatKey(key)} value={<StatValue statKey={key} current={value} preview={changed ? previewValue : undefined} delta={changed ? delta : undefined} deltaKind={deltaKind} />} detail={key === "attackInterval" ? `${(1 / Math.max(0.01, value)).toFixed(2)} attacks/sec` : undefined} accent={key.endsWith("Resistance") ? value > 0 ? "green" : value < 0 ? "red" : undefined : key === "attackPower" ? "gold" : undefined} statKey={key} statValue={value} /></div>;
        })}
      </div>
    </section>
  );
}

function StatValue({ statKey, current, preview, delta, deltaKind }: { statKey: string; current: number; preview?: number; delta?: number; deltaKind: "better" | "worse" | "neutral" }) {
  const changed = preview !== undefined && delta !== undefined;
  return <span className="hero-stat-value-comparison"><span>{formatCombatStatValue(statKey, current, changed ? "comparison" : "normal")}</span>{changed && <><span className="hero-stat-arrow">→</span><strong className="hero-stat-preview-value">{formatCombatStatValue(statKey, preview, "comparison")}</strong><em className={`hero-stat-delta is-${deltaKind}`}>{formatCombatStatDelta(statKey, delta)}</em></>}</span>;
}
