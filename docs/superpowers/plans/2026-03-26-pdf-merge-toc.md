# PDF Merge — Table of Contents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Table of Contents to PDF Merge — a tabular TOC page inserted as page 1, nested PDF bookmarks, customizable entry names/numbering/hierarchy, and auto-detect names from page content.

**Architecture:** TOC state lives in PdfMergeTool alongside existing files state. A toggle in the toolbar opens a TocEditorModal for editing entries. On merge, `handleMerge` in PdfMergeTool calls `renderTocPages` and `entriesToNestedBookmarks` from tocUtils.ts, then passes nested bookmarks to `mergePDFs`. This avoids a circular dependency (shared `pdf.ts` never imports from tool-specific modules). The `addPdfBookmarks` in pdf.ts is updated for nested outlines.

**Tech Stack:** React, TypeScript, pdf-lib (TOC page rendering + nested bookmarks), pdfjs-dist (text extraction for auto-detect), lucide-react, dnd-kit (drag reorder in modal)

**Spec:** `docs/superpowers/specs/2026-03-26-pdf-merge-toc-design.md`

---

### Task 1: Extend Modal widths and create TOC types/utilities foundation

**Files:**
- Modify: `src/components/common/Modal.tsx`
- Create: `src/tools/pdf-merge/tocUtils.ts`

- [ ] **Step 1: Add wider Modal size options**

In `src/components/common/Modal.tsx`, update the `ModalProps` interface width type (line 9) and widths map (lines 12-17):

```typescript
// Line 9: update type
width?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

// Lines 12-17: add entries
const widths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
}
```

- [ ] **Step 2: Create tocUtils.ts with types and numbering logic**

Create `src/tools/pdf-merge/tocUtils.ts` with:

```typescript
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
  // 1→A, 2→B, ..., 26→Z, 27→AA
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
  parentIndex: number,   // 1-based parent number
  childIndex?: number,   // 1-based child number (undefined for parents)
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
    // Children: pageIndex is relative to their parent's start
    return { ...e, pageIndex: lastParentStart + (e.sourcePageNumber ? e.sourcePageNumber - 1 : 0) }
  })
}

export function estimateTocPageCount(entryCount: number, pageHeight: number = 792): number {
  const margins = 144 // 72pt * 2
  const headerHeight = 60 // title + column headers + spacing
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

      // Collect children
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/common/Modal.tsx src/tools/pdf-merge/tocUtils.ts
git commit -m "feat: add TOC types, numbering logic, and wider Modal sizes"
```

---

### Task 2: Update pdf.ts — text extraction, nested bookmarks, extended mergePDFs

**Files:**
- Modify: `src/utils/pdf.ts`

- [ ] **Step 1: Add extractPageTitleCandidate export**

Add a new exported function after the existing text extraction functions. This function loads a PDF page via pdfjs and finds the largest-font text item as a title candidate:

```typescript
/**
 * Extract the most likely title text from a PDF page.
 * Finds the largest-font text item on the page.
 * Returns null if no good candidate found.
 */
export async function extractPageTitleCandidate(
  file: File,
  pageNumber: number, // 1-based
): Promise<string | null> {
  const buffer = await file.arrayBuffer()
  const data = new Uint8Array(buffer)
  const doc = await pdfjsLib.getDocument({ data: data.slice() }).promise

  try {
    if (pageNumber < 1 || pageNumber > doc.numPages) return null
    const page = await doc.getPage(pageNumber)
    const content = await page.getTextContent()

    let maxFontSize = 0
    let bestText = ''

    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const fontSize = Math.abs(item.transform[0]) || 12
      if (fontSize > maxFontSize) {
        maxFontSize = fontSize
        bestText = item.str.trim()
      }
    }

    page.cleanup()

    if (!bestText) return null

    // Clean common noise
    let cleaned = bestText
      .replace(/\bSHEET\s+\d+\s+OF\s+\d+\b/gi, '')
      .replace(/\bPAGE\s+\d+\b/gi, '')
      .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '') // dates
      .trim()

    if (cleaned.length < 3 || cleaned.length > 80) return null
    return cleaned
  } finally {
    doc.destroy()
  }
}
```

- [ ] **Step 2: Update addPdfBookmarks for nested outlines**

Replace the existing `addPdfBookmarks` function (lines 338-380) to support the `NestedBookmark` interface with optional children:

```typescript
interface NestedBookmarkInput {
  title: string
  pageIndex: number
  children?: NestedBookmarkInput[]
}

/**
 * Add bookmarks (PDF outline) to a PDF document.
 * Supports one level of nesting (parent → children).
 */
function addPdfBookmarks(
  pdfDoc: PDFDocument,
  bookmarks: NestedBookmarkInput[],
): void {
  if (bookmarks.length === 0) return
  const ctx = pdfDoc.context

  function createItem(bm: NestedBookmarkInput): PDFRef {
    const pageRef = pdfDoc.getPage(bm.pageIndex).ref
    const dest = PDFArray.withContext(ctx)
    dest.push(pageRef)
    dest.push(PDFName.of('Fit'))

    const item = PDFDict.withContext(ctx)
    item.set(PDFName.of('Title'), PDFHexString.fromText(bm.title))
    item.set(PDFName.of('Dest'), dest)
    return ctx.register(item)
  }

  // Create top-level items
  const topRefs: PDFRef[] = []

  for (const bm of bookmarks) {
    const parentRef = createItem(bm)
    topRefs.push(parentRef)

    // Create children if present
    if (bm.children && bm.children.length > 0) {
      const childRefs = bm.children.map((c) => createItem(c))

      // Link children siblings
      for (let i = 0; i < childRefs.length; i++) {
        const dict = ctx.lookup(childRefs[i]) as PDFDict
        dict.set(PDFName.of('Parent'), parentRef)
        if (i > 0) dict.set(PDFName.of('Prev'), childRefs[i - 1])
        if (i < childRefs.length - 1) dict.set(PDFName.of('Next'), childRefs[i + 1])
      }

      // Set parent's First/Last/Count for children
      const parentDict = ctx.lookup(parentRef) as PDFDict
      parentDict.set(PDFName.of('First'), childRefs[0])
      parentDict.set(PDFName.of('Last'), childRefs[childRefs.length - 1])
      parentDict.set(PDFName.of('Count'), PDFNumber.of(childRefs.length))
    }
  }

  // Link top-level siblings
  for (let i = 0; i < topRefs.length; i++) {
    const dict = ctx.lookup(topRefs[i]) as PDFDict
    if (i > 0) dict.set(PDFName.of('Prev'), topRefs[i - 1])
    if (i < topRefs.length - 1) dict.set(PDFName.of('Next'), topRefs[i + 1])
  }

  // Create outline root
  const root = PDFDict.withContext(ctx)
  root.set(PDFName.of('Type'), PDFName.of('Outlines'))
  root.set(PDFName.of('First'), topRefs[0])
  root.set(PDFName.of('Last'), topRefs[topRefs.length - 1])
  root.set(PDFName.of('Count'), PDFNumber.of(topRefs.length))
  const rootRef = ctx.register(root)

  // Set parent on top-level items
  for (const ref of topRefs) {
    (ctx.lookup(ref) as PDFDict).set(PDFName.of('Parent'), rootRef)
  }

  pdfDoc.catalog.set(PDFName.of('Outlines'), rootRef)
}
```

- [ ] **Step 3: Export addPdfBookmarks and update mergePDFs bookmarks type**

The `addPdfBookmarks` function needs to be **exported** so that `PdfMergeTool.tsx` can call it directly for the TOC flow (avoiding a circular dependency — `pdf.ts` must never import from tool-specific modules).

Add `export` to the function declaration:
```typescript
export function addPdfBookmarks(
```

Update the `mergePDFs` `bookmarks` parameter type to accept the nested structure (backward-compatible — existing callers just don't pass `children`):
```typescript
export async function mergePDFs(
  files: { file: File; pages?: number[]; rotations?: Record<number, number> }[],
  onProgress?: (current: number, total: number) => void,
  bookmarks?: NestedBookmarkInput[],
): Promise<Uint8Array>
```

Also add `PDFRef` to the pdf-lib import at the top of the file (needed by the new `addPdfBookmarks`):
```typescript
import { PDFDocument, PDFDict, PDFName, PDFHexString, PDFArray, PDFNumber, PDFRef, degrees } from 'pdf-lib'
```

**Important:** Do NOT add any TOC rendering to `mergePDFs`. The TOC page insertion and nested bookmark building will be done by `handleMerge` in PdfMergeTool.tsx (Task 5), which calls `renderTocPages` and `entriesToNestedBookmarks` from `tocUtils.ts`, then passes the result to `addPdfBookmarks`. This avoids a circular dependency.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`
Expected: No errors (may need Task 3 stub first — if so, create a minimal export in tocUtils.ts)

- [ ] **Step 5: Commit**

```bash
git add src/utils/pdf.ts src/tools/pdf-merge/tocUtils.ts
git commit -m "feat: add text extraction, nested bookmarks, and TOC-aware mergePDFs"
```

---

### Task 3: TOC page renderer (pdf-lib vector drawing)

**Files:**
- Modify: `src/tools/pdf-merge/tocUtils.ts`

- [ ] **Step 1: Add the renderTocPages function**

Add to `tocUtils.ts` a function that uses pdf-lib to draw the tabular TOC page and insert it at position 0 of the merged document. This function:

1. Calculates how many TOC pages are needed (1 or 2)
2. Gets the page dimensions from the first source page
3. Creates TOC page(s) with Helvetica font
4. Draws "TABLE OF CONTENTS" header centered at the top
5. Draws column headers: "No." | "Description" | "Page" with separator line
6. Draws each entry row — parents bold, children indented and regular weight
7. Draws separator lines between parent groups
8. Adds clickable link annotations on each row pointing to the target page
9. Inserts the TOC page(s) at index 0 using `pdfDoc.insertPage()`
10. Returns the number of TOC pages inserted

Function signature:

```typescript
import { PDFDocument, StandardFonts, PDFArray, PDFDict, PDFName, PDFNumber, PDFHexString, rgb } from 'pdf-lib'

export async function renderTocPages(
  pdfDoc: PDFDocument,
  entries: TocEntry[],
  numbering: TocNumbering,
  customPrefix: string,
): Promise<number>  // Returns number of TOC pages inserted
```

**Must be `async`** because `pdfDoc.embedFont(StandardFonts.Helvetica)` returns a Promise. All callers must `await` the result.

Key implementation details:
- Use `StandardFonts.Helvetica` and `StandardFonts.HelveticaBold`
- Page margins: 72pt all sides
- Title: 16pt bold, centered
- Column headers: 10pt bold, separator line at 0.5pt gray
- Parent entries: 11pt bold, child entries: 10pt regular indented 20pt
- Row height: 18pt
- Page numbers are 1-based final numbers: `entry.pageIndex + tocPageCount + 1`
- For clickable links: create a `/Link` annotation dict for each row with `/Rect` bounds and `/Dest` pointing to the target page
- Add annotations to the page's `/Annots` array
- If entries overflow one page, create a second page with "TABLE OF CONTENTS (continued)" header
- Insert pages via `pdfDoc.insertPage(0, tocPage)` (inserts at beginning, shifting existing pages)

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/tools/pdf-merge/tocUtils.ts
git commit -m "feat: add TOC page renderer with tabular layout and clickable links"
```

---

### Task 4: TocEditorModal component

**Files:**
- Create: `src/tools/pdf-merge/TocEditorModal.tsx`

- [ ] **Step 1: Create the TocEditorModal component**

Create `src/tools/pdf-merge/TocEditorModal.tsx` — a modal with:

**Props:**
```typescript
interface TocEditorModalProps {
  open: boolean
  onClose: () => void
  entries: TocEntry[]
  onEntriesChange: (entries: TocEntry[]) => void
  numbering: TocNumbering
  onNumberingChange: (n: TocNumbering) => void
  customPrefix: string
  onCustomPrefixChange: (p: string) => void
  files: { id: string; name: string; file: File; pageCount: number; pages: { excluded: boolean }[] }[]
  estimatedTocPageCount: number
}
```

**Internal state:**
- `selected: Set<string>` — selected entry IDs (for bulk indent/outdent)
- `editingId: string | null` — which entry is in inline-edit mode
- `detecting: boolean` — auto-detect progress state
- `detectProgress: { current: number; total: number } | null`

**Layout (matches the mockup approved in brainstorming):**
- Uses `Modal` with `width="3xl"`
- Header: `ListOrdered` icon + title + entry count + "Auto-detect Names" button (blue) + close
- Toolbar: Numbering preset pills + Select All / Indent / Outdent buttons
- Column headers: Checkbox | Drag handle | No. | Description | Pages | Page | Actions
- Scrollable entry list with parent/child rows
- Footer: keyboard hints + "Add Entry" + "Done"

**Key interactions:**
- Checkbox toggle (single click) and range selection (shift+click)
- Tab/Shift+Tab for indent/outdent (only when entries selected, check `selected.size > 0`)
- Inline label editing on click/pencil icon — **important:** the inline edit's Escape handler must call `e.stopPropagation()` to prevent the Modal from also closing
- Drag reorder using dnd-kit `SortableContext` (already used in PdfMergeTool for file reorder)
- Three-dot menu: Add child, Delete (promote children), Duplicate
- "Auto-detect Names" button calls `extractPageTitleCandidate` for each entry and updates labels

**Auto-detect implementation:**
1. Set `detecting: true`, show progress
2. For each entry whose label matches its default filename-based label:
   - Call `extractPageTitleCandidate(file, pageNumber)` from `@/utils/pdf.ts`
   - If result is non-null, update the label
   - If null, set `autoDetected: true` on the entry (fallback name stays)
3. Show toast with count: "Updated X of Y entries (Z were manually edited)"

**Numbering display:**
- The "No." column shows the auto-calculated number from `formatEntryNumber()`
- Parent numbers are counted sequentially (1, 2, 3...), children get parent.child (1.1, 1.2...)
- "Custom..." preset shows a small inline text input for the prefix

**Page column display:**
- Shows `entry.pageIndex + estimatedTocPageCount + 1` (1-based final page number)

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/tools/pdf-merge/TocEditorModal.tsx
git commit -m "feat: add TocEditorModal with entry editing, numbering, and auto-detect"
```

---

### Task 5: Integrate TOC into PdfMergeTool

**Files:**
- Modify: `src/tools/pdf-merge/PdfMergeTool.tsx`

- [ ] **Step 1: Add imports and TOC state**

Add imports for TOC components and utilities:
```typescript
import { TocEditorModal } from './TocEditorModal.tsx'
import {
  type TocEntry, type TocNumbering,
  buildInitialEntries, recalcPageIndices, estimateTocPageCount,
  entriesToNestedBookmarks,
} from './tocUtils.ts'
import { ListOrdered } from 'lucide-react'  // add to existing lucide import
```

Add TOC state alongside existing state (after the `copiedPage` useState):
```typescript
const [tocEnabled, setTocEnabled] = useState(false)
const [tocEntries, setTocEntries] = useState<TocEntry[]>([])
const [tocNumbering, setTocNumbering] = useState<TocNumbering>('numeric')
const [tocCustomPrefix, setTocCustomPrefix] = useState('')
const [tocModalOpen, setTocModalOpen] = useState(false)
```

- [ ] **Step 2: Add TOC auto-population and sync**

Add a `useEffect` that auto-populates TOC entries when first enabled, and recalculates page indices when files change:

```typescript
useEffect(() => {
  if (!tocEnabled) return
  setTocEntries((prev) => {
    if (prev.length === 0) {
      // First enable — auto-populate from file list
      return buildInitialEntries(files)
    }
    // Files changed — remove entries for deleted files
    const fileIds = new Set(files.map((f) => f.id))
    const filtered = prev.filter((e) => fileIds.has(e.sourceFileId))
    // Append entries for newly added files
    const existingFileIds = new Set(filtered.map((e) => e.sourceFileId))
    const newFiles = files.filter((f) => !existingFileIds.has(f.id))
    const newEntries = buildInitialEntries(newFiles)
    return recalcPageIndices([...filtered, ...newEntries])
  })
}, [tocEnabled, files])
```

Uses the functional updater to avoid stale closure issues (reads `prev` instead of `tocEntries` from the closure). Also appends entries for newly added files per the spec.

- [ ] **Step 3: Add TOC toggle button to the toolbar**

In the toolbar section (after the Preview toggle button, before the Merge & Download button — around line 964), add:

```typescript
{mode === 'merge' && (
  <>
    <button
      onClick={() => {
        if (!tocEnabled) {
          setTocEnabled(true)
          setTocModalOpen(true)
        } else {
          setTocModalOpen(true)
        }
      }}
      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
        tocEnabled ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'bg-white/[0.04] text-white/40 hover:text-white/60'
      }`}
      title="Table of Contents"
    >
      <ListOrdered size={12} />
      TOC
      {tocEnabled && <span className="w-1.5 h-1.5 rounded-full bg-[#F47B20]" />}
    </button>
  </>
)}
```

- [ ] **Step 4: Add TocEditorModal render**

At the bottom of the component's return JSX (alongside the existing modals), add:

```typescript
<TocEditorModal
  open={tocModalOpen}
  onClose={() => setTocModalOpen(false)}
  entries={tocEntries}
  onEntriesChange={setTocEntries}
  numbering={tocNumbering}
  onNumberingChange={setTocNumbering}
  customPrefix={tocCustomPrefix}
  onCustomPrefixChange={setTocCustomPrefix}
  files={files}
  estimatedTocPageCount={estimateTocPageCount(tocEntries.length)}
/>
```

- [ ] **Step 5: Update handleMerge for TOC rendering and bookmarks**

In the `handleMerge` function, the TOC flow happens AFTER `mergePDFs` returns, to avoid a circular dependency. Import `addPdfBookmarks` from `pdf.ts` and `renderTocPages`, `entriesToNestedBookmarks` from `tocUtils.ts`.

Replace the merge + download section with:

```typescript
import { mergePDFs, addPdfBookmarks } from '@/utils/pdf.ts'
import { renderTocPages, entriesToNestedBookmarks } from './tocUtils.ts'
import { PDFDocument } from 'pdf-lib'
```

In `handleMerge`, after building `mergeInputs` and `bookmarks`:

```typescript
// Call mergePDFs without bookmarks — we'll add them after TOC insertion
const mergedBytes = await mergePDFs(
  mergeInputs.map((input) => {
    const base: { file: File; pages?: number[]; rotations?: Record<number, number> } = { file: input.file }
    if ('pages' in input && input.pages) base.pages = input.pages
    if ('rotations' in input && input.rotations) base.rotations = input.rotations
    return base
  }),
  (current, total) => { setProgress(Math.round((current / total) * 100)) },
  // Only pass flat bookmarks when TOC is OFF
  !tocEnabled && bookmarks.length > 1 ? bookmarks : undefined,
)

let finalBytes = mergedBytes

// If TOC enabled, load the merged doc, insert TOC page, add nested bookmarks
if (tocEnabled && tocEntries.length > 0) {
  const pdfDoc = await PDFDocument.load(mergedBytes)
  const tocPageCount = await renderTocPages(pdfDoc, tocEntries, tocNumbering, tocCustomPrefix)
  const nestedBookmarks = entriesToNestedBookmarks(tocEntries, tocNumbering, tocCustomPrefix, tocPageCount)
  addPdfBookmarks(pdfDoc, nestedBookmarks)
  finalBytes = await pdfDoc.save()
}

const blob = new Blob([finalBytes], { type: 'application/pdf' })
```

**Also update the `useCallback` dependency array** (currently `[files, smartFilename]`) to include TOC state:
```typescript
}, [files, smartFilename, tocEnabled, tocEntries, tocNumbering, tocCustomPrefix])
```

This prevents stale closures where merge uses outdated TOC data.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/tools/pdf-merge/PdfMergeTool.tsx
git commit -m "feat: integrate TOC toggle, editor modal, and merge data into PDF Merge"
```

---

### Task 6: Build verification and manual test

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 2: Start dev server and test**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx vite --port 5173 --host 127.0.0.1`

Test checklist at `http://localhost:5173` via Playwright MCP browser:
1. Open PDF Merge, add 3+ PDF files
2. "TOC" toggle button appears in toolbar (next to Preview)
3. Clicking it opens the TOC Editor Modal — entries auto-populated from filenames
4. Numbering pills work — numbers update in real-time
5. Click entry label to inline-edit
6. Select entries via checkbox, Tab to indent, Shift+Tab to outdent
7. "Auto-detect Names" scans pages and updates labels
8. Fallback names show subtle "(auto)" tag
9. Close modal, reorder files — TOC entry page numbers update
10. "Merge & Download" — exported PDF has:
    - Page 1: Tabular TOC page with clickable entries
    - Remaining pages: source documents
    - PDF sidebar bookmarks with parent/child nesting
11. Open exported PDF in a viewer — click TOC entries and bookmarks to verify navigation
12. Toggle TOC off — merge produces normal output without TOC page

- [ ] **Step 3: Production build**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: TOC polish from manual testing"
```
