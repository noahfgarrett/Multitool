// src/tools/image-bg-remove/maskEngine.ts
import type { ColorSample } from './types'

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
