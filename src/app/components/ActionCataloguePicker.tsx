import { Check, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActionCatalogueGroup, ActionCatalogueItem } from "../../game/presentation/playerActionCatalogue";
import { catalogueGroupContainsQuery, catalogueItemMatchesQuery } from "../../game/presentation/playerActionCatalogue";
import { PlaceholderArt } from "./PlaceholderArt";
import { DisclosureChevron } from "./DisclosureChevron";

export interface ActionCataloguePickerProps {
  value: string;
  catalogue: ActionCatalogueGroup[];
  onChange: (actionId: string) => void;
  disabled?: boolean;
}

export function ActionCataloguePicker({ value, catalogue, onChange, disabled = false }: ActionCataloguePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentItem = useMemo(() => findCatalogueItem(catalogue, value), [catalogue, value]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(findAncestors(catalogue, value)));
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    searchRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && value) setExpanded((current) => new Set([...current, ...findAncestors(catalogue, value)]));
  }, [catalogue, open, value]);

  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const select = (actionId: string) => {
    onChange(actionId);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="action-picker" data-debug-kind="action-picker">
      <button
        type="button"
        className="action-picker-trigger"
        disabled={disabled}
        aria-haspopup="tree"
        aria-expanded={open}
        aria-label={currentItem ? `Action: ${currentItem.name}` : value ? `Action: missing ${value}` : "Action: choose action"}
        onClick={() => setOpen((current) => !current)}
        data-hero-window-focus
        data-debug-kind="action-picker-trigger"
        data-debug-action-id={value || undefined}
      >
        <PlaceholderArt icon={currentItem?.icon ?? "spark"} size="small" variant={currentItem ? "gold" : "muted"} />
        <span>
          <strong>{currentItem?.name ?? (value ? "MISSING ACTION" : "Choose action")}</strong>
          <small>{currentItem?.subtitle ?? (value ? value : "Select an action for this Rule")}</small>
        </span>
        <DisclosureChevron open={open} />
      </button>
      {open && <div className="action-picker-popover" role="dialog" aria-label="Choose action">
        <div className="action-picker-heading"><span className="tiny-label">CHOOSE ACTION</span><button type="button" className="icon-button compact" onClick={() => setOpen(false)} aria-label="Close action picker"><X size={13} /></button></div>
        <label className="catalogue-search action-picker-search-wrap">
          <Search size={13} aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actions..."
            aria-label="Search actions"
            data-debug-kind="action-picker-search"
          />
        </label>
        <div className="action-picker-groups combatbound-scroll" role="tree">
          {catalogue.map((group) => <ActionGroup
            key={group.id}
            group={group}
            value={value}
            normalizedQuery={normalizedQuery}
            expanded={expanded}
            onToggle={toggle}
            onSelect={select}
            depth={0}
          />)}
          {normalizedQuery && !catalogue.some((group) => catalogueGroupContainsQuery(group, normalizedQuery)) && <p className="catalogue-no-results">No actions match “{query}”.</p>}
        </div>
      </div>}
    </div>
  );
}

function ActionGroup({ group, value, normalizedQuery, expanded, onToggle, onSelect, depth }: {
  group: ActionCatalogueGroup;
  value: string;
  normalizedQuery: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (actionId: string) => void;
  depth: number;
}) {
  if (!catalogueGroupContainsQuery(group, normalizedQuery)) return null;
  const isExpanded = Boolean(normalizedQuery) || expanded.has(group.id);
  return (
    <div className="action-picker-group" data-debug-kind="action-picker-group" data-debug-group-id={group.id} data-debug-expanded={isExpanded ? "true" : "false"} data-debug-count={group.itemCount}>
      <button
        type="button"
        className={`catalogue-accordion-header action-picker-group-header depth-${depth}`}
        onClick={() => onToggle(group.id)}
        aria-expanded={isExpanded}
        aria-controls={`${group.id.replace(/[^a-zA-Z0-9_-]/g, "-")}-picker-body`}
        data-debug-kind="action-picker-group-header"
        data-debug-group-id={group.id}
      >
        <DisclosureChevron open={isExpanded} size={13} className="catalogue-accordion-chevron" />
        {group.icon && <PlaceholderArt icon={group.icon} size="small" variant="muted" />}
        <span className="catalogue-accordion-label">{group.label}</span>
        <span className="catalogue-accordion-count">{group.itemCount}</span>
      </button>
      {isExpanded && <div id={`${group.id.replace(/[^a-zA-Z0-9_-]/g, "-")}-picker-body`} className="action-picker-group-body">
        {(group.children ?? []).map((child) => <ActionGroup key={child.id} group={child} value={value} normalizedQuery={normalizedQuery} expanded={expanded} onToggle={onToggle} onSelect={onSelect} depth={depth + 1} />)}
        {(group.items ?? []).filter((item) => catalogueItemMatchesQuery(item, normalizedQuery)).map((item) => <ActionItem key={item.id} item={item} selected={item.id === value} onSelect={onSelect} depth={depth + 1} />)}
      </div>}
    </div>
  );
}

function ActionItem({ item, selected, onSelect, depth }: { item: ActionCatalogueItem; selected: boolean; onSelect: (actionId: string) => void; depth: number }) {
  return <button
    type="button"
    className={`action-picker-item ${selected ? "is-selected" : ""} ${!item.available ? "is-unavailable" : ""}`}
    onClick={() => onSelect(item.id)}
    role="treeitem"
    aria-selected={selected}
    style={{ ["--catalogue-item-depth" as string]: depth }}
    data-debug-kind="action-picker-item"
    data-debug-action-id={item.id}
    data-debug-action-kind={item.actionKind}
    data-debug-group-id={item.groupId}
  >
    <PlaceholderArt icon={item.icon} size="small" variant={selected ? "gold" : "muted"} />
    <span><strong>{item.name}</strong><small>{item.subtitle}</small></span>
    <em className={item.statusLabel?.startsWith("REQUIRES") ? "is-invalid" : item.equipped ? "is-equipped" : ""}>{item.statusLabel ?? (item.equipped ? "EQUIPPED" : "KNOWN")}</em>
    {selected && <Check size={13} className="action-picker-item-check" aria-label="Selected" />}
  </button>;
}

function findCatalogueItem(groups: ActionCatalogueGroup[], actionId: string): ActionCatalogueItem | undefined {
  for (const group of groups) {
    const item = group.items?.find((candidate) => candidate.id === actionId);
    if (item) return item;
    const nested = findCatalogueItem(group.children ?? [], actionId);
    if (nested) return nested;
  }
  return undefined;
}

function findAncestors(groups: ActionCatalogueGroup[], actionId: string): string[] {
  for (const group of groups) {
    if (group.items?.some((item) => item.id === actionId)) return [group.id];
    for (const child of group.children ?? []) {
      if (child.items?.some((item) => item.id === actionId)) return [group.id, child.id];
    }
    const nested = findAncestors(group.children ?? [], actionId);
    if (nested.length) return [group.id, ...nested];
  }
  return [];
}
