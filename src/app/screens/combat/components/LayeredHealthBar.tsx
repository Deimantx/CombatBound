import { GameTooltip } from '../../../components/tooltip/GameTooltip'

interface LayeredHealthBarProps {
  health: number
  maxHealth: number
  barrier: number
  className?: string
  ariaLabel?: string
}

export function getLayeredHealthSegments(health: number, maxHealth: number, barrier: number) {
  const safeMax = Math.max(1, Number.isFinite(maxHealth) ? maxHealth : 1)
  const safeHealth = Math.max(0, Number.isFinite(health) ? health : 0)
  const safeBarrier = Math.max(0, Number.isFinite(barrier) ? barrier : 0)
  const healthFraction = Math.max(0, Math.min(1, safeHealth / safeMax))
  const barrierFit = Math.min(safeBarrier, Math.max(0, safeMax - safeHealth))
  return {
    healthFraction,
    barrierFraction: Math.max(0, Math.min(1 - healthFraction, barrierFit / safeMax)),
    overflowFraction: Math.max(0, Math.min(1, (safeBarrier - barrierFit) / safeMax)),
  }
}

export function LayeredHealthBar({ health, maxHealth, barrier, className = '', ariaLabel }: LayeredHealthBarProps) {
  const safeMax = Math.max(1, Number.isFinite(maxHealth) ? maxHealth : 1)
  const safeHealth = Math.max(0, Number.isFinite(health) ? health : 0)
  const safeBarrier = Math.max(0, Number.isFinite(barrier) ? barrier : 0)
  const { healthFraction: hpFraction, barrierFraction, overflowFraction } = getLayeredHealthSegments(health, maxHealth, barrier)
  const healthValue = Math.floor(safeHealth)
  const maxValue = Math.floor(safeMax)
  const barrierValue = Math.floor(safeBarrier)
  const tooltip = { id: 'combat.player-health', title: 'Health', subtitle: 'Current defensive pool', description: 'Absorb Shield protects Health before incoming damage reaches the Hunter.', rows: [{ label: 'Health', value: `${healthValue} / ${maxValue}`, tone: 'red' as const }, { label: 'Absorb Shield', value: `${barrierValue}`, tone: 'blue' as const }, { label: 'Effective Protected Pool', value: `${healthValue + barrierValue}`, tone: 'green' as const }] }
  return <GameTooltip content={tooltip}><div className={`layered-health-bar ${className}`} data-debug-kind="player-vital-bar" data-debug-health={healthValue} data-debug-max-health={maxValue} data-debug-barrier={barrierValue}>
    <div className="layered-health-track" role="progressbar" aria-label={ariaLabel ?? `Health ${healthValue} of ${maxValue}. Absorb Shield ${barrierValue}.`} aria-valuenow={Math.min(healthValue, maxValue)} aria-valuemin={0} aria-valuemax={maxValue}>
      <span className="layered-health-fill" style={{ width: `${hpFraction * 100}%` }} />
      {barrierFraction > 0 && <span className="layered-health-barrier" style={{ left: `${hpFraction * 100}%`, width: `${barrierFraction * 100}%` }} />}
      {overflowFraction > 0 && <span className="layered-health-overflow" style={{ width: `${overflowFraction * 100}%` }} />}
    </div>
  </div></GameTooltip>
}
