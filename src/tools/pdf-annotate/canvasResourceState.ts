interface CanvasResourceElement {
  width: number
  height: number
  style: {
    display: string
  }
}

export function collapseCanvasForRelease(canvas: CanvasResourceElement): void {
  canvas.width = 0
  canvas.height = 0
  canvas.style.display = 'none'
}

export function restoreCanvasForRender(canvas: CanvasResourceElement): void {
  canvas.style.display = ''
}
