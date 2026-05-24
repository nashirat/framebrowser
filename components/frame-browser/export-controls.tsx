"use client"

import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ExportControlsProps = {
  disabled: boolean
  rangeStartFrame: number
  rangeEndFrame: number
  stepFrames: number
  exportStepFrames: number
  onStepFramesChange: (value: number) => void
  onRangeStartFrameChange: (value: number) => void
  onRangeEndFrameChange: (value: number) => void
  onExportStepFramesChange: (value: number) => void
  onExport: () => void
}

export function ExportControls({
  disabled,
  rangeStartFrame,
  rangeEndFrame,
  stepFrames,
  exportStepFrames,
  onStepFramesChange,
  onRangeStartFrameChange,
  onRangeEndFrameChange,
  onExportStepFramesChange,
  onExport,
}: ExportControlsProps) {
  const readNumber = (value: string, fallback: number) => {
    const nextValue = Number(value)
    return Number.isFinite(nextValue) ? nextValue : fallback
  }

  return (
    <div className="grid gap-1.5 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
      <div className="grid gap-0.5">
        <Label htmlFor="step-frames">Step frames</Label>
        <Input
          id="step-frames"
          type="number"
          min={1}
          value={stepFrames}
          onChange={(event) =>
            onStepFramesChange(
              Math.max(1, Math.round(readNumber(event.target.value, stepFrames)))
            )
          }
        />
      </div>
      <div className="grid gap-0.5">
        <Label htmlFor="range-start-frame">Range start</Label>
        <Input
          id="range-start-frame"
          type="number"
          min={0}
          value={rangeStartFrame}
          disabled={disabled}
          onChange={(event) =>
            onRangeStartFrameChange(readNumber(event.target.value, rangeStartFrame))
          }
        />
      </div>
      <div className="grid gap-0.5">
        <Label htmlFor="range-end-frame">Range end</Label>
        <Input
          id="range-end-frame"
          type="number"
          min={0}
          value={rangeEndFrame}
          disabled={disabled}
          onChange={(event) =>
            onRangeEndFrameChange(readNumber(event.target.value, rangeEndFrame))
          }
        />
      </div>
      <div className="grid gap-0.5">
        <Label htmlFor="export-step-frames">Export step</Label>
        <Input
          id="export-step-frames"
          type="number"
          min={1}
          value={exportStepFrames}
          disabled={disabled}
          onChange={(event) =>
            onExportStepFramesChange(
              Math.max(1, readNumber(event.target.value, exportStepFrames))
            )
          }
        />
      </div>
      <Button
        type="button"
        className="self-end"
        disabled={disabled}
        onClick={onExport}
      >
        <Download />
        Export
      </Button>
    </div>
  )
}
