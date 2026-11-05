import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'
import { migrateLegacyStorage } from './migration.ts'

class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() { return this.data.size }
  clear() { this.data.clear() }
  getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null }
  key(index: number) { return [...this.data.keys()][index] ?? null }
  removeItem(key: string) { this.data.delete(key) }
  setItem(key: string, value: string) { this.data.set(key, String(value)) }
}

const g = globalThis as unknown as { localStorage: Storage; sessionStorage: Storage }

beforeEach(() => {
  g.localStorage = new MemoryStorage()
  g.sessionStorage = new MemoryStorage()
})

test('migrateLegacyStorage copies lwt- and apex- keys to the mt- prefix', () => {
  localStorage.setItem('lwt-user-profile', '{"name":"A"}')
  localStorage.setItem('apex-theme', 'light')
  localStorage.setItem('lwt-form-123', 'form')
  localStorage.setItem('apex-dashboard-9', 'dash')
  sessionStorage.setItem('lwt-pdf-annotate-session', 'session')

  migrateLegacyStorage()

  assert.equal(localStorage.getItem('mt-user-profile'), '{"name":"A"}')
  assert.equal(localStorage.getItem('mt-theme'), 'light')
  assert.equal(localStorage.getItem('mt-form-123'), 'form')
  assert.equal(localStorage.getItem('mt-dashboard-9'), 'dash')
  assert.equal(sessionStorage.getItem('mt-pdf-annotate-session'), 'session')
  // Old keys are left in place
  assert.equal(localStorage.getItem('lwt-user-profile'), '{"name":"A"}')
})

test('migrateLegacyStorage does not overwrite existing mt- keys and runs once', () => {
  localStorage.setItem('mt-theme', 'dark')
  localStorage.setItem('lwt-theme', 'light')
  migrateLegacyStorage()
  assert.equal(localStorage.getItem('mt-theme'), 'dark')
  assert.equal(localStorage.getItem('mt-migrated'), 'true')

  localStorage.setItem('lwt-user-profile', 'late')
  migrateLegacyStorage()
  assert.equal(localStorage.getItem('mt-user-profile'), null)
})
