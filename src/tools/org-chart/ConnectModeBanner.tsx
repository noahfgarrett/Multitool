import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { OrgChartStore } from './orgChartStore.ts'

export function ConnectModeBanner({ store }: { store: OrgChartStore }): React.ReactElement | null {
  const { connectMode, connectFlash, cancelConnectMode, nodes } = store

  // Esc exits connect mode (only while active)
  useEffect(() => {
    if (connectMode.state === 'off') return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        cancelConnectMode()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [connectMode.state, cancelConnectMode])

  if (connectFlash) {
    return (
      <div
        data-testid="connect-flash-banner"
        className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-red-500/90 backdrop-blur-md border border-red-400/50 text-white text-xs font-medium shadow-lg"
      >
        {connectFlash}
      </div>
    )
  }

  if (connectMode.state === 'off') return null
  if (connectMode.state === 'picking-type') return null  // popover takes over

  let message = ''
  if (connectMode.state === 'awaiting-source') {
    const needsMoreNodes = nodes.length < 2
    message = needsMoreNodes
      ? 'Add another node first'
      : 'Connect mode — click a source node'
  } else if (connectMode.state === 'awaiting-target') {
    const source = nodes.find(n => n.id === connectMode.sourceId)
    message = source ? `Click a target node (from: ${source.name})` : 'Click a target node'
  }

  return (
    <div
      data-testid="connect-mode-banner"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-full bg-dark-elevated/90 backdrop-blur-md border border-white/[0.1] text-white/90 text-xs font-medium shadow-lg"
    >
      <span>{message}</span>
      <span className="text-white/40 text-[10px]">Esc to exit</span>
      <button
        type="button"
        onClick={cancelConnectMode}
        className="p-0.5 rounded hover:bg-white/[0.1] text-white/50 hover:text-white/90"
        data-testid="connect-mode-exit"
        aria-label="Exit connect mode"
      >
        <X size={12} />
      </button>
    </div>
  )
}
