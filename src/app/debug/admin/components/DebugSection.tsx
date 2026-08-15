import { useId, type ReactNode } from "react";
import { DisclosureChevron } from "../../../components/DisclosureChevron";

export function DebugSection({
  title,
  subtitle,
  children,
  actions,
  collapsible = false,
  open = true,
  onToggle,
  id,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  id?: string;
}) {
  const expanded = !collapsible || open;
  const generatedId = useId().replace(/:/g, "");
  const contentId = `${id ?? `debug-section-${generatedId}`}-content`;
  return (
    <section className={`debug-section ${collapsible && !open ? "is-collapsed" : ""}`} data-debug-section-id={id} data-debug-id={id}>
      <header>
        {collapsible && onToggle ? <button type="button" className="debug-section-heading" onClick={onToggle} aria-expanded={expanded} aria-controls={contentId} data-debug-kind="debug-collapse" data-debug-label={title}><span><span className="tiny-label">{title}</span>{subtitle && <p>{subtitle}</p>}</span><DisclosureChevron open={expanded} /></button> : <div className="debug-section-heading"><span className="tiny-label">{title}</span>{subtitle && <p>{subtitle}</p>}</div>}
        <div className="debug-section-actions">
          {actions}
        </div>
      </header>
      {expanded && <div id={contentId} className="debug-section-content">{children}</div>}
    </section>
  );
}
