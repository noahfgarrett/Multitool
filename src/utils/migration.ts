/**
 * One-time migration of localStorage/sessionStorage keys from
 * the old "lwt-" prefix (LotusWorks Toolkit) and the intermediate
 * "apex-" prefix to the current "mt-" prefix (Multitool).
 *
 * Does NOT delete old keys so that users who revert to an older version
 * still have their data intact during the transition period.
 *
 * IndexedDB limitation: IndexedDB databases cannot be renamed or copied
 * without reading every object store and re-writing to a new database.
 * If the app begins using IndexedDB, a dedicated migration for each
 * database will need to be added here.
 */

const MIGRATION_FLAG = 'mt-migrated'

/** Well-known localStorage key suffixes that map 1:1. */
const KNOWN_LS_SUFFIXES: readonly string[] = [
  'user-profile',
  'theme',
  'merge-settings',
  'email-recipients',
  'email-groups',
  'orgchart-versions',
  'tool-presets',
] as const

/** Well-known sessionStorage key suffixes that map 1:1. */
const KNOWN_SS_SUFFIXES: readonly string[] = [
  'pdf-annotate-session',
] as const

/** Wildcard prefixes (old forms) to iterate in localStorage. */
const LS_WILDCARD_OLD_PREFIXES: readonly string[] = [
  'lwt-form-',
  'lwt-dashboard-',
  'apex-form-',
  'apex-dashboard-',
] as const

/**
 * Copy a value from one storage key to another if the source exists
 * and the destination has not already been written.
 */
function copyKey(storage: Storage, oldKey: string, newKey: string): void {
  try {
    const value = storage.getItem(oldKey)
    if (value !== null && storage.getItem(newKey) === null) {
      storage.setItem(newKey, value)
    }
  } catch {
    // Storage quota exceeded or unavailable — skip silently
  }
}

/**
 * Migrate all lwt-* and apex-* localStorage and sessionStorage keys to mt-* equivalents.
 * Safe to call multiple times — the migration flag prevents redundant work.
 */
export function migrateFromLotusWorks(): void {
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') return
  } catch {
    // localStorage unavailable — nothing to migrate
    return
  }

  // ── localStorage: well-known keys ─────────────────────────────
  for (const suffix of KNOWN_LS_SUFFIXES) {
    const mtKey = `mt-${suffix}`
    copyKey(localStorage, `lwt-${suffix}`, mtKey)
    copyKey(localStorage, `apex-${suffix}`, mtKey)
  }

  // Also migrate the un-prefixed and old-prefixed lastSeenVersion if present
  copyKey(localStorage, 'lastSeenVersion', 'mt-lastSeenVersion')
  copyKey(localStorage, 'apex-lastSeenVersion', 'mt-lastSeenVersion')

  // ── localStorage: wildcard prefixes ───────────────────────────
  try {
    const len = localStorage.length
    for (let i = 0; i < len; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      for (const prefix of LS_WILDCARD_OLD_PREFIXES) {
        if (key.startsWith(prefix)) {
          // Strip old prefix, prepend "mt-"
          const oldPrefixLen = prefix.startsWith('lwt-') ? 4 : 5 // "lwt-" = 4, "apex-" = 5
          const newKey = 'mt-' + key.slice(oldPrefixLen)
          copyKey(localStorage, key, newKey)
        }
      }
    }
  } catch {
    // Iteration failed — skip wildcard migration
  }

  // ── sessionStorage: well-known keys ───────────────────────────
  try {
    for (const suffix of KNOWN_SS_SUFFIXES) {
      const mtKey = `mt-${suffix}`
      copyKey(sessionStorage, `lwt-${suffix}`, mtKey)
      copyKey(sessionStorage, `apex-${suffix}`, mtKey)
    }
  } catch {
    // sessionStorage unavailable — skip
  }

  // ── Mark migration complete ───────────────────────────────────
  try {
    localStorage.setItem(MIGRATION_FLAG, 'true')
  } catch {
    // If we can't set the flag, migration will re-run next time.
    // copyKey is idempotent (skips if destination exists), so this is safe.
  }
}
