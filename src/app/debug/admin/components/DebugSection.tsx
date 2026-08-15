import type { ReactNode } from "react";

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
  return (
    <section className={`debug-section ${collapsible && !open ? "is-collapsed" : ""}`} data-debug-section-id={id}>
      <header>
        <div>
          <span className="tiny-label">{title}</span>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="debug-section-actions">
          {actions}
          {collapsible && onToggle && (
            <button type="button" className="debug-collapse-toggle" onClick={onToggle} aria-expanded={expanded} data-debug-kind="debug-collapse" data-debug-label={title}>
              {expanded ? "COLLAPSE" : "EXPAND"}
            </button>
          )}
        </div>
      </header>
      {expanded && children}
    </section>
  );
}
