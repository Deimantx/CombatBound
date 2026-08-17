import { formatCombatStatDelta, formatCombatStatValue, formatDamageRange, getCombatStatDisplaySpec } from "../../../../../game/presentation/statFormatting";
import { buildStatTooltip } from "../../../../../game/presentation/tooltipBuilders";
import type { HunterCombatStats } from "../../../../../game/equipment/derivedStats";
import { GameTooltip } from "../../../../components/tooltip/GameTooltip";

type SnapshotStats = HunterCombatStats;

export function EquipmentBuildSnapshot({ current, preview }: { current: SnapshotStats; preview?: SnapshotStats }) {
  const rows: SnapshotRow[] = [
    { key: "attackDamage", label: "Physical Damage", value: formatDamageRange(current.attackDamageMin ?? current.attackDamage, current.attackDamageMax ?? current.attackDamage), previewValue: preview ? formatDamageRange(preview.attackDamageMin ?? preview.attackDamage, preview.attackDamageMax ?? preview.attackDamage) : undefined, numeric: ((current.attackDamageMin ?? current.attackDamage) + (current.attackDamageMax ?? current.attackDamage)) / 2, previewNumeric: preview ? ((preview.attackDamageMin ?? preview.attackDamage) + (preview.attackDamageMax ?? preview.attackDamage)) / 2 : undefined, tooltipKey: "attackDamage", range: { min: current.attackDamageMin ?? current.attackDamage, max: current.attackDamageMax ?? current.attackDamage } },
    { key: "attackInterval", label: "Attack Time", value: formatCombatStatValue("attackInterval", current.attackInterval), previewValue: preview ? formatCombatStatValue("attackInterval", preview.attackInterval) : undefined, numeric: current.attackInterval, previewNumeric: preview?.attackInterval },
    { key: "accuracyRating", label: "Accuracy", value: formatCombatStatValue("accuracyRating", current.accuracyRating ?? 0), previewValue: preview ? formatCombatStatValue("accuracyRating", preview.accuracyRating ?? 0) : undefined, numeric: current.accuracyRating ?? 0, previewNumeric: preview ? preview.accuracyRating ?? 0 : undefined },
    { key: "maxLife", label: "Maximum Life", value: formatCombatStatValue("maxLife", current.maxLife ?? 0), previewValue: preview ? formatCombatStatValue("maxLife", preview.maxLife ?? 0) : undefined, numeric: current.maxLife ?? 0, previewNumeric: preview ? preview.maxLife ?? 0 : undefined },
    { key: "armour", label: "Armour", value: formatCombatStatValue("armour", current.armour ?? 0), previewValue: preview ? formatCombatStatValue("armour", preview.armour ?? 0) : undefined, numeric: current.armour ?? 0, previewNumeric: preview ? preview.armour ?? 0 : undefined },
    { key: "evasionRating", label: "Evasion", value: formatCombatStatValue("evasionRating", current.evasionRating ?? 0), previewValue: preview ? formatCombatStatValue("evasionRating", preview.evasionRating ?? 0) : undefined, numeric: current.evasionRating ?? 0, previewNumeric: preview ? preview.evasionRating ?? 0 : undefined },
    { key: "maxMana", label: "Maximum Mana", value: formatCombatStatValue("maxMana", current.maxMana), previewValue: preview ? formatCombatStatValue("maxMana", preview.maxMana) : undefined, numeric: current.maxMana, previewNumeric: preview?.maxMana },
    { key: "maxStamina", label: "Maximum Stamina", value: formatCombatStatValue("maxStamina", current.maxStamina), previewValue: preview ? formatCombatStatValue("maxStamina", preview.maxStamina) : undefined, numeric: current.maxStamina, previewNumeric: preview?.maxStamina },
    ...optionalRows(current, preview),
    ...resistanceRows(current, preview),
  ];
  return (
    <section className="hero-build-snapshot" data-debug-kind="hero-build-snapshot" data-debug-preview-active={preview ? "true" : "false"}>
      <header className="hero-build-snapshot-heading"><div><span className="tiny-label">BUILD SNAPSHOT</span><strong>Effective values used by Combat</strong></div>{preview && <span className="hero-build-snapshot-preview">COMPARING</span>}</header>
      <div className="hero-build-snapshot-grid">{rows.map((row) => <SnapshotRowView key={row.key} row={row} />)}</div>
    </section>
  );
}

interface SnapshotRow {
  key: string;
  label: string;
  value: string;
  previewValue?: string;
  numeric: number;
  previewNumeric?: number;
  tooltipKey?: string;
  range?: { min: number; max: number };
}

function SnapshotRowView({ row }: { row: SnapshotRow }) {
  const changed = row.previewNumeric !== undefined && Math.abs(row.previewNumeric - row.numeric) > 0.0001;
  const direction = getCombatStatDisplaySpec(row.tooltipKey ?? row.key)?.comparisonDirection;
  const deltaKind = !changed || direction === "neutral" ? "neutral" : direction === "lower-is-better" ? row.previewNumeric! < row.numeric ? "better" : "worse" : row.previewNumeric! > row.numeric ? "better" : "worse";
  const delta = changed ? row.previewNumeric! - row.numeric : 0;
  const tooltip = buildStatTooltip(row.tooltipKey ?? row.key, row.numeric, "Effective value used by Combat", row.range);
  return <div className="hero-build-snapshot-row" data-debug-kind="hero-build-snapshot-row" data-debug-snapshot-stat={row.key} data-debug-delta-kind={changed ? deltaKind : undefined}><GameTooltip content={tooltip}><span className="hero-build-snapshot-label">{row.label}</span></GameTooltip><span className="hero-build-snapshot-value"><span>{row.value}</span>{changed && <><span className="hero-stat-arrow">→</span><strong className={`hero-stat-preview-value is-${deltaKind}`}>{row.previewValue}</strong><em className={`hero-stat-delta is-${deltaKind}`}>{formatCombatStatDelta(row.tooltipKey ?? row.key, delta)}</em></>}</span></div>;
}

function optionalRows(current: SnapshotStats, preview?: SnapshotStats): SnapshotRow[] {
  const candidates: Array<["attackBlockChance" | "spellBlockChance" | "spellSuppressionChance", string]> = [["attackBlockChance", "Attack Block"], ["spellBlockChance", "Spell Block"], ["spellSuppressionChance", "Spell Suppression"]];
  return candidates.filter(([key]) => (current[key] ?? 0) > 0 || (preview?.[key] ?? 0) > 0).map(([key, label]) => ({ key, label, value: formatCombatStatValue(key, current[key] ?? 0), previewValue: preview ? formatCombatStatValue(key, preview[key] ?? 0) : undefined, numeric: current[key] ?? 0, previewNumeric: preview ? preview[key] ?? 0 : undefined }));
}

function resistanceRows(current: SnapshotStats, preview?: SnapshotStats): SnapshotRow[] {
  const resistances: Array<["fireResistance" | "coldResistance" | "lightningResistance" | "chaosResistance", "maxFireResistance" | "maxColdResistance" | "maxLightningResistance" | "maxChaosResistance", string]> = [["fireResistance", "maxFireResistance", "Fire Resistance"], ["coldResistance", "maxColdResistance", "Cold Resistance"], ["lightningResistance", "maxLightningResistance", "Lightning Resistance"], ["chaosResistance", "maxChaosResistance", "Chaos Resistance"]];
  return resistances.map(([key, maxKey, label]) => ({ key, label, value: `${formatCombatStatValue(key, current[key] ?? 0)} / ${formatCombatStatValue(maxKey, current[maxKey] ?? 0)}`, previewValue: preview ? `${formatCombatStatValue(key, preview[key] ?? 0)} / ${formatCombatStatValue(maxKey, preview[maxKey] ?? 0)}` : undefined, numeric: current[key] ?? 0, previewNumeric: preview ? preview[key] ?? 0 : undefined }));
}
