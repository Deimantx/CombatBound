import { DisclosureChevron } from "../../components/DisclosureChevron";
import { GameTooltip } from "../../components/tooltip/GameTooltip";
import { buildStatTooltip } from "../../../game/presentation/tooltipBuilders";
import type { EquipmentComparisonRow } from "../../../game/presentation/equipmentComparison";
import { useState } from "react";

export function InventoryBuildChanges({ rows, replacementName, slotLabel }: { rows: readonly EquipmentComparisonRow[]; replacementName?: string; slotLabel?: string }) {
  const [showAll, setShowAll] = useState(false);
  if (!rows.length) return null;
  const visibleRows = showAll ? rows : rows.slice(0, 8);
  return <div className="inventory-comparison" data-debug-kind="inventory-build-changes"><header>BUILD CHANGES{slotLabel ? ` · ${slotLabel}` : ""}</header>{replacementName && <p className="inventory-comparison-context">Replacing {replacementName}</p>}<div className="inventory-comparison-list">{visibleRows.map((row) => <div key={row.key} className={`inventory-comparison-row ${row.tone}`}><GameTooltip content={buildStatTooltip(row.key === "physicalDamageRange" ? "attackDamage" : row.key, row.afterValue ?? 0, "After equipping this item")}><span className="inventory-comparison-label">{row.label}</span></GameTooltip><span className="inventory-comparison-values">{row.before} → {row.after}</span><strong className="inventory-comparison-delta">{row.delta ?? ""}</strong></div>)}</div>{rows.length > 8 && <button type="button" className="inventory-disclosure-toggle" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll}><DisclosureChevron open={showAll} />{showAll ? "Show fewer changes" : `Show all ${rows.length} changes`}</button>}</div>;
}
