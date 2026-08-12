interface ProgressBarProps {
  value: number
  variant?: 'health' | 'attack' | 'experience' | 'resource'
  label?: string
  showValue?: boolean
  className?: string
  ariaLabel?: string
}

export function ProgressBar({ value, variant = 'experience', label, showValue = false, className = '', ariaLabel }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className={`progress-wrap ${className}`}>
      {(label || showValue) && <div className="progress-meta"><span>{label}</span>{showValue && <span>{Math.round(clamped)}%</span>}</div>}
      <div className={`progress-track progress-${variant}`} role="progressbar" aria-label={ariaLabel} aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <span className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}
