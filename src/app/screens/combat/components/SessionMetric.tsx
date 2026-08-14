import { GameTooltip } from '../../../components/tooltip/GameTooltip'
import type { TooltipModel } from '../../../../game/presentation/tooltipTypes'

interface SessionMetricProps {
  label: string
  value: string | number
  metric: string
  tooltip: TooltipModel
}

export function SessionMetric({ label, value, metric, tooltip }: SessionMetricProps) {
  const content = <div className="session-metric" data-debug-kind="hunt-session-metric" data-debug-metric={metric}><span>{label}</span><strong>{value}</strong></div>
  return <GameTooltip content={tooltip}>{content}</GameTooltip>
}
