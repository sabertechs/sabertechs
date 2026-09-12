import * as React from "react"
import { CalendarIcon, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/**
 * Modern date picker with a popover calendar.
 * Value is an ISO date string (yyyy-MM-dd) or "".
 */
export function DatePicker({ value, onChange, placeholder = "Pick a date", className }) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parseISO(value) : undefined

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9 rounded-md border border-slate-200 bg-white hover:bg-slate-50",
              !value && "text-slate-400"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-indigo-500" />
            {value ? format(selected, "dd MMM yyyy") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day) {
                onChange(format(day, "yyyy-MM-dd"))
                setOpen(false)
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rounded-full p-0.5 hover:bg-slate-100"
          aria-label="Clear date"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}