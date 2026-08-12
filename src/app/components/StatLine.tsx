import type { ReactNode } from 'react'

interface StatLineProps {
  label: string
  value: ReactNode
  detail?: string
  accent?: 'gold' | 'green' | 'red' | 'blue'
}

export function StatLine({ label, value, detail, accent }: StatLineProps) {
  return (
    <div className="stat-line">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent ? `text-${accent}` : ''}`}>{value}</span>
      {detail && <span className="stat-detail">{detail}</span>}
    </div>
  )
}
