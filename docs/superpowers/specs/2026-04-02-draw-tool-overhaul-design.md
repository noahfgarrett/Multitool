# Draw Tool Overhaul — Design Spec

**Date:** 2026-04-02
**Status:** Approved
**Goal:** Eliminate the settling jolt on pencil stroke commit and add velocity-based width variation during live drawing.

## Problem

1. **Settling jolt** — Live drawing uses `drawSmoothPath()` (Catmull-Rom + `ctx.stroke()`), commit uses `getStroke()` from `perfect-freehand` (polygon outline + `ctx.fill()`). Two different rendering algorithms produce a visible jump when the mouse is released.
2. **No velocity-based width** — `perfect-freehand` only runs on commit. During live drawing, strokes are uniform width regardless of speed.

## Root Cause

- Live rendering: `PdfAnnotateTool.tsx:3430` — `drawSmoothPath(ctx, currentPtsRef.current, pageRs)` with `ctx.stroke()`
- Committed rendering: `drawing.ts:168` — `getStroke(inputPts, {...})` with `ctx.fill()`
- Point decimation on commit: `decimatePoints([...pts], 0.5)` at `PdfAnnotateTool.tsx:3753` reduces point count, further changing curve shape

## Fix

### Use `getStroke()` for both live and committed rendering

**Live drawing (`handlePointerMove`):**
```typescript
const strokeOutline = getStroke(inputPts, {
  size: strokeWidth * pageRenderScale * 2,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: !hasTruePressure,
  last: false,  // stroke is incomplete
})
```

**Committed rendering (`drawing.ts` — already correct):**
```typescript
const strokeOutline = getStroke(inputPts, {
  size: ann.strokeWidth * scale * 2,
  thinning: hasTruePressure ? 0.5 : 0,
  smoothing: 0.5,
  streamline: 0.5,
  simulatePressure: !hasTruePressure,
  last: true,  // stroke is complete, add end cap
})
```

Only difference: `last: false` during live drawing, `last: true` on commit.

### Pressure detection

- Mouse (`pointerType === 'mouse'`): `simulatePressure: true` — velocity controls width
- Pen (`pointerType === 'pen'`): `simulatePressure: false` — real Apple Pencil pressure
- Touch (`pointerType === 'touch'`): `simulatePressure: true` — velocity-based

Detection already exists: `hasTruePressure = pressure.some(p => p !== 0.5 && p !== 0)`

### Extract shared rendering helper

Create a helper function used by both live and committed paths:

```typescript
function renderFreehandStroke(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number, number]>,
  options: { size: number; simulatePressure: boolean; last: boolean; color: string; opacity: number }
): void
```

This goes in `drawing.ts` and is imported by `PdfAnnotateTool.tsx` for live rendering. Eliminates code duplication.

### Remove `drawSmoothPath()` from live pencil rendering

The `drawSmoothPath()` call in `handlePointerMove` for pencil strokes is replaced entirely by `renderFreehandStroke()`. `drawSmoothPath()` itself remains in the codebase for other uses (non-pressure annotation rendering fallback in `drawing.ts`).

### Remove point decimation on pencil commit

Remove `decimatePoints([...pts], 0.5)` for pencil strokes in `handlePointerUp`. Store raw points. `perfect-freehand` handles smoothing internally via its `smoothing` and `streamline` options. Decimation was causing curve shape changes between live and committed rendering.

Note: Highlighter strokes already skip decimation (`isHL ? [...pts]`), so this just extends that pattern to pencil.

### Update committed rendering thinning

Currently `drawing.ts` sets `thinning: 0` when there's no true pressure (mouse-drawn strokes). This means committed mouse strokes are uniform width — losing the velocity variation that `simulatePressure` provided. Change to:

```typescript
thinning: 0.5,  // always 0.5 — simulatePressure handles the velocity→width mapping
```

The `simulatePressure: !hasTruePressure` flag already controls whether velocity or real pressure drives the variation. `thinning` should always be `0.5` to allow that variation to be visible.

## Files Changed

- `src/tools/pdf-annotate/drawing.ts` — Extract `renderFreehandStroke()` helper, fix thinning to always be 0.5
- `src/tools/pdf-annotate/PdfAnnotateTool.tsx` — Replace `drawSmoothPath()` with `renderFreehandStroke()` in live pencil rendering, remove `decimatePoints` for pencil on commit

## What's NOT Changing

- Highlighter tool rendering (separate offscreen canvas approach)
- Shape tools (rectangle, circle, line, arrow, cloud, polygon)
- Text/callout tools
- `drawSmoothPath()` function itself (used as fallback for `smooth === false` annotations)
- Straight-line mode rendering
- Any other annotation type
- The overall snapshot-restore pattern for incremental canvas updates
