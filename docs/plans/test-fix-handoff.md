# Test Fix Handoff — PDF Annotate Phase 2/3 Regression Fixes

## Status: In Progress

### Baseline (before fixes)
- **1469 total tests** in `e2e/documents/pdf-annotate/`
- **1228 passed, 241 failed** (4 workers)

### What's been fixed
1. **Export button text** — Changed "Export" back to "Export PDF" in `PdfAnnotateTool.tsx:4184`
2. **Export modal flow** — Updated `exportPDF()` helper in `e2e/helpers/pdf-annotate.ts` to click "Export for Review" after the modal opens
3. **Reset dialog tests** — Added `resetWithConfirm()` / `resetWithDismiss()` helpers that use `page.on('dialog')` for native `confirm()`. Updated all 22 references across:
   - `01-file-handling.spec.ts`
   - `23-session-persistence.spec.ts`
   - `24-export.spec.ts`
4. **Export test modal step** — Added `Export for Review` click to all direct export button clicks in:
   - `24-export.spec.ts` (~36 locations)
   - `25-text-highlight.spec.ts` (line 427)
   - `27-chaos-stress.spec.ts` (line 707)

### Verified passing
- `24-export.spec.ts` — 43/43 (was 0/43)
- `01-file-handling.spec.ts` — all passing (was 13 failing)
- `23-session-persistence.spec.ts` — all passing (was 3 failing)
- Combined run of those 3 files: **122/122 passed**

### Remaining failures (~150+ estimated)
Full run was in progress but not completed. Categories:

1. **Visual regression snapshots (28)** — `28-visual-regression.spec.ts` — All baselines stale from toolbar changes. Fix: `npx playwright test e2e/documents/pdf-annotate/28-visual-regression.spec.ts --update-snapshots`

2. **Text resize/move tests (30)** — `12-text-resize.spec.ts` — Arrow key nudge, delete, duplicate, copy-paste all failing. Root cause needs investigation — may be that `selectAnnotationAt` enters edit mode for text, intercepting keyboard events.

3. **Callout tool tests (16)** — `13-callout-tool.spec.ts`:
   - `button[title="Callout (O)"]` not found — title is dynamic on dropdown trigger, only shows when callout is active. Tests should use keyboard shortcut 'o' instead.
   - Default font size test expects 14, actual is 16 (test bug, MEMORY.md confirms default is 16)

4. **Multi-page tests (19)** — `22-multi-page.spec.ts` — Some strict mode violations from duplicate elements

5. **Zoom tests (11)** — `20-zoom-pan.spec.ts` — Strict mode violations with zoom preset buttons (e.g., "25%" matches both "25%" and "125%")

6. **Other scattered failures** — Eraser, undo/redo, cursor hit testing, cloud tool, highlighter — mostly strict mode violations or interception issues

### Key patterns to fix
- **Strict mode**: Many tests use simple text matchers that now match multiple elements due to new toolbar buttons. Use `{ exact: true }` or more specific selectors.
- **Pointer interception**: Some dropdown items are behind overlapping divs. May need `{ force: true }` or closing dropdowns first.
- **Visual baselines**: Just need `--update-snapshots` after all other fixes are done.

### Files modified (uncommitted)
- `src/tools/pdf-annotate/PdfAnnotateTool.tsx` — Export button text
- `e2e/helpers/pdf-annotate.ts` — exportPDF helper + reset helpers
- `e2e/documents/pdf-annotate/01-file-handling.spec.ts` — Reset dialog tests
- `e2e/documents/pdf-annotate/23-session-persistence.spec.ts` — Reset dialog tests
- `e2e/documents/pdf-annotate/24-export.spec.ts` — Export modal flow + reset
- `e2e/documents/pdf-annotate/25-text-highlight.spec.ts` — Export modal flow
- `e2e/documents/pdf-annotate/27-chaos-stress.spec.ts` — Export modal flow
