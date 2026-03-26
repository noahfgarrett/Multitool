import {
  PDFDocument, StandardFonts, PDFArray, PDFDict, PDFName,
  PDFNumber, rgb,
} from 'pdf-lib'

// ── Types ────────────────────────────────────────

export interface TocEntry {
  id: string
  label: string
  pageIndex: number       // 0-based index into assembled source pages (pre-TOC)
  pageCount: number
  indent: number          // 0 = parent, 1 = child
  autoDetected: boolean   // True if name came from fallback
  sourceFileId: string
  sourcePageNumber?: number
}

export type TocNumbering = 'none' | 'numeric' | 'alpha' | 'roman' | 'custom'

export interface NestedBookmark {
  title: string
  pageIndex: number
  children?: NestedBookmark[]
}

// ── Numbering ────────────────────────────────────

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']

function toAlpha(n: number): string {
  let result = ''
  let num = n
  while (num > 0) {
    num--
    result = String.fromCharCode(65 + (num % 26)) + result
    num = Math.floor(num / 26)
  }
  return result
}

function toRoman(n: number): string {
  return n >= 1 && n <= ROMAN.length ? ROMAN[n - 1] : String(n)
}

export function formatEntryNumber(
  numbering: TocNumbering,
  customPrefix: string,
  parentIndex: number,
  childIndex?: number,
): string {
  if (numbering === 'none') return ''

  let parentLabel: string
  switch (numbering) {
    case 'numeric': parentLabel = String(parentIndex); break
    case 'alpha':   parentLabel = toAlpha(parentIndex); break
    case 'roman':   parentLabel = toRoman(parentIndex); break
    case 'custom':  parentLabel = `${customPrefix}${parentIndex}`; break
    default:        parentLabel = String(parentIndex)
  }

  if (childIndex !== undefined) {
    return `${parentLabel}.${childIndex}`
  }
  return `${parentLabel}.`
}

// ── Entry builders ───────────────────────────────

export function buildInitialEntries(
  files: { id: string; name: string; pageCount: number; pages: { excluded: boolean }[] }[],
): TocEntry[] {
  const entries: TocEntry[] = []
  let pageOffset = 0

  for (const f of files) {
    const includedCount = f.pages.length > 0
      ? f.pages.filter((p) => !p.excluded).length
      : f.pageCount

    if (includedCount === 0) continue

    entries.push({
      id: crypto.randomUUID(),
      label: f.name.replace(/\.pdf$/i, ''),
      pageIndex: pageOffset,
      pageCount: includedCount,
      indent: 0,
      autoDetected: false,
      sourceFileId: f.id,
    })
    pageOffset += includedCount
  }
  return entries
}

export function recalcPageIndices(entries: TocEntry[]): TocEntry[] {
  let offset = 0
  let lastParentStart = 0
  return entries.map((e) => {
    if (e.indent === 0) {
      lastParentStart = offset
      const updated = { ...e, pageIndex: offset }
      offset += e.pageCount
      return updated
    }
    return { ...e, pageIndex: lastParentStart + (e.sourcePageNumber ? e.sourcePageNumber - 1 : 0) }
  })
}

export function estimateTocPageCount(entryCount: number, pageHeight: number = 792): number {
  const margins = 144
  const headerHeight = 60
  const rowHeight = 18
  const availableHeight = pageHeight - margins - headerHeight
  const entriesPerPage = Math.floor(availableHeight / rowHeight)
  return Math.max(1, Math.ceil(entryCount / entriesPerPage))
}

// ── Convert flat entries to nested bookmarks ─────

export function entriesToNestedBookmarks(
  entries: TocEntry[],
  numbering: TocNumbering,
  customPrefix: string,
  tocPageCount: number,
): NestedBookmark[] {
  const result: NestedBookmark[] = []
  let parentIdx = 0

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    if (e.indent === 0) {
      parentIdx++
      const children: NestedBookmark[] = []
      let childIdx = 0

      for (let j = i + 1; j < entries.length && entries[j].indent > 0; j++) {
        childIdx++
        const child = entries[j]
        const prefix = formatEntryNumber(numbering, customPrefix, parentIdx, childIdx)
        children.push({
          title: prefix ? `${prefix} ${child.label}` : child.label,
          pageIndex: child.pageIndex + tocPageCount,
        })
      }

      const prefix = formatEntryNumber(numbering, customPrefix, parentIdx)
      result.push({
        title: prefix ? `${prefix} ${e.label}` : e.label,
        pageIndex: e.pageIndex + tocPageCount,
        children: children.length > 0 ? children : undefined,
      })
    }
  }
  return result
}

// ── TOC Page Renderer ───────────────────────────

export async function renderTocPages(
  pdfDoc: PDFDocument,
  entries: TocEntry[],
  numbering: TocNumbering,
  customPrefix: string,
): Promise<number> {
  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Get page dimensions from the first existing page, or default to US Letter
  let pageWidth = 612
  let pageHeight = 792
  if (pdfDoc.getPageCount() > 0) {
    const firstPage = pdfDoc.getPage(0)
    const size = firstPage.getSize()
    pageWidth = size.width
    pageHeight = size.height
  }

  // Layout constants
  const MARGIN = 72
  const TITLE_SIZE = 16
  const TITLE_GAP = 24
  const HEADER_SIZE = 10
  const HEADER_LINE_GAP = 8
  const ROW_HEIGHT = 18
  const PARENT_SIZE = 11
  const CHILD_SIZE = 10
  const CHILD_INDENT = 20
  const NO_COL_X = MARGIN
  const DESC_COL_X = MARGIN + 50
  const PAGE_COL_RIGHT_X = pageWidth - MARGIN

  const titleHeight = TITLE_SIZE + TITLE_GAP
  const headerHeight = HEADER_SIZE + HEADER_LINE_GAP
  const availableHeight = pageHeight - MARGIN - MARGIN - titleHeight - headerHeight
  const entriesPerPage = Math.max(1, Math.floor(availableHeight / ROW_HEIGHT))
  const tocPageCount = Math.max(1, Math.ceil(entries.length / entriesPerPage))

  const grayColor = rgb(0.8, 0.8, 0.8)
  const blackColor = rgb(0, 0, 0)

  const ctx = pdfDoc.context

  // Track parent index across pages for consistent numbering
  let parentIdx = 0
  let childIdx = 0

  for (let pageNum = 0; pageNum < tocPageCount; pageNum++) {
    const tocPage = pdfDoc.insertPage(pageNum, [pageWidth, pageHeight])

    // Current Y position (top-down drawing)
    let curY = pageHeight - MARGIN

    // Draw title
    const titleText = pageNum === 0
      ? 'TABLE OF CONTENTS'
      : 'TABLE OF CONTENTS (continued)'
    const titleWidth = boldFont.widthOfTextAtSize(titleText, TITLE_SIZE)
    tocPage.drawText(titleText, {
      x: (pageWidth - titleWidth) / 2,
      y: curY - TITLE_SIZE,
      size: TITLE_SIZE,
      font: boldFont,
      color: blackColor,
    })
    curY -= titleHeight

    // Draw column headers
    tocPage.drawText('No.', {
      x: NO_COL_X,
      y: curY - HEADER_SIZE,
      size: HEADER_SIZE,
      font: boldFont,
      color: blackColor,
    })
    tocPage.drawText('Description', {
      x: DESC_COL_X,
      y: curY - HEADER_SIZE,
      size: HEADER_SIZE,
      font: boldFont,
      color: blackColor,
    })
    const pageHeaderText = 'Page'
    const pageHeaderWidth = boldFont.widthOfTextAtSize(pageHeaderText, HEADER_SIZE)
    tocPage.drawText(pageHeaderText, {
      x: PAGE_COL_RIGHT_X - pageHeaderWidth,
      y: curY - HEADER_SIZE,
      size: HEADER_SIZE,
      font: boldFont,
      color: blackColor,
    })
    curY -= HEADER_SIZE + 4

    // Header separator line
    tocPage.drawLine({
      start: { x: MARGIN, y: curY },
      end: { x: pageWidth - MARGIN, y: curY },
      thickness: 0.5,
      color: grayColor,
    })
    curY -= HEADER_LINE_GAP - 4

    // Determine slice of entries for this page
    const startIdx = pageNum * entriesPerPage
    const endIdx = Math.min(startIdx + entriesPerPage, entries.length)
    const pageEntries = entries.slice(startIdx, endIdx)

    // Collect link refs for this page
    const linkRefs: ReturnType<typeof ctx.register>[] = []

    // Track whether we need separator lines between parent groups
    let isFirstParentOnPage = true

    for (let i = 0; i < pageEntries.length; i++) {
      const entry = pageEntries[i]
      const isParent = entry.indent === 0

      if (isParent) {
        parentIdx++
        childIdx = 0

        // Separator line above parent groups (except the first one on the page)
        if (!isFirstParentOnPage) {
          tocPage.drawLine({
            start: { x: MARGIN, y: curY + ROW_HEIGHT - 4 },
            end: { x: pageWidth - MARGIN, y: curY + ROW_HEIGHT - 4 },
            thickness: 0.5,
            color: grayColor,
          })
        }
        isFirstParentOnPage = false
      } else {
        childIdx++
      }

      const rowY = curY - (i * ROW_HEIGHT)
      const fontSize = isParent ? PARENT_SIZE : CHILD_SIZE
      const rowFont = isParent ? boldFont : font
      const descX = isParent ? DESC_COL_X : DESC_COL_X + CHILD_INDENT

      // Number column
      const numText = isParent
        ? formatEntryNumber(numbering, customPrefix, parentIdx)
        : formatEntryNumber(numbering, customPrefix, parentIdx, childIdx)

      if (numText) {
        tocPage.drawText(numText, {
          x: NO_COL_X,
          y: rowY,
          size: fontSize,
          font: rowFont,
          color: blackColor,
        })
      }

      // Description column
      tocPage.drawText(entry.label, {
        x: descX,
        y: rowY,
        size: fontSize,
        font: rowFont,
        color: blackColor,
      })

      // Page number (right-aligned) — 1-based, offset by TOC pages
      const displayPageNum = entry.pageIndex + tocPageCount + 1
      const pageNumText = String(displayPageNum)
      const pageNumWidth = font.widthOfTextAtSize(pageNumText, fontSize)
      tocPage.drawText(pageNumText, {
        x: PAGE_COL_RIGHT_X - pageNumWidth,
        y: rowY,
        size: fontSize,
        font: font,
        color: blackColor,
      })

      // Create clickable link annotation to the target page
      const targetPageIdx = entry.pageIndex + tocPageCount
      if (targetPageIdx >= 0 && targetPageIdx < pdfDoc.getPageCount()) {
        const targetPage = pdfDoc.getPage(targetPageIdx)

        // Destination: [pageRef, /Fit]
        const dest = PDFArray.withContext(ctx)
        dest.push(targetPage.ref)
        dest.push(PDFName.of('Fit'))

        // Link annotation dict
        const linkDict = PDFDict.withContext(ctx)
        linkDict.set(PDFName.of('Type'), PDFName.of('Annot'))
        linkDict.set(PDFName.of('Subtype'), PDFName.of('Link'))

        // Clickable rect: [x1, y1, x2, y2] — y is bottom-up in PDF
        const rectArray = PDFArray.withContext(ctx)
        rectArray.push(PDFNumber.of(MARGIN))
        rectArray.push(PDFNumber.of(rowY - 4))
        rectArray.push(PDFNumber.of(pageWidth - MARGIN))
        rectArray.push(PDFNumber.of(rowY + 14))
        linkDict.set(PDFName.of('Rect'), rectArray)

        linkDict.set(PDFName.of('Dest'), dest)

        // No visible border
        const borderArray = PDFArray.withContext(ctx)
        borderArray.push(PDFNumber.of(0))
        borderArray.push(PDFNumber.of(0))
        borderArray.push(PDFNumber.of(0))
        linkDict.set(PDFName.of('Border'), borderArray)

        const linkRef = ctx.register(linkDict)
        linkRefs.push(linkRef)
      }
    }

    // Attach all link annotations to the TOC page
    if (linkRefs.length > 0) {
      const existingAnnots = tocPage.node.lookup(PDFName.of('Annots'))
      const annotsArray = existingAnnots instanceof PDFArray
        ? existingAnnots
        : PDFArray.withContext(ctx)

      for (const ref of linkRefs) {
        annotsArray.push(ref)
      }
      tocPage.node.set(PDFName.of('Annots'), annotsArray)
    }
  }

  return tocPageCount
}
