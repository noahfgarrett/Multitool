import type { PageRefs } from './types.ts'

/**
 * Print the annotated PDF by compositing each page's PDF canvas and annotation
 * canvas into images, embedding them in a hidden iframe, and invoking the
 * browser's native print dialog.
 */
export async function printAnnotatedPDF(
  pageRefsMap: Map<number, PageRefs>,
  pageCount: number,
  pageDimsMap: Map<number, { width: number; height: number }>,
): Promise<void> {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-9999px'
  iframe.style.top = '-9999px'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  try {
    const iframeDoc = iframe.contentDocument
    if (!iframeDoc) throw new Error('Could not access iframe document')

    iframeDoc.open()
    iframeDoc.write('<!DOCTYPE html><html><head><style>')
    iframeDoc.write(`
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: white; }
      .page { page-break-after: always; display: flex; justify-content: center; align-items: center; }
      .page:last-child { page-break-after: auto; }
      .page img { max-width: 100%; height: auto; display: block; }
      @media print {
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .page img { max-width: 100%; height: auto; }
      }
    `)
    iframeDoc.write('</style></head><body>')

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const refs = pageRefsMap.get(pageNum)
      if (!refs) continue

      const dims = pageDimsMap.get(pageNum)
      if (!dims) continue

      const { pdfCanvas, annCanvas } = refs

      // Create a composite canvas at the high-DPI buffer resolution
      const compositeCanvas = document.createElement('canvas')
      compositeCanvas.width = pdfCanvas.width
      compositeCanvas.height = pdfCanvas.height

      const ctx = compositeCanvas.getContext('2d')
      if (!ctx) continue

      // Draw PDF layer first, then annotation layer, then active canvas on top
      ctx.drawImage(pdfCanvas, 0, 0)
      ctx.drawImage(annCanvas, 0, 0)
      if (refs.activeCanvas) {
        ctx.drawImage(refs.activeCanvas, 0, 0)
      }

      const dataUrl = compositeCanvas.toDataURL('image/png')

      iframeDoc.write(
        `<div class="page"><img src="${dataUrl}" width="${dims.width}" height="${dims.height}" /></div>`,
      )
    }

    iframeDoc.write('</body></html>')
    iframeDoc.close()

    // Allow images to fully decode before triggering print
    await new Promise<void>((resolve) => setTimeout(resolve, 300))

    iframe.contentWindow?.print()
  } finally {
    // Delay removal slightly so the print dialog can finish rendering
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }
}
