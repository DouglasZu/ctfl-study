import { ArrowLeft } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { Button } from './Button'
import { cx } from './utils'

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  onBack?: () => void
  backLabel?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  meta,
  onBack,
  backLabel = 'Voltar',
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cx('page-header', className)} {...props}>
      <div className="page-header__content">
        {onBack ? (
          <Button
            variant="ghost"
            size="sm"
            className="page-header__back"
            leftIcon={<ArrowLeft size={18} aria-hidden="true" />}
            onClick={onBack}
          >
            {backLabel}
          </Button>
        ) : null}
        {eyebrow ? <div className="page-header__eyebrow">{eyebrow}</div> : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? <div className="page-header__description">{description}</div> : null}
        {meta ? <div className="page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}
