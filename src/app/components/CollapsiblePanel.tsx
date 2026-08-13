import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface CollapsiblePanelProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  children: ReactNode
  summary?: ReactNode
  actions?: ReactNode
  className?: string
  panelId: string
  screen?: string
  defaultOpen?: boolean
}

export function CollapsiblePanel({ title, subtitle, icon: Icon, children, summary, actions, className = '', panelId, screen, defaultOpen = true }: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const generatedId = useId().replace(/:/g, '')
  const contentId = `${panelId}-content-${generatedId}`
  return <section className={`panel collapsible-panel ${className}`} data-ui-panel={panelId} data-debug-screen={screen}>
    <header className="panel-header collapsible-panel-header">
      <button type="button" className="collapsible-panel-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={contentId} data-debug-kind="collapsible-panel" data-debug-panel-section={panelId}>
        <span className="panel-heading">{Icon && <span className="panel-icon"><Icon size={15} /></span>}<span><span className="panel-title">{title}</span>{subtitle && <span className="panel-subtitle">{subtitle}</span>}</span></span>
        <ChevronDown size={16} className={`collapsible-panel-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
      </button>
      {(summary || actions) && <div className="collapsible-panel-actions">{summary && <span className="collapsible-panel-summary">{summary}</span>}{actions}</div>}
    </header>
    <div id={contentId} className="panel-body collapsible-panel-content" hidden={!open} aria-hidden={!open}>{children}</div>
  </section>
}
