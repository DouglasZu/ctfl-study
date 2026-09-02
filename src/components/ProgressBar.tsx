import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger'

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  value: number
  max?: number
  label?: ReactNode
  showValue?: boolean
  valueLabel?: string
  tone?: ProgressTone
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  valueLabel,
  tone = 'primary',
  size = 'md',
  className,
  ...props
}: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), safeMax) : 0
  const percentage = (safeValue / safeMax) * 100
  const announcedValue = valueLabel ?? `${Math.round(percentage)}%`

  return (
    <div className={cx('progress', className)} {...props}>
      {label || showValue ? (
        <div className="progress__meta">
          {label ? <span>{label}</span> : <span />}
          {showValue ? <strong>{announcedValue}</strong> : null}
        </div>
      ) : null}
      <div
        className={cx('progress__track', `progress__track--${size}`)}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={announcedValue}
      >
        <span
          className={cx('progress__fill', `progress__fill--${tone}`)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
