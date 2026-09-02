import {
  type HTMLAttributes,
  type ReactNode,
  type ElementType,
} from 'react'
import { cx } from './utils'

export type CardVariant = 'default' | 'muted' | 'highlight' | 'interactive'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
}

export function Card({
  variant = 'default',
  padding = 'md',
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cx('card', `card--${variant}`, `card--padding-${padding}`, className)}
      {...props}
    />
  )
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  action?: ReactNode
}

export function CardHeader({ action, className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cx('card__header', className)} {...props}>
      <div className="card__heading">{children}</div>
      {action ? <div className="card__action">{action}</div> : null}
    </div>
  )
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: Extract<ElementType, 'h2' | 'h3' | 'h4'>
}

export function CardTitle({ as: Component = 'h2', className, ...props }: CardTitleProps) {
  return <Component className={cx('card__title', className)} {...props} />
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx('card__description', className)} {...props} />
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('card__content', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('card__footer', className)} {...props} />
}
