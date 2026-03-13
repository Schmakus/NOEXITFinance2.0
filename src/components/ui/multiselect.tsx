import * as React from 'react'
import { cn } from '@/lib/utils'
import { multiSelectOptionVariants, multiSelectVariants } from './multiselect-variants'
import type { MultiSelectVariantProps } from './multiselect-variants'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  variant?: MultiSelectVariantProps['variant']
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder, className, variant }) => {
  const [input, setInput] = React.useState('')
  const [showOptions, setShowOptions] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const filteredOptions = React.useMemo(() => {
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(input.toLowerCase()) &&
        !value.includes(opt.value)
    )
  }, [input, options, value])

  const handleAdd = (val: string) => {
    if (!value.includes(val)) {
      onChange([...value, val])
      setInput('')
      setShowOptions(false)
      inputRef.current?.focus()
    }
  }

  const handleRemove = (val: string) => {
    onChange(value.filter((v) => v !== val))
  }

  return (
    <div className={cn('relative z-40 w-full', className)}>
      <div className={cn(multiSelectVariants({ variant }))}>
        {value.map((val) => {
          const opt = options.find((o) => o.value === val)
          return (
            <span key={val} className="flex items-center bg-amber-100 text-amber-800 rounded px-2 py-0.5 text-xs">
              {opt?.label ?? val}
              <button type="button" className="ml-1 text-amber-600 hover:text-red-500" onClick={() => handleRemove(val)}>
                ×
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          className="h-8 flex-1 min-w-[80px] bg-transparent outline-none text-sm px-1 py-0.5"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setShowOptions(true)
          }}
          onFocus={() => setShowOptions(true)}
          onBlur={() => setTimeout(() => setShowOptions(false), 100)}
          placeholder={placeholder}
        />
      </div>
      {showOptions && filteredOptions.length > 0 && (
        <div className="absolute z-[90] mt-1 max-h-40 w-full overflow-auto rounded-md border border-border bg-[#18181b] shadow-xl">
          {filteredOptions.map((opt) => (
            <div
              key={opt.value}
              className={cn(multiSelectOptionVariants({ variant }))}
              onMouseDown={() => handleAdd(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
