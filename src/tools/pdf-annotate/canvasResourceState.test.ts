import assert from 'node:assert/strict'
import test from 'node:test'
import { collapseCanvasForRelease, restoreCanvasForRender } from './canvasResourceState.ts'

function makeCanvas(width = 100, height = 200) {
  return {
    width,
    height,
    style: {
      display: '',
    },
  }
}

test('collapseCanvasForRelease clears the backing buffer and hides the canvas', () => {
  const canvas = makeCanvas()

  collapseCanvasForRelease(canvas)

  assert.equal(canvas.width, 0)
  assert.equal(canvas.height, 0)
  assert.equal(canvas.style.display, 'none')
})

test('restoreCanvasForRender makes a previously collapsed canvas visible', () => {
  const canvas = makeCanvas(0, 0)
  canvas.style.display = 'none'

  restoreCanvasForRender(canvas)

  assert.equal(canvas.style.display, '')
})
