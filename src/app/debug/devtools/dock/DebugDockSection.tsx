import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDevToolsRuntimeStore } from "../devToolsRuntimeStore";

export function DebugDockSection({ id, title, children, defaultOpen = false }: { id: string; title: string; children: ReactNode; defaultOpen?: boolean }) {
  const open = useDevToolsRuntimeStore((state) => state.expandedSections.includes(id) || (defaultOpen && !state.expandedSections.length));
  const toggle = useDevToolsRuntimeStore((state) => state.toggleSection);
  return <section className="debug-dock-section" data-debug-kind="debug-dock-section" data-debug-section={id} data-debug-expanded={open}>
    <button type="button" className="debug-dock-section-header" onClick={() => toggle(id)} aria-expanded={open}><span>{open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span><strong>{title}</strong></button>
    {open && <div className="debug-dock-section-body">{children}</div>}
  </section>;
}
