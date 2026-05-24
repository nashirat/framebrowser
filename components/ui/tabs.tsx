"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  value: string
  setValue: (value: string) => void
} | null>(null)

function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const currentValue = value ?? internalValue
  const setValue = React.useCallback(
    (nextValue: string) => {
      setInternalValue(nextValue)
      onValueChange?.(nextValue)
    },
    [onValueChange]
  )

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div data-slot="tabs" className={cn("flex flex-col", className)} {...props} />
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      role="tablist"
      className={cn(
        "inline-flex h-8 w-fit items-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  value,
  className,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const context = React.useContext(TabsContext)
  const active = context?.value === value

  return (
    <button
      data-slot="tabs-trigger"
      role="tab"
      type="button"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={() => context?.setValue(value)}
      className={cn(
        "inline-flex h-6 items-center justify-center rounded-sm px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const context = React.useContext(TabsContext)

  if (context?.value !== value) {
    return null
  }

  return (
    <div
      data-slot="tabs-content"
      role="tabpanel"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
