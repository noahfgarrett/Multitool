# Draw Tool Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the settling jolt on pencil stroke commit and enable velocity-based width variation during live drawing.

**Architecture:** Extract a shared `renderFreehandStroke()` helper in `drawing.ts`. Replace `drawSmoothPath()` with this helper in the live pencil rendering path. Fix `thinning` to always be `0.5`. Remove point decimation for pencil on commit.

**Tech Stack:** React 19, TypeScript, `perfect-freehand` (already installed), HTML Canvas API

---

### Task 1: Extract `renderFreehandStroke()` Helper

**Files:**
- Modify: `src/tools/pdf-annotate/drawing.ts` (lines 157-188)

- [ ] **Step 1: Add the `renderFreehandStroke` export function**

In `src/tools/pdf-annotate/drawing.ts`, add this function after the `drawSmoothPath` function (after line ~62) and before the `drawAnnotation` function:

```typescript
/**
 * Render a freehand stroke using perfect-freehand's variable-width algorithm.
 * Used for both live drawing and committed annotation rendering.
 */
export function renderFreehandStroke(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number, number]>,
  options: {
    size: number
    simulatePressure: boolean
    last: boolean
    color: string
    opacity: number
  },
): void {
  if (points.length < 2) return

  const hasTruePressure = points.some(([, , p]) => p !== 0.5 && p !== 0)
  const strokeOutline = getStroke(points, {
    size: options.size,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: options.simulatePressure,
    last: options.last,
  })

  if (strokeOutline.length === 0) return

  ctx.save()
  ctx.globalAlpha = options.opacity
  ctx.fillStyle = options.color
  ctx.beginPath()
  ctx.moveTo(strokeOutline[0][0], strokeOutline[0][1])
  for (let i = 1; i < strokeOutline.length; i++) {
    ctx.lineTo(strokeOutline[i][0], strokeOutline[i][1])
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
```

- [ ] **Step 2: Refactor the committed pencil rendering to use the helper**

In the same file, replace the pencil case with pressure (lines 164-184):

From:
```typescript
} else if (ann.pressure && ann.pressure.length === pts.length) {
  const inputPts = pts.map((p, i) => [p.x * scale, p.y * scale, ann.pressure![i]] as [number, number, number])
  const hasTruePressure = ann.pressure.some(p => p !== 0.5 && p !== 0)
  const strokeOutline = getStroke(inputPts, {
    size: ann.strokeWidth * scale * 2,
    thinning: hasTruePressure ? 0.5 : 0,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure: !hasTruePressure,
  })
  if (strokeOutline.length > 0) {
    ctx.beginPath()
    ctx.moveTo(strokeOutline[0][0], strokeOutline[0][1])
    for (let i = 1; i < strokeOutline.length; i++) {
      const [x, y] = strokeOutline[i]
      ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
  }
```

To:
```typescript
} else if (ann.pressure && ann.pressure.length === pts.length) {
  const inputPts = pts.map((p, i) => [p.x * scale, p.y * scale, ann.pressure![i]] as [number, number, number])
  const hasTruePressure = ann.pressure.some(p => p !== 0.5 && p !== 0)
  renderFreehandStroke(ctx, inputPts, {
    size: ann.strokeWidth * scale * 2,
    simulatePressure: !hasTruePressure,
    last: true,
    color: ctx.strokeStyle as string,
    opacity: ctx.globalAlpha,
  })
```

Note: `ctx.strokeStyle` and `ctx.globalAlpha` are already set by the caller before the switch statement. The helper saves/restores context, so existing state is preserved.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/tools/pdf-annotate/drawing.ts
git commit -m "refactor: extract renderFreehandStroke helper for shared live/committed rendering"
```

---

### Task 2: Replace Live Pencil Rendering with `renderFreehandStroke`

**Files:**
- Modify: `src/tools/pdf-annotate/PdfAnnotateTool.tsx` (lines ~3515-3525)

- [ ] **Step 1: Import `renderFreehandStroke`**

Find the existing import from `./drawing.ts` (around line 40-45). Add `renderFreehandStroke` to the import:

```typescript
import { drawAnnotation, drawSmoothPath, renderFreehandStroke, ... } from './drawing.ts'
```

If `drawSmoothPath` is no longer used elsewhere in PdfAnnotateTool.tsx after this change, remove it from the import.

- [ ] **Step 2: Replace the live pencil rendering block**

Find the `else` branch in the live rendering section (around line 3515-3525) that currently does:

```typescript
} else {
  ctx.save()
  ctx.globalAlpha = opacity / 100
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth * pageRs
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  drawSmoothPath(ctx, currentPtsRef.current, pageRs)
  ctx.restore()
}
```

Replace with:

```typescript
} else {
  const livePts = currentPtsRef.current
  const livePressure = currentPressureRef.current
  if (livePts.length >= 2) {
    const inputPts = livePts.map((p, i) => [
      p.x * pageRs,
      p.y * pageRs,
      livePressure[i] ?? 0.5,
    ] as [number, number, number])
    const hasTruePressure = livePressure.some(p => p !== 0.5 && p !== 0)
    renderFreehandStroke(ctx, inputPts, {
      size: strokeWidth * pageRs * 2,
      simulatePressure: !hasTruePressure,
      last: false,
      color,
      opacity: opacity / 100,
    })
  }
}
```

Key differences from committed rendering:
- `last: false` (stroke is still in progress — no end cap)
- Uses `currentPtsRef` and `currentPressureRef` (live data, not committed annotation)
- `opacity / 100` (live uses the 0-100 slider value, committed uses 0-1)

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/tools/pdf-annotate/PdfAnnotateTool.tsx
git commit -m "feat: live pencil rendering uses perfect-freehand — velocity-based width, no settling jolt"
```

---

### Task 3: Remove Point Decimation for Pencil on Commit

**Files:**
- Modify: `src/tools/pdf-annotate/PdfAnnotateTool.tsx` (line ~3850)

- [ ] **Step 1: Remove decimation for pencil strokes**

Find line ~3850:
```typescript
const finalPts = isHL ? [...pts] : (isPencilOrHL ? decimatePoints([...pts], 0.5) : [...pts])
```

Change to:
```typescript
const finalPts = [...pts]
```

Point decimation was needed when live and committed rendering used different algorithms — decimation changed the curve shape causing visual mismatch. Now that both paths use `getStroke()` with the same `smoothing` and `streamline` options, the library handles smoothing internally. Raw points produce the most faithful reproduction.

- [ ] **Step 2: Check if `decimatePoints` import is still used**

Search the file for other uses of `decimatePoints`. If this was the only call site, remove it from the import line:

```typescript
// Remove decimatePoints from this import if unused:
import { ..., decimatePoints, ... } from './geometry.ts'
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/tools/pdf-annotate/PdfAnnotateTool.tsx
git commit -m "fix: remove point decimation for pencil — prevents curve shape change on commit"
```

---

### Task 4: Visual Verification

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Visual test — mouse drawing**

Open the app, go to PDF Annotate, upload a PDF. Select the Pencil tool and draw:
1. Draw a stroke slowly — should produce a THICK line
2. Draw a stroke quickly — should produce a THIN line
3. Release the mouse button — stroke should NOT visibly jump, shift, or change shape
4. Draw multiple strokes — each should retain its velocity-based width variation

- [ ] **Step 3: Visual test — undo/redo**

1. Draw a stroke
2. Ctrl+Z to undo — stroke disappears
3. Ctrl+Shift+Z to redo — stroke reappears with same shape and width variation

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: draw tool overhaul — velocity-based width + zero-jolt commit"
```
