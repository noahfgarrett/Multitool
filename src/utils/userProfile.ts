export interface UserProfile {
  name: string
  jobTitle: string
  company: string
  /** Base64 data URL (JPEG, max 128x128) */
  photo: string
}

const PROFILE_STORAGE_KEY = 'lotusworks-user-profile'

export function loadUserProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (stored) {
      const parsed: unknown = JSON.parse(stored)
      if (isUserProfile(parsed)) return parsed
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

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.name === 'string' &&
    typeof obj.jobTitle === 'string' &&
    typeof obj.company === 'string' &&
    typeof obj.photo === 'string'
  )
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
