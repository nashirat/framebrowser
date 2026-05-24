"use client"

import { ExportControls } from "@/components/frame-browser/export-controls"
import { ReadoutGrid } from "@/components/frame-browser/readout-grid"

type FrameControlTabProps = {
  canUseVideo: boolean
  currentFrame: number
  totalFrames: number
  currentTime: number
  presentedFrames: number
  mediaTime: number
  stepFrames: number
  rangeStartFrame: number
  rangeEndFrame: number
  exportStepFrames: number
  onStepFramesChange: (value: number) => void
  onRangeStartFrameChange: (value: number) => void
  onRangeEndFrameChange: (value: number) => void
  onExportStepFramesChange: (value: number) => void
  onExport: () => void
}

export function FrameControlTab({
  canUseVideo,
  currentFrame,
  totalFrames,
  currentTime,
  presentedFrames,
  mediaTime,
  stepFrames,
  rangeStartFrame,
  rangeEndFrame,
  exportStepFrames,
  onStepFramesChange,
  onRangeStartFrameChange,
  onRangeEndFrameChange,
  onExportStepFramesChange,
  onExport,
}: FrameControlTabProps) {
  return (
    <div className="grid w-full gap-2">
      <ReadoutGrid
        currentFrame={currentFrame}
        totalFrames={totalFrames}
        currentTime={currentTime}
        presentedFrames={presentedFrames}
        mediaTime={mediaTime}
      />

      <ExportControls
        disabled={!canUseVideo}
        rangeStartFrame={rangeStartFrame}
        rangeEndFrame={rangeEndFrame}
        stepFrames={stepFrames}
        exportStepFrames={exportStepFrames}
        onStepFramesChange={onStepFramesChange}
        onRangeStartFrameChange={onRangeStartFrameChange}
        onRangeEndFrameChange={onRangeEndFrameChange}
        onExportStepFramesChange={onExportStepFramesChange}
        onExport={onExport}
      />
    </div>
  )
}
