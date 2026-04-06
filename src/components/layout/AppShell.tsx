import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar.tsx'
import { Header } from './Header.tsx'
import { Toast } from '@/components/common/Toast.tsx'
import { ShootingStars } from '@/components/ShootingStars.tsx'
import { useAppStore } from '@/stores/appStore.ts'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const theme = useAppStore((s) => s.theme)

  return (
    <div className="flex h-full w-full">
      {theme === 'night-sky' && <ShootingStars />}
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>
      </div>
      <Toast />
    </div>
  )
}
