import { useState } from "react";
import { inventoryRefsEqual, type InventoryViewEntry } from "../../../game/inventory/inventorySelectors";
import { serializeInventoryEntryRef, type ManualOrderPlacement } from "../../../game/inventory/inventoryManualOrder";
import { InventoryCard } from "./InventoryCard";

interface InventoryGridProps {
  entries: readonly InventoryViewEntry[];
  visibleEntries: readonly InventoryViewEntry[];
  visibleLimit: number;
  query: string;
  activeFilterCount: number;
  showSummary: boolean;
  hunterRank: number;
  manualMode: boolean;
  selectedRef: InventoryViewEntry["ref"] | null;
  onSelect: (entry: InventoryViewEntry) => void;
  onReorder: (draggedKey: string, targetKey: string, placement: ManualOrderPlacement) => void;
  onShowMore: () => void;
  onClearFilters: () => void;
}

export function InventoryGrid({ entries, visibleEntries, visibleLimit, query, activeFilterCount, showSummary, hunterRank, manualMode, selectedRef, onSelect, onReorder, onShowMore, onClearFilters }: InventoryGridProps) {
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [target, setTarget] = useState<{ key: string; placement: ManualOrderPlacement } | null>(null);
  const clearDrag = () => { setDraggedKey(null); setTarget(null); };
  const empty = entries.length === 0;
  return <div className="inventory-grid-pane" data-debug-kind="inventory-grid-pane">
    {showSummary && entries.length > 0 && <div className="inventory-summary"><span><strong>{entries.length}</strong> results</span>{visibleLimit < entries.length && <span>Showing {visibleEntries.length} of {entries.length}</span>}</div>}
    {empty ? <InventoryEmptyState query={query} activeFilterCount={activeFilterCount} onClear={onClearFilters} /> : <>
      <div className={`inventory-grid ${manualMode ? "is-manual" : ""}`} data-debug-kind="inventory-grid">{visibleEntries.map((entry) => {
        const key = serializeInventoryEntryRef(entry.ref);
        const targetPlacement = target?.key === key ? target.placement : undefined;
        return <InventoryCard key={key} entry={entry} hunterRank={hunterRank} selected={Boolean(selectedRef && inventoryRefsEqual(selectedRef, entry.ref))} manualMode={manualMode} dragging={draggedKey === key} dragTarget={targetPlacement} onSelect={() => onSelect(entry)} onDragStart={(event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", key); setDraggedKey(key); setTarget(null); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; if (!draggedKey || draggedKey === key) return; const rect = event.currentTarget.getBoundingClientRect(); setTarget({ key, placement: event.clientX < rect.left + rect.width / 2 ? "before" : "after" }); }} onDrop={(event) => { event.preventDefault(); if (draggedKey && target && target.key === key) onReorder(draggedKey, key, target.placement); clearDrag(); }} onDragEnd={clearDrag} />;
      })}</div>
      {visibleLimit < entries.length && <div className="inventory-list-footer"><span>Showing {visibleEntries.length} of {entries.length}</span><button type="button" className="button button-ghost button-small" onClick={onShowMore}>Show More</button></div>}
    </>}
  </div>;
}

function InventoryEmptyState({ query, activeFilterCount, onClear }: { query: string; activeFilterCount: number; onClear: () => void }) {
  const filtered = Boolean(query || activeFilterCount);
  return <div className="inventory-empty-state"><strong>{filtered ? "No items match these filters" : "Your inventory is empty"}</strong><span>{filtered ? "Try a different search or clear the active filters." : "Rewards and owned items will appear here."}</span>{activeFilterCount > 0 && <button type="button" className="button button-ghost button-small" onClick={onClear}>Clear Filters</button>}</div>;
}
