export interface UserProfile {
  name: string
  email: string
  initials: string
  /** Job title (Agent A addition) */
  jobTitle: string
  /** Company name (Agent A addition) */
  company: string
  /** Base64 data URL (JPEG, max 128x128) for profile photo (Agent A addition) */
  photo: string
}

const PROFILE_STORAGE_KEY = 'lotusworks-user-profile'

export function getUserProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      if (isUserProfile(parsed)) return normalizeProfile(parsed as unknown as Record<string, unknown>)
    }
  } catch {
    // localStorage unavailable or corrupt
  }
  return null
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // localStorage unavailable
  }
}

/** Alias for getUserProfile (used by SettingsModal / Agent A code). */
export const loadUserProfile = getUserProfile

export function hasUserProfile(): boolean {
  return getUserProfile() !== null
}

export function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  // At minimum, must have a name string. Other fields get defaults if missing.
  return typeof obj.name === 'string'
}

/** Normalize a stored profile that may be missing fields added across versions. */
function normalizeProfile(raw: Record<string, unknown>): UserProfile {
  return {
    name: (raw.name as string) || '',
    email: (raw.email as string) || '',
    initials: (raw.initials as string) || generateInitials((raw.name as string) || ''),
    jobTitle: (raw.jobTitle as string) || '',
    company: (raw.company as string) || '',
    photo: (raw.photo as string) || '',
  }
}

/**
 * Compress an image file to a max 128x128 JPEG at 0.85 quality.
 * Returns a base64 data URL.
 */
export function compressProfilePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        const maxSize = 128
        let { width, height } = img

        // Scale down to fit within maxSize x maxSize
        if (width > maxSize || height > maxSize) {
          const scale = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
