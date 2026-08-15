import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { PlaceholderArt } from "./PlaceholderArt";

export function CatalogueAccordionGroup({
  id,
  label,
  icon,
  count,
  expanded,
  depth = 0,
  onToggle,
  children,
  className = "",
  meta,
  debugGroupType,
  debugProficiencyId,
}: {
  id: string;
  label: string;
  icon?: string;
  count: number;
  expanded: boolean;
  depth?: number;
  onToggle: () => void;
  children?: ReactNode;
  className?: string;
  meta?: ReactNode;
  debugGroupType?: string;
  debugProficiencyId?: string;
}) {
  const bodyId = `${id.replace(/[^a-zA-Z0-9_-]/g, "-")}-body`;
  const debugKind = debugGroupType === "weapon"
    ? "combat-ability-group"
    : debugGroupType === "spellbook"
      ? "spellbook-school-group"
      : "catalogue-accordion-group";
  const debugHeaderKind = debugGroupType === "weapon"
    ? "combat-ability-group-header"
    : debugGroupType === "spellbook"
      ? "spellbook-school-group-header"
      : "catalogue-accordion-header";
  return (
    <section
      className={`catalogue-accordion-group ${className}`.trim()}
      data-debug-kind={debugKind}
      data-debug-group-id={id}
      data-debug-group-type={debugGroupType}
      data-debug-proficiency-id={debugProficiencyId}
      data-debug-expanded={expanded ? "true" : "false"}
      data-debug-count={count}
      style={{ ["--catalogue-depth" as string]: depth }}
    >
      <button
        type="button"
        className="catalogue-accordion-header"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        data-debug-kind={debugHeaderKind}
        data-debug-group-id={id}
      >
        <span className="catalogue-accordion-chevron" aria-hidden="true">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {icon && <PlaceholderArt icon={icon} size="small" variant="muted" />}
        <span className="catalogue-accordion-label">{label}</span>
        {meta}
        <span className="catalogue-accordion-count">{count}</span>
      </button>
      {expanded && <div id={bodyId} className="catalogue-accordion-body">{children}</div>}
    </section>
  );
}
