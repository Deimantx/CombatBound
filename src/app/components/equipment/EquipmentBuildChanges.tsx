import { useState } from "react";
import { DisclosureChevron } from "../DisclosureChevron";
import { GameTooltip } from "../tooltip/GameTooltip";
import { buildStatTooltip } from "../../../game/presentation/tooltipBuilders";
import type { EquipmentComparisonRow } from "../../../game/presentation/equipmentComparison";

export interface EquipmentBuildChangesProps {
  rows: readonly EquipmentComparisonRow[];
  replacementName?: string;
  slotLabel?: string;
  debugKind?: string;
  showSummary?: boolean;
}

export function EquipmentBuildChanges({ rows, replacementName, slotLabel, debugKind = "equipment-build-changes", showSummary = true }: EquipmentBuildChangesProps) {
  const [showAll, setShowAll] = useState(false);
  if (!rows.length) return null;
  const visibleRows = showAll ? rows : rows.slice(0, 8);
  const gains = rows.filter((row) => row.tone === "is-positive").length;
  const losses = rows.filter((row) => row.tone === "is-negative").length;
  return <div className="inventory-comparison equipment-build-changes" data-debug-kind={debugKind}>
    <header>BUILD CHANGES{slotLabel ? ` · ${slotLabel}` : ""}</header>
    {replacementName && <p className="inventory-comparison-context">Replacing {replacementName}</p>}
    {showSummary && (gains > 0 || losses > 0) && <p className="equipment-build-changes-summary">{gains ? `${gains} gain${gains === 1 ? "" : "s"}` : ""}{gains && losses ? " · " : ""}{losses ? `${losses} loss${losses === 1 ? "" : "es"}` : ""}</p>}
    <div className="inventory-comparison-list">{visibleRows.map((row) => <div key={row.key} className={`inventory-comparison-row ${row.tone}`}>
      <GameTooltip content={buildStatTooltip(row.key === "physicalDamageRange" ? "attackDamage" : row.key, row.afterValue ?? 0, "After equipping this item")}><span className="inventory-comparison-label">{row.label}</span></GameTooltip>
      <span className="inventory-comparison-values">{row.before} → {row.after}</span>
      <strong className="inventory-comparison-delta">{row.delta ?? ""}</strong>
    </div>)}</div>
    {rows.length > 8 && <button type="button" className="inventory-disclosure-toggle" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}><DisclosureChevron open={showAll} />{showAll ? "Show fewer changes" : `Show all ${rows.length} changes`}</button>}
  </div>;
}
