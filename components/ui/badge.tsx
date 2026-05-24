import * as React from "react"

import { cn } from "@/lib/utils"

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-6 min-w-0 items-center rounded-md border border-border bg-secondary px-2 text-xs font-medium text-secondary-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
