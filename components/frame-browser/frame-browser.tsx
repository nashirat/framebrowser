"use client"

import * as React from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FrameControlTab } from "@/components/frame-browser/frame-control-tab"
import {
  PhaseControls,
  type Phase,
} from "@/components/frame-browser/phase-controls"
import { TimelineControl } from "@/components/frame-browser/timeline-control"
import { VideoViewer } from "@/components/frame-browser/video-viewer"
import {
  captureFrame,
  clamp,
  downloadBlob,
  safeFileStem,
  waitForFrame,
} from "@/lib/frame-utils"
import { createZip } from "@/lib/zip"

type VideoMetadata = {
  presentedFrames?: number
  mediaTime?: number
}

export function FrameBrowser() {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const objectUrlRef = React.useRef("")
  const fpsSampleRef = React.useRef<{
    lastMediaTime: number | null
    samples: number[]
  }>({ lastMediaTime: null, samples: [] })
  const [videoUrl, setVideoUrl] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [duration, setDuration] = React.useState(0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [fps, setFps] = React.useState(30)
  const [defaultVideoFps, setDefaultVideoFps] = React.useState<number | null>(null)
  const [playbackRate, setPlaybackRate] = React.useState(1)
  const [stepFrames, setStepFrames] = React.useState(10)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [presentedFrames, setPresentedFrames] = React.useState(0)
  const [mediaTime, setMediaTime] = React.useState(0)
  const [rangeStartFrame, setRangeStartFrame] = React.useState(0)
  const [rangeEndFrame, setRangeEndFrame] = React.useState(0)
  const [exportStepFrames, setExportStepFrames] = React.useState(1)
  const [exportStatus, setExportStatus] = React.useState("No file loaded")
  const [phaseStartFrame, setPhaseStartFrame] = React.useState(0)
  const [phaseEndFrame, setPhaseEndFrame] = React.useState(0)
  const [phaseStartLocked, setPhaseStartLocked] = React.useState(false)
  const [phaseEndLocked, setPhaseEndLocked] = React.useState(false)
  const [phases, setPhases] = React.useState<Phase[]>([])

  const currentFrame = Math.round(currentTime * fps)
  const totalFrames = Math.floor(duration * fps)
  const canUseVideo = Boolean(videoUrl)
  const exportName = safeFileStem(fileName)
  const padWidth = Math.max(4, String(totalFrames).length)

  const seekToTime = React.useCallback(
    (time: number) => {
      const video = videoRef.current
      const nextTime = clamp(time, 0, duration || 0)

      if (video) {
        video.currentTime = nextTime
        return
      }

      setCurrentTime(nextTime)
    },
    [duration]
  )

  const stepByFrames = React.useCallback(
    (frames: number) => {
      const video = videoRef.current
      const sourceTime = video?.currentTime ?? currentTime
      const sourceFrame = Math.round(sourceTime * fps)
      const targetFrame = clamp(sourceFrame + frames, 0, totalFrames)

      seekToTime(targetFrame / fps)
    },
    [currentTime, fps, seekToTime, totalFrames]
  )

  const togglePlayback = React.useCallback(() => {
    const video = videoRef.current

    if (!video) {
      return
    }

    if (video.paused) {
      void video.play()
      return
    }

    video.pause()
  }, [])

  const loadFile = React.useCallback((file: File) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
    }

    const nextUrl = URL.createObjectURL(file)
    objectUrlRef.current = nextUrl
    setVideoUrl(nextUrl)
    setFileName(file.name)
    setDuration(0)
    setCurrentTime(0)
    setFps(30)
    setDefaultVideoFps(null)
    setPresentedFrames(0)
    setMediaTime(0)
    setRangeStartFrame(0)
    setRangeEndFrame(0)
    setPhaseStartFrame(0)
    setPhaseEndFrame(0)
    setPhaseStartLocked(false)
    setPhaseEndLocked(false)
    setPhases([])
    fpsSampleRef.current = { lastMediaTime: null, samples: [] }
    setExportStatus("Loaded")
  }, [])

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate, videoUrl])

  React.useEffect(() => {
    if (duration <= 0) {
      return
    }

    const nextTotalFrames = Math.floor(duration * fps)

    setRangeEndFrame(nextTotalFrames)
    setPhaseStartFrame((frame) => clamp(frame, 0, nextTotalFrames))
    setPhaseEndFrame((frame) => clamp(frame, 0, nextTotalFrames))
  }, [duration, fps])

  React.useEffect(() => {
    if (!canUseVideo) {
      return
    }

    const nextFrame = clamp(currentFrame, 0, totalFrames)

    if (!phaseStartLocked) {
      setPhaseStartFrame(nextFrame)
      setPhaseEndFrame(nextFrame)
      return
    }

    if (!phaseEndLocked) {
      setPhaseEndFrame(nextFrame)
    }
  }, [canUseVideo, currentFrame, phaseEndLocked, phaseStartLocked, totalFrames])

  React.useEffect(() => {
    const video = videoRef.current

    if (!video || !canUseVideo || !("requestVideoFrameCallback" in video)) {
      return
    }

    let active = true
    let callbackId = 0
    const schedule = () => {
      callbackId = video.requestVideoFrameCallback(
        (_now: number, metadata: VideoMetadata) => {
          if (!active) {
            return
          }

          setPresentedFrames(metadata.presentedFrames ?? 0)
          const nextMediaTime = metadata.mediaTime ?? video.currentTime
          const fpsSample = fpsSampleRef.current

          if (fpsSample.lastMediaTime !== null) {
            const delta = nextMediaTime - fpsSample.lastMediaTime

            if (delta > 0.005 && delta < 0.2) {
              const nextSamples = [...fpsSample.samples, 1 / delta].slice(-12)
              fpsSample.samples = nextSamples

              if (nextSamples.length >= 3) {
                const sortedSamples = [...nextSamples].sort((a, b) => a - b)
                const median = sortedSamples[Math.floor(sortedSamples.length / 2)]
                const nextDefaultFps = Number(median.toFixed(3))

                setDefaultVideoFps(nextDefaultFps)
                setFps(nextDefaultFps)
              }
            }
          }

          fpsSample.lastMediaTime = nextMediaTime
          setMediaTime(nextMediaTime)
          setCurrentTime(video.currentTime)
          schedule()
        }
      )
    }

    schedule()

    return () => {
      active = false
      if ("cancelVideoFrameCallback" in video) {
        video.cancelVideoFrameCallback(callbackId)
      }
    }
  }, [canUseVideo, videoUrl])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      if (
        target?.matches("input, textarea, select") ||
        target?.isContentEditable
      ) {
        return
      }

      if (event.code === "Space") {
        event.preventDefault()
        togglePlayback()
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        stepByFrames(event.shiftKey ? -stepFrames : -1)
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        stepByFrames(event.shiftKey ? stepFrames : 1)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [stepByFrames, stepFrames, togglePlayback])

  const exportCurrentFrame = React.useCallback(async () => {
    const video = videoRef.current

    if (!video) {
      return
    }

    try {
      setExportStatus("Exporting PNG")
      const frame = clamp(currentFrame, 0, totalFrames)
      await waitForFrame(video, frame / fps)
      const blob = await captureFrame(video)
      downloadBlob(blob, `${exportName}_${String(frame).padStart(padWidth, "0")}.png`)
      setExportStatus("PNG exported")
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "PNG export failed")
    }
  }, [currentFrame, exportName, fps, padWidth, totalFrames])

  const exportFrameRange = React.useCallback(async () => {
    const video = videoRef.current

    if (!video) {
      return
    }

    const start = clamp(Math.min(rangeStartFrame, rangeEndFrame), 0, totalFrames)
    const end = clamp(Math.max(rangeStartFrame, rangeEndFrame), 0, totalFrames)
    const step = Math.max(1, Math.round(exportStepFrames))
    const entries: { name: string; data: Blob }[] = []

    try {
      for (let frame = start; frame <= end; frame += step) {
        setExportStatus(`Exporting ${frame} / ${end}`)
        await waitForFrame(video, frame / fps)
        entries.push({
          name: `${exportName}_${String(frame).padStart(padWidth, "0")}.png`,
          data: await captureFrame(video),
        })
      }

      const zip = await createZip(entries)
      downloadBlob(zip, `${exportName}_${start}-${end}_every-${step}.zip`)
      setExportStatus(`ZIP exported (${entries.length} PNG)`)
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "ZIP export failed")
    }
  }, [
    exportName,
    exportStepFrames,
    fps,
    padWidth,
    rangeEndFrame,
    rangeStartFrame,
    totalFrames,
  ])

  const exportSelection = React.useCallback(() => {
    if (rangeStartFrame === rangeEndFrame) {
      void exportCurrentFrame()
      return
    }

    void exportFrameRange()
  }, [exportCurrentFrame, exportFrameRange, rangeEndFrame, rangeStartFrame])

  const seekToFrame = React.useCallback(
    (frame: number) => {
      seekToTime(clamp(frame, 0, totalFrames) / fps)
    },
    [fps, seekToTime, totalFrames]
  )

  const addPhase = React.useCallback(() => {
    const startFrame = clamp(Math.min(phaseStartFrame, phaseEndFrame), 0, totalFrames)
    const endFrame = clamp(Math.max(phaseStartFrame, phaseEndFrame), 0, totalFrames)

    setPhases((currentPhases) => [
      ...currentPhases,
      {
        id: `${Date.now()}-${currentPhases.length}`,
        label: `Phase ${currentPhases.length + 1}`,
        startFrame,
        endFrame,
      },
    ])
    setPhaseStartFrame(currentFrame)
    setPhaseEndFrame(currentFrame)
    setPhaseStartLocked(false)
    setPhaseEndLocked(false)
  }, [currentFrame, phaseEndFrame, phaseStartFrame, totalFrames])

  return (
    <main className="flex h-svh min-h-0 flex-col bg-background text-foreground">
      <VideoViewer
        videoRef={videoRef}
        videoUrl={videoUrl}
        fileName={fileName}
        onLoadedMetadata={() => {
          const video = videoRef.current
          const nextDuration = video?.duration ?? 0
          const safeDuration = Number.isFinite(nextDuration) ? nextDuration : 0
          const nextTotalFrames = Math.floor(safeDuration * fps)

          setDuration(safeDuration)
          setCurrentTime(0)
          setRangeEndFrame(nextTotalFrames)
          setPhaseEndFrame(nextTotalFrames)
          setExportStatus("Ready")
        }}
        onTimeUpdate={() => {
          const video = videoRef.current

          if (video) {
            setCurrentTime(video.currentTime)
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadFile={loadFile}
      />

      <section className="h-[390px] shrink-0 overflow-hidden border-t border-border bg-background px-3 py-2 shadow-[0_-12px_32px_rgba(0,0,0,0.08)] sm:h-[360px] sm:px-4">
        <TimelineControl
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          playbackRate={playbackRate}
          stepFrames={stepFrames}
          exportStatus={exportStatus}
          disabled={!canUseVideo}
          onLoadFile={loadFile}
          onPlaybackRateChange={setPlaybackRate}
          onSeek={seekToTime}
          onStepFrames={stepByFrames}
          onTogglePlayback={togglePlayback}
        />
        <Tabs
          defaultValue="frame-control"
          className="mt-1.5 h-[calc(100%-4.75rem)] min-h-0 gap-1.5"
        >
          <TabsList>
            <TabsTrigger value="frame-control">Frame control</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="phase">Phase</TabsTrigger>
          </TabsList>
          <TabsContent
            value="frame-control"
            className="flex min-h-0 flex-1 items-center overflow-y-auto pr-1"
          >
            <FrameControlTab
              canUseVideo={canUseVideo}
              currentFrame={currentFrame}
              totalFrames={totalFrames}
              currentTime={currentTime}
              presentedFrames={presentedFrames}
              mediaTime={mediaTime}
              stepFrames={stepFrames}
              rangeStartFrame={rangeStartFrame}
              rangeEndFrame={rangeEndFrame}
              exportStepFrames={exportStepFrames}
              onStepFramesChange={setStepFrames}
              onRangeStartFrameChange={setRangeStartFrame}
              onRangeEndFrameChange={setRangeEndFrame}
              onExportStepFramesChange={setExportStepFrames}
              onExport={exportSelection}
            />
          </TabsContent>
          <TabsContent
            value="metadata"
            className="flex min-h-0 flex-1 items-center overflow-y-auto pr-1"
          >
            <div className="grid w-full grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-md border border-border bg-muted/40 p-2">
                Duration: {duration.toFixed(3)}s
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-2">
                FPS: {fps}
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-2">
                Frames: {totalFrames}
              </div>
              <div className="truncate rounded-md border border-border bg-muted/40 p-2">
                Source: {fileName || "none"}
              </div>
            </div>
          </TabsContent>
          <TabsContent
            value="phase"
            className="flex min-h-0 flex-1 items-center overflow-y-auto pr-1"
          >
            <PhaseControls
              disabled={!canUseVideo}
              currentFrame={currentFrame}
              totalFrames={totalFrames}
              fps={fps}
              phaseStartFrame={phaseStartFrame}
              phaseEndFrame={phaseEndFrame}
              phaseStartLocked={phaseStartLocked}
              phaseEndLocked={phaseEndLocked}
              phases={phases}
              onPhaseStartFrameChange={(frame) => {
                setPhaseStartFrame(frame)
                setPhaseStartLocked(true)
              }}
              onPhaseEndFrameChange={(frame) => {
                setPhaseEndFrame(frame)
                setPhaseEndLocked(true)
              }}
              onUseCurrentAsStart={() => {
                setPhaseStartFrame(currentFrame)
                setPhaseEndFrame(currentFrame)
                setPhaseStartLocked(true)
                setPhaseEndLocked(false)
              }}
              onUseCurrentAsEnd={() => {
                setPhaseEndFrame(currentFrame)
                setPhaseEndLocked(true)
              }}
              onAddPhase={addPhase}
              onRenamePhase={(id, label) =>
                setPhases((currentPhases) =>
                  currentPhases.map((phase) =>
                    phase.id === id ? { ...phase, label } : phase
                  )
                )
              }
              onRemovePhase={(id) =>
                setPhases((currentPhases) =>
                  currentPhases.filter((phase) => phase.id !== id)
                )
              }
              onSeekFrame={seekToFrame}
            />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  )
}
