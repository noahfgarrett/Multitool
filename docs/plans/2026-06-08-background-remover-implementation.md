# Background Remover "Really Good" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the binary chroma-key background remover with a model-free, pro-quality tool: soft anti-aliased edges, defringe, live preview, magic-wand contiguous selection, multi-color sampling, and erase/restore brushes — with undo/redo and faithful full-res export.

**Architecture:** A pure, DOM-free `maskEngine` (operates on `Uint8ClampedArray`) computes a soft alpha mask from a declarative `MaskDoc` (color samples + wand seeds + vector brush strokes + tolerance/softness/defringe). The React layer caches the source at two resolutions — a ~1600px preview for instant interaction and native res for export — and renders the same engine at both. Undo/redo snapshots the tiny `MaskDoc`. Companion design doc: `docs/plans/2026-06-08-background-remover-design.md`.

**Tech Stack:** React 19 + TypeScript (strict), HTML Canvas 2D, Vite single-file build. Unit tests via Node's built-in `node:test` run through `tsx` (already a devDependency — no new deps). E2E via Playwright.

---

## File Structure

```
src/tools/image-bg-remove/
  BgRemoveTool.tsx     # orchestrator: load, two-res caches, rAF preview, export, shortcuts, layout (default export — registry unchanged)
  types.ts             # MaskDoc, ColorSample, Point, BrushStroke, Tool, PreviewBackground, createEmptyDoc
  maskEngine.ts        # PURE pipeline: removalFromColor, floodFillRegion, boxBlur01, removalFromWand, combineMax, rasterizeStrokes, collectBgColors, applyMask(Into), renderMask
  useMaskHistory.ts    # MaskDoc state + undo/redo (mirrors pdf-split useHistory) + typed actions
  ControlPanel.tsx     # left panel: tool palette, sliders, sample list, actions, undo/redo, output info
  Workspace.tsx        # interactive canvas: zoom/pan, per-tool pointer handling, brush cursor + overlay, preview-bg, before/after
  maskEngine.test.ts   # node:test unit tests for the pure engine
```

**Conventions to follow (from existing tools):** dark theme via `var(--*)` tokens and `bg-white/[0.04]` panels, teal accent `#14B8A6`, `lucide-react` icons, shared `Button`/`Slider`/`FileDropZone`/`ProgressBar`. The tool's default export stays `BgRemoveTool` so `src/tools/registry.ts` needs no change.

---

## Task 1: Types & empty document

**Files:**
- Create: `src/tools/image-bg-remove/types.ts`

- [ ] **Step 1: Create the types module**

```ts
// src/tools/image-bg-remove/types.ts

export interface ColorSample {
  r: number
  g: number
  b: number
}

export interface Point {
  x: number
  y: number
}

export type BrushType = 'erase' | 'restore'

export interface BrushStroke {
  type: BrushType
  /** Points in NATIVE image coordinates (resolution-independent). */
  points: Point[]
  /** Radius in NATIVE image pixels. */
  radius: number
}

export type Tool = 'wand' | 'picker' | 'erase' | 'restore'

export type PreviewBackground = 'checkerboard' | 'white' | 'black'

/**
 * Declarative description of the mask. Everything is stored in native image
 * coordinates / raw colors so the mask can be rendered at any resolution.
 */
export interface MaskDoc {
  samples: ColorSample[]
  wandSeeds: Point[]
  strokes: BrushStroke[]
  /** 0–100. Color/region match radius. */
  tolerance: number
  /** 0–100. Width of the soft alpha fade band. */
  softness: number
  /** 0–100. Edge color-decontamination strength. */
  defringe: number
}

export const createEmptyDoc = (): MaskDoc => ({
  samples: [],
  wandSeeds: [],
  strokes: [],
  tolerance: 30,
  softness: 15,
  defringe: 50,
})
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: PASS (zero errors).

- [ ] **Step 3: Commit**

```bash
git add src/tools/image-bg-remove/types.ts
git commit -m "feat(bg-remove): add MaskDoc types"
```

---

## Task 2: maskEngine — color removal (TDD)

**Files:**
- Create: `src/tools/image-bg-remove/maskEngine.ts`
- Create: `src/tools/image-bg-remove/maskEngine.test.ts`
- Modify: `package.json` (add `test:unit` script)

- [ ] **Step 1: Add the `test:unit` script**

In `package.json`, inside `"scripts"`, add (after `"test:headed"`):

```json
    "test:unit": "node --import tsx --test \"src/**/*.test.ts\""
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/tools/image-bg-remove/maskEngine.test.ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  smoothstep,
  toleranceToDist,
  colorDist,
  removalFromColor,
  MAX_COLOR_DIST,
} from './maskEngine'
import type { ColorSample } from './types'

/** Build a solid RGBA buffer. */
function solid(w: number, h: number, r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let p = 0; p < w * h; p++) {
    d[p * 4] = r
    d[p * 4 + 1] = g
    d[p * 4 + 2] = b
    d[p * 4 + 3] = a
  }
  return d
}

test('smoothstep clamps and eases', () => {
  assert.equal(smoothstep(0, 10, -5), 0)
  assert.equal(smoothstep(0, 10, 15), 1)
  assert.equal(smoothstep(0, 10, 5), 0.5)
  assert.equal(smoothstep(5, 5, 4), 0) // degenerate band → step
  assert.equal(smoothstep(5, 5, 6), 1)
})

test('toleranceToDist maps 0–100 onto color-distance space', () => {
  assert.equal(toleranceToDist(0), 0)
  assert.ok(Math.abs(toleranceToDist(100) - MAX_COLOR_DIST) < 1e-6)
})

test('colorDist is Euclidean', () => {
  const c: ColorSample = { r: 0, g: 0, b: 0 }
  assert.ok(Math.abs(colorDist(0, 0, 0, c) - 0) < 1e-6)
  assert.ok(Math.abs(colorDist(255, 0, 0, c) - 255) < 1e-6)
})

test('removalFromColor: exact match removed, far pixel kept (hard band)', () => {
  // 2x1 image: pixel 0 = green bg, pixel 1 = red fg
  const data = new Uint8ClampedArray([0, 255, 0, 255, 255, 0, 0, 255])
  const samples: ColorSample[] = [{ r: 0, g: 255, b: 0 }]
  const removal = removalFromColor(data, 2, 1, samples, 10, 0)
  assert.equal(removal[0], 1) // green removed
  assert.equal(removal[1], 0) // red kept
})

test('removalFromColor: soft band yields partial removal', () => {
  // single pixel at distance ~127.5 from the sample
  const data = solid(1, 1, 128, 0, 0)
  const samples: ColorSample[] = [{ r: 0, g: 0, b: 0 }]
  // inner = tolerance dist, band wide enough that 128 falls inside the ramp
  const removal = removalFromColor(data, 1, 1, samples, 5, 60)
  assert.ok(removal[0] > 0 && removal[0] < 1, `expected partial, got ${removal[0]}`)
})

test('removalFromColor: no samples removes nothing', () => {
  const data = solid(3, 1, 10, 20, 30)
  const removal = removalFromColor(data, 3, 1, [], 50, 20)
  assert.deepEqual(Array.from(removal), [0, 0, 0])
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `node --import tsx --test src/tools/image-bg-remove/maskEngine.test.ts`
Expected: FAIL — cannot find module `./maskEngine` / exports undefined.

- [ ] **Step 4: Implement the color-removal core**

```ts
// src/tools/image-bg-remove/maskEngine.ts
import type { ColorSample } from './types'

/** Max possible Euclidean distance in 8-bit RGB space (~441.67). */
export const MAX_COLOR_DIST = Math.sqrt(3 * 255 * 255)

/** Width (in color-distance units) of the soft fade band at softness=100. */
const SOFTNESS_BAND_MAX = 150

export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) return x < edge0 ? 0 : 1
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function toleranceToDist(tolerance: number): number {
  return (tolerance / 100) * MAX_COLOR_DIST
}

export function softnessToBand(softness: number): number {
  return (softness / 100) * SOFTNESS_BAND_MAX
}

export function colorDist(r: number, g: number, b: number, c: ColorSample): number {
  const dr = r - c.r
  const dg = g - c.g
  const db = b - c.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * Per-pixel removal amount (0..1) from color samples. A pixel near ANY sample
 * is removed; the soft ramp from `tolerance` over the `softness` band produces
 * anti-aliased edges instead of a binary cutoff.
 */
export function removalFromColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  samples: ColorSample[],
  tolerance: number,
  softness: number,
): Float32Array {
  const out = new Float32Array(width * height)
  if (samples.length === 0) return out
  const inner = toleranceToDist(tolerance)
  const outer = inner + softnessToBand(softness)
  for (let p = 0; p < width * height; p++) {
    const i = p * 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    let minDist = Infinity
    for (let s = 0; s < samples.length; s++) {
      const d = colorDist(r, g, b, samples[s])
      if (d < minDist) minDist = d
    }
    out[p] = 1 - smoothstep(inner, outer, minDist)
  }
  return out
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `node --import tsx --test src/tools/image-bg-remove/maskEngine.test.ts`
Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add src/tools/image-bg-remove/maskEngine.ts src/tools/image-bg-remove/maskEngine.test.ts package.json
git commit -m "feat(bg-remove): soft color-removal mask with unit tests"
```

---

## Task 3: maskEngine — flood fill, box blur, wand (TDD)

**Files:**
- Modify: `src/tools/image-bg-remove/maskEngine.ts`
- Modify: `src/tools/image-bg-remove/maskEngine.test.ts`

- [ ] **Step 1: Append the failing tests**

Add to the imports at the top of `maskEngine.test.ts`:

```ts
import { floodFillRegion, boxBlur01, removalFromWand } from './maskEngine'
import type { Point } from './types'
```

Append these tests to `maskEngine.test.ts`:

```ts
test('floodFillRegion: fills only the contiguous matching region', () => {
  // 3x1: black, black, white. Seed at x=0, low tolerance.
  const data = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255])
  const region = floodFillRegion(new Uint8ClampedArray(data), 3, 1, { x: 0, y: 0 }, 5)
  assert.equal(region[0], 1)
  assert.equal(region[1], 1)
  assert.equal(region[2], 0) // white not reached
})

test('floodFillRegion: does not leak across a non-matching barrier', () => {
  // 5x1: black, black, WHITE barrier, black, black. Seed left → only left pair.
  const px = [
    0, 0, 0, 255,
    0, 0, 0, 255,
    255, 255, 255, 255,
    0, 0, 0, 255,
    0, 0, 0, 255,
  ]
  const region = floodFillRegion(new Uint8ClampedArray(px), 5, 1, { x: 0, y: 0 }, 5)
  assert.deepEqual(Array.from(region), [1, 1, 0, 0, 0])
})

test('boxBlur01: radius 0 is identity; blur of a step is monotonic and bounded', () => {
  const mask = new Float32Array([0, 0, 1, 1])
  assert.deepEqual(Array.from(boxBlur01(mask, 4, 1, 0)), [0, 0, 1, 1])
  const blurred = boxBlur01(new Float32Array([0, 0, 1, 1, 1, 1]), 6, 1, 1)
  for (const v of blurred) assert.ok(v >= 0 && v <= 1)
})

test('removalFromWand: unions seeds and stays within 0..1', () => {
  const data = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255])
  const seeds: Point[] = [{ x: 0, y: 0 }]
  const removal = removalFromWand(data, 3, 1, seeds, 5, 0)
  assert.equal(removal[0], 1)
  assert.equal(removal[2], 0)
  for (const v of removal) assert.ok(v >= 0 && v <= 1)
})

test('removalFromWand: no seeds removes nothing', () => {
  const data = new Uint8ClampedArray(3 * 4)
  const removal = removalFromWand(data, 3, 1, [], 50, 50)
  assert.deepEqual(Array.from(removal), [0, 0, 0])
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test src/tools/image-bg-remove/maskEngine.test.ts`
Expected: FAIL — `floodFillRegion`/`boxBlur01`/`removalFromWand` not exported.

- [ ] **Step 3: Implement flood fill, box blur, and wand**

First, update the type import at the top of `maskEngine.ts` to add `Point`:

```ts
import type { ColorSample, Point } from './types'
```

Then append to `maskEngine.ts`:

```ts
/** Preview-space blur radius (px) applied to wand edges at softness=100. */
const WAND_BLUR_MAX = 6

function clampInt(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

/**
 * Flood-fill the connected region of pixels within `tolerance` of the seed
 * pixel's color. Returns a binary (0/1) mask. Region is marked at enqueue time
 * so each pixel is visited once.
 */
export function floodFillRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seed: Point,
  tolerance: number,
): Uint8Array {
  const region = new Uint8Array(width * height)
  const sx = Math.round(seed.x)
  const sy = Math.round(seed.y)
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return region

  const si = (sy * width + sx) * 4
  const seedColor: ColorSample = { r: data[si], g: data[si + 1], b: data[si + 2] }
  const thresh = toleranceToDist(tolerance)

  const within = (p: number): boolean => {
    const i = p * 4
    return colorDist(data[i], data[i + 1], data[i + 2], seedColor) <= thresh
  }

  const start = sy * width + sx
  const stack: number[] = [start]
  region[start] = 1
  while (stack.length > 0) {
    const p = stack.pop()
    if (p === undefined) break
    const x = p % width
    const y = (p - x) / width
    const neighbors = [
      x > 0 ? p - 1 : -1,
      x < width - 1 ? p + 1 : -1,
      y > 0 ? p - width : -1,
      y < height - 1 ? p + width : -1,
    ]
    for (const n of neighbors) {
      if (n < 0 || region[n]) continue
      if (within(n)) {
        region[n] = 1
        stack.push(n)
      }
    }
  }
  return region
}

/** Separable box blur over a 0..1 mask with clamp-to-edge. radius<=0 → identity. */
export function boxBlur01(
  mask: Float32Array,
  width: number,
  height: number,
  radius: number,
): Float32Array {
  const r = Math.round(radius)
  if (r <= 0) return mask
  const win = r * 2 + 1
  const tmp = new Float32Array(width * height)
  const out = new Float32Array(width * height)

  // horizontal
  for (let y = 0; y < height; y++) {
    const row = y * width
    let sum = 0
    for (let k = -r; k <= r; k++) sum += mask[row + clampInt(k, 0, width - 1)]
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum / win
      sum += mask[row + clampInt(x + r + 1, 0, width - 1)] - mask[row + clampInt(x - r, 0, width - 1)]
    }
  }
  // vertical
  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let k = -r; k <= r; k++) sum += tmp[clampInt(k, 0, height - 1) * width + x]
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / win
      sum += tmp[clampInt(y + r + 1, 0, height - 1) * width + x] - tmp[clampInt(y - r, 0, height - 1) * width + x]
    }
  }
  return out
}

/**
 * Per-pixel removal amount (0..1) from wand seeds: union of each seed's
 * contiguous region, feathered by `softness`. Seeds must already be in the
 * coordinate space of `data` (caller scales for preview vs export).
 */
export function removalFromWand(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  seeds: Point[],
  tolerance: number,
  softness: number,
): Float32Array {
  const region = new Float32Array(width * height)
  if (seeds.length === 0) return region
  for (const seed of seeds) {
    const r = floodFillRegion(data, width, height, seed, tolerance)
    for (let p = 0; p < region.length; p++) if (r[p]) region[p] = 1
  }
  return boxBlur01(region, width, height, (softness / 100) * WAND_BLUR_MAX)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --import tsx --test src/tools/image-bg-remove/maskEngine.test.ts`
Expected: PASS (all tests, including Task 2's).

- [ ] **Step 5: Commit**

```bash
git add src/tools/image-bg-remove/maskEngine.ts src/tools/image-bg-remove/maskEngine.test.ts
git commit -m "feat(bg-remove): magic-wand flood fill with feathered edges"
```

---

## Task 4: maskEngine — strokes, defringe composite, renderMask (TDD)

**Files:**
- Modify: `src/tools/image-bg-remove/maskEngine.ts`
- Modify: `src/tools/image-bg-remove/maskEngine.test.ts`

- [ ] **Step 1: Append the failing tests**

Add to imports in `maskEngine.test.ts`:

```ts
import {
  rasterizeStrokes,
  combineMax,
  collectBgColors,
  applyMask,
  renderMask,
  MANUAL_NONE,
  MANUAL_KEEP,
  MANUAL_REMOVE,
} from './maskEngine'
import type { BrushStroke, MaskDoc } from './types'
```

Append these tests:

```ts
test('rasterizeStrokes: disk stamps the center; erase=2, restore=1; last wins', () => {
  const erase: BrushStroke = { type: 'erase', points: [{ x: 2, y: 2 }], radius: 1 }
  const m1 = rasterizeStrokes(5, 5, [erase], 1)
  assert.equal(m1[2 * 5 + 2], MANUAL_REMOVE)
  assert.equal(m1[0], MANUAL_NONE)

  const restore: BrushStroke = { type: 'restore', points: [{ x: 2, y: 2 }], radius: 1 }
  const m2 = rasterizeStrokes(5, 5, [erase, restore], 1) // restore applied last
  assert.equal(m2[2 * 5 + 2], MANUAL_KEEP)
})

test('rasterizeStrokes: scale maps native coords/radius into buffer space', () => {
  const stroke: BrushStroke = { type: 'erase', points: [{ x: 4, y: 4 }], radius: 2 }
  const m = rasterizeStrokes(5, 5, [stroke], 0.5) // center → (2,2), radius → 1
  assert.equal(m[2 * 5 + 2], MANUAL_REMOVE)
})

test('combineMax takes the per-pixel maximum', () => {
  // Use float32-exact values so Array.from round-trips without quantization drift.
  const a = new Float32Array([0, 0.75, 1])
  const b = new Float32Array([0.5, 0.25, 0])
  assert.deepEqual(Array.from(combineMax(a, b)), [0.5, 0.75, 1])
})

test('applyMask: manual override beats key removal', () => {
  const src = new Uint8ClampedArray([10, 20, 30, 255, 10, 20, 30, 255])
  const removal = new Float32Array([1, 0]) // px0 removed, px1 kept by key
  const manual = new Uint8Array([MANUAL_KEEP, MANUAL_REMOVE]) // overrides flip both
  const out = applyMask(src, 2, 1, removal, manual, [], 0)
  assert.equal(out[3], 255) // px0 force-kept
  assert.equal(out[7], 0)   // px1 force-removed
})

test('applyMask: partial removal scales original alpha', () => {
  const src = new Uint8ClampedArray([0, 0, 0, 200])
  const removal = new Float32Array([0.5])
  const out = applyMask(src, 1, 1, removal, new Uint8Array([MANUAL_NONE]), [], 0)
  assert.equal(out[3], Math.round((1 - 0.5) * 200))
})

test('applyMask: defringe pushes edge color toward the unmixed foreground', () => {
  // Observed grey 128 at coverage a=0.5 over black bg → unmixed F = 256→clamped 255.
  const src = new Uint8ClampedArray([128, 128, 128, 255])
  const removal = new Float32Array([0.5]) // a = 0.5 (edge pixel)
  const bg = [{ r: 0, g: 0, b: 0 }]
  const none = applyMask(src, 1, 1, removal, new Uint8Array([MANUAL_NONE]), bg, 0)
  const full = applyMask(src, 1, 1, removal, new Uint8Array([MANUAL_NONE]), bg, 100)
  assert.equal(none[0], 128)        // defringe off → unchanged
  assert.ok(full[0] > none[0])      // defringe on → brighter (decontaminated)
})

test('renderMask: end-to-end keys the sampled background', () => {
  // 2x1: green bg + red fg. Sample green via doc.samples.
  const src = new Uint8ClampedArray([0, 255, 0, 255, 255, 0, 0, 255])
  const doc: MaskDoc = {
    samples: [{ r: 0, g: 255, b: 0 }],
    wandSeeds: [],
    strokes: [],
    tolerance: 10,
    softness: 0,
    defringe: 0,
  }
  const out = renderMask(src, 2, 1, doc, 1)
  assert.equal(out[3], 0)   // green bg transparent
  assert.equal(out[7], 255) // red fg opaque
})

test('collectBgColors: includes samples and the color under each seed', () => {
  const src = new Uint8ClampedArray([0, 0, 255, 255]) // single blue pixel
  const colors = collectBgColors(src, 1, 1, [{ r: 9, g: 9, b: 9 }], [{ x: 0, y: 0 }])
  assert.deepEqual(colors[0], { r: 9, g: 9, b: 9 })
  assert.deepEqual(colors[1], { r: 0, g: 0, b: 255 })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --import tsx --test src/tools/image-bg-remove/maskEngine.test.ts`
Expected: FAIL — new exports undefined.

- [ ] **Step 3: Implement strokes, composite, and orchestrator**

Append to `maskEngine.ts`. First update the import line at the top of the file to include the extra types:

```ts
import type { ColorSample, BrushStroke, Point, MaskDoc } from './types'
```

Then append:

```ts
export const MANUAL_NONE = 0
export const MANUAL_KEEP = 1
export const MANUAL_REMOVE = 2

function stampDisk(
  manual: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  value: number,
): void {
  const minX = Math.max(0, Math.floor(cx - radius))
  const maxX = Math.min(width - 1, Math.ceil(cx + radius))
  const minY = Math.max(0, Math.floor(cy - radius))
  const maxY = Math.min(height - 1, Math.ceil(cy + radius))
  const r2 = radius * radius
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r2) manual[y * width + x] = value
    }
  }
}

/**
 * Rasterize brush strokes into a manual-override mask (0=none, 1=keep, 2=remove).
 * `scale` maps native stroke coords/radius into the target buffer space. Disks
 * are interpolated between successive points so fast strokes don't gap. Later
 * strokes overwrite earlier (last-wins).
 */
export function rasterizeStrokes(
  width: number,
  height: number,
  strokes: BrushStroke[],
  scale: number,
): Uint8Array {
  const manual = new Uint8Array(width * height)
  for (const stroke of strokes) {
    const value = stroke.type === 'restore' ? MANUAL_KEEP : MANUAL_REMOVE
    const radius = Math.max(1, stroke.radius * scale)
    const pts = stroke.points
    for (let k = 0; k < pts.length; k++) {
      const x0 = pts[k].x * scale
      const y0 = pts[k].y * scale
      stampDisk(manual, width, height, x0, y0, radius, value)
      if (k < pts.length - 1) {
        const x1 = pts[k + 1].x * scale
        const y1 = pts[k + 1].y * scale
        const dist = Math.hypot(x1 - x0, y1 - y0)
        const steps = Math.ceil(dist / Math.max(1, radius / 2))
        for (let s = 1; s < steps; s++) {
          const t = s / steps
          stampDisk(manual, width, height, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, value)
        }
      }
    }
  }
  return manual
}

export function combineMax(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] > b[i] ? a[i] : b[i]
  return out
}

function nearestColor(r: number, g: number, b: number, colors: ColorSample[]): ColorSample {
  let best = colors[0]
  let bestD = Infinity
  for (const c of colors) {
    const d = colorDist(r, g, b, c)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

/** Background reference colors used for defringe: samples + the color under each seed. */
export function collectBgColors(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  samples: ColorSample[],
  scaledSeeds: Point[],
): ColorSample[] {
  const colors: ColorSample[] = samples.map((s) => ({ ...s }))
  for (const s of scaledSeeds) {
    const x = Math.round(s.x)
    const y = Math.round(s.y)
    if (x >= 0 && y >= 0 && x < width && y < height) {
      const i = (y * width + x) * 4
      colors.push({ r: src[i], g: src[i + 1], b: src[i + 2] })
    }
  }
  return colors
}

/**
 * Composite one band of rows [yStart, yEnd) into `out`. Applies manual overrides,
 * alpha = origAlpha*(1-removal), and defringe color decontamination on edge pixels.
 */
export function applyMaskInto(
  out: Uint8ClampedArray,
  src: Uint8ClampedArray,
  width: number,
  removal: Float32Array,
  manual: Uint8Array,
  bgColors: ColorSample[],
  defringe: number,
  yStart: number,
  yEnd: number,
): void {
  const strength = defringe / 100
  for (let p = yStart * width; p < yEnd * width; p++) {
    const i = p * 4
    let rem = removal[p]
    const m = manual[p]
    if (m === MANUAL_KEEP) rem = 0
    else if (m === MANUAL_REMOVE) rem = 1
    const a = 1 - rem
    const fgA = a * (src[i + 3] / 255)

    let r = src[i]
    let g = src[i + 1]
    let b = src[i + 2]
    if (strength > 0 && bgColors.length > 0 && a > 0.01 && a < 0.99) {
      const bg = nearestColor(r, g, b, bgColors)
      const fr = (r - (1 - a) * bg.r) / a
      const fg = (g - (1 - a) * bg.g) / a
      const fb = (b - (1 - a) * bg.b) / a
      r = clampByte(r + (fr - r) * strength)
      g = clampByte(g + (fg - g) * strength)
      b = clampByte(b + (fb - b) * strength)
    }
    out[i] = r
    out[i + 1] = g
    out[i + 2] = b
    out[i + 3] = Math.round(fgA * 255)
  }
}

/** Full-frame composite (used by preview + tests). */
export function applyMask(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  removal: Float32Array,
  manual: Uint8Array,
  bgColors: ColorSample[],
  defringe: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length)
  applyMaskInto(out, src, width, removal, manual, bgColors, defringe, 0, height)
  return out
}

/**
 * Render the full mask for a buffer. `scale` = bufferWidth / nativeWidth, used to
 * map native-space wand seeds and stroke geometry into the buffer. Color samples
 * are resolution-independent.
 */
export function renderMask(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  doc: MaskDoc,
  scale: number,
): Uint8ClampedArray {
  const colorR = removalFromColor(src, width, height, doc.samples, doc.tolerance, doc.softness)
  const scaledSeeds = doc.wandSeeds.map((s) => ({ x: s.x * scale, y: s.y * scale }))
  const wandR = removalFromWand(src, width, height, scaledSeeds, doc.tolerance, doc.softness)
  const removal = combineMax(colorR, wandR)
  const manual = rasterizeStrokes(width, height, doc.strokes, scale)
  const bgColors = collectBgColors(src, width, height, doc.samples, scaledSeeds)
  return applyMask(src, width, height, removal, manual, bgColors, doc.defringe)
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --import tsx --test src/tools/image-bg-remove/maskEngine.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tools/image-bg-remove/maskEngine.ts src/tools/image-bg-remove/maskEngine.test.ts
git commit -m "feat(bg-remove): brush strokes, defringe composite, renderMask orchestrator"
```

---

## Task 5: useMaskHistory hook

Mirrors the pdf-split `useHistory` pattern (`src/tools/pdf-split/PdfSplitTool.tsx:56-102`): a ref-backed undo/redo stack, snapshot-before-mutation. The snapshot here is the whole `MaskDoc` (small vector data). Verified by build + the Task 10 E2E (no React unit-test runner exists in this repo).

**Files:**
- Create: `src/tools/image-bg-remove/useMaskHistory.ts`

- [ ] **Step 1: Implement the hook**

```ts
// src/tools/image-bg-remove/useMaskHistory.ts
import { useCallback, useRef, useState } from 'react'
import type { MaskDoc, ColorSample, Point, BrushStroke } from './types'
import { createEmptyDoc } from './types'

const MAX_HISTORY = 50

type SliderKey = 'tolerance' | 'softness' | 'defringe'

export interface MaskHistory {
  doc: MaskDoc
  canUndo: boolean
  canRedo: boolean
  addSample: (s: ColorSample) => void
  removeSample: (index: number) => void
  addWandSeed: (p: Point) => void
  addStroke: (stroke: BrushStroke) => void
  /** Live slider update (no history entry — paired with beginGesture/endGesture). */
  setSlider: (key: SliderKey, value: number) => void
  /** Snapshot once at the start of a slider drag so the whole drag is one undo step. */
  beginGesture: () => void
  endGesture: () => void
  /** Undoable clear (the Reset button). */
  reset: () => void
  /** Hard clear with no undo (loading a new image). */
  clear: () => void
  undo: () => void
  redo: () => void
}

function cloneDoc(d: MaskDoc): MaskDoc {
  return {
    samples: d.samples.map((s) => ({ ...s })),
    wandSeeds: d.wandSeeds.map((p) => ({ ...p })),
    strokes: d.strokes.map((st) => ({
      type: st.type,
      radius: st.radius,
      points: st.points.map((p) => ({ ...p })),
    })),
    tolerance: d.tolerance,
    softness: d.softness,
    defringe: d.defringe,
  }
}

export function useMaskHistory(): MaskHistory {
  const [doc, setDoc] = useState<MaskDoc>(createEmptyDoc)
  const docRef = useRef(doc)
  docRef.current = doc

  const undoStack = useRef<MaskDoc[]>([])
  const redoStack = useRef<MaskDoc[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const gestureActive = useRef(false)

  const snapshot = useCallback(() => {
    undoStack.current.push(cloneDoc(docRef.current))
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift()
    redoStack.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const addSample = useCallback((s: ColorSample) => {
    snapshot()
    setDoc((d) => ({ ...d, samples: [...d.samples, s] }))
  }, [snapshot])

  const removeSample = useCallback((index: number) => {
    snapshot()
    setDoc((d) => ({ ...d, samples: d.samples.filter((_, i) => i !== index) }))
  }, [snapshot])

  const addWandSeed = useCallback((p: Point) => {
    snapshot()
    setDoc((d) => ({ ...d, wandSeeds: [...d.wandSeeds, p] }))
  }, [snapshot])

  const addStroke = useCallback((stroke: BrushStroke) => {
    snapshot()
    setDoc((d) => ({ ...d, strokes: [...d.strokes, stroke] }))
  }, [snapshot])

  const setSlider = useCallback((key: SliderKey, value: number) => {
    setDoc((d) => ({ ...d, [key]: value }))
  }, [])

  const beginGesture = useCallback(() => {
    if (gestureActive.current) return
    gestureActive.current = true
    snapshot()
  }, [snapshot])

  const endGesture = useCallback(() => {
    gestureActive.current = false
  }, [])

  const reset = useCallback(() => {
    snapshot()
    setDoc(createEmptyDoc())
  }, [snapshot])

  const clear = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
    setCanUndo(false)
    setCanRedo(false)
    setDoc(createEmptyDoc())
  }, [])

  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return
    redoStack.current.push(cloneDoc(docRef.current))
    setDoc(prev)
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }, [])

  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return
    undoStack.current.push(cloneDoc(docRef.current))
    setDoc(next)
    setCanUndo(true)
    setCanRedo(redoStack.current.length > 0)
  }, [])

  return {
    doc, canUndo, canRedo,
    addSample, removeSample, addWandSeed, addStroke,
    setSlider, beginGesture, endGesture, reset, clear, undo, redo,
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tools/image-bg-remove/useMaskHistory.ts
git commit -m "feat(bg-remove): MaskDoc undo/redo history hook"
```

---

## Task 6: ControlPanel component

Presentational left panel. All state lives in the orchestrator (Task 8); this renders props and fires callbacks.

**Files:**
- Create: `src/tools/image-bg-remove/ControlPanel.tsx`

- [ ] **Step 1: Implement ControlPanel**

```tsx
// src/tools/image-bg-remove/ControlPanel.tsx
import { Button } from '@/components/common/Button.tsx'
import { Slider } from '@/components/common/Slider.tsx'
import { ProgressBar } from '@/components/common/ProgressBar.tsx'
import { formatFileSize } from '@/utils/fileReader.ts'
import {
  Wand2, Pipette, Eraser, Brush, Undo2, Redo2, Download, RotateCcw, Eye, EyeOff, X,
} from 'lucide-react'
import type { Tool, MaskDoc, PreviewBackground } from './types'

type SliderKey = 'tolerance' | 'softness' | 'defringe'

interface ControlPanelProps {
  tool: Tool
  onToolChange: (t: Tool) => void
  doc: MaskDoc
  brushSize: number
  onBrushSizeChange: (n: number) => void
  onRemoveSample: (index: number) => void
  onSliderChange: (key: SliderKey, value: number) => void
  onSliderGestureStart: () => void
  onSliderGestureEnd: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onExport: () => void
  onLoadNew: () => void
  isExporting: boolean
  exportProgress: number
  outputSize: number | null
  originalSize: { width: number; height: number }
  fileSize: number
  previewBg: PreviewBackground
  onPreviewBgChange: (b: PreviewBackground) => void
  showOriginal: boolean
  onToggleOriginal: () => void
  error: string | null
  onDismissError: () => void
}

const TOOLS: { id: Tool; label: string; icon: typeof Wand2; key: string }[] = [
  { id: 'wand', label: 'Magic Wand', icon: Wand2, key: 'W' },
  { id: 'picker', label: 'Color Picker', icon: Pipette, key: 'I' },
  { id: 'erase', label: 'Erase', icon: Eraser, key: 'E' },
  { id: 'restore', label: 'Restore', icon: Brush, key: 'R' },
]

const PREVIEW_BGS: PreviewBackground[] = ['checkerboard', 'white', 'black']

export function ControlPanel(props: ControlPanelProps) {
  const { tool, doc, brushSize } = props
  const isBrush = tool === 'erase' || tool === 'restore'

  const sliderGestureProps = {
    onPointerDown: props.onSliderGestureStart,
    onPointerUp: props.onSliderGestureEnd,
    onKeyDown: props.onSliderGestureStart,
    onBlur: props.onSliderGestureEnd,
  }

  return (
    <div className="w-72 flex-shrink-0 space-y-5 overflow-y-auto pr-2">
      {/* Undo / redo */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary" size="sm" onClick={props.onUndo} disabled={!props.canUndo}
          icon={<Undo2 size={14} />} className="flex-1"
        >
          Undo
        </Button>
        <Button
          variant="secondary" size="sm" onClick={props.onRedo} disabled={!props.canRedo}
          icon={<Redo2 size={14} />} className="flex-1"
        >
          Redo
        </Button>
      </div>

      {/* Tool palette */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/70">Tool</span>
        <div className="grid grid-cols-2 gap-2">
          {TOOLS.map(({ id, label, icon: Icon, key }) => (
            <button
              key={id}
              data-testid={`tool-${id}`}
              onClick={() => props.onToolChange(id)}
              title={`${label} (${key})`}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                tool === id
                  ? 'bg-[#14B8A6]/15 border-[#14B8A6]/40 text-white'
                  : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:text-white/90'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Color samples */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/70">Background colors</span>
        {doc.samples.length === 0 ? (
          <p className="text-[11px] text-white/40 italic">
            Use the Color Picker to sample background colors, or click with the Magic Wand.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {doc.samples.map((s, i) => (
              <button
                key={i}
                data-testid="sample-swatch"
                onClick={() => props.onRemoveSample(i)}
                title={`Remove rgb(${s.r}, ${s.g}, ${s.b})`}
                className="group relative w-8 h-8 rounded-md border-2 border-white/20 hover:border-red-400/60 transition-colors"
                style={{ backgroundColor: `rgb(${s.r}, ${s.g}, ${s.b})` }}
              >
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded">
                  <X size={12} className="text-white" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sliders */}
      <Slider
        label="Tolerance" value={doc.tolerance} min={1} max={100} step={1} suffix="%"
        onChange={(e) => props.onSliderChange('tolerance', Number((e.target as HTMLInputElement).value))}
        {...sliderGestureProps}
      />
      <Slider
        label="Edge softness" value={doc.softness} min={0} max={100} step={1} suffix="%"
        onChange={(e) => props.onSliderChange('softness', Number((e.target as HTMLInputElement).value))}
        {...sliderGestureProps}
      />
      <Slider
        label="Defringe" value={doc.defringe} min={0} max={100} step={1} suffix="%"
        onChange={(e) => props.onSliderChange('defringe', Number((e.target as HTMLInputElement).value))}
        {...sliderGestureProps}
      />
      {isBrush && (
        <Slider
          label="Brush size" value={brushSize} min={2} max={300} step={1} suffix="px"
          onChange={(e) => props.onBrushSizeChange(Number((e.target as HTMLInputElement).value))}
        />
      )}

      {/* Preview background + before/after */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/70">Preview on</span>
        <div className="flex gap-2">
          {PREVIEW_BGS.map((bg) => (
            <button
              key={bg}
              data-testid={`preview-bg-${bg}`}
              onClick={() => props.onPreviewBgChange(bg)}
              className={`flex-1 px-2 py-1.5 rounded-md border text-[11px] capitalize transition-colors ${
                props.previewBg === bg
                  ? 'bg-[#14B8A6]/15 border-[#14B8A6]/40 text-white'
                  : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:text-white/90'
              }`}
            >
              {bg === 'checkerboard' ? 'Checker' : bg}
            </button>
          ))}
        </div>
        <button
          onClick={props.onToggleOriginal}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          {props.showOriginal ? <EyeOff size={12} /> : <Eye size={12} />}
          {props.showOriginal ? 'Show result' : 'Show original'}
        </button>
      </div>

      {/* Error */}
      {props.error && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-[11px] text-red-400 flex-1">{props.error}</p>
          <button onClick={props.onDismissError} className="p-0.5 rounded text-red-400/60 hover:text-red-400" aria-label="Dismiss error">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-1">
        {props.isExporting ? (
          <ProgressBar value={Math.round(props.exportProgress * 100)} label="Exporting…" />
        ) : (
          <Button onClick={props.onExport} icon={<Download size={14} />} className="w-full">
            Download PNG
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={props.onReset} icon={<RotateCcw size={14} />} className="flex-1">
            Reset
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] space-y-1">
        <p className="text-xs text-white/40">Original</p>
        <p className="text-sm text-white">{props.originalSize.width} × {props.originalSize.height}px</p>
        <p className="text-xs text-white/40">{formatFileSize(props.fileSize)}</p>
        {props.outputSize !== null && (
          <>
            <p className="text-xs text-white/40 pt-1">Output (PNG)</p>
            <p className="text-sm text-white">{formatFileSize(props.outputSize)}</p>
          </>
        )}
      </div>

      <button onClick={props.onLoadNew} className="text-xs text-white/30 hover:text-white/60 transition-colors">
        Load different image
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tools/image-bg-remove/ControlPanel.tsx
git commit -m "feat(bg-remove): control panel with tools, sliders, samples, undo/redo"
```

---

## Task 7: Workspace component

Interactive canvas. Works in **native image coordinates** for the view transform; draws the supplied preview-resolution canvases scaled into the native rect, so pointer→image mapping yields native coords directly.

**Files:**
- Create: `src/tools/image-bg-remove/Workspace.tsx`

- [ ] **Step 1: Implement Workspace**

```tsx
// src/tools/image-bg-remove/Workspace.tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import type { Point, BrushStroke, Tool, PreviewBackground } from './types'

interface WorkspaceProps {
  originalCanvas: HTMLCanvasElement
  maskedCanvas: HTMLCanvasElement
  imageWidth: number
  imageHeight: number
  tool: Tool
  brushSize: number
  previewBg: PreviewBackground
  showOriginal: boolean
  /** Bumped by the orchestrator whenever maskedCanvas content changes. */
  renderVersion: number
  onPickColor: (p: Point) => void
  onWandClick: (p: Point) => void
  onStroke: (stroke: BrushStroke) => void
}

interface View {
  scale: number
  tx: number
  ty: number
}

function drawCheckerboard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const size = 10
  ctx.fillStyle = '#3a3a3a'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = '#2c2c2c'
  for (let yy = 0; yy < h; yy += size) {
    for (let xx = 0; xx < w; xx += size) {
      if ((Math.floor(xx / size) + Math.floor(yy / size)) % 2 === 0) {
        ctx.fillRect(x + xx, y + yy, Math.min(size, w - xx), Math.min(size, h - yy))
      }
    }
  }
}

export function Workspace(props: WorkspaceProps) {
  const {
    originalCanvas, maskedCanvas, imageWidth, imageHeight,
    tool, brushSize, previewBg, showOriginal, renderVersion,
    onPickColor, onWandClick, onStroke,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewRef = useRef<View>({ scale: 1, tx: 0, ty: 0 })
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)

  const isPanning = useRef(false)
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const isDrawing = useRef(false)
  const strokePoints = useRef<Point[]>([])
  const spaceDown = useRef(false)
  const fittedRef = useRef(false)
  const isBrush = tool === 'erase' || tool === 'restore'

  // Re-fit on the next valid draw whenever a new image loads.
  useEffect(() => {
    fittedRef.current = false
  }, [imageWidth, imageHeight])

  const toImage = useCallback((clientX: number, clientY: number): Point => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const { scale, tx, ty } = viewRef.current
    return { x: (clientX - rect.left - tx) / scale, y: (clientY - rect.top - ty) / scale }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    if (cw === 0 || ch === 0) return
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw
      canvas.height = ch
    }

    // Fit-to-container once per image (preserves zoom/pan on later redraws).
    if (!fittedRef.current) {
      const pad = 48
      const s = Math.min((cw - pad) / imageWidth, (ch - pad) / imageHeight)
      const scale = s > 0 && Number.isFinite(s) ? s : 1
      viewRef.current = {
        scale,
        tx: (cw - imageWidth * scale) / 2,
        ty: (ch - imageHeight * scale) / 2,
      }
      fittedRef.current = true
    }

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, cw, ch)

    const { scale, tx, ty } = viewRef.current
    const rw = imageWidth * scale
    const rh = imageHeight * scale

    ctx.save()
    ctx.beginPath()
    ctx.rect(tx, ty, rw, rh)
    ctx.clip()
    if (previewBg === 'white') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(tx, ty, rw, rh)
    } else if (previewBg === 'black') {
      ctx.fillStyle = '#000000'
      ctx.fillRect(tx, ty, rw, rh)
    } else {
      drawCheckerboard(ctx, tx, ty, rw, rh)
    }
    ctx.restore()

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const srcCanvas = showOriginal ? originalCanvas : maskedCanvas
    ctx.drawImage(srcCanvas, 0, 0, srcCanvas.width, srcCanvas.height, tx, ty, rw, rh)

    // In-progress stroke overlay (visual feedback before commit)
    if (isDrawing.current && strokePoints.current.length > 0) {
      ctx.fillStyle = tool === 'restore' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'
      const rad = brushSize * scale
      for (const p of strokePoints.current) {
        ctx.beginPath()
        ctx.arc(tx + p.x * scale, ty + p.y * scale, rad, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [imageWidth, imageHeight, previewBg, showOriginal, originalCanvas, maskedCanvas, tool, brushSize])

  // Redraw on visual prop / content changes (view transform is preserved).
  useEffect(() => {
    draw()
  }, [draw, renderVersion])

  // Resize handling
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(container)
    return () => ro.disconnect()
  }, [draw])

  // Wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { scale, tx, ty } = viewRef.current
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      const newScale = Math.min(20, Math.max(0.05, scale * factor))
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const ix = (mx - tx) / scale
      const iy = (my - ty) / scale
      viewRef.current = { scale: newScale, tx: mx - ix * newScale, ty: my - iy * newScale }
      draw()
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [draw])

  // Space-to-pan tracking
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    if (spaceDown.current || e.button === 1) {
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty }
      return
    }
    if (e.button !== 0) return
    const p = toImage(e.clientX, e.clientY)
    if (tool === 'picker') {
      onPickColor(p)
      return
    }
    if (tool === 'wand') {
      onWandClick(p)
      return
    }
    isDrawing.current = true
    strokePoints.current = [p]
    draw()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (isBrush) setCursor({ x: e.clientX, y: e.clientY })
    if (isPanning.current && panStart.current) {
      viewRef.current.tx = panStart.current.tx + (e.clientX - panStart.current.x)
      viewRef.current.ty = panStart.current.ty + (e.clientY - panStart.current.y)
      draw()
      return
    }
    if (isDrawing.current) {
      strokePoints.current.push(toImage(e.clientX, e.clientY))
      draw()
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    canvasRef.current?.releasePointerCapture(e.pointerId)
    if (isPanning.current) {
      isPanning.current = false
      panStart.current = null
      return
    }
    if (isDrawing.current) {
      isDrawing.current = false
      const points = strokePoints.current
      strokePoints.current = []
      if (points.length > 0) {
        onStroke({ type: tool === 'restore' ? 'restore' : 'erase', points, radius: brushSize })
      }
    }
  }

  const cursorClass =
    tool === 'picker' || tool === 'wand' ? 'cursor-crosshair' : isBrush ? 'cursor-none' : 'cursor-default'

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06]">
      <canvas
        ref={canvasRef}
        data-testid="bg-workspace-canvas"
        className={`absolute inset-0 ${cursorClass}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setCursor(null)}
      />
      {isBrush && cursor && (
        <div
          className="pointer-events-none fixed rounded-full border border-white/80 mix-blend-difference"
          style={{
            left: cursor.x - brushSize * viewRef.current.scale,
            top: cursor.y - brushSize * viewRef.current.scale,
            width: brushSize * viewRef.current.scale * 2,
            height: brushSize * viewRef.current.scale * 2,
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tools/image-bg-remove/Workspace.tsx
git commit -m "feat(bg-remove): interactive zoom/pan canvas with per-tool pointers"
```

---

## Task 8: BgRemoveTool orchestrator

Wires everything: load image → two-resolution caches → rAF live preview → export (chunked) → shortcuts. Default export so the registry is unchanged.

**Files:**
- Modify: `src/tools/image-bg-remove/BgRemoveTool.tsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

```tsx
// src/tools/image-bg-remove/BgRemoveTool.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { FileDropZone } from '@/components/common/FileDropZone.tsx'
import { readFileAsDataURL } from '@/utils/fileReader.ts'
import { loadImage, canvasToBlob } from '@/utils/imageProcessing.ts'
import { downloadBlob } from '@/utils/download.ts'
import { X } from 'lucide-react'
import { ControlPanel } from './ControlPanel'
import { Workspace } from './Workspace'
import { useMaskHistory } from './useMaskHistory'
import {
  removalFromColor, removalFromWand, combineMax, rasterizeStrokes, collectBgColors, applyMaskInto, renderMask,
} from './maskEngine'
import type { Tool, Point, PreviewBackground, BrushStroke, MaskDoc } from './types'

const PREVIEW_MAX_EDGE = 1600
const MAX_MEGAPIXELS = 64

interface BufferCache {
  data: Uint8ClampedArray
  width: number
  height: number
}

const yieldToUI = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

/** Async full-res render with progress, reusing the engine pieces. */
async function renderMaskChunked(
  src: Uint8ClampedArray,
  width: number,
  height: number,
  doc: MaskDoc,
  onProgress: (p: number) => void,
): Promise<Uint8ClampedArray> {
  const colorR = removalFromColor(src, width, height, doc.samples, doc.tolerance, doc.softness)
  onProgress(0.15)
  await yieldToUI()
  const scaledSeeds = doc.wandSeeds.map((s) => ({ x: s.x, y: s.y })) // scale = 1 at native res
  const wandR = removalFromWand(src, width, height, scaledSeeds, doc.tolerance, doc.softness)
  onProgress(0.4)
  await yieldToUI()
  const removal = combineMax(colorR, wandR)
  const manual = rasterizeStrokes(width, height, doc.strokes, 1)
  const bgColors = collectBgColors(src, width, height, doc.samples, scaledSeeds)
  onProgress(0.5)
  await yieldToUI()

  const out = new Uint8ClampedArray(src.length)
  const band = Math.max(1, Math.floor(height / 20))
  for (let y0 = 0; y0 < height; y0 += band) {
    const y1 = Math.min(height, y0 + band)
    applyMaskInto(out, src, width, removal, manual, bgColors, doc.defringe, y0, y1)
    onProgress(0.5 + 0.5 * (y1 / height))
    await yieldToUI()
  }
  return out
}

export default function BgRemoveTool() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tool, setTool] = useState<Tool>('wand')
  const [brushSize, setBrushSize] = useState(40)
  const [previewBg, setPreviewBg] = useState<PreviewBackground>('checkerboard')
  const [showOriginal, setShowOriginal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [outputSize, setOutputSize] = useState<number | null>(null)
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 })
  const [previewReady, setPreviewReady] = useState(false)
  const [renderVersion, setRenderVersion] = useState(0)

  const history = useMaskHistory()
  const { doc } = history
  const docRef = useRef(doc)
  docRef.current = doc

  const nativeRef = useRef<BufferCache | null>(null)
  const previewRef = useRef<(BufferCache & { scale: number }) | null>(null)
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const maskedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)

  // ── Live preview (rAF-coalesced) ──
  // The guard coalesces bursts of doc changes into one render per frame; the
  // rAF reads docRef so it always renders the LATEST doc, never a stale closure.
  useEffect(() => {
    if (!previewReady) return
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const pv = previewRef.current
      const masked = maskedCanvasRef.current
      if (!pv || !masked) return
      const out = renderMask(pv.data, pv.width, pv.height, docRef.current, pv.scale)
      masked.getContext('2d')!.putImageData(new ImageData(out, pv.width, pv.height), 0, 0)
      setRenderVersion((v) => v + 1)
    })
  }, [doc, previewReady])

  // Cancel any pending preview render on unmount only.
  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
  }, [])

  const resetCaches = useCallback(() => {
    nativeRef.current = null
    previewRef.current = null
    originalCanvasRef.current = null
    maskedCanvasRef.current = null
    setPreviewReady(false)
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setError(null)
    setOutputSize(null)
    setShowOriginal(false)
    setTool('wand')
    try {
      const dataUrl = await readFileAsDataURL(file)
      const img = await loadImage(dataUrl)
      let nw = img.naturalWidth
      let nh = img.naturalHeight
      setOriginalSize({ width: nw, height: nh })

      let capNote = false
      if (nw * nh > MAX_MEGAPIXELS * 1_000_000) {
        const f = Math.sqrt((MAX_MEGAPIXELS * 1_000_000) / (nw * nh))
        nw = Math.round(nw * f)
        nh = Math.round(nh * f)
        capNote = true
      }

      // native working buffer
      const nativeCanvas = document.createElement('canvas')
      nativeCanvas.width = nw
      nativeCanvas.height = nh
      const nctx = nativeCanvas.getContext('2d', { willReadFrequently: true })!
      nctx.drawImage(img, 0, 0, nw, nh)
      nativeRef.current = { data: nctx.getImageData(0, 0, nw, nh).data, width: nw, height: nh }

      // preview buffer
      const scale = Math.min(1, PREVIEW_MAX_EDGE / Math.max(nw, nh))
      const pw = Math.max(1, Math.round(nw * scale))
      const ph = Math.max(1, Math.round(nh * scale))
      const previewCanvas = document.createElement('canvas')
      previewCanvas.width = pw
      previewCanvas.height = ph
      const pctx = previewCanvas.getContext('2d', { willReadFrequently: true })!
      pctx.imageSmoothingEnabled = true
      pctx.imageSmoothingQuality = 'high'
      pctx.drawImage(img, 0, 0, pw, ph)
      previewRef.current = { data: pctx.getImageData(0, 0, pw, ph).data, width: pw, height: ph, scale: pw / nw }
      originalCanvasRef.current = previewCanvas

      const masked = document.createElement('canvas')
      masked.width = pw
      masked.height = ph
      // seed masked with the original so first paint isn't blank
      masked.getContext('2d')!.drawImage(previewCanvas, 0, 0)
      maskedCanvasRef.current = masked

      history.clear()
      setImageFile(file)
      setPreviewReady(true)
      setError(capNote ? `Image is very large — processing capped at ~${MAX_MEGAPIXELS} MP.` : null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to load image: ${msg}`)
      setImageFile(null)
      resetCaches()
    }
  }, [history, resetCaches])

  const handlePickColor = useCallback((p: Point) => {
    const nd = nativeRef.current
    if (!nd) return
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    if (x < 0 || y < 0 || x >= nd.width || y >= nd.height) return
    const i = (y * nd.width + x) * 4
    history.addSample({ r: nd.data[i], g: nd.data[i + 1], b: nd.data[i + 2] })
  }, [history])

  const handleWandClick = useCallback((p: Point) => {
    const nd = nativeRef.current
    if (!nd) return
    if (p.x < 0 || p.y < 0 || p.x >= nd.width || p.y >= nd.height) return
    history.addWandSeed({ x: p.x, y: p.y })
  }, [history])

  const handleStroke = useCallback((stroke: BrushStroke) => {
    history.addStroke(stroke)
  }, [history])

  const handleExport = useCallback(async () => {
    const nd = nativeRef.current
    if (!nd || !imageFile) return
    setIsExporting(true)
    setExportProgress(0)
    setError(null)
    try {
      const out = await renderMaskChunked(nd.data, nd.width, nd.height, doc, setExportProgress)
      const canvas = document.createElement('canvas')
      canvas.width = nd.width
      canvas.height = nd.height
      canvas.getContext('2d')!.putImageData(new ImageData(out, nd.width, nd.height), 0, 0)
      const blob = await canvasToBlob(canvas, 'image/png', 1)
      setOutputSize(blob.size)
      const baseName = imageFile.name.replace(/\.[^.]+$/, '')
      downloadBlob(blob, `${baseName}-nobg.png`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Export failed: ${msg}`)
    } finally {
      setIsExporting(false)
      setExportProgress(0)
    }
  }, [doc, imageFile])

  const handleLoadNew = useCallback(() => {
    setImageFile(null)
    setOutputSize(null)
    history.clear()
    resetCaches()
  }, [history, resetCaches])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    if (!imageFile) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) history.redo()
        else history.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        history.redo()
        return
      }
      if (typing || mod) return
      switch (e.key.toLowerCase()) {
        case 'w': setTool('wand'); break
        case 'i': setTool('picker'); break
        case 'e': setTool('erase'); break
        case 'r': setTool('restore'); break
        case '[': setBrushSize((s) => Math.max(2, s - 4)); break
        case ']': setBrushSize((s) => Math.min(300, s + 4)); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [imageFile, history])

  if (!imageFile) {
    return (
      <div className="h-full flex flex-col gap-4">
        <FileDropZone
          onFiles={handleFiles}
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
          multiple={false}
          label="Drop an image here"
          description="PNG, JPEG, WebP, GIF, or BMP"
          className="h-full"
        />
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="p-1 rounded text-red-400/60 hover:text-red-400 transition-colors" aria-label="Dismiss error">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex gap-6">
      <ControlPanel
        tool={tool}
        onToolChange={setTool}
        doc={doc}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        onRemoveSample={history.removeSample}
        onSliderChange={history.setSlider}
        onSliderGestureStart={history.beginGesture}
        onSliderGestureEnd={history.endGesture}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        onReset={history.reset}
        onExport={handleExport}
        onLoadNew={handleLoadNew}
        isExporting={isExporting}
        exportProgress={exportProgress}
        outputSize={outputSize}
        originalSize={originalSize}
        fileSize={imageFile.size}
        previewBg={previewBg}
        onPreviewBgChange={setPreviewBg}
        showOriginal={showOriginal}
        onToggleOriginal={() => setShowOriginal((s) => !s)}
        error={error}
        onDismissError={() => setError(null)}
      />
      {previewReady && originalCanvasRef.current && maskedCanvasRef.current && (
        <Workspace
          originalCanvas={originalCanvasRef.current}
          maskedCanvas={maskedCanvasRef.current}
          imageWidth={nativeRef.current!.width}
          imageHeight={nativeRef.current!.height}
          tool={tool}
          brushSize={brushSize}
          previewBg={previewBg}
          showOriginal={showOriginal}
          renderVersion={renderVersion}
          onPickColor={handlePickColor}
          onWandClick={handleWandClick}
          onStroke={handleStroke}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: PASS.

- [ ] **Step 3: Run the full production build**

Run: `npm run build`
Expected: PASS — produces `dist/Multitool.html`, zero TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/tools/image-bg-remove/BgRemoveTool.tsx
git commit -m "feat(bg-remove): orchestrator with live preview, chunked export, shortcuts"
```

---

## Task 9: Remove the obsolete binary keyer

**Files:**
- Modify: `src/utils/imageProcessing.ts` (remove `removeBackgroundColor`)

- [ ] **Step 1: Confirm nothing else imports it**

Run: `grep -rn "removeBackgroundColor" src e2e`
Expected: only the definition in `src/utils/imageProcessing.ts` (the old `BgRemoveTool` import was removed in Task 8). If any other file references it, STOP and migrate that caller first.

- [ ] **Step 2: Delete the function**

Remove the entire `removeBackgroundColor` export (the JSDoc block + function) from `src/utils/imageProcessing.ts`. Leave `loadImage`, `resizeImage`, `canvasToBlob`, and `getPixelColor` intact.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc -b && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/utils/imageProcessing.ts
git commit -m "refactor(bg-remove): remove obsolete binary removeBackgroundColor"
```

---

## Task 10: Rewrite the E2E spec

The old spec asserts the removed color-picker UI ("Target Color", "Picking...", "Remove Background"). Replace it with the new tool's flow.

**Files:**
- Modify: `e2e/images/bg-remove.spec.ts` (full rewrite)

- [ ] **Step 1: Replace the spec**

```ts
// e2e/images/bg-remove.spec.ts
import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test.describe('Background Remover tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })
    const sidebar = page.locator('aside nav')
    await sidebar.locator('button').filter({ hasText: 'Background Remover' }).click()
    await waitForToolLoad(page)
    await expect(page.locator('header h1')).toHaveText('Background Remover')
  })

  test('empty state shows upload area', async ({ page }) => {
    await expect(page.locator('text=Drop an image here')).toBeVisible()
    await expect(page.locator('text=PNG, JPEG, WebP, GIF, or BMP')).toBeVisible()
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp,image/gif,image/bmp')
  })

  test('upload shows workspace canvas and tool palette', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')

    // Workspace canvas appears
    await expect(page.getByTestId('bg-workspace-canvas')).toBeVisible({ timeout: 5000 })

    // Four tools, Magic Wand selected by default
    for (const id of ['wand', 'picker', 'erase', 'restore']) {
      await expect(page.getByTestId(`tool-${id}`)).toBeVisible()
    }

    // Sliders present
    await expect(page.locator('text=Tolerance')).toBeVisible()
    await expect(page.locator('text=Edge softness')).toBeVisible()
    await expect(page.locator('text=Defringe')).toBeVisible()

    // Download + original info
    await expect(page.locator('button').filter({ hasText: 'Download PNG' })).toBeVisible()
    await expect(page.locator('text=Original')).toBeVisible()
    await expect(page.locator('text=Load different image')).toBeVisible()
  })

  test('color picker adds a background-color sample', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    await expect(page.getByTestId('bg-workspace-canvas')).toBeVisible({ timeout: 5000 })

    // Switch to the color picker and click the canvas center (reliably inside the
    // centered image — corner clicks land in the fit padding, outside the image).
    await page.getByTestId('tool-picker').click()
    await page.getByTestId('bg-workspace-canvas').click()

    // A sample swatch should appear
    await expect(page.getByTestId('sample-swatch').first()).toBeVisible({ timeout: 3000 })

    // Undo should now be enabled, and undoing removes the sample
    const undo = page.locator('button').filter({ hasText: 'Undo' })
    await expect(undo).toBeEnabled()
    await undo.click()
    await expect(page.getByTestId('sample-swatch')).toHaveCount(0)
  })

  test('magic wand click enables undo (records a seed)', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    const canvas = page.getByTestId('bg-workspace-canvas')
    await expect(canvas).toBeVisible({ timeout: 5000 })

    await canvas.click() // wand is default
    await expect(page.locator('button').filter({ hasText: 'Undo' })).toBeEnabled({ timeout: 3000 })
  })

  test('download produces a PNG file', async ({ page }) => {
    await uploadFile(page, 'sample-image.png')
    const canvas = page.getByTestId('bg-workspace-canvas')
    await expect(canvas).toBeVisible({ timeout: 5000 })
    await canvas.click()

    const downloadPromise = page.waitForEvent('download')
    await page.locator('button').filter({ hasText: 'Download PNG' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/-nobg\.png$/)
  })
})
```

- [ ] **Step 2: Run the spec**

Run: `npx playwright test e2e/images/bg-remove.spec.ts`
Expected: PASS (5 tests). If a click lands on a non-background pixel and a test depends on visible removal, adjust the click position — but these assertions only require a sample/seed to be recorded, not a specific pixel outcome.

- [ ] **Step 3: Commit**

```bash
git add e2e/images/bg-remove.spec.ts
git commit -m "test(bg-remove): rewrite E2E for the new workspace UI"
```

---

## Task 11: Visual verification (VVP)

Confirm the headline quality wins — soft edges + defringe — actually render.

**Files:**
- Create (temporary): `e2e/qa-generated/vvp-bg-remove.spec.ts`

- [ ] **Step 1: Write a screenshot spec over white and black backgrounds**

```ts
// e2e/qa-generated/vvp-bg-remove.spec.ts
import { test, expect } from '@playwright/test'
import { waitForToolLoad } from '../helpers/navigation'
import { uploadFile } from '../helpers/file-upload'

test('VVP: bg-remove keyed result over white and black', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1').filter({ hasText: 'Multitool' })).toBeVisible({ timeout: 10000 })
  await page.locator('aside nav').locator('button').filter({ hasText: 'Background Remover' }).click()
  await waitForToolLoad(page)

  await uploadFile(page, 'sample-image.png')
  const canvas = page.getByTestId('bg-workspace-canvas')
  await expect(canvas).toBeVisible({ timeout: 5000 })

  // Sample the corner background colour, raise softness + defringe
  await page.getByTestId('tool-picker').click()
  await canvas.click({ position: { x: 4, y: 4 } })

  await page.getByTestId('preview-bg-white').click()
  await page.screenshot({ path: 'test-results/bg-remove-white.png', fullPage: false })
  await page.getByTestId('preview-bg-black').click()
  await page.screenshot({ path: 'test-results/bg-remove-black.png', fullPage: false })
})
```

- [ ] **Step 2: Run it and inspect the screenshots**

Run: `npx playwright test e2e/qa-generated/vvp-bg-remove.spec.ts`
Then open `test-results/bg-remove-white.png` and `test-results/bg-remove-black.png` and verify:
- Removed background is the chosen white/black, subject retained.
- Subject edges are smooth (anti-aliased), not jagged.
- No bright color halo clinging to the edge against the contrasting background.

If edges look hard or fringed, revisit `softnessToBand`/`WAND_BLUR_MAX` (Task 3) and the defringe strength (Task 4) before proceeding.

- [ ] **Step 3: Keep or remove the VVP spec**

If useful as a permanent baseline, keep it; otherwise `git rm` it. Either way, commit:

```bash
git add -A e2e/qa-generated/vvp-bg-remove.spec.ts
git commit -m "test(bg-remove): VVP screenshot check for edge quality"
```

---

## Task 12: Final verification gate

- [ ] **Step 1: Unit tests**

Run: `npm run test:unit`
Expected: PASS (all `maskEngine` tests).

- [ ] **Step 2: Production build (typecheck + single-file)**

Run: `npm run build`
Expected: PASS — `dist/Multitool.html` produced, zero TypeScript errors.

- [ ] **Step 3: Full E2E for the tool**

Run: `npx playwright test e2e/images/bg-remove.spec.ts`
Expected: PASS.

- [ ] **Step 4: Manual smoke in the dev server**

Run: `npm run dev`, open the Background Remover, and confirm: wand click removes the connected background live; tolerance/softness update instantly; erase/restore brushes work; undo/redo (⌘/Ctrl+Z) steps correctly; zoom/pan; Download PNG saves a transparent file.

- [ ] **Step 5: Self-review checklist (CLAUDE.md Definition of Done)**

Confirm: no leftover `console.log`; null/empty guards on load (already handled — bad file → error state); large-image cap path tested (>64MP downsizes with notice); strict TS with zero `any`; UI renders cleanly with proper spacing/alignment.

---

## Notes for the implementer

- **No new dependencies.** Unit tests use `node:test` + the existing `tsx`. If you find yourself reaching for vitest/jest, stop — it's not needed.
- **Single-file constraint.** Everything is canvas + typed arrays; no workers, no external assets. Don't introduce a worker (the design deliberately keeps the export pass on the main thread with chunked yielding).
- **Coordinate spaces.** `MaskDoc` stores native image coords. `Workspace` maps pointer → native coords (its view transform treats the image as native-sized). The engine scales native coords into the buffer via the `scale` arg (`pw/nw` for preview, `1` for export). Keep this invariant.
- **Release is out of scope.** This plan stops at a working, tested feature on the branch. Version bump, changelog, and GitHub/PWA release follow the separate procedure in CLAUDE.md when the user asks to ship.
```
