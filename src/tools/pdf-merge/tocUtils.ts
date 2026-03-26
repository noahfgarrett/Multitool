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
