import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import { getPDFBytes } from '@/utils/pdf.ts'
import { downloadBlob } from '@/utils/download.ts'
import type { PDFFile } from '@/types'
import type { Toast } from '@/types/common.ts'
import type { Point, PageAnnotations, Measurement, CalibrationState } from './types.ts'
import { resolvePdfFont, saveWithPicker, toPdfCoords, parseHexColor } from './types.ts'
import { wrapText, nearestPointOnRect } from './geometry.ts'
import type { CropRegion } from './usePdfAnnotateState.ts'

// ── Export parameters ──────────────────────────────────

export interface ExportPdfParams {
  pdfFile: PDFFile
  annotations: PageAnnotations
  pageRotations: Record<number, number>
  measurements: Record<number, Measurement[]>
  calibration: CalibrationState
  cropRegions: Record<number, CropRegion>
  setIsExporting: (v: boolean) => void
  setExportError: (v: string | null) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
}

// ── Build params (subset without UI callbacks) ──────────

export type BuildAnnotatedPdfParams = Omit<ExportPdfParams, 'setIsExporting' | 'setExportError' | 'addToast'>

// ── Build annotated PDF bytes ────────────────────────────

export async function buildAnnotatedPdfBytes(params: BuildAnnotatedPdfParams): Promise<Uint8Array> {
  const { pdfFile, annotations, pageRotations, measurements, calibration, cropRegions } = params

  const bytes = await getPDFBytes(pdfFile)
    const doc = await PDFDocument.load(bytes)
    const pages = doc.getPages()
    const fontCache = new Map<StandardFonts, Awaited<ReturnType<typeof doc.embedFont>>>()
    const getFont = async (ff: string, annBold = false, annItalic = false) => {
      const std = resolvePdfFont(ff, annBold, annItalic)
      if (!fontCache.has(std)) fontCache.set(std, await doc.embedFont(std))
      return fontCache.get(std)!
    }

    for (const [pageStr, pageAnns] of Object.entries(annotations)) {
      const pageNum = parseInt(pageStr)
      if (pageNum < 1 || pageNum > pages.length || !pageAnns.length) continue

      const page = pages[pageNum - 1]
      const { width: origW, height: origH } = page.getSize()
      const rotation = pageRotations[pageNum] || 0

      // Apply rotation
      if (rotation !== 0) {
        const existingRot = page.getRotation().angle
        page.setRotation(degrees((existingRot + rotation) % 360))
      }

      for (const ann of pageAnns) {
        const { r, g, b: bv } = parseHexColor(ann.color)
        const c = rgb(r, g, bv)

        // Transform points to PDF coordinates
        const toPC = (p: Point) => toPdfCoords(p, origW, origH, rotation)

        switch (ann.type) {
          case 'highlighter':
            // Text-selection highlights (rects)
            if (ann.rects && ann.rects.length > 0) {
              if (ann.strikethrough) {
                for (const rect of ann.rects) {
                  const midY = rect.y + rect.h / 2
                  const lineStart = toPC({ x: rect.x, y: midY })
                  const lineEnd = toPC({ x: rect.x + rect.w, y: midY })
                  page.drawLine({
                    start: lineStart, end: lineEnd,
                    thickness: Math.max(0.5, 1.5), color: c, opacity: ann.opacity,
                  })
                }
              } else {
                for (const rect of ann.rects) {
                  const tl = toPC({ x: rect.x, y: rect.y + rect.h })
                  page.drawRectangle({
                    x: tl.x, y: tl.y,
                    width: rect.w, height: rect.h,
                    color: c, opacity: ann.opacity,
                  })
                }
              }
            } else {
              // Freehand highlighter — export as line segments (matches canvas rendering)
              for (let i = 0; i < ann.points.length - 1; i++) {
                const s = toPC(ann.points[i])
                const e = toPC(ann.points[i + 1])
                page.drawLine({
                  start: s, end: e,
                  thickness: ann.strokeWidth, color: c, opacity: ann.opacity,
                })
              }
            }
            break
          case 'pencil':
            if (ann.points.length >= 3 && ann.smooth !== false) {
              // Export as SVG cubic Bézier (Catmull-Rom) for smooth curves
              const pts = ann.points
              const first = toPC(pts[0])
              const tension = 0.3
              let svgD = `M 0 0`
              for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[Math.max(0, i - 1)]
                const p1 = pts[i]
                const p2 = pts[i + 1]
                const p3 = pts[Math.min(pts.length - 1, i + 2)]
                const cp1 = toPC({ x: p1.x + (p2.x - p0.x) * tension, y: p1.y + (p2.y - p0.y) * tension })
                const cp2 = toPC({ x: p2.x - (p3.x - p1.x) * tension, y: p2.y - (p3.y - p1.y) * tension })
                const ep = toPC(p2)
                svgD += ` C ${cp1.x - first.x} ${-(cp1.y - first.y)} ${cp2.x - first.x} ${-(cp2.y - first.y)} ${ep.x - first.x} ${-(ep.y - first.y)}`
              }
              page.drawSvgPath(svgD, {
                x: first.x, y: first.y,
                borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
              })
            } else {
              // Straight segments (eraser fragments or < 3 points)
              for (let i = 0; i < ann.points.length - 1; i++) {
                const s = toPC(ann.points[i])
                const e = toPC(ann.points[i + 1])
                page.drawLine({
                  start: s, end: e,
                  thickness: ann.strokeWidth, color: c, opacity: ann.opacity,
                })
              }
            }
            break
          case 'line': {
            if (ann.points.length < 2) break
            const lineOpts: Record<string, unknown> = {
              start: toPC(ann.points[0]), end: toPC(ann.points[1]),
              thickness: ann.strokeWidth, color: c, opacity: ann.opacity,
            }
            if (ann.dashPattern === 'dashed') lineOpts.dashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
            else if (ann.dashPattern === 'dotted') lineOpts.dashArray = [ann.strokeWidth, ann.strokeWidth * 2]
            page.drawLine(lineOpts as unknown as Parameters<typeof page.drawLine>[0])
            break
          }
          case 'arrow': {
            if (ann.points.length < 2) break
            const s = toPC(ann.points[0])
            const e = toPC(ann.points[1])
            const pdfAngle = Math.atan2(e.y - s.y, e.x - s.x)
            const hl = Math.min(20, Math.max(10, ann.strokeWidth * 2.5))
            const halfAngle = Math.PI / 7
            const baseX = e.x - hl * Math.cos(pdfAngle)
            const baseY = e.y - hl * Math.sin(pdfAngle)
            const lineStart = ann.arrowStart
              ? { x: s.x + hl * Math.cos(pdfAngle), y: s.y + hl * Math.sin(pdfAngle) }
              : s
            const arrowLineOpts: Record<string, unknown> = { start: lineStart, end: { x: baseX, y: baseY }, thickness: ann.strokeWidth, color: c, opacity: ann.opacity }
            if (ann.dashPattern === 'dashed') arrowLineOpts.dashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
            else if (ann.dashPattern === 'dotted') arrowLineOpts.dashArray = [ann.strokeWidth, ann.strokeWidth * 2]
            page.drawLine(arrowLineOpts as unknown as Parameters<typeof page.drawLine>[0])
            // End arrowhead
            const lxOff = -hl * Math.cos(pdfAngle - halfAngle)
            const lyOff = hl * Math.sin(pdfAngle - halfAngle)
            const rxOff = -hl * Math.cos(pdfAngle + halfAngle)
            const ryOff = hl * Math.sin(pdfAngle + halfAngle)
            page.drawSvgPath(`M 0 0 L ${lxOff} ${lyOff} L ${rxOff} ${ryOff} Z`, {
              x: e.x, y: e.y, color: c, opacity: ann.opacity, borderWidth: 0,
            })
            // Start arrowhead (double-headed)
            if (ann.arrowStart) {
              const revAngle = pdfAngle + Math.PI
              const slxOff = -hl * Math.cos(revAngle - halfAngle)
              const slyOff = hl * Math.sin(revAngle - halfAngle)
              const srxOff = -hl * Math.cos(revAngle + halfAngle)
              const sryOff = hl * Math.sin(revAngle + halfAngle)
              page.drawSvgPath(`M 0 0 L ${slxOff} ${slyOff} L ${srxOff} ${sryOff} Z`, {
                x: s.x, y: s.y, color: c, opacity: ann.opacity, borderWidth: 0,
              })
            }
            break
          }
          case 'rectangle': {
            if (ann.points.length < 2) break
            const rw = Math.abs(ann.points[1].x - ann.points[0].x)
            const rh = Math.abs(ann.points[1].y - ann.points[0].y)
            const cr = ann.cornerRadius || 0
            const dashArr = ann.dashPattern === 'dashed' ? [ann.strokeWidth * 3, ann.strokeWidth * 2]
              : ann.dashPattern === 'dotted' ? [ann.strokeWidth, ann.strokeWidth * 2] : undefined

            let rectFillRgb: ReturnType<typeof rgb> | undefined
            if (ann.fillColor) {
              const { r: fr, g: fg, b: fb } = parseHexColor(ann.fillColor)
              rectFillRgb = rgb(fr, fg, fb)
            }

            if (cr > 0) {
              const tl = toPC({ x: Math.min(ann.points[0].x, ann.points[1].x), y: Math.min(ann.points[0].y, ann.points[1].y) })
              const clamped = Math.min(cr, rw / 2, rh / 2)
              const svgRRect = `M ${clamped} 0 L ${rw - clamped} 0 Q ${rw} 0 ${rw} ${-clamped} L ${rw} ${-(rh - clamped)} Q ${rw} ${-rh} ${rw - clamped} ${-rh} L ${clamped} ${-rh} Q 0 ${-rh} 0 ${-(rh - clamped)} L 0 ${-clamped} Q 0 0 ${clamped} 0 Z`
              const pathOpts: Record<string, unknown> = {
                x: tl.x, y: tl.y,
                borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
              }
              if (rectFillRgb) { pathOpts.color = rectFillRgb; pathOpts.opacity = ann.opacity }
              if (dashArr) pathOpts.borderDashArray = dashArr
              page.drawSvgPath(svgRRect, pathOpts as Parameters<typeof page.drawSvgPath>[1])
            } else {
              const tl = toPC({ x: Math.min(ann.points[0].x, ann.points[1].x), y: Math.max(ann.points[0].y, ann.points[1].y) })
              const rectOpts: Record<string, unknown> = {
                x: tl.x, y: tl.y, width: rw, height: rh,
                borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
              }
              if (rectFillRgb) { rectOpts.color = rectFillRgb; rectOpts.opacity = ann.opacity }
              if (dashArr) rectOpts.borderDashArray = dashArr
              page.drawRectangle(rectOpts as Parameters<typeof page.drawRectangle>[0])
            }
            break
          }
          case 'cloud': {
            if (ann.points.length < 3) break
            if (ann.fillColor) {
              const { r: fr, g: fg, b: fb } = parseHexColor(ann.fillColor)
              const first = toPC(ann.points[0])
              let svgD = `M ${0} ${0}`
              for (let pi = 1; pi < ann.points.length; pi++) {
                const pt = toPC(ann.points[pi])
                svgD += ` L ${pt.x - first.x} ${-(pt.y - first.y)}`
              }
              svgD += ' Z'
              page.drawSvgPath(svgD, { x: first.x, y: first.y, color: rgb(fr, fg, fb), opacity: ann.opacity, borderWidth: 0 })
            }
            {
              const firstPt = toPC(ann.points[0])
              let svgPath = `M ${0} ${0}`
              for (let ei = 0; ei < ann.points.length; ei++) {
                const edgeStart = ann.points[ei]
                const edgeEnd = ann.points[(ei + 1) % ann.points.length]
                const edgeLen = Math.hypot(edgeEnd.x - edgeStart.x, edgeEnd.y - edgeStart.y)
                const arcSz = 20
                const numBumps = Math.max(2, Math.round(edgeLen / arcSz))
                const ddx = (edgeEnd.x - edgeStart.x) / numBumps
                const ddy = (edgeEnd.y - edgeStart.y) / numBumps
                const len = Math.hypot(ddx, ddy)
                if (len === 0) continue
                const nx = (ddy / len) * arcSz * 0.4
                const ny = (-ddx / len) * arcSz * 0.4
                for (let i = 0; i < numBumps; i++) {
                  const ex = edgeStart.x + ddx * (i + 1), ey = edgeStart.y + ddy * (i + 1)
                  const sx = edgeStart.x + ddx * i, sy = edgeStart.y + ddy * i
                  const mx = (sx + ex) / 2 + nx, my = (sy + ey) / 2 + ny
                  const cp = toPC({ x: mx, y: my })
                  const ep = toPC({ x: ex, y: ey })
                  svgPath += ` Q ${cp.x - firstPt.x} ${-(cp.y - firstPt.y)} ${ep.x - firstPt.x} ${-(ep.y - firstPt.y)}`
                }
              }
              svgPath += ' Z'
              const cloudDash = ann.dashPattern === 'dashed' ? [ann.strokeWidth * 3, ann.strokeWidth * 2]
                : ann.dashPattern === 'dotted' ? [ann.strokeWidth, ann.strokeWidth * 2] : undefined
              const pathOpts: Record<string, unknown> = {
                x: firstPt.x, y: firstPt.y,
                borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
              }
              if (cloudDash) pathOpts.borderDashArray = cloudDash
              page.drawSvgPath(svgPath, pathOpts as Parameters<typeof page.drawSvgPath>[1])
            }
            break
          }
          case 'circle': {
            if (ann.points.length < 2) break
            const [c1, c2] = ann.points
            const center = toPC({ x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 })
            const ellipseOpts: Record<string, unknown> = {
              x: center.x, y: center.y,
              xScale: Math.abs(c2.x - c1.x) / 2,
              yScale: Math.abs(c2.y - c1.y) / 2,
              borderWidth: ann.strokeWidth, borderColor: c, borderOpacity: ann.opacity,
            }
            if (ann.fillColor) {
              const { r: fr, g: fg, b: fb } = parseHexColor(ann.fillColor)
              ellipseOpts.color = rgb(fr, fg, fb)
              ellipseOpts.opacity = ann.opacity
            }
            if (ann.dashPattern === 'dashed') ellipseOpts.borderDashArray = [ann.strokeWidth * 3, ann.strokeWidth * 2]
            else if (ann.dashPattern === 'dotted') ellipseOpts.borderDashArray = [ann.strokeWidth, ann.strokeWidth * 2]
            page.drawEllipse(ellipseOpts as Parameters<typeof page.drawEllipse>[0])
            break
          }
          case 'text': {
            if (!ann.text || !ann.points.length) break
            if (ann.backgroundColor && ann.width && ann.height) {
              const { r: tbr, g: tbg, b: tbb } = parseHexColor(ann.backgroundColor)
              const bgBl = toPC({ x: ann.points[0].x, y: ann.points[0].y + ann.height })
              page.drawRectangle({
                x: bgBl.x, y: bgBl.y,
                width: ann.width, height: ann.height,
                color: rgb(tbr, tbg, tbb), opacity: 0.3,
              })
            }
            const baseFsText = ann.fontSize || 16
            const fs = ann.superscript || ann.subscript ? baseFsText * 0.6 : baseFsText
            const yShift = ann.superscript ? -baseFsText * 0.4 : ann.subscript ? baseFsText * 0.2 : 0
            const pdfFont = await getFont(ann.fontFamily || 'Arial', ann.bold, ann.italic)
            let exportText = ann.text
            if (ann.listType && ann.listType !== 'none') {
              exportText = ann.text.split('\n').map((line: string, idx: number) => {
                if (!line.trim()) return line
                return (ann.listType === 'bullet' ? '•  ' : `${idx + 1}.  `) + line
              }).join('\n')
            }
            const lines = ann.width ? wrapText(exportText, ann.width, fs, ann.bold, (t: string) => pdfFont.widthOfTextAtSize(t, fs)) : exportText.split('\n')
            const tAlign = ann.textAlign || 'left'
            for (let i = 0; i < lines.length; i++) {
              let xOff = 0
              if (ann.width && tAlign !== 'left') {
                const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                if (tAlign === 'center') xOff = (ann.width - tw) / 2
                else if (tAlign === 'right') xOff = ann.width - tw
              }
              const linePt = toPC({ x: ann.points[0].x + xOff, y: ann.points[0].y + yShift + fs * (ann.lineHeight || 1.3) * i + fs })
              page.drawText(lines[i], {
                x: linePt.x, y: linePt.y,
                size: fs, font: pdfFont, color: c, opacity: ann.opacity,
              })
              if (ann.underline) {
                const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                const ulY = ann.points[0].y + fs * (ann.lineHeight || 1.3) * i + fs + fs * 0.15
                const ulStart = toPC({ x: ann.points[0].x + xOff, y: ulY })
                const ulEnd = toPC({ x: ann.points[0].x + xOff + tw, y: ulY })
                page.drawLine({ start: ulStart, end: ulEnd, thickness: Math.max(0.5, fs * 0.05), color: c, opacity: ann.opacity })
              }
              if (ann.strikethrough) {
                const tw = pdfFont.widthOfTextAtSize(lines[i], fs)
                const stY = ann.points[0].y + fs * (ann.lineHeight || 1.3) * i + fs - fs * 0.35
                const stStart = toPC({ x: ann.points[0].x + xOff, y: stY })
                const stEnd = toPC({ x: ann.points[0].x + xOff + tw, y: stY })
                page.drawLine({ start: stStart, end: stEnd, thickness: Math.max(0.5, fs * 0.05), color: c, opacity: ann.opacity })
              }
            }
            break
          }
          case 'callout': {
            if (!ann.points.length || !ann.width || !ann.height) break
            const boxPt = ann.points[0]
            const cfs = ann.fontSize || 14

            const bl = toPC({ x: boxPt.x, y: boxPt.y + ann.height })
            page.drawRectangle({
              x: bl.x, y: bl.y,
              width: ann.width, height: ann.height,
              color: rgb(1, 1, 1), borderColor: c,
              borderWidth: 1.5, opacity: 1, borderOpacity: 1,
            })

            if (ann.text) {
              const calloutFont = await getFont(ann.fontFamily || 'Arial', ann.bold, ann.italic)
              const baseCfs = cfs
              const effectiveCfs = ann.superscript || ann.subscript ? baseCfs * 0.6 : baseCfs
              const cYShift = ann.superscript ? -baseCfs * 0.4 : ann.subscript ? baseCfs * 0.2 : 0
              let cExportText = ann.text
              if (ann.listType && ann.listType !== 'none') {
                cExportText = ann.text.split('\n').map((line: string, idx: number) => {
                  if (!line.trim()) return line
                  return (ann.listType === 'bullet' ? '•  ' : `${idx + 1}.  `) + line
                }).join('\n')
              }
              const cLines = wrapText(cExportText, ann.width - 8, effectiveCfs, ann.bold, (t: string) => calloutFont.widthOfTextAtSize(t, effectiveCfs))
              const cAlign = ann.textAlign || 'left'
              for (let i = 0; i < cLines.length; i++) {
                let cxOff = 4
                if (cAlign !== 'left') {
                  const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                  if (cAlign === 'center') cxOff = 4 + (ann.width - 8 - ctw) / 2
                  else if (cAlign === 'right') cxOff = ann.width - 4 - ctw
                }
                const lPt = toPC({ x: boxPt.x + cxOff, y: boxPt.y + 4 + cYShift + effectiveCfs * (ann.lineHeight || 1.3) * i + effectiveCfs })
                page.drawText(cLines[i], {
                  x: lPt.x, y: lPt.y,
                  size: effectiveCfs, font: calloutFont, color: c, opacity: 1,
                })
                if (ann.underline) {
                  const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                  const culY = boxPt.y + 4 + cfs * (ann.lineHeight || 1.3) * i + cfs + cfs * 0.15
                  const culStart = toPC({ x: boxPt.x + cxOff, y: culY })
                  const culEnd = toPC({ x: boxPt.x + cxOff + ctw, y: culY })
                  page.drawLine({ start: culStart, end: culEnd, thickness: Math.max(0.5, cfs * 0.05), color: c, opacity: 1 })
                }
                if (ann.strikethrough) {
                  const ctw = calloutFont.widthOfTextAtSize(cLines[i], cfs)
                  const cstY = boxPt.y + 4 + cfs * (ann.lineHeight || 1.3) * i + cfs - cfs * 0.35
                  const cstStart = toPC({ x: boxPt.x + cxOff, y: cstY })
                  const cstEnd = toPC({ x: boxPt.x + cxOff + ctw, y: cstY })
                  page.drawLine({ start: cstStart, end: cstEnd, thickness: Math.max(0.5, cfs * 0.05), color: c, opacity: 1 })
                }
              }
            }

            if (ann.arrows) {
              for (const tip of ann.arrows) {
                const origin = nearestPointOnRect(boxPt.x, boxPt.y, ann.width, ann.height, tip.x, tip.y)
                const aS = toPC(origin)
                const aE = toPC(tip)
                const aAngle = Math.atan2(aE.y - aS.y, aE.x - aS.x)
                const aHl = Math.min(20, Math.max(10, 1.5 * 2.5))
                const aHalf = Math.PI / 7
                const abX = aE.x - aHl * Math.cos(aAngle)
                const abY = aE.y - aHl * Math.sin(aAngle)
                page.drawLine({
                  start: aS, end: { x: abX, y: abY },
                  thickness: 1.5, color: c, opacity: 1,
                })
                const aLxOff = -aHl * Math.cos(aAngle - aHalf)
                const aLyOff = aHl * Math.sin(aAngle - aHalf)
                const aRxOff = -aHl * Math.cos(aAngle + aHalf)
                const aRyOff = aHl * Math.sin(aAngle + aHalf)
                page.drawSvgPath(`M 0 0 L ${aLxOff} ${aLyOff} L ${aRxOff} ${aRyOff} Z`, {
                  x: aE.x, y: aE.y, color: c, opacity: 1, borderWidth: 0,
                })
              }
            }
            break
          }
          case 'stamp': {
            if (!ann.points.length || !ann.width || !ann.height) break
            const stampPt = toPC(ann.points[0])
            const stampTr = toPC({ x: ann.points[0].x + ann.width, y: ann.points[0].y })
            const stampW = Math.abs(stampTr.x - stampPt.x)
            const stampH = ann.height
            const stampX = Math.min(stampPt.x, stampTr.x)
            const stampY = stampPt.y - stampH
            if (ann.backgroundColor) {
              const { r: bgr, g: bgg, b: bgb } = parseHexColor(ann.backgroundColor)
              page.drawRectangle({
                x: stampX, y: stampY, width: stampW, height: stampH,
                color: rgb(bgr, bgg, bgb), opacity: ann.opacity,
              })
            }
            page.drawRectangle({
              x: stampX, y: stampY, width: stampW, height: stampH,
              borderColor: c, borderWidth: 1.5, opacity: ann.opacity,
            })
            const stampFont = await getFont(ann.fontFamily || 'Arial', true, false)
            const stampLabel = ann.stampType === 'DATE'
              ? new Date().toLocaleDateString()
              : ann.stampType || 'STAMP'
            const stampFs = Math.min(ann.height * 0.42, 18)
            const tw = stampFont.widthOfTextAtSize(stampLabel, stampFs)
            const sp = toPC({ x: ann.points[0].x + ann.width / 2, y: ann.points[0].y + ann.height / 2 })
            page.drawText(stampLabel, {
              x: sp.x - tw / 2, y: sp.y - stampFs / 2,
              size: stampFs, font: stampFont, color: c, opacity: ann.opacity,
            })
            break
          }
          case 'imageStamp': {
            if (!ann.imageDataUrl || ann.points.length < 2) break
            const p0 = toPC(ann.points[0])
            const p1 = toPC(ann.points[1])
            const imgX = Math.min(p0.x, p1.x)
            const imgY = Math.min(p0.y, p1.y)
            const imgW = Math.abs(p1.x - p0.x)
            const imgH = Math.abs(p1.y - p0.y)
            if (imgW <= 0 || imgH <= 0) break

            try {
              const base64 = ann.imageDataUrl.split(',')[1]
              const imgBytes = Uint8Array.from(atob(base64), c2 => c2.charCodeAt(0))
              let embeddedImg
              if (ann.imageDataUrl.includes('image/png')) {
                embeddedImg = await doc.embedPng(imgBytes)
              } else {
                try {
                  embeddedImg = await doc.embedJpg(imgBytes)
                } catch {
                  embeddedImg = await doc.embedPng(imgBytes)
                }
              }
              page.drawImage(embeddedImg, {
                x: imgX, y: imgY,
                width: imgW, height: imgH,
                opacity: ann.opacity,
              })
            } catch {
              page.drawRectangle({
                x: imgX, y: imgY, width: imgW, height: imgH,
                borderColor: c, borderWidth: 1.5, opacity: ann.opacity,
              })
            }
            break
          }
        }
      }
    }

    // Export measurements
    const measFont = await doc.embedFont(StandardFonts.Helvetica)
    for (const [pageStr, pageMeas] of Object.entries(measurements)) {
      const pageNum = parseInt(pageStr)
      if (pageNum < 1 || pageNum > pages.length || !pageMeas.length) continue
      const page = pages[pageNum - 1]
      const { width: origW, height: origH } = page.getSize()
      const rotation = pageRotations[pageNum] || 0
      const toPC = (p: Point) => toPdfCoords(p, origW, origH, rotation)

      for (const m of pageMeas) {
        const s = toPC(m.startPt)
        const e = toPC(m.endPt)
        const pxDist = Math.hypot(m.endPt.x - m.startPt.x, m.endPt.y - m.startPt.y)

        page.drawLine({
          start: s, end: e,
          thickness: 1.5, color: rgb(0.133, 0.827, 0.933), opacity: 0.9,
          dashArray: [6, 4],
        })

        for (const pt of [s, e]) {
          page.drawCircle({
            x: pt.x, y: pt.y, size: 3,
            color: rgb(0.133, 0.827, 0.933), opacity: 0.9,
          })
        }

        let label: string
        if (calibration.pixelsPerUnit !== null) {
          const realDist = pxDist / calibration.pixelsPerUnit
          label = `${realDist.toFixed(2)} ${calibration.unit}`
        } else {
          label = `${pxDist.toFixed(1)} px`
        }
        const mid = toPC({ x: (m.startPt.x + m.endPt.x) / 2, y: (m.startPt.y + m.endPt.y) / 2 })
        const tw = measFont.widthOfTextAtSize(label, 9)
        const padX = 4
        const padY = 2
        page.drawRectangle({
          x: mid.x - tw / 2 - padX, y: mid.y - 5 - padY,
          width: tw + padX * 2, height: 10 + padY * 2,
          color: rgb(0, 0.16, 0.2), opacity: 0.85,
          borderColor: rgb(0.133, 0.827, 0.933), borderWidth: 0.5, borderOpacity: 0.9,
        })
        page.drawText(label, {
          x: mid.x - tw / 2, y: mid.y - 4,
          size: 9, font: measFont, color: rgb(0.133, 0.827, 0.933), opacity: 0.9,
        })
      }
    }

    // Apply rotation to pages without annotations too
    for (const [pageStr, rot] of Object.entries(pageRotations)) {
      const pageNum = parseInt(pageStr)
      if (rot === 0 || pageNum < 1 || pageNum > pages.length) continue
      if (annotations[pageNum]?.length) continue
      const page = pages[pageNum - 1]
      const existingRot = page.getRotation().angle
      page.setRotation(degrees((existingRot + rot) % 360))
    }

    // Apply crop regions
    for (const [pageStr, cropRgn] of Object.entries(cropRegions)) {
      const cropPageNum = parseInt(pageStr)
      if (cropPageNum < 1 || cropPageNum > pages.length) continue
      const cropPage = pages[cropPageNum - 1]
      const { width: cpw, height: cph } = cropPage.getSize()
      const cropRot = pageRotations[cropPageNum] || 0
      const blPdf = toPdfCoords({ x: cropRgn.x, y: cropRgn.y + cropRgn.h }, cpw, cph, cropRot)
      const trPdf = toPdfCoords({ x: cropRgn.x + cropRgn.w, y: cropRgn.y }, cpw, cph, cropRot)
      const minX = Math.min(blPdf.x, trPdf.x)
      const minY = Math.min(blPdf.y, trPdf.y)
      const cropW = Math.abs(trPdf.x - blPdf.x)
      const cropH = Math.abs(trPdf.y - blPdf.y)
      if (cropW > 0 && cropH > 0) {
        cropPage.setMediaBox(minX, minY, cropW, cropH)
      }
    }

    const pdfBytes = await doc.save()
    return pdfBytes
}

// ── Export function (build + save to disk) ────────────────

export async function exportAnnotatedPdf(params: ExportPdfParams): Promise<void> {
  const {
    setIsExporting, setExportError, addToast,
    ...buildParams
  } = params

  setIsExporting(true)
  setExportError(null)
  try {
    const pdfBytes = await buildAnnotatedPdfBytes(buildParams)
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const fileName = `${buildParams.pdfFile.name.replace(/\.pdf$/i, '')}-annotated.pdf`

    const pickerResult = await saveWithPicker(blob, fileName, {
      description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] },
    })
    if (pickerResult === 'cancelled') return
    if (pickerResult === 'fallback') downloadBlob(blob, fileName)
    addToast({ type: 'success', message: 'PDF exported' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    setExportError(`Export failed: ${msg}`)
  } finally {
    setIsExporting(false)
  }
}
