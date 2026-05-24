import * as React from "react"

import { cn } from "@/lib/utils"

function Slider({
  className,
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "onChange"> & {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
}) {
  return (
    <input
      data-slot="slider"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value?.[0]}
      defaultValue={defaultValue?.[0]}
      onChange={(event) => onValueChange?.([Number(event.currentTarget.value)])}
      className={cn(
        "h-4 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Slider }
