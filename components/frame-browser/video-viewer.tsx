"use client"

import * as React from "react"
import { Upload } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type VideoViewerProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>
  videoUrl: string
  fileName: string
  onLoadedMetadata: () => void
  onTimeUpdate: () => void
  onPlay: () => void
  onPause: () => void
  onLoadFile: (file: File) => void
}

export function VideoViewer({
  videoRef,
  videoUrl,
  fileName,
  onLoadedMetadata,
  onTimeUpdate,
  onPlay,
  onPause,
  onLoadFile,
}: VideoViewerProps) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center bg-zinc-950 p-3 sm:p-5">
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            className="h-full max-h-full w-full object-contain"
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onSeeked={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 px-6 text-center text-sm text-zinc-500">
            <Button asChild size="lg">
              <label>
                <Upload />
                Load video
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
            <div>Load local video to inspect frames.</div>
          </div>
        )}
        <Badge className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] border-white/10 bg-black/70 text-zinc-200">
          <span className="truncate">{fileName || "No file loaded"}</span>
        </Badge>
      </div>
    </section>
  )
}
