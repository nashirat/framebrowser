import { formatTime } from "@/lib/frame-utils"

type ReadoutGridProps = {
  currentFrame: number
  totalFrames: number
  currentTime: number
  presentedFrames: number
  mediaTime: number
}

function Readout({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-2 py-0.5">
      <div className="text-[10px] leading-4 text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-xs leading-5">{value}</div>
    </div>
  )
}

export function ReadoutGrid({
  currentFrame,
  totalFrames,
  currentTime,
  presentedFrames,
  mediaTime,
}: ReadoutGridProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
      <Readout label="Frame" value={`${currentFrame} / ${totalFrames}`} />
      <Readout label="Time" value={formatTime(currentTime)} />
      <Readout label="Decoded" value={presentedFrames} />
      <Readout label="Media time" value={formatTime(mediaTime)} />
      <Readout label="Clock" value={`${Math.round(mediaTime * 1000)} ms`} />
    </div>
  )
}
