import { useId } from 'react'
import { EmptyState } from './EmptyState'
import { TrendingUp } from 'lucide-react'
import { cx } from './utils'

export interface ChartPoint {
  label: string
  value: number
}

export interface LineChartProps {
  data: readonly ChartPoint[]
  ariaLabel?: string
  minValue?: number
  maxValue?: number
  target?: number
  formatValue?: (value: number) => string
  emptyMessage?: string
  className?: string
}

export function LineChart({
  data,
  ariaLabel = 'Evolução dos resultados',
  minValue = 0,
  maxValue = 100,
  target,
  formatValue = (value) => `${Math.round(value)}%`,
  emptyMessage = 'Conclua simulados para visualizar sua evolução.',
  className,
}: LineChartProps) {
  const gradientId = useId().replace(/:/g, '')

  if (data.length === 0) {
    return (
      <EmptyState
        className={cx('line-chart__empty', className)}
        icon={TrendingUp}
        title="Ainda não há dados"
        description={emptyMessage}
      />
    )
  }

  const width = 640
  const height = 220
  const padding = { top: 18, right: 18, bottom: 34, left: 44 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const range = maxValue > minValue ? maxValue - minValue : 1
  const getX = (index: number) =>
    data.length === 1 ? padding.left + chartWidth / 2 : padding.left + (index / (data.length - 1)) * chartWidth
  const getY = (value: number) =>
    padding.top + chartHeight - ((Math.min(Math.max(value, minValue), maxValue) - minValue) / range) * chartHeight
  const coordinates = data.map((point, index) => ({
    ...point,
    x: getX(index),
    y: getY(point.value),
  }))
  const linePath = coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const first = coordinates[0]
  const last = coordinates[coordinates.length - 1]
  const baseY = padding.top + chartHeight
  const areaPath = first && last ? `${linePath} L ${last.x} ${baseY} L ${first.x} ${baseY} Z` : ''
  const guides = [maxValue, minValue + range / 2, minValue]
  const labelIndexes = Array.from(new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]))

  return (
    <figure className={cx('line-chart', className)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {guides.map((guide) => {
          const y = getY(guide)
          return (
            <g key={guide} className="line-chart__guide">
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text x={padding.left - 9} y={y + 4} textAnchor="end">
                {formatValue(guide)}
              </text>
            </g>
          )
        })}
        {target !== undefined && target >= minValue && target <= maxValue ? (
          <g className="line-chart__target">
            <line x1={padding.left} x2={width - padding.right} y1={getY(target)} y2={getY(target)} />
            <text x={width - padding.right} y={getY(target) - 7} textAnchor="end">
              Meta {formatValue(target)}
            </text>
          </g>
        ) : null}
        {areaPath ? <path className="line-chart__area" d={areaPath} fill={`url(#${gradientId})`} /> : null}
        <path className="line-chart__line" d={linePath} />
        {coordinates.map((point, index) => (
          <g key={`${point.label}-${index}`} className="line-chart__point">
            <circle cx={point.x} cy={point.y} r="5">
              <title>{`${point.label}: ${formatValue(point.value)}`}</title>
            </circle>
          </g>
        ))}
        {labelIndexes.map((index) => {
          const point = coordinates[index]
          if (!point) return null
          return (
            <text
              key={`${point.label}-${index}`}
              className="line-chart__x-label"
              x={point.x}
              y={height - 8}
              textAnchor={index === 0 ? 'start' : index === data.length - 1 ? 'end' : 'middle'}
            >
              {point.label}
            </text>
          )
        })}
      </svg>
      <figcaption className="visually-hidden">{ariaLabel}</figcaption>
    </figure>
  )
}
