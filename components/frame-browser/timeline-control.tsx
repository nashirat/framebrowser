"use client"

import { Pause, Play } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { formatTime } from "@/lib/frame-utils"

type TimelineControlProps = {
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackRate: number
  stepFrames: number
  exportStatus: string
  disabled: boolean
  onLoadFile: (file: File) => void
  onPlaybackRateChange: (value: number) => void
  onSeek: (time: number) => void
  onStepFrames: (frames: number) => void
  onTogglePlayback: () => void
}

export function TimelineControl({
  currentTime,
  duration,
  isPlaying,
  playbackRate,
  stepFrames,
  exportStatus,
  disabled,
  onLoadFile,
  onPlaybackRateChange,
  onSeek,
  onStepFrames,
  onTogglePlayback,
}: TimelineControlProps) {
  return (
    <div className="grid gap-0.5">
      <Slider
        value={[currentTime]}
        min={0}
        max={duration || 0}
        step={0.001}
        disabled={disabled}
        onValueChange={([value]) => onSeek(value)}
        aria-label="Timeline"
        className="h-3"
      />
      <div className="flex items-center justify-between font-mono text-[10px] leading-3 text-muted-foreground">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div className="relative flex min-h-7 items-center justify-between gap-2">
        <div className="z-10 flex min-w-0 items-center justify-start">
          <Button asChild variant="secondary" size="xs">
            <label>
              Load
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) {
                    onLoadFile(file)
                  }
                  event.currentTarget.value = ""
                }}
              />
            </label>
          </Button>
        </div>
        <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center justify-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="xs"
              title="Move to start"
              disabled={disabled}
              onClick={() => onSeek(0)}
            >
              Start
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              title={`Back ${stepFrames} frames`}
              disabled={disabled}
              onClick={() => onStepFrames(-stepFrames)}
            >
              -{stepFrames}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              title="Back one frame"
              disabled={disabled}
              onClick={() => onStepFrames(-1)}
            >
              -1
            </Button>
            <Button
              type="button"
              size="icon-sm"
              title={isPlaying ? "Pause" : "Play"}
              disabled={disabled}
              onClick={onTogglePlayback}
            >
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              title="Forward one frame"
              disabled={disabled}
              onClick={() => onStepFrames(1)}
            >
              +1
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              title={`Forward ${stepFrames} frames`}
              disabled={disabled}
              onClick={() => onStepFrames(stepFrames)}
            >
              +{stepFrames}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              title="Move to end"
              disabled={disabled}
              onClick={() => onSeek(duration)}
            >
              End
            </Button>
          </div>
        </div>
        <div className="z-10 flex min-w-0 items-center justify-end gap-1.5">
          <span className="text-[10px] text-muted-foreground">Speed</span>
          <Input
            type="number"
            min={0.1}
            max={4}
            step={0.1}
            value={playbackRate}
            aria-label="Playback speed"
            className="h-6 w-16 px-1.5 text-xs"
            disabled={disabled}
            onChange={(event) => {
              const nextRate = Number(event.target.value)

              if (Number.isFinite(nextRate)) {
                onPlaybackRateChange(Math.min(Math.max(nextRate, 0.1), 4))
              }
            }}
          />
          <Badge className="h-6 max-w-full px-2">
            <span className="truncate">{exportStatus}</span>
          </Badge>
        </div>
      </div>
    </div>
  )
}
