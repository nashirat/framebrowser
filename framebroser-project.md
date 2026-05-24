# Frame Browser Standalone Project Brief

## Goal

Build a standalone web app for browsing video frame-by-frame, reading frame/time metadata, and exporting still frames. UI should feel like a compact video editor: video preview on top, timeline always visible below it, controls docked at the bottom.

## Name

Frame Browser

Use `/framebroser` only if preserving old route compatibility. For new project, prefer `/` or `/frame-browser`.

## Stack

- Next.js App Router
- TypeScript
- shadcn/ui
- Tailwind CSS
- No backend required for MVP
- Browser APIs: `HTMLVideoElement`, `requestVideoFrameCallback`, `canvas.toBlob`, `URL.createObjectURL`

## Core User Flow

1. User loads local video file.
2. App shows video preview.
3. User scrubs timeline or steps frame-by-frame.
4. App displays current frame, total frames, current time, decoded frames, and media time.
5. User exports current frame as PNG.
6. User exports frame range as ZIP of PNG files.

## Layout

Use vertical editor layout:

- Top: video viewer, centered, dark preview shell, `object-fit: contain`.
- Bottom: control dock.
- First row of dock: thin full-width timeline, always visible.
- Under timeline: tabs.
- First tab: `Frame control`.
- `Frame control` tab includes readouts, transport buttons, FPS settings, step settings, and export tools.

Avoid side panel layout. Controls should not sit beside video.

## shadcn/ui Components

Use these components:

- `Button` for load, transport, export actions.
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` for dock panels.
- `Slider` for timeline.
- `Input` for numeric fields.
- `Label` for field labels.
- `Separator` between compact groups if needed.
- `Badge` for export status or loaded file status.
- `Tooltip` for compact icon buttons if icons are used.

Optional:

- `Card` only for repeated/export groups if needed. Do not wrap whole dock in nested cards.
- `ScrollArea` only on small screens if content truly overflows. Desktop should not show internal scrollbar.

## UI Details

- Dock should be compact, not tall.
- Timeline should be visually thin and full width.
- Use a dense grid for controls.
- Keep filename visible but clamp long names.
- Prefer icon buttons for transport controls if available:
  - skip back step
  - back one frame
  - play/pause
  - forward one frame
  - skip forward step
- Use readable time format: `MM:SS.mmm`.
- Disable video actions until a file is loaded.

## State

Required state:

- `videoUrl`
- `fileName`
- `duration`
- `currentTime`
- `fps`
- `stepFrames`
- `isPlaying`
- `presentedFrames`
- `mediaTime`
- `rangeStartFrame`
- `rangeEndFrame`
- `exportStepFrames`
- `exportStatus`

Derived values:

- `frameDuration = 1 / fps`
- `currentFrame = round(currentTime * fps)`
- `totalFrames = floor(duration * fps)`
- `canUseVideo = Boolean(videoUrl)`
- `exportName = safe file stem from fileName`

## Video Behavior

- Use local file object URL for video source.
- Revoke old object URL when loading a new file.
- Revoke object URL on unmount.
- Use `playsInline`.
- On metadata loaded:
  - set duration
  - set current time
  - set range end frame to video duration times FPS
- On seek/time update:
  - update `currentTime`
- On play/pause:
  - update `isPlaying`
- Use `requestVideoFrameCallback` when available for decoded frame metadata.

## Keyboard Shortcuts

Ignore shortcuts while typing in inputs.

- `ArrowLeft`: seek back 1 frame
- `ArrowRight`: seek forward 1 frame
- `Shift + ArrowLeft`: seek back by configured step frames
- `Shift + ArrowRight`: seek forward by configured step frames
- `Space`: play/pause

## Export Behavior

Current frame export:

- Seek video to selected frame time.
- Draw video to canvas.
- Export PNG blob.
- Download as `{safeFileStem}_{frameNumberPadded}.png`.

Range export:

- Clamp start/end frames.
- Step through frames by `exportStepFrames`.
- Capture PNG blob for each frame.
- ZIP in browser.
- Download as `{safeFileStem}_{start}-{end}_every-{step}.zip`.

No server upload required.

## Utility Functions Needed

- `safeFileStem(fileName: string)`
- `formatTime(seconds: number)`
- `clamp(value: number, min: number, max: number)`
- `waitForFrame(video, time)`
- `captureFrame(video)`
- `downloadBlob(blob, name)`
- `createZip(entries)`

MVP can keep a small in-browser ZIP implementation, or use a dependency such as `fflate` if project allows dependencies.

## Suggested File Structure

```txt
app/
  page.tsx
  layout.tsx
components/
  frame-browser/
    frame-browser.tsx
    video-viewer.tsx
    timeline-control.tsx
    frame-control-tab.tsx
    export-controls.tsx
    readout-grid.tsx
lib/
  frame-utils.ts
  zip.ts
```

## Acceptance Criteria

- Local video loads without upload.
- Video preview stays above controls on desktop and mobile.
- Timeline remains visible regardless of active tab.
- First tab is `Frame control`.
- Export controls live inside `Frame control`, not a separate tab.
- No desktop internal scrollbar in bottom dock for normal viewport sizes.
- User can step exactly one frame based on configured FPS.
- User can export current frame as PNG.
- User can export frame range as ZIP.
- Object URLs are cleaned up.

## Nice-To-Have Later

- Dropzone for loading video.
- Recent files list using browser storage.
- Thumbnail strip.
- Actual frame extraction via WebCodecs when available.
- Export progress bar.
- Editable timecode input.
- Preserve settings in local storage.
