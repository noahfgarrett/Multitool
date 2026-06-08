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
