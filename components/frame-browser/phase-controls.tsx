"use client"

import * as React from "react"
import { Plus, Scissors, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { clamp, downloadBlob, formatTime } from "@/lib/frame-utils"

export type Phase = {
  id: string
  label: string
  startFrame: number
  endFrame: number
}

type PhaseControlsProps = {
  disabled: boolean
  currentFrame: number
  totalFrames: number
  fps: number
  phaseStartFrame: number
  phaseEndFrame: number
  phaseStartLocked: boolean
  phaseEndLocked: boolean
  phases: Phase[]
  onPhaseStartFrameChange: (value: number) => void
  onPhaseEndFrameChange: (value: number) => void
  onUseCurrentAsStart: () => void
  onUseCurrentAsEnd: () => void
  onAddPhase: () => void
  onRenamePhase: (id: string, label: string) => void
  onRemovePhase: (id: string) => void
  onSeekFrame: (frame: number) => void
}

function readNumber(value: string, fallback: number) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

function getPhaseMetrics(phase: Phase, fps: number) {
  const startFrame = Math.min(phase.startFrame, phase.endFrame)
  const endFrame = Math.max(phase.startFrame, phase.endFrame)
  const frameCount = endFrame - startFrame + 1
  const milliseconds = Math.round((frameCount / fps) * 1000)

  return { endFrame, frameCount, milliseconds, startFrame }
}

function getIntersectingRanges(phase: Phase, phases: Phase[], fps: number) {
  const { endFrame, startFrame } = getPhaseMetrics(phase, fps)

  return phases
    .map((candidate) => ({ candidate }))
    .filter(({ candidate }) => candidate.id !== phase.id)
    .map(({ candidate }) => {
      const candidateMetrics = getPhaseMetrics(candidate, fps)
      const overlapStart = Math.max(startFrame, candidateMetrics.startFrame)
      const overlapEnd = Math.min(endFrame, candidateMetrics.endFrame)

      if (overlapStart > overlapEnd) {
        return null
      }

      const frameCount = overlapEnd - overlapStart + 1
      return {
        endFrame: overlapEnd,
        frameCount,
        label: candidate.label,
        milliseconds: Math.round((frameCount / fps) * 1000),
        startFrame: overlapStart,
      }
    })
    .filter((range): range is NonNullable<typeof range> => Boolean(range))
}

export function PhaseControls({
  disabled,
  currentFrame,
  totalFrames,
  fps,
  phaseStartFrame,
  phaseEndFrame,
  phaseStartLocked,
  phaseEndLocked,
  phases,
  onPhaseStartFrameChange,
  onPhaseEndFrameChange,
  onUseCurrentAsStart,
  onUseCurrentAsEnd,
  onAddPhase,
  onRenamePhase,
  onRemovePhase,
  onSeekFrame,
}: PhaseControlsProps) {
  const [selectedPhaseIds, setSelectedPhaseIds] = React.useState<string[]>([])
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const barRefs = React.useRef(new Map<string, HTMLButtonElement>())
  const [barRects, setBarRects] = React.useState<
    Record<string, { height: number; left: number; top: number; width: number }>
  >({})
  const safeTotalFrames = Math.max(1, totalFrames)
  const previewStart = clamp(Math.min(phaseStartFrame, phaseEndFrame), 0, safeTotalFrames)
  const previewEnd = clamp(Math.max(phaseStartFrame, phaseEndFrame), 0, safeTotalFrames)
  const previewFrameCount = previewEnd - previewStart + 1
  const previewMs = Math.round((previewFrameCount / fps) * 1000)
  const selectedPhaseIdSet = React.useMemo(
    () => new Set(selectedPhaseIds),
    [selectedPhaseIds]
  )
  const selectedPhaseCount = phases.filter((phase) =>
    selectedPhaseIdSet.has(phase.id)
  ).length
  const selectedPhases = phases.filter((phase) => selectedPhaseIdSet.has(phase.id))
  const intersectionGuides = React.useMemo(() => {
    const guides: {
      endFrame: number
      fromId: string
      key: string
      startFrame: number
      toId: string
    }[] = []

    for (let index = 0; index < selectedPhases.length; index += 1) {
      const phase = selectedPhases[index]
      const metrics = getPhaseMetrics(phase, fps)

      for (
        let compareIndex = index + 1;
        compareIndex < selectedPhases.length;
        compareIndex += 1
      ) {
        const candidate = selectedPhases[compareIndex]
        const candidateMetrics = getPhaseMetrics(candidate, fps)
        const startFrame = Math.max(metrics.startFrame, candidateMetrics.startFrame)
        const endFrame = Math.min(metrics.endFrame, candidateMetrics.endFrame)

        if (startFrame <= endFrame) {
          guides.push({
            endFrame,
            fromId: phase.id,
            key: `${phase.id}-${candidate.id}-${startFrame}-${endFrame}`,
            startFrame,
            toId: candidate.id,
          })
        }
      }
    }

    return guides
  }, [fps, selectedPhases])

  React.useEffect(() => {
    setSelectedPhaseIds((currentIds) => {
      const phaseIds = new Set(phases.map((phase) => phase.id))
      const nextIds = currentIds.filter((id) => phaseIds.has(id))

      for (const phase of phases) {
        if (!nextIds.includes(phase.id)) {
          nextIds.push(phase.id)
        }
      }

      return nextIds
    })
  }, [phases])

  React.useEffect(() => {
    const measureBars = () => {
      const listRect = listRef.current?.getBoundingClientRect()

      if (!listRect) {
        return
      }

      const nextRects: Record<
        string,
        { height: number; left: number; top: number; width: number }
      > = {}

      for (const [id, element] of barRefs.current) {
        const rect = element.getBoundingClientRect()
        nextRects[id] = {
          height: rect.height,
          left: rect.left - listRect.left,
          top: rect.top - listRect.top,
          width: rect.width,
        }
      }

      setBarRects(nextRects)
    }

    measureBars()

    const resizeObserver = new ResizeObserver(measureBars)
    if (listRef.current) {
      resizeObserver.observe(listRef.current)
    }

    for (const element of barRefs.current.values()) {
      resizeObserver.observe(element)
    }

    window.addEventListener("resize", measureBars)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", measureBars)
    }
  }, [phases, selectedPhaseIds])

  const exportSelectedPhases = React.useCallback(() => {
    const payload = {
      fps,
      totalFrames,
      phases: selectedPhases.map((phase) => {
        const metrics = getPhaseMetrics(phase, fps)

        return {
          label: phase.label,
          startFrame: metrics.startFrame,
          endFrame: metrics.endFrame,
          frameCount: metrics.frameCount,
          durationMs: metrics.milliseconds,
          timeline: {
            startMs: Math.round((metrics.startFrame / fps) * 1000),
            endMs: Math.round((metrics.endFrame / fps) * 1000),
            startTime: formatTime(metrics.startFrame / fps),
            endTime: formatTime(metrics.endFrame / fps),
          },
          intersects: getIntersectingRanges(phase, selectedPhases, fps).map(
            (intersection) => ({
              phase: intersection.label,
              startFrame: intersection.startFrame,
              endFrame: intersection.endFrame,
              frameCount: intersection.frameCount,
              durationMs: intersection.milliseconds,
            })
          ),
        }
      }),
    }

    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
      "frame-browser-phases.json"
    )
  }, [fps, selectedPhases, totalFrames])

  return (
    <section className="grid w-full gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium">Phase</div>
        <Badge>{previewFrameCount} frames</Badge>
        <Badge>{previewMs} ms</Badge>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="ml-auto"
          disabled={selectedPhaseCount === 0}
          onClick={exportSelectedPhases}
        >
          Export JSON
        </Button>
      </div>

      <div className="grid gap-2 lg:grid-cols-[repeat(2,minmax(0,1fr))_auto_auto_auto]">
        <div className="grid gap-1">
          <Label htmlFor="phase-start-frame">Start frame</Label>
          <Input
            id="phase-start-frame"
            type="number"
            min={0}
            max={totalFrames}
            value={phaseStartFrame}
            disabled={disabled || phaseStartLocked}
            onChange={(event) =>
              onPhaseStartFrameChange(
                clamp(
                  Math.round(readNumber(event.target.value, phaseStartFrame)),
                  0,
                  safeTotalFrames
                )
              )
            }
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="phase-end-frame">End frame</Label>
          <Input
            id="phase-end-frame"
            type="number"
            min={0}
            max={totalFrames}
            value={phaseEndFrame}
            disabled={disabled || !phaseStartLocked || phaseEndLocked}
            onChange={(event) =>
              onPhaseEndFrameChange(
                clamp(
                  Math.round(readNumber(event.target.value, phaseEndFrame)),
                  0,
                  safeTotalFrames
                )
              )
            }
          />
        </div>
        <Button
          type="button"
          variant={phaseStartLocked ? "default" : "outline"}
          className={
            phaseStartLocked
              ? "self-end bg-emerald-600 text-white hover:bg-emerald-700"
              : "self-end"
          }
          disabled={disabled || phaseStartLocked}
          onClick={onUseCurrentAsStart}
        >
          <Plus />
          {phaseStartLocked ? "Started" : "Start"}
        </Button>
        <Button
          type="button"
          variant={phaseEndLocked ? "default" : "outline"}
          className={
            phaseEndLocked
              ? "self-end bg-red-600 text-white hover:bg-red-700"
              : "self-end"
          }
          disabled={disabled || !phaseStartLocked || phaseEndLocked}
          onClick={onUseCurrentAsEnd}
        >
          <Plus />
          {phaseEndLocked ? "Ended" : "End"}
        </Button>
        <Button
          type="button"
          className="self-end"
          disabled={disabled}
          onClick={onAddPhase}
        >
          <Scissors />
          Separate
        </Button>
      </div>

      <div ref={listRef} className="relative grid gap-1">
        {phases.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-2 py-2 text-xs text-muted-foreground">
            No separated phases yet.
          </div>
        ) : (
          phases.map((phase) => {
            const { endFrame, frameCount, milliseconds, startFrame } =
              getPhaseMetrics(phase, fps)
            const intersections = selectedPhaseIdSet.has(phase.id)
              ? getIntersectingRanges(phase, selectedPhases, fps)
              : []

            return (
              <div
                key={phase.id}
                className="relative grid gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-xs"
              >
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedPhaseIdSet.has(phase.id)}
                    aria-label={`Select ${phase.label}`}
                    className="size-3.5 accent-primary"
                    onChange={(event) => {
                      setSelectedPhaseIds((currentIds) =>
                        event.target.checked
                          ? [...currentIds, phase.id]
                          : currentIds.filter((id) => id !== phase.id)
                      )
                    }}
                  />
                  <Input
                    value={phase.label}
                    className="h-6 min-w-0 px-1.5 text-xs font-medium"
                    aria-label={`${phase.label} name`}
                    onChange={(event) =>
                      onRenamePhase(phase.id, event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur()
                      }
                    }}
                  />
                  <span className="font-mono">
                    {startFrame}-{endFrame}
                  </span>
                  <span className="font-mono">
                    {frameCount}f / {formatTime(milliseconds / 1000)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    title="Remove phase"
                    onClick={() => onRemovePhase(phase.id)}
                  >
                    <X />
                  </Button>
                </div>
                <button
                  ref={(element) => {
                    if (element) {
                      barRefs.current.set(phase.id, element)
                      return
                    }

                    barRefs.current.delete(phase.id)
                  }}
                  type="button"
                  className="relative h-2 overflow-hidden rounded-full bg-background"
                  title={`${phase.label}: ${startFrame}-${endFrame}`}
                  onClick={() => onSeekFrame(startFrame)}
                >
                  <span
                    className="absolute inset-y-0 rounded-full bg-emerald-500/70"
                    style={{
                      left: `${(startFrame / safeTotalFrames) * 100}%`,
                      width: `${Math.max(((endFrame - startFrame) / safeTotalFrames) * 100, 0.5)}%`,
                    }}
                  />
                  <span
                    className="absolute inset-y-0 w-px bg-primary"
                    style={{ left: `${(currentFrame / safeTotalFrames) * 100}%` }}
                  />
                </button>
                {intersections.length > 0 ? (
                  <div className="grid gap-0.5 font-mono text-[11px] text-muted-foreground">
                    {intersections.map((intersection) => (
                      <div key={`${intersection.label}-${intersection.startFrame}-${intersection.endFrame}`}>
                        Intersects {intersection.label}: {intersection.startFrame}-
                        {intersection.endFrame}, {intersection.frameCount}f /{" "}
                        {formatTime(intersection.milliseconds / 1000)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
        {intersectionGuides.map((guide) => {
          const fromRect = barRects[guide.fromId]
          const toRect = barRects[guide.toId]

          if (!fromRect || !toRect) {
            return null
          }

          const top = Math.min(fromRect.top, toRect.top)
          const bottom = Math.max(
            fromRect.top + fromRect.height,
            toRect.top + toRect.height
          )
          const progressStart = guide.startFrame / safeTotalFrames
          const progressEnd = guide.endFrame / safeTotalFrames

          return (
            <React.Fragment key={guide.key}>
              <span
                className="pointer-events-none absolute z-20 w-0 -translate-x-1/2 border-l-2 border-dotted border-white shadow-[0_0_0_1px_rgba(0,0,0,0.85)]"
                style={{
                  height: `${bottom - top}px`,
                  left: `${fromRect.left + progressStart * fromRect.width}px`,
                  top: `${top}px`,
                }}
              />
              <span
                className="pointer-events-none absolute z-20 w-0 -translate-x-1/2 border-l-2 border-dotted border-white shadow-[0_0_0_1px_rgba(0,0,0,0.85)]"
                style={{
                  height: `${bottom - top}px`,
                  left: `${fromRect.left + progressEnd * fromRect.width}px`,
                  top: `${top}px`,
                }}
              />
            </React.Fragment>
          )
        })}
      </div>
    </section>
  )
}
