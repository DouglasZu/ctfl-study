import type { LucideIcon } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { cx } from './utils'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string> {
  value: T
  options: readonly SegmentOption<T>[]
  onChange: (value: T) => void
  label: string
  className?: string
  fullWidth?: boolean
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()

    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
    let nextIndex = currentIndex
    for (let count = 0; count < options.length; count += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length
      const option = options[nextIndex]
      if (option && !option.disabled) {
        onChange(option.value)
        itemRefs.current[nextIndex]?.focus()
        break
      }
    }
  }

  return (
    <div
      className={cx('segmented-control', fullWidth && 'segmented-control--full', className)}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((option, index) => {
        const Icon = option.icon
        const selected = option.value === value
        return (
          <button
            key={option.value}
            ref={(element) => {
              itemRefs.current[index] = element
            }}
            type="button"
            className={cx('segmented-control__item', selected && 'is-selected')}
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => moveSelection(event, index)}
          >
            {Icon ? <Icon size={17} aria-hidden="true" /> : null}
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
