# Background Remover — "Really Good" Redesign

**Date:** 2026-06-08
**Tool:** `src/tools/image-bg-remove/`
**Status:** Design validated, ready for implementation plan

## Goal

Turn the current basic chroma-key remover into a genuinely professional, model-free
background remover. Keep the bundle tiny (no neural model) while delivering pro-quality
output and a refinement workflow that can actually *finish the job* on imperfect images.

### Why model-free

A one-click AI remover (remove.bg style) would need a bundled segmentation model
(~20–45MB), which conflicts with the "keep the bundle super small" priority. We stay
color-key based. (Noted for the future: MediaPipe Selfie Segmentation is a ~250KB model
+ ~2–3MB WASM runtime that does *people only* — a possible "one-click for portraits"
add-on later, deliberately out of scope now.)

## Current state (what we're replacing)

- `BgRemoveTool.tsx` — pick one color by clicking, remove pixels within an RGB-distance
  tolerance, **binary alpha** (hard on/off → jagged edges, color halos).
- `utils/imageProcessing.ts::removeBackgroundColor` — the binary keyer. To be removed.
- Works only on solid/studio backgrounds; output looks "cut out."

## Scope

**Baseline quality (non-negotiable):**
- Soft, anti-aliased edges (smooth alpha ramp, not binary cutoff)
- Defringe / despill (remove the colored edge halo)
- Live preview (updates instantly, no "Remove" button round-trip)

**Power features (selected):**
- Magic-wand contiguous selection
- Erase / restore brushes
- Multi-color sampling

**Explicitly out of scope:** background replacement (output stays transparent PNG);
neural segmentation model.

---

## Section 1 — Interaction model & workspace

**Tool palette (four tools):**
- **Magic Wand** *(default on load)* — click background → removes the *connected* region
  within tolerance. Click again for disconnected background patches.
- **Color Picker (eyedropper)** — click adds a *color sample*; pixels near that color
  *anywhere* are removed. Multiple samples for gradient/textured backgrounds (multi-color
  sampling). Shown as a swatch list with delete buttons.
- **Erase brush** — manually paint away missed areas.
- **Restore brush** — manually paint back wrongly-removed areas.

Wand + Color build the *automatic* mask; brushes are *manual overrides* on top.

**Shared controls:** Tolerance, Edge Softness (affect Wand + Color), Defringe, Brush Size.

**Workspace (right):**
- Zoom & pan (scroll-zoom, drag-pan, Fit button) — needed for precise edge brushing.
- Preview-background toggle: checkerboard (default) / white / black — to spot fringing.
- Before/after toggle.

**Layout:** keep the left-control-panel + right-preview structure, expanded.

---

## Section 2 — The masking pipeline

Everything composes into one alpha per pixel, computed from **independent, editable layers**:

**Layer 1 — Key mask** (Color samples + Wand → soft removal amount 0…1):
- *Color samples:* per pixel, distance to the *nearest* sample color (min across samples).
  Map through a **smoothstep ramp**: `dist ≤ tolerance` → fully removed; within the
  softness band beyond → smooth fade; past it → kept. This soft ramp *is* the
  anti-aliased-edge fix.
- *Wand:* flood-fill from the click point across pixels within tolerance → connected
  region; boundary feathered by softness; unioned with color removal.

**Layer 2 — Manual mask** (brushes, signed override):
- Erase → force-remove; Restore → force-keep. Stored as **vector stroke paths**
  (points + radius in *image* coordinates) — undoable and resolution-independent.

**Composition:**
```
removal = keyRemoval(px)            // 0..1
if manual == forceKeep:   removal = 0
if manual == forceRemove: removal = 1
finalAlpha = originalAlpha * (1 - removal)
```

**Defringe (color decontamination):** edge pixels keep a background-color halo. Treating
observed color as `C = α·F + (1−α)·B`, solve for true foreground
`F = (C − (1−α)·B) / α` (B = nearest background sample), clamped. Slider blends 0 → full.
Kills the "cut-out" rim.

**Key insight:** samples and strokes are stored *declaratively*, so the mask recomputes at
any resolution and any step is undoable.

---

## Section 3 — Resolution & performance strategy

**Two-resolution model** (enabled by declarative storage):
- **Preview resolution (interactive):** downscale source once, longest edge capped at
  **~1600px** (~2.5M px). All live interaction runs here → recompute in a few ms.
- **Export resolution (one-shot):** on Download, re-run the *same* pipeline at native res.
  Samples are colors+tolerance, wand re-floods natively, brushes re-rasterize from vector
  paths → genuinely sharp output, never an upscaled blur.

**Cheap live updates (CLAUDE.md: no O(N) per frame):**
- Cache source `ImageData` once per resolution — never re-read pixels per update.
- Coalesce slider recomputes to **one pass per animation frame** (rAF).
- Brushing updates only the **manual layer** + re-composites; does not recompute the key mask.

**Export without freezing:** full-res pass runs in **async row-bands** (yield between
chunks) with a progress bar. Main-thread — sidesteps Web-Worker inlining risk in the
single-file build (YAGNI; move just the export pass to a worker later if profiling demands).

**Hard caps (CLAUDE.md):** refuse/auto-downscale beyond ~64 MP with a clear message;
clean error if `getImageData` fails.

---

## Section 4 — State model & undo/redo

**The mask is a declarative document** (tiny — vectors, not pixels):
```ts
interface MaskDoc {
  samples: { r: number; g: number; b: number }[]
  wandSeeds: { x: number; y: number }[]
  strokes: { type: 'erase' | 'restore'; points: { x: number; y: number }[]; radius: number }[]
  tolerance: number
  softness: number
  defringe: number
}
```
Preview and export both render *from* this. **One global tolerance/softness** governs both
color and wand (wand seeds re-flood at current tolerance) → one predictable knob.

**Undo/redo = snapshot history of `MaskDoc`** (small vector data → cheap snapshots).
**Mirror the undo/redo pattern just added to pdf-split** (commit `7fcc2ad`) for consistency.
- One entry per discrete action: add/delete color sample, wand click, completed brush
  stroke (pointer-down→up = one step).
- Slider changes commit **on pointer-up** (drag coalesces to one step).
- Cap depth ~50.

**Shortcuts:** ⌘/Ctrl+Z undo, ⌘/Ctrl+Shift+Z + Ctrl+Y redo; tool keys (W/I/E/R);
`[` `]` brush size.

**Reset** clears samples/wand/strokes (keeps image); **Load different image** resets all.
Zoom/pan and computed preview are ephemeral — never in history.

---

## Section 5 — File structure & testing

```
src/tools/image-bg-remove/
  BgRemoveTool.tsx     // orchestrator: layout, wires hook → workspace + panel, export
  types.ts             // MaskDoc, ColorSample, BrushStroke, Tool union
  maskEngine.ts        // PURE, DOM-free pipeline (Uint8ClampedArray in/out)
  useMaskHistory.ts    // MaskDoc state + undo/redo snapshot stack + actions
  Workspace.tsx        // interactive canvas: zoom/pan, per-tool pointers, preview-bg, before/after
  ControlPanel.tsx     // tool palette, sliders, sample list, actions, output info
  maskEngine.test.ts   // unit tests
```

**Design rule:** `maskEngine` operates on plain `Uint8ClampedArray` + width/height — zero
DOM/canvas dependency — so the correctness-critical core is unit-testable in Node. The
React layer owns canvas↔ImageData conversion.

**Reuse:** `FileDropZone`, `Button`, `Slider`, `ProgressBar` (export), `EmptyState`. Keep
`loadImage`/`canvasToBlob`/`getPixelColor`; **remove obsolete binary `removeBackgroundColor`**
after grepping for other importers.

**Testing:**
- **Unit** via Node's `node:test` run through `tsx` (**no new dependency**; add `test:unit`
  script): smoothstep ramp boundaries, flood-fill connectivity + tolerance, defringe unmix
  math, stroke rasterization, composite override precedence.
- **E2E:** update `e2e/images/bg-remove.spec.ts` — load fixture, wand-click, assert output +
  download enabled; `data-testid` selectors.
- **VVP:** screenshot a keyed subject over white/black/checkerboard — confirm soft edges +
  no fringe halo.
- **Gate:** `npm run build` (tsc strict, zero `any`) + lint clean + single-file render check.
