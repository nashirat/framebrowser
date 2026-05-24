"use client"

import * as React from "react"

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function TooltipTrigger({
  asChild,
  children,
}: {
  asChild?: boolean
  children: React.ReactNode
}) {
  return asChild ? <>{children}</> : <span>{children}</span>
}

function TooltipContent({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
