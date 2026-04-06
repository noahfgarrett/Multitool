import { create } from 'zustand'
import type { ToolId, Toast } from '@/types/index.ts'
import type { ThemeId } from '@/utils/theme.ts'
import { loadTheme, saveTheme, applyThemeClass } from '@/utils/theme.ts'

interface AppState {
  // Navigation
  activeTool: ToolId | null
  sidebarExpanded: boolean
  sidebarCategories: Record<string, boolean>

  // Theme
  theme: ThemeId

  // Settings modal
  settingsOpen: boolean

  // Toasts
  toasts: Toast[]

  // Actions
  setActiveTool: (tool: ToolId | null) => void
  goHome: () => void
  toggleSidebar: () => void
  setSidebarExpanded: (expanded: boolean) => void
  toggleCategory: (category: string) => void
  setTheme: (theme: ThemeId) => void
  openSettings: () => void
  closeSettings: () => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const initialTheme = loadTheme()
applyThemeClass(initialTheme)

export const useAppStore = create<AppState>((set) => ({
  activeTool: null,
  sidebarExpanded: true,
  sidebarCategories: {
    documents: true,
    images: true,
    files: true,
    creators: true,
    utilities: true,
  },
  theme: initialTheme,
  settingsOpen: false,
  toasts: [],

  setActiveTool: (tool) => set({ activeTool: tool }),
  goHome: () => set({ activeTool: null }),

  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),

  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),

  toggleCategory: (category) =>
    set((s) => ({
      sidebarCategories: {
        ...s.sidebarCategories,
        [category]: !s.sidebarCategories[category],
      },
    })),

  setTheme: (theme) => {
    saveTheme(theme)
    applyThemeClass(theme)
    set({ theme })
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  addToast: (toast) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    const duration = toast.duration ?? 3000
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
