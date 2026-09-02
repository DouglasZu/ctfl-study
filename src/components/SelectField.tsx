import { ChevronDown } from 'lucide-react'
import { useId, type SelectHTMLAttributes } from 'react'
import { cx } from './utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string
  options: readonly SelectOption[]
  hint?: string
  error?: string
  placeholder?: string
}

export function SelectField({
  label,
  options,
  hint,
  error,
  placeholder,
  id,
  className,
  required,
  ...props
}: SelectFieldProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const supportingId = hint || error ? `${selectId}-supporting` : undefined

  return (
    <div className={cx('field', error && 'field--error')}>
      <label className="field__label" htmlFor={selectId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className="select-wrap">
        <select
          id={selectId}
          className={cx('select', className)}
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={supportingId}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="select-wrap__icon" size={18} aria-hidden="true" />
      </div>
      {error || hint ? (
        <span id={supportingId} className={cx('field__supporting', error && 'field__error')}>
          {error ?? hint}
        </span>
      ) : null}
    </div>
  )
}
