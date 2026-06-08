// src/tools/image-bg-remove/maskEngine.ts
import type { ColorSample, BrushStroke, Point, MaskDoc } from './types'

/** Max possible Euclidean distance in 8-bit RGB space (~441.67). */
export const MAX_COLOR_DIST = Math.sqrt(3 * 255 * 255)

/** Width (in color-distance units) of the soft fade band at softness=100. */
const SOFTNESS_BAND_MAX = MAX_COLOR_DIST

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
