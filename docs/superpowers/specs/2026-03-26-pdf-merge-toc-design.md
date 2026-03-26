# PDF Merge — Table of Contents

**Date:** 2026-03-26
**Status:** Approved

## Overview

Add an optional Table of Contents feature to PDF Merge. When enabled, the merged PDF gets a professionally formatted tabular TOC page inserted as page 1, plus PDF outline bookmarks for sidebar navigation. Users can customize entry names, indent entries into parent/child hierarchy, choose numbering conventions, and auto-detect names from page content.

## Architecture

The TOC feature is an enhancement to the existing PDF Merge tool — not a separate tool.

- **Toggle button** in the merge toolbar (next to "Preview") activates the TOC feature
- **TOC Editor Modal** provides the full editing experience for entries, hierarchy, and numbering
- **Auto-detect Names** uses pdfjs-dist text extraction to suggest entry labels from page content
- **TOC state** lives in `PdfMergeTool.tsx` alongside the existing `files` state
- On merge, TOC data produces: (1) a vector PDF TOC page via pdf-lib, and (2) nested PDF outline bookmarks via the existing `addPdfBookmarks` infrastructure
- No new dependencies — uses existing pdfjs-dist and pdf-lib

### Files to create/modify

| File | Action | Purpose |
|------|--------|---------|
| `src/tools/pdf-merge/TocEditorModal.tsx` | Create | The TOC editor modal component |
| `src/tools/pdf-merge/tocUtils.ts` | Create | Auto-detect names, TOC page rendering, numbering logic, types |
| `src/tools/pdf-merge/PdfMergeTool.tsx` | Modify | Add TOC toggle, state, pass TOC data to merge |
| `src/utils/pdf.ts` | Modify | Add `extractPageTitleCandidate` export, update `addPdfBookmarks` for nested outlines, extend `mergePDFs` to accept TOC data |
| `src/components/common/Modal.tsx` | Modify | Add `'2xl'` and `'3xl'` width options to the widths map |

No changes to `registry.ts`, `appStore.ts`, or any other tool.

## Entry Point

A toggle button in the merge toolbar, positioned next to the existing "Preview" toggle:
- Icon: `ListOrdered` from lucide-react
- Label: "Table of Contents"
- Default: Off
- When toggled on: a badge or subtle indicator shows it's active (e.g., orange dot)
- Clicking the label or a dedicated "Edit" button opens the TOC Editor Modal

## TOC Data Model

### Types

All TOC types are defined and exported from `src/tools/pdf-merge/tocUtils.ts`:

```typescript
interface TocEntry {
  id: string              // Unique ID (crypto.randomUUID)
  label: string           // Display name ("Structural Plans")
  pageIndex: number       // Starting page in assembled source pages (0-based, pre-TOC insertion)
  pageCount: number       // Number of pages in this section
  indent: number          // 0 = parent, 1 = child
  autoDetected: boolean   // True if name came from fallback (shows "(auto)" tag)
  sourceFileId: string    // Links back to the MergeFile it came from
  sourcePageNumber?: number // For child entries: specific page in source file
}

type TocNumbering = 'none' | 'numeric' | 'alpha' | 'roman' | 'custom'

interface NestedBookmark {
  title: string           // "1. Structural Plans" (numbering prefix prepended)
  pageIndex: number       // 0-based page in final merged doc (offset by TOC page count)
  children?: NestedBookmark[]
}
```

### Page index semantics

There is a chicken-and-egg relationship between page numbers and TOC page count:

- **During editing:** `pageIndex` is the 0-based index into the assembled source pages (TOC not yet inserted). The "Page" column in the TOC editor displays `pageIndex + estimatedTocPageCount + 1` (1-based, accounting for the TOC page).
- **Estimated TOC page count:** Calculated from entry count and available page height. Updated live as entries are added/removed. Usually 1 page, 2 if > ~35 entries.
- **During merge:** The final TOC page count is known after rendering. All `pageIndex` values are offset by the actual TOC page count for bookmarks and link annotations.

### State in PdfMergeTool

```typescript
const [tocEnabled, setTocEnabled] = useState(false)
const [tocEntries, setTocEntries] = useState<TocEntry[]>([])
const [tocNumbering, setTocNumbering] = useState<TocNumbering>('numeric')
const [tocCustomPrefix, setTocCustomPrefix] = useState('')
```

### Auto-population

When the user first enables the TOC toggle (or opens the modal with an empty entry list), entries are auto-populated:
- One parent entry per source file, using the filename (minus `.pdf`) as the label
- `pageIndex` calculated from cumulative page counts (respecting excluded pages)
- `pageCount` from the file's included page count
- `indent: 0` for all auto-populated entries
- `autoDetected: false` (filenames are not auto-detected, they're known)

### Sync behavior

When files are reordered, added, removed, or pages are excluded in the merge view:
- `pageIndex` and `pageCount` are recalculated for all entries
- Labels and indent levels are preserved
- Entries for removed files are also removed
- Entries for newly added files are appended at the end
- If all pages of a file are excluded, its TOC entry is grayed out with a "(no pages)" indicator — not hidden, so the user can see the gap

TOC state persists across merge/gridStitch mode switches (both are `useState` in PdfMergeTool, which persists across renders). TOC is only relevant to merge mode — the toggle and toolbar button are hidden in gridStitch mode.

## TOC Editor Modal

### Layout

A large modal using `width: "3xl"` (add to Modal.tsx widths map: `'2xl': 'max-w-2xl'`, `'3xl': 'max-w-3xl'`).

**Header row:**
- `ListOrdered` icon + "Table of Contents" title + entry count
- "Auto-detect Names" button (blue accent, `Lightbulb` icon)
- Close button

**Toolbar row:**
- Numbering preset pills: None | 1, 2, 3 | A, B, C | I, II, III | Custom...
  - "Custom..." opens a small inline input for the prefix string (e.g., "Section ", "Sheet ")
  - Active preset has orange highlight
- Right side: Select All | Indent | Outdent bulk action buttons

**Column headers:**
- Checkbox (select) | Drag handle | No. | Description | Pages | Page | Actions

**Entry list** (scrollable, max-height):
- Each row has: checkbox, drag handle, auto-calculated number, editable label, page count, starting page, three-dot menu
- **Parent entries** (indent 0): Bold label, full-size row
- **Child entries** (indent 1): Indented ~24px, lighter text, slightly smaller
- **Fallback indicator**: Entries where auto-detect fell back show a muted `(auto)` tag next to the label
- **Edit pencil**: Small pencil icon next to label — clicking it or clicking the label directly enables inline editing

**Footer row:**
- Keyboard shortcut hints: "Tab to indent selected · Shift+Tab to outdent · Click name to edit"
- "Add Entry" button (secondary) — appends a new parent entry with label "Untitled" and `pageIndex` = last entry's pageIndex + pageCount, editable immediately via inline edit
- "Done" button (primary, orange) — closes the modal

### Interactions

| Action | Behavior |
|--------|----------|
| Click checkbox | Toggle selection for that entry |
| Click + Shift+Click | Range selection |
| Tab (with selection) | Indent selected entries (set `indent: 1`, become children of the preceding indent-0 entry). Only applies when entries are selected — default Tab focus behavior is preserved otherwise for accessibility. |
| Shift+Tab (with selection) | Outdent selected entries (set `indent: 0`, become parents) |
| Drag handle | Reorder entries. **Parents drag with their children as a group.** Children can be reordered within their parent but cannot be dragged to a different parent. |
| Click label / pencil icon | Inline edit — text input replaces the label, Enter or blur to confirm, Escape to cancel |
| Three-dot menu → Add child | Insert a child entry immediately after the parent (or after its last existing child). Default label: `"{parent label} - Page {N}"` where N is the next page after existing children. Default `pageIndex`: parent's `pageIndex + existing children count`. |
| Three-dot menu → Delete | Remove the entry. If a parent is deleted, its children are promoted to parents. |
| Three-dot menu → Duplicate | Create a copy of the entry pointing to the same pageIndex. Useful for splitting a section into a parent + its first child. |
| "Add Entry" button | Appends a new parent entry at the end with label "Untitled", `pageIndex` set to last entry's end, inline edit activated immediately |
| Numbering preset | Changes how the No. column displays — recalculates all numbers immediately |

### Numbering Conventions

Numbers are auto-calculated based on the preset and hierarchy position:

| Preset | Parent | Child |
|--------|--------|-------|
| None | (empty) | (empty) |
| 1, 2, 3 | 1. | 1.1, 1.2, 1.3 |
| A, B, C | A. | A.1, A.2, A.3 |
| I, II, III | I. | I.1, I.2, I.3 |
| Custom "Section " | Section 1. | Section 1.1, Section 1.2 |

The number is a display prefix — it's prepended to the label in the generated TOC page and bookmarks, but stored separately from the label so changing the numbering preset doesn't modify the user's text.

## Auto-detect Names

### Trigger
"Auto-detect Names" button in the TOC modal header. Shows a progress indicator while scanning (e.g., "Scanning page 3 of 19...").

### Implementation

A new exported function in `src/utils/pdf.ts`:

```typescript
export async function extractPageTitleCandidate(
  file: File,
  pageNumber: number, // 1-based
): Promise<string | null>
```

This function:
1. Loads the PDF via the existing `getCachedDoc` internal cache (or loads fresh if not cached)
2. Calls `page.getTextContent()` on the specified page
3. Collects text items with font sizes from `Math.abs(item.transform[0]) || 12` (fallback to 12 when transform is zero — matches the existing `extractPositionedText` pattern)
4. Returns the cleaned title string, or `null` if no good candidate found

### Algorithm (in `tocUtils.ts`, calls `extractPageTitleCandidate`)

For each page in the merge order:

1. Call `extractPageTitleCandidate(file, pageNumber)`
2. Find the text item(s) with the **largest font size** — these are likely titles or headers
3. Among the largest-font items, take the **first one** (reading order, top-to-bottom)
4. **Clean the text**: trim whitespace, strip common noise patterns:
   - "SHEET X OF Y" → remove
   - "PAGE X" → remove
   - Dates in common formats → remove
   - If result is < 3 characters or > 80 characters → fallback
5. **Fallback**: `{filename} - Page {N}` with `autoDetected: true`

### Application

- Parent entries get the detected title from their **first page**
- Child entries get the detected title from their specific page
- Existing user-edited labels are **not overwritten** — only entries that still have their default filename-based label get updated
- Confirmation toast via `useAppStore.getState().addToast()`: "Updated 12 of 15 entries (3 were manually edited)"

### Performance

Text extraction is lightweight — no rendering, just parsing text items from the PDF structure. Expect < 2 seconds for 50 pages.

## TOC Page Rendering

### When generated

During the merge process, after all source pages are assembled but before the final PDF is saved. The TOC page is inserted as **page 1** of the merged document.

### Rendering approach

Use **pdf-lib directly** to draw the tabular layout — text, lines, and rectangles. No HTML-to-PDF, no canvas. Produces crisp vector output at any zoom.

### Page layout (Tabular style)

```
+--------------------------------------------------+
|          TABLE OF CONTENTS                        |
|                                                   |
|  No.    Description                      Page     |
|  ─────────────────────────────────────────────── |
|  1.     Structural Plans                    1     |
|  1.1      Foundation Details                1     |
|  1.2      Framing Layout                   4     |
|  ─────────────────────────────────────────────── |
|  2.     Mechanical Plans                    7     |
|  2.1      HVAC Layout                       7     |
|  2.2      Plumbing Details                 10     |
|  ─────────────────────────────────────────────── |
|  3.     Electrical Plans                   13     |
|  4.     Site Survey                        18     |
|                                                   |
+--------------------------------------------------+
```

### Specifics

- **Font**: Helvetica (pdf-lib StandardFont — always available, no embedding needed)
- **Title**: "TABLE OF CONTENTS" — 16pt bold, centered
- **Column headers**: "No." | "Description" | "Page" — 10pt bold, with separator line below
- **Parent entries**: 11pt bold
- **Child entries**: 10pt regular, indented ~20pt from parent
- **Separator lines**: Light gray between parent groups (0.5pt, #CCCCCC)
- **Page numbers**: Right-aligned. Display as 1-based final page numbers (source pageIndex + tocPageCount + 1).
- **Page size**: Match the first source document's page dimensions
- **Margins**: 72pt (1 inch) all sides — standard for construction documents
- **Clickable links**: Each entry row is a PDF link annotation (`/Subtype /Link`, `/Rect` for the row bounds, `/Dest` array pointing to the target page). This is the most technically complex part of the rendering — it requires creating `PDFDict` entries with annotation properties and adding them to the TOC page's `/Annots` array. Reference the existing bookmark destination pattern (`PDFArray` with page ref + `PDFName.of('Fit')`).

### Page overflow

If the TOC has too many entries for one page, continue onto a second TOC page. Calculate available height = page height - margins - header height, then row height (~18pt per entry). If entries exceed available space, split and add "TABLE OF CONTENTS (continued)" header on page 2.

## PDF Outline Bookmarks

In addition to the visual TOC page, the merge generates **PDF outline bookmarks** (the sidebar navigation tree that appears in PDF viewers like Acrobat, Preview, Chrome).

### Updated function signature

```typescript
function addPdfBookmarks(
  pdfDoc: PDFDocument,
  bookmarks: NestedBookmark[],
): void
```

The existing flat bookmark callers (the current `handleMerge` when TOC is disabled) will pass entries without `children`. When TOC is enabled, the caller converts `tocEntries` into `NestedBookmark[]` with children nested under parents.

### Nested structure

- Parent entries (indent 0) are top-level outline items
- Child entries (indent 1) are nested under their parent:
  - Parent dict gets `First`, `Last`, `Count` pointing to its children
  - Child dicts get `Parent` pointer to the parent
  - Children are linked with `Prev`/`Next` sibling pointers (same as existing flat implementation)
- This uses the same PDF outline spec already implemented — just adding one level of nesting

### mergePDFs signature extension

```typescript
export async function mergePDFs(
  files: { file: File; pages?: number[]; rotations?: Record<number, number> }[],
  onProgress?: (current: number, total: number) => void,
  bookmarks?: NestedBookmark[],
  tocData?: {
    entries: TocEntry[]
    numbering: TocNumbering
    customPrefix: string
  },
): Promise<Uint8Array>
```

When `tocData` is provided, `mergePDFs`:
1. Assembles source pages (existing behavior)
2. Renders the TOC page(s) from `tocData` using the rendering logic in `tocUtils.ts`
3. Inserts TOC page(s) at position 0
4. Builds nested bookmarks with page indices offset by the TOC page count
5. Adds bookmarks via `addPdfBookmarks`
6. Saves and returns

## Merge Output Order

1. **TOC page(s)** — if `tocEnabled`, 1-2 pages generated from `tocEntries`
2. **Source documents** — in merge order, with excluded pages removed and rotations applied (existing behavior)

Page numbers in the TOC refer to the **final document page numbers** (TOC page = 1, first source page = 2 or 3 if TOC overflows).

## Visual Design

- Follows the existing dark theme and LotusWorks design language
- All icons from lucide-react
- Modal uses the `Modal` component with new `'3xl'` width option
- Orange accent (`#F47B20`) for active states, selected entries, primary buttons
- Blue accent for the "Auto-detect Names" button (matches the Enhancement Idea color language)
- Entry rows follow the same visual density as the existing file list in merge view

## Constraints

- 100% client-side — no external API calls
- No new dependencies
- Must work in the single-HTML distribution build
- Text extraction only works on PDFs with embedded text (not scanned images without OCR)
- pdf-lib StandardFonts only support Latin-1 characters — TOC entry labels with CJK/emoji will show `?` (documented limitation in CLAUDE.md)

## Follow-up Features (out of scope)

- **Cover Page Builder** — Template-based cover page with project fields and logo upload. Will be incorporated into Form Builder as a template. The merge output order will become: Cover Page → TOC → Documents.
- **Per-page granularity (Option C)** — Every page gets a TOC entry by default. Deferred — current B-level (per-file + manual sub-entries) covers the core use case.
