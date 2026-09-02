import { Inbox, type LucideIcon } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: LucideIcon
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div className={cx('empty-state', className)} {...props}>
      <span className="empty-state__icon" aria-hidden="true">
        <Icon size={28} strokeWidth={1.7} />
      </span>
      <h2 className="empty-state__title">{title}</h2>
      {description ? <div className="empty-state__description">{description}</div> : null}
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  )
}
