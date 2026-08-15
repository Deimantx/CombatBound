import type { ReactNode } from "react";
import { useDevToolsRuntimeStore } from "../devToolsRuntimeStore";
import { DisclosureChevron } from "../../../components/DisclosureChevron";

export function DebugDockSection({ id, title, summary, children, defaultOpen = false }: { id: string; title: string; summary?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const open = useDevToolsRuntimeStore((state) => state.expandedSections.includes(id) || (defaultOpen && !state.expandedSections.length));
  const toggle = useDevToolsRuntimeStore((state) => state.toggleSection);
  return <section className="debug-dock-section" data-debug-kind="debug-dock-section" data-debug-section={id} data-debug-expanded={open}>
    <button type="button" className="debug-dock-section-header" onClick={() => toggle(id)} aria-expanded={open} aria-controls={`${id}-debug-dock-content`}><DisclosureChevron open={open} size={12} /><strong>{title}</strong>{summary && <span className="debug-dock-section-summary">{summary}</span>}</button>
    {open && <div id={`${id}-debug-dock-content`} className="debug-dock-section-body">{children}</div>}
  </section>;
}
