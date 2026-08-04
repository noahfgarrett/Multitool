import type { CSSProperties } from 'react'
import type { ConnectorType, LegendPosition } from './types.ts'
import type { OrgChartStore } from './orgChartStore.ts'
import { buildLegendContent, ensureVisibleConnectorType } from './legend.ts'

const POSITION_STYLE: Record<LegendPosition, CSSProperties> = {
  'top-left': { left: 16, top: 16 },
  'top-right': { right: 16, top: 16 },
  'bottom-left': { left: 16, bottom: 48 },
  'bottom-right': { right: 16, bottom: 48 },
}

function RelationshipSample({ type }: { type: ConnectorType }): React.ReactElement {
  const visibleType = ensureVisibleConnectorType(type, '#101018')
  const borderStyle = visibleType.style === 'dotted'
    ? 'dotted'
    : visibleType.style === 'dashed'
      ? 'dashed'
      : 'solid'
  return (
    <span
      className="relative block w-9 flex-shrink-0"
      style={{
        height: visibleType.style === 'double' ? 7 : 1,
        borderTop: `${Math.max(1, visibleType.lineWidth)}px ${borderStyle} ${visibleType.color}`,
        borderBottom: visibleType.style === 'double'
          ? `${Math.max(1, visibleType.lineWidth * 0.6)}px solid ${visibleType.color}`
          : undefined,
      }}
      aria-hidden="true"
    />
  )
}

export function LegendOverlay({ store }: { store: OrgChartStore }): React.ReactElement | null {
  const content = buildLegendContent(store)
  const hasContent = content.relationships.length > 0 || content.departments.length > 0
  if (!store.legend.visible || !hasContent) return null

  return (
    <aside
      className="absolute z-20 w-52 rounded-md px-3 py-2.5 pointer-events-none shadow-lg"
      style={{
        ...POSITION_STYLE[store.legend.position],
        color: '#ffffff',
        backgroundColor: 'rgba(16, 16, 24, 0.94)',
        border: '1px solid rgba(255,255,255,0.14)',
      }}
      aria-label="Chart legend"
      data-testid="org-chart-legend"
    >
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Legend</h3>
      {content.relationships.length > 0 ? (
        <section className="mt-2" aria-label="Relationships">
          <h4 className="text-[9px] font-semibold uppercase tracking-wider text-white/35">Relationships</h4>
          <ul className="mt-1 space-y-1.5">
            {content.relationships.map(type => (
              <li key={type.id} className="flex items-center gap-2 text-[11px] text-white/85">
                <RelationshipSample type={type} />
                <span className="truncate">{type.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {content.departments.length > 0 ? (
        <section className="mt-2" aria-label="Departments">
          <h4 className="text-[9px] font-semibold uppercase tracking-wider text-white/35">Departments</h4>
          <ul className="mt-1 grid grid-cols-1 gap-1.5">
            {content.departments.map(item => (
              <li key={item.label.toLocaleLowerCase()} className="flex items-center gap-2 text-[11px] text-white/85">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color, border: '1px solid rgba(255,255,255,0.2)' }}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  )
}
