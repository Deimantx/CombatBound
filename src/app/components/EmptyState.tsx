import type { ReactNode } from 'react'

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><div className="empty-mark">—</div><strong>{title}</strong><p>{children}</p></div>
}
