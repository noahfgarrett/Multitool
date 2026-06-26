import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isTauriRuntime, shouldCheckHtmlUpdates } from './runtimeEnvironment.ts'

test('isTauriRuntime detects the desktop runtime marker', () => {
  assert.equal(isTauriRuntime({}), false)
  assert.equal(isTauriRuntime({ __TAURI_INTERNALS__: {} }), true)
})

test('shouldCheckHtmlUpdates only checks updates for standalone HTML builds', () => {
  assert.equal(shouldCheckHtmlUpdates({ isPwa: false, isTauri: false }), true)
  assert.equal(shouldCheckHtmlUpdates({ isPwa: true, isTauri: false }), false)
  assert.equal(shouldCheckHtmlUpdates({ isPwa: false, isTauri: true }), false)
})
