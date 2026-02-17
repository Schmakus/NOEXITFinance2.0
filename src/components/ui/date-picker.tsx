import * as React from "react"
import { format, parse } from "date-fns"
import { de } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  /** Date value as ISO string (YYYY-MM-DD) */
  value?: string
  /** Called with ISO string (YYYY-MM-DD) or empty string */
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function DatePicker({ value, onChange, placeholder = "Datum wählen", className, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, "dd.MM.yyyy", { locale: de }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
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
  )
}

export { DatePicker }
