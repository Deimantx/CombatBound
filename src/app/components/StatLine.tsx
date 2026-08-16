import type { ReactNode } from 'react'
import { GameTooltip } from './tooltip/GameTooltip'
import { buildStatTooltip } from '../../game/presentation/tooltipBuilders'
import type { DamageRange } from '../../game/presentation/statFormatting'

interface StatLineProps {
  label: string
  value: ReactNode
  detail?: string
  accent?: 'gold' | 'green' | 'red' | 'blue'
  statKey?: string
  statValue?: number
  statRange?: DamageRange
}

export function StatLine({ label, value, detail, accent, statKey, statValue, statRange }: StatLineProps) {
  const line = (
    <div className="stat-line" data-debug-stat-key={statKey}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent ? `text-${accent}` : ''}`}>{value}</span>
      {detail && <span className="stat-detail">{detail}</span>}
    </div>
  )
  return statKey && statValue !== undefined ? <GameTooltip content={buildStatTooltip(statKey, statValue, detail, statRange)}>{line}</GameTooltip> : line
}
