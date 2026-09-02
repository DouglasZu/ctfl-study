import type { LucideIcon } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { Card } from './Card'
import { cx } from './utils'

export interface StatTrend {
  value: string
  label?: string
  direction?: 'up' | 'down' | 'neutral'
}

export interface StatCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  label: string
  value: ReactNode
  helper?: ReactNode
  icon?: LucideIcon
  trend?: StatTrend
  tone?: 'default' | 'accent' | 'success' | 'warning'
}

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  trend,
  tone = 'default',
  className,
  ...props
}: StatCardProps) {
  return (
    <Card className={cx('stat-card', `stat-card--${tone}`, className)} {...props}>
      <div className="stat-card__topline">
        <span className="stat-card__label">{label}</span>
        {Icon ? (
          <span className="stat-card__icon" aria-hidden="true">
            <Icon size={19} strokeWidth={1.9} />
          </span>
        ) : null}
      </div>
      <strong className="stat-card__value">{value}</strong>
      {trend || helper ? (
        <div className="stat-card__footer">
          {trend ? (
            <span className={cx('stat-card__trend', `stat-card__trend--${trend.direction ?? 'neutral'}`)}>
              {trend.value}
              {trend.label ? <span>{trend.label}</span> : null}
            </span>
          ) : null}
          {helper ? <span className="stat-card__helper">{helper}</span> : null}
        </div>
      ) : null}
    </Card>
  )
}
