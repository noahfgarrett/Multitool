import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getMiddleMousePanCursor, getPannedScrollPosition, shouldHandleMiddleMousePan } from './middleMousePan.ts'

test('middle mouse button starts grab-hand panning and suppresses native autoscroll', () => {
  assert.equal(shouldHandleMiddleMousePan({ button: 1 }), true)
  assert.equal(getMiddleMousePanCursor(), 'grabbing')
})

test('non-middle mouse buttons do not start middle-mouse panning', () => {
  assert.equal(shouldHandleMiddleMousePan({ button: 0 }), false)
  assert.equal(shouldHandleMiddleMousePan({ button: 2 }), false)
})

test('middle mouse pan moves scroll opposite the pointer drag', () => {
  assert.deepEqual(
    getPannedScrollPosition(
      { startX: 100, startY: 50, scrollLeft: 400, scrollTop: 300 },
      { clientX: 130, clientY: 10 },
    ),
    { scrollLeft: 370, scrollTop: 340 },
  )
})
