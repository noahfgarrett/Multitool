/**
 * Load an image file into an HTMLImageElement.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Resize an image on a canvas and return the canvas.
 */
export function resizeImage(
  img: HTMLImageElement,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

/**
 * Convert a canvas to a Blob of the specified type.
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas toBlob failed'))
      },
      type,
      quality,
    )
  })
}

/**
 * Get the color at a specific pixel from a canvas.
 */
export function getPixelColor(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
): { r: number; g: number; b: number } {
  const ctx = canvas.getContext('2d')!
  const pixel = ctx.getImageData(x, y, 1, 1).data
  return { r: pixel[0], g: pixel[1], b: pixel[2] }
}
