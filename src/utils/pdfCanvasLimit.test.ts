import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveMaxCanvasPixels } from './pdfCanvasLimits.ts'

test('desktop pdf canvas cap preserves high-fidelity rendering', () => {
  assert.equal(resolveMaxCanvasPixels({ userAgent: '', platform: 'MacIntel', maxTouchPoints: 0 }), 16_777_216)
})

test('touch pdf canvas cap stays mobile-safe', () => {
  assert.equal(resolveMaxCanvasPixels({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', platform: 'iPad', maxTouchPoints: 5 }), 5_242_880)
})
