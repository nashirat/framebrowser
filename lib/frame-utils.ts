export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) {
    return "00:00.000"
  }

  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const wholeSeconds = Math.floor(safeSeconds % 60)
  const milliseconds = Math.floor((safeSeconds % 1) * 1000)

  return `${String(minutes).padStart(2, "0")}:${String(wholeSeconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`
}

export function safeFileStem(fileName: string) {
  const stem = fileName.replace(/\.[^/.]+$/, "")
  const safeStem = stem
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return safeStem || "frame"
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function waitForFrame(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      if ("requestVideoFrameCallback" in video) {
        video.requestVideoFrameCallback(() => resolve())
        return
      }

      requestAnimationFrame(() => resolve())
    }

    if (Math.abs(video.currentTime - time) < 0.001) {
      finish()
      return
    }

    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked)
      finish()
    }

    video.addEventListener("seeked", onSeeked, { once: true })
    video.currentTime = time
  })
}

export function captureFrame(video: HTMLVideoElement) {
  return new Promise<Blob>((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      reject(new Error("Video frame is not ready."))
      return
    }

    canvas.width = width
    canvas.height = height
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height)
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("PNG export failed."))
        return
      }

      resolve(blob)
    }, "image/png")
  })
}
