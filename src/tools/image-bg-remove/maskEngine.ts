// src/tools/image-bg-remove/maskEngine.ts
import type { ColorSample, Point } from './types'

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
