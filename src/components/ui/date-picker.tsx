import * as React from "react"
import { format, parse } from "date-fns"
import { de } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DatePickerProps {
  /** Date value as ISO string (YYYY-MM-DD) */
  value?: string
  /** Called with ISO string (YYYY-MM-DD) or empty string */
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function DatePicker({ value, onChange, className, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState<string>("")
  const [inputError, setInputError] = React.useState<string>("")

  React.useEffect(() => {
    if (value) {
      const d = parse(value, "yyyy-MM-dd", new Date())
      if (!isNaN(d.getTime())) {
        setInputValue(format(d, "dd.MM.yyyy"))
      } else {
        setInputValue("")
      }
    } else {
      setInputValue("")
    }
  }, [value])

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    const d = parse(value, "yyyy-MM-dd", new Date())
    return isNaN(d.getTime()) ? undefined : d
  }, [value])

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange?.(format(day, "yyyy-MM-dd"))
    } else {
      onChange?.("")
    }
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    setInputError("")
    // Prüfe Format dd.mm.yyyy
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(val)) {
      const [day, month, year] = val.split(".")
      const d = new Date(Number(year), Number(month) - 1, Number(day))
      if (!isNaN(d.getTime())) {
        onChange?.(format(d, "yyyy-MM-dd"))
        setInputError("")
      } else {
        setInputError("Ungültiges Datum")
      }
    } else if (val === "") {
      onChange?.("")
      setInputError("")
    } else {
      setInputError("Format: TT.MM.JJJJ")
    }
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex gap-2 items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-10 justify-center text-center font-normal h-10 p-0 flex items-center",
                !value && "text-muted-foreground"
              )}
              aria-label="Datum wählen"
            >
              <CalendarIcon className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 border border-border shadow-sm rounded-lg bg-amber-600 text-[#23272f]"
            align="start"
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              locale={de}
              showOutsideDays
              classNames={{
                root: "p-3",
                months: "flex flex-col sm:flex-row gap-2",
                month: "flex flex-col gap-4",
                month_caption: "flex justify-center pt-1 relative items-center",
                caption_label: "text-sm font-medium",
                nav: "flex items-center gap-1",
                button_previous: "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
                button_next: "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input",
                month_grid: "w-full border-collapse space-x-1",
                weekdays: "flex",
                weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                week: "flex w-full mt-2",
                day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent",
                day_button: "h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer",
                selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
                today: "bg-accent text-accent-foreground rounded-md",
                outside: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-50",
                hidden: "invisible",
              }}
            />
          </PopoverContent>
        </Popover>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="TT.MM.JJJJ"
          className="w-32"
          disabled={disabled}
          maxLength={10}
          variant="amber"
        />
      </div>
      {inputError && <span className="text-xs text-red-500">{inputError}</span>}
    </div>
  )
}

export { DatePicker }
