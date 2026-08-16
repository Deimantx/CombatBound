import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { inventoryItemTaxonomy } from "../../../game/inventory/inventorySelectors";
import { findItemTaxonomyNode, getItemTaxonomyPath } from "../../../game/presentation/itemTaxonomy";

interface InventoryCategoryNavigatorProps {
  nodeId: string;
  ownedCounts: ReadonlyMap<string, number>;
  onChange: (nodeId: string) => void;
}

export function InventoryCategoryNavigator({ nodeId, ownedCounts, onChange }: InventoryCategoryNavigatorProps) {
  const current = findItemTaxonomyNode(inventoryItemTaxonomy, nodeId) ?? inventoryItemTaxonomy;
  const path = getItemTaxonomyPath(inventoryItemTaxonomy, current.id).slice(1);
  const parent = path.length > 1 ? path[path.length - 2] : undefined;
  const context = current.children.length ? current : parent ?? current;
  const choices = useMemo(
    () => context.children.filter((child) => (ownedCounts.get(child.id) ?? 0) > 0),
    [context, ownedCounts],
  );
  const allLabel = context.id === "items.equipment" ? "All Gear" : `All ${context.label}`;

  return <nav className="inventory-category-navigator" data-debug-kind="inventory-category-navigator" aria-label="Equipment categories">
    <div className="inventory-category-breadcrumb">
      {path.map((part, index) => <span key={part.id}>
        {index > 0 && <ChevronRight size={11} aria-hidden="true" />}
        <button type="button" onClick={() => onChange(part.id)} className={index === path.length - 1 ? "is-current" : ""} aria-current={index === path.length - 1 ? "page" : undefined}>{compactTaxonomyLabel(part, path[index - 1])}</button>
      </span>)}
    </div>
    <div className="inventory-category-buttons">
      <CategoryChip label={allLabel} active={current.id === context.id} onClick={() => onChange(context.id)} />
      {choices.map((choice) => <CategoryChip key={choice.id} label={compactTaxonomyLabel(choice, context)} count={ownedCounts.get(choice.id)} active={choice.id === current.id} onClick={() => onChange(choice.id)} />)}
    </div>
  </nav>;
}

function compactTaxonomyLabel(node: { id: string; label: string }, parent?: { id: string }) {
  if (parent?.id.endsWith(".one-handed") && node.label.startsWith("One-Handed ")) return node.label.slice("One-Handed ".length);
  if (parent?.id.endsWith(".two-handed") && node.label.startsWith("Two-Handed ")) return node.label.slice("Two-Handed ".length);
  return node.label;
}

function CategoryChip({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return <button type="button" className={`inventory-category-chip ${active ? "is-active" : ""}`} onClick={onClick} aria-current={active ? "page" : undefined}>
    <span>{label}</span>{count !== undefined && <em>{count}</em>}
  </button>;
}

export type { InventoryCategoryNavigatorProps };
