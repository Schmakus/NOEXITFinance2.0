import * as React from 'react'

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
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, value, onChange, placeholder, className }) => {
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
    <div className={`relative w-full ${className ?? ''}`}>
      <div className="flex flex-wrap gap-1 items-center border rounded px-2 py-1 bg-background focus-within:ring-2 ring-amber-400">
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
          className="flex-1 min-w-[80px] bg-transparent outline-none text-sm px-1 py-0.5"
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
        <div className="absolute z-10 mt-1 w-full bg-background border rounded shadow-lg max-h-40 overflow-auto">
          {filteredOptions.map((opt) => (
            <div
              key={opt.value}
              className="px-3 py-2 hover:bg-amber-100 cursor-pointer text-sm"
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
