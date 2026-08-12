import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface PanelProps {
  title?: string
  subtitle?: string
  icon?: LucideIcon
  actions?: ReactNode
  children: ReactNode
  className?: string
  panelId?: string
  screen?: string
}

export function Panel({ title, subtitle, icon: Icon, actions, children, className = '', panelId, screen }: PanelProps) {
  return (
    <section className={`panel ${className}`} data-ui-panel={panelId} data-debug-screen={screen}>
      {(title || actions) && (
        <header className="panel-header">
          <div className="panel-heading">
            {Icon && <span className="panel-icon"><Icon size={15} /></span>}
            <div>
              {title && <h2 className="panel-title">{title}</h2>}
              {subtitle && <p className="panel-subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      <div className="panel-body">{children}</div>
    </section>
  )
}
