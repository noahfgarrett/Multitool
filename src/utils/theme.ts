export type ThemeId = 'night-sky' | 'blueprint' | 'clean-dark' | 'light'

export interface ThemeDefinition {
  id: ThemeId
  label: string
  description: string
  preview: {
    bg: string
    accent: string
    text: string
  }
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'night-sky',
    label: 'Night Sky',
    description: 'Dark navy gradient with twinkling stars and shooting stars',
    preview: { bg: '#00171F', accent: '#14B8A6', text: '#FFFFFF' },
  },
  {
    id: 'blueprint',
    label: 'Blueprint',
    description: 'Dark navy with subtle grid lines — an engineering classic',
    preview: { bg: '#0A1628', accent: '#14B8A6', text: '#C8D6E5' },
  },
  {
    id: 'clean-dark',
    label: 'Clean Dark',
    description: 'Flat dark surfaces with no distractions',
    preview: { bg: '#111111', accent: '#14B8A6', text: '#E0E0E0' },
  },
  {
    id: 'light',
    label: 'Light',
    description: 'White backgrounds with dark text for bright environments',
    preview: { bg: '#F5F5F5', accent: '#14B8A6', text: '#1A1A1A' },
  },
]

const THEME_STORAGE_KEY = 'mt-theme'

export function loadTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && THEMES.some((t) => t.id === stored)) {
      return stored as ThemeId
    }
  } catch {
    // localStorage unavailable
  }
  return 'night-sky'
}

export function saveTheme(themeId: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId)
  } catch {
    // localStorage unavailable
  }
}

export function applyThemeClass(themeId: ThemeId): void {
  const body = document.body
  // Remove all theme classes
  THEMES.forEach((t) => body.classList.remove(`theme-${t.id}`))
  // Apply the new one
  body.classList.add(`theme-${themeId}`)
}
