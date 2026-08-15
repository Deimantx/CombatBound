import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PlaceholderArt } from "../../../components/PlaceholderArt";

export function DebugCatalogueGroup({
  id,
  label,
  count,
  icon,
  depth = 0,
  expanded,
  onToggle,
  children,
  debugGroupType,
}: {
  id: string;
  label: string;
  count: number;
  icon?: string;
  depth?: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  debugGroupType: string;
}) {
  const bodyId = `${id.replace(/[^a-zA-Z0-9_-]/g, "-")}-body`;
  return (
    <section className="debug-catalogue-group" data-debug-kind="debug-catalogue-group" data-debug-group-id={id} data-debug-group-type={debugGroupType} data-debug-count={count} data-debug-expanded={expanded ? "true" : "false"} style={{ ["--debug-depth" as string]: depth }}>
      <button type="button" className="debug-catalogue-group-header" onClick={onToggle} aria-expanded={expanded} aria-controls={bodyId} data-debug-kind="debug-catalogue-group-header" data-debug-group-id={id}>
        <span aria-hidden="true">{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
        {icon && <PlaceholderArt icon={icon} size="small" variant="muted" />}
        <strong>{label}</strong>
        <span className="debug-catalogue-group-count">{count}</span>
      </button>
      {expanded && <div id={bodyId} className="debug-catalogue-group-body">{children}</div>}
    </section>
  );
}
