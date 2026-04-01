import { create } from 'zustand'
import type { ToolId, Toast } from '@/types/index.ts'

interface AppState {
  // Navigation
  activeTool: ToolId | null
  sidebarExpanded: boolean
  sidebarCategories: Record<string, boolean>

  // Toasts
  toasts: Toast[]

  // Views (non-tool screens)
  activeView: 'feedback' | null
  showProfileModal: boolean

  // Changelog
  showChangelog: boolean
  setShowChangelog: (show: boolean) => void

  // Actions
  setActiveTool: (tool: ToolId | null) => void
  goHome: () => void
  toggleSidebar: () => void
  setSidebarExpanded: (expanded: boolean) => void
  toggleCategory: (category: string) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  setActiveView: (view: 'feedback' | null) => void
  setShowProfileModal: (show: boolean) => void
}

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
  toasts: [],
  activeView: null,
  showProfileModal: false,
  showChangelog: false,

  setActiveTool: (tool) => set({ activeTool: tool, activeView: null }),
  goHome: () => set({ activeTool: null, activeView: null }),
  setActiveView: (view) => set({ activeView: view, activeTool: null }),
  setShowProfileModal: (show) => set({ showProfileModal: show }),
  setShowChangelog: (show) => set({ showChangelog: show }),

  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),

  setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),

  toggleCategory: (category) =>
    set((s) => ({
      sidebarCategories: {
        ...s.sidebarCategories,
        [category]: !s.sidebarCategories[category],
      },
    })),

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
