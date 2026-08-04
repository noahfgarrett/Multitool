import type { OrgChartState, OrgChartVersion } from './types.ts'

const DB_NAME = 'multitool-org-chart'
const DB_VERSION = 1
const STORE_NAME = 'documents'
const ACTIVE_KEY = 'active-v2'
const VERSIONS_KEY = 'versions-v2'
const FALLBACK_ACTIVE_KEY = 'mt-orgchart-autosave-v2'
const LEGACY_VERSIONS_KEY = 'mt-orgchart-versions'

export interface StoredOrgChartDraft {
  schemaVersion: 2
  savedAt: number
  snapshot: OrgChartState
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open chart storage'))
  })
}

async function readIndexedValue<T>(key: string): Promise<T | null> {
  const database = await openDatabase()
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve((request.result as T | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('Unable to read chart storage'))
    })
  } finally {
    database.close()
  }
}

async function writeIndexedValue<T>(key: string, value: T): Promise<void> {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(value, key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Unable to save chart'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Chart save was interrupted'))
    })
  } finally {
    database.close()
  }
}

export async function loadAutosavedChart(): Promise<StoredOrgChartDraft | null> {
  try {
    return await readIndexedValue<StoredOrgChartDraft>(ACTIVE_KEY)
  } catch {
    try {
      const raw = localStorage.getItem(FALLBACK_ACTIVE_KEY)
      return raw ? JSON.parse(raw) as StoredOrgChartDraft : null
    } catch {
      return null
    }
  }
}

export async function saveAutosavedChart(snapshot: OrgChartState): Promise<number> {
  const savedAt = Date.now()
  const draft: StoredOrgChartDraft = { schemaVersion: 2, savedAt, snapshot }
  try {
    await writeIndexedValue(ACTIVE_KEY, draft)
  } catch {
    localStorage.setItem(FALLBACK_ACTIVE_KEY, JSON.stringify(draft))
  }
  return savedAt
}

export async function loadStoredVersions(): Promise<OrgChartVersion[]> {
  try {
    const stored = await readIndexedValue<OrgChartVersion[]>(VERSIONS_KEY)
    if (stored) return stored
  } catch {
    // Fall through to the legacy localStorage migration path.
  }

  try {
    const raw = localStorage.getItem(LEGACY_VERSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const versions = parsed as OrgChartVersion[]
    try {
      await writeIndexedValue(VERSIONS_KEY, versions)
      localStorage.removeItem(LEGACY_VERSIONS_KEY)
    } catch {
      // Keep the legacy copy when migration cannot be committed.
    }
    return versions
  } catch {
    return []
  }
}

export async function saveStoredVersions(versions: OrgChartVersion[]): Promise<void> {
  try {
    await writeIndexedValue(VERSIONS_KEY, versions)
  } catch {
    localStorage.setItem(LEGACY_VERSIONS_KEY, JSON.stringify(versions))
  }
}
