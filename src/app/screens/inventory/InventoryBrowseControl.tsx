import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { InventoryState } from "../../../game/inventory/inventoryTypes";
import { inventoryItemTaxonomy } from "../../../game/inventory/inventorySelectors";
import { findItemTaxonomyNode, getItemTaxonomyPath } from "../../../game/presentation/itemTaxonomy";

interface InventoryBrowseControlProps {
  nodeId: string;
  inventory: InventoryState;
  ownedCounts: ReadonlyMap<string, number>;
  onChange: (id: string) => void;
}

export function InventoryBrowseControl({ nodeId, inventory: _inventory, ownedCounts, onChange }: InventoryBrowseControlProps) {
  const [open, setOpen] = useState(false);
  const node = findItemTaxonomyNode(inventoryItemTaxonomy, nodeId) ?? inventoryItemTaxonomy;
  const path = getItemTaxonomyPath(inventoryItemTaxonomy, node.id).slice(1);
  const ownedChildren = useMemo(
    () => node.children.filter((child) => (ownedCounts.get(child.id) ?? 0) > 0),
    [node, ownedCounts],
  );

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const selectNode = (id: string, isLeaf: boolean) => {
    onChange(id);
    if (isLeaf) setOpen(false);
  };

  return <div className="inventory-browse-control" data-debug-kind="inventory-browse-control">
    <div className="inventory-browse-row">
      <div className="inventory-breadcrumb" aria-label="Equipment browse path">
        {path.map((part, index) => <span key={part.id}>
          <button type="button" onClick={() => { onChange(part.id); setOpen(false); }} aria-current={index === path.length - 1 ? "page" : undefined}>{part.label}</button>
          {index < path.length - 1 && <ChevronRight size={12} aria-hidden="true" />}
        </span>)}
      </div>
      <button type="button" className="button button-ghost button-small inventory-browse-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="inventory-browse-drawer">
        Browse<ChevronDown size={13} className={open ? "is-open" : ""} />
      </button>
    </div>
    {open && <div id="inventory-browse-drawer" className="inventory-browse-drawer" data-debug-kind="inventory-browse-drawer">
      <strong>Browse equipment</strong>
      {ownedChildren.length ? ownedChildren.map((child) => <button type="button" key={child.id} onClick={() => selectNode(child.id, child.children.length === 0)}>
        <span>{child.label}</span><em>{ownedCounts.get(child.id) ?? 0}</em>{child.children.length > 0 && <ChevronRight size={12} aria-hidden="true" />}
      </button>) : <span className="inventory-browse-empty">No deeper owned categories.</span>}
    </div>}
  </div>;
}
