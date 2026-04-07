# HEIC Support & Bulk Conversion Progress Bar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add HEIC/HEIF image conversion support and a progress bar for bulk conversions so users can convert 20+ files with clear visual feedback.

**Architecture:** Install `heic2any` for client-side HEIC decoding. Register `.heic`/`.heif` in the existing format registry as image category. Add a bulk progress bar to `ConverterTool.tsx` that shows completion count and a visual bar during "Convert All" operations. HEIC files get decoded to PNG blobs first, then flow through the existing image conversion pipeline.

**Tech Stack:** heic2any (HEIC decoding), existing conversion pipeline (canvas, pdf-lib), React state for progress tracking.

---

### Task 1: Install heic2any

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the heic2any package**

```bash
cd /Users/noahgarrett/codebase/multitool && npm install heic2any
```

- [ ] **Step 2: Verify installation**

```bash
ls /Users/noahgarrett/codebase/multitool/node_modules/heic2any/dist/heic2any.d.ts
```

Expected: File exists (confirms package installed with types).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install heic2any for HEIC/HEIF image conversion"
```

---

### Task 2: Add HEIC/HEIF to the format registry and conversion logic

**Files:**
- Modify: `src/utils/conversion.ts`

- [ ] **Step 1: Add HEIC/HEIF entries to FORMAT_REGISTRY**

In `src/utils/conversion.ts`, add two entries after the existing image entries (after the `svg` line, around line 83):

```typescript
heic: { category: 'image', outputs: [PNG, JPEG, WEBP, PDF] },
heif: { category: 'image', outputs: [PNG, JPEG, WEBP, PDF] },
```

- [ ] **Step 2: Add the HEIC decoding helper function**

Add this function in the IMAGE CONVERTERS section (after `parseSvgDimensions`, around line 265):

```typescript
/**
 * Decode a HEIC/HEIF file into a PNG blob using heic2any.
 * Returns a standard image Blob that the browser can render via canvas.
 */
async function decodeHeic(file: File): Promise<Blob> {
  const heic2any = (await import('heic2any')).default
  let result: Blob | Blob[]
  try {
    result = await heic2any({ blob: file, toType: 'image/png', quality: 1 })
  } catch (err) {
    throw new Error(`Failed to decode HEIC file: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
  // heic2any can return a single Blob or an array (for multi-image HEIC containers)
  if (Array.isArray(result)) {
    if (result.length === 0) throw new Error('HEIC file contains no images')
    return result[0]
  }
  return result
}
```

- [ ] **Step 3: Route HEIC/HEIF through the decoder in convertFile**

In the `convertFile` function, inside the `if (category === 'image')` block (around line 129), add HEIC handling before the existing SVG/generic image routing:

```typescript
if (category === 'image') {
  // HEIC/HEIF: decode first, then convert as a standard image
  if (ext === 'heic' || ext === 'heif') {
    const decoded = await decodeHeic(file)
    const decodedFile = new File([decoded], `${baseName}.png`, { type: 'image/png' })
    return output.ext === 'pdf'
      ? convertImageToPdf(decodedFile, baseName)
      : convertImageToImage(decodedFile, output, quality, baseName)
  }

  if (ext === 'svg') {
    // ... existing SVG handling
```

- [ ] **Step 4: Run build to verify compilation**

```bash
cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/utils/conversion.ts
git commit -m "feat: add HEIC/HEIF image conversion via heic2any decoder"
```

---

### Task 3: Update ConverterTool UI to accept HEIC/HEIF files

**Files:**
- Modify: `src/tools/file-converter/ConverterTool.tsx`

- [ ] **Step 1: Add HEIC/HEIF to the ACCEPT string**

Update the `ACCEPT` constant (line 19) to include `.heic` and `.heif`:

```typescript
const ACCEPT = [
  'image/*', '.svg', '.heic', '.heif',
  '.pdf',
  '.csv', '.xlsx', '.xls', '.tsv', '.json',
  '.txt', '.md', '.html', '.htm',
  '.docx',
].join(',')
```

Note: `image/*` may not match HEIC on all browsers, so the explicit extensions ensure the file picker allows them.

- [ ] **Step 2: Run build to verify**

```bash
cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/tools/file-converter/ConverterTool.tsx
git commit -m "feat: accept HEIC/HEIF files in file converter drop zone"
```

---

### Task 4: Add bulk conversion progress bar

**Files:**
- Modify: `src/tools/file-converter/ConverterTool.tsx`

This is the core UX improvement. Add a progress bar that appears during "Convert All" operations showing:
- A visual progress bar (animated, orange fill)
- Text: "Converting 3 of 12 files..." with elapsed time for long operations
- Replaces the "Convert All" button while active (prevents double-clicks)

- [ ] **Step 1: Add progress state**

Add these state variables after the existing `entries` state (around line 72):

```typescript
const [bulkProgress, setBulkProgress] = useState<{
  current: number
  total: number
  startTime: number
} | null>(null)
```

- [ ] **Step 2: Update handleConvertAll to track progress**

Replace the existing `handleConvertAll` (lines 114-129) with a version that updates progress:

```typescript
const handleConvertAll = useCallback(async () => {
  const eligible = entries.filter((e) => e.selectedFormat && e.status !== 'done')
  if (eligible.length === 0) return

  setBulkProgress({ current: 0, total: eligible.length, startTime: Date.now() })

  for (let i = 0; i < eligible.length; i++) {
    const entry = eligible[i]
    setBulkProgress((prev) => prev ? { ...prev, current: i } : null)
    updateEntry(entry.id, { status: 'converting', error: null })
    try {
      const raw = await convertFile(entry.file, entry.selectedFormat!, entry.options)
      if (Array.isArray(raw)) {
        updateEntry(entry.id, { status: 'done', result: raw.length === 1 ? raw[0] : null, results: raw })
      } else {
        updateEntry(entry.id, { status: 'done', result: raw, results: null })
      }
    } catch (err) {
      updateEntry(entry.id, { status: 'error', error: err instanceof Error ? err.message : 'Conversion failed' })
    }
  }

  setBulkProgress(null)
}, [entries, updateEntry])
```

- [ ] **Step 3: Add the progress bar UI component**

Add this inline between the toolbar and file entries (after the `downloadError` block, before `{/* File entries */}`):

```tsx
{bulkProgress && (
  <div className="flex-shrink-0 space-y-2">
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/70">
        Converting {bulkProgress.current + 1} of {bulkProgress.total} files...
      </span>
      {(() => {
        const elapsed = Math.floor((Date.now() - bulkProgress.startTime) / 1000)
        return elapsed >= 3 ? (
          <span className="text-white/30">{elapsed}s elapsed</span>
        ) : null
      })()}
    </div>
    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full bg-[#F47B20] transition-all duration-300 ease-out"
        style={{ width: `${((bulkProgress.current + 1) / bulkProgress.total) * 100}%` }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 4: Update the elapsed time display to tick**

The elapsed time won't update automatically since it's computed from `Date.now()` at render time. Add a tick mechanism. Add this after the `bulkProgress` state declaration:

```typescript
// Tick every second while bulk conversion is running to update elapsed time
const [, setTick] = useState(0)
useEffect(() => {
  if (!bulkProgress) return
  const id = setInterval(() => setTick((t) => t + 1), 1000)
  return () => clearInterval(id)
}, [bulkProgress])
```

Update the React import at line 1 to:
```typescript
import { useState, useCallback, useEffect } from 'react'
```

- [ ] **Step 5: Disable "Convert All" button during bulk progress**

In the toolbar, wrap the Convert All button so it's hidden while `bulkProgress` is active:

```tsx
{eligibleCount > 0 && !bulkProgress && (
  <Button onClick={handleConvertAll} size="sm">
    Convert{eligibleCount > 1 ? ` All (${eligibleCount})` : ''}
  </Button>
)}
```

- [ ] **Step 6: Run build to verify**

```bash
cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/tools/file-converter/ConverterTool.tsx
git commit -m "feat: add progress bar for bulk file conversions"
```

---

### Task 5: Update help text

**Files:**
- Modify: `src/data/toolHelp.ts`

- [ ] **Step 1: Add HEIC to the supported conversions list**

In `toolHelp.ts`, find the `file-converter` section's "Supported Conversions" items array and add HEIC mention:

Change:
```typescript
'Images: JPG, PNG, WebP, BMP — convert between any combination',
```
To:
```typescript
'Images: JPG, PNG, WebP, BMP, HEIC/HEIF — convert between formats (HEIC/HEIF input only)',
```

- [ ] **Step 2: Commit**

```bash
git add src/data/toolHelp.ts
git commit -m "docs: add HEIC/HEIF to file converter help text"
```

---

### Task 6: Manual testing & verification

- [ ] **Step 1: Start dev server**

```bash
cd /Users/noahgarrett/codebase/multitool && npm run dev
```

- [ ] **Step 2: Test HEIC conversion**

Open the file converter, drop a `.heic` file:
- Verify it shows as "HEIC" type with PNG, JPEG, WebP, PDF output buttons
- Convert to each format — verify output downloads correctly
- Test with a `.heif` file if available

- [ ] **Step 3: Test bulk conversion with progress bar**

Drop 5+ files of mixed types (images, PDFs, etc.), select output formats for all, click "Convert All":
- Verify progress bar appears with "Converting X of Y files..."
- Verify the bar fills smoothly as conversions complete
- Verify elapsed time appears after ~3 seconds
- Verify "Convert All" button is hidden during conversion
- Verify progress bar disappears when complete
- Verify "Download All" bundles everything into a ZIP

- [ ] **Step 4: Test large batch (20+ files)**

Drop 20+ image files, select an output format for all, click "Convert All":
- Verify the UI remains responsive
- Verify progress bar tracks accurately
- Verify all files convert successfully

- [ ] **Step 5: Final build check**

```bash
cd /Users/noahgarrett/codebase/multitool && npm run build
```

Expected: Build succeeds with no errors.
