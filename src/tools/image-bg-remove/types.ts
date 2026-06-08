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
