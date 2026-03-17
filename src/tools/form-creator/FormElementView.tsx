import type { FormElement } from './types.ts'
import { HANDLE_SIZE } from './types.ts'
import {
  Type, AlignLeft, CheckSquare, Circle, ChevronDown,
  Calendar, PenTool, Image as ImageIcon, Minus, Heading,
  Clock, Hash, Table2, Calculator, Camera, Plus, MessageSquare,
} from 'lucide-react'

// ── Resize handle positions ──────────────────────────────────

export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

const HANDLE_CURSORS: Record<HandlePosition, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
  se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
}

function getHandlePositions(w: number, h: number): { pos: HandlePosition; x: number; y: number }[] {
  const hs = HANDLE_SIZE
  return [
    { pos: 'nw', x: -hs / 2, y: -hs / 2 },
    { pos: 'n',  x: w / 2 - hs / 2, y: -hs / 2 },
    { pos: 'ne', x: w - hs / 2, y: -hs / 2 },
    { pos: 'e',  x: w - hs / 2, y: h / 2 - hs / 2 },
    { pos: 'se', x: w - hs / 2, y: h - hs / 2 },
    { pos: 's',  x: w / 2 - hs / 2, y: h - hs / 2 },
    { pos: 'sw', x: -hs / 2, y: h - hs / 2 },
    { pos: 'w',  x: -hs / 2, y: h / 2 - hs / 2 },
  ]
}

// ── Type icon mapping ────────────────────────────────────────

function TypeIcon({ type }: { type: FormElement['type'] }) {
  const props = { size: 12, className: 'text-white' }
  switch (type) {
    case 'text-input': return <Type {...props} />
    case 'textarea': return <AlignLeft {...props} />
    case 'checkbox': return <CheckSquare {...props} />
    case 'radio': return <Circle {...props} />
    case 'select': return <ChevronDown {...props} />
    case 'date': return <Calendar {...props} />
    case 'label': return <Type {...props} />
    case 'heading': return <Heading {...props} />
    case 'signature': return <PenTool {...props} />
    case 'image': return <ImageIcon {...props} />
    case 'datetime': return <Clock {...props} />
    case 'number': return <Hash {...props} />
    case 'table': return <Table2 {...props} />
    case 'calculated': return <Calculator {...props} />
    case 'photo': return <Camera {...props} />
    case 'divider': return <Minus {...props} />
  }
}

// ── Element visual rendering ─────────────────────────────────

function ElementContent({ element }: { element: FormElement }) {
  const { type, label, placeholder, options, imageDataUrl, fontSize, fontWeight, textAlign, color } = element
  const textStyle = { fontSize: fontSize ?? 14, fontWeight: fontWeight ?? 'normal', textAlign: (textAlign ?? 'left') as React.CSSProperties['textAlign'], color: color ?? '#000' }

  switch (type) {
    case 'heading':
      return (
        <div className="w-full h-full flex items-center px-2" style={textStyle}>
          {label}
        </div>
      )

    case 'label':
      return (
        <div className="w-full h-full flex items-center px-1" style={textStyle}>
          {label}
        </div>
      )

    case 'text-input':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-1 px-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}{element.required ? ' *' : ''}</span>
          <div className="border-b border-gray-400 pb-1">
            <span className="text-gray-400" style={{ fontSize: 11 }}>{placeholder}</span>
          </div>
        </div>
      )

    case 'textarea':
      return (
        <div className="w-full h-full flex flex-col gap-1 px-1 pt-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}{element.required ? ' *' : ''}</span>
          <div className="flex-1 border border-gray-300 rounded px-1">
            <span className="text-gray-400" style={{ fontSize: 10 }}>{placeholder}</span>
          </div>
        </div>
      )

    case 'checkbox':
      return (
        <div className="w-full h-full flex items-center gap-2 px-1">
          <div className="w-4 h-4 border border-gray-400 rounded-sm flex-shrink-0" />
          <span style={{ fontSize: fontSize ?? 12, color: color ?? '#333' }}>{label}</span>
        </div>
      )

    case 'radio':
      return (
        <div className="w-full h-full flex flex-col gap-1 px-1 pt-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}{element.required ? ' *' : ''}</span>
          {(options ?? []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 border border-gray-400 rounded-full flex-shrink-0" />
              <span style={{ fontSize: 11, color: '#555' }}>{opt}</span>
            </div>
          ))}
        </div>
      )

    case 'select':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-1 px-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}{element.required ? ' *' : ''}</span>
          <div className="border border-gray-300 rounded px-2 py-0.5 flex items-center justify-between">
            <span className="text-gray-400" style={{ fontSize: 11 }}>Select...</span>
            <ChevronDown size={10} className="text-gray-400" />
          </div>
        </div>
      )

    case 'date':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-1 px-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}{element.required ? ' *' : ''}</span>
          <div className="border-b border-gray-400 pb-1 flex items-center gap-1">
            <Calendar size={10} className="text-gray-400" />
            <span className="text-gray-400" style={{ fontSize: 11 }}>MM/DD/YYYY</span>
          </div>
        </div>
      )

    case 'datetime':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-1 px-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}{element.required ? ' *' : ''}</span>
          <div className="border-b border-gray-400 pb-1 flex items-center gap-1">
            <Calendar size={10} className="text-gray-400" />
            <Clock size={10} className="text-gray-400" />
            <span className="text-gray-400" style={{ fontSize: 11 }}>MM/DD/YYYY HH:MM</span>
          </div>
        </div>
      )

    case 'number':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-1 px-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}{element.required ? ' *' : ''}</span>
          <div className="border-b border-gray-400 pb-1">
            <span className="text-gray-400" style={{ fontSize: 11 }}>{element.numberPrefix ?? ''}{placeholder || '0.00'}</span>
          </div>
        </div>
      )

    case 'table': {
      const rows = element.tableRows ?? 3
      const cols = element.tableCols ?? 3
      const headers = element.tableHeaders ?? []
      return (
        <div className="w-full h-full overflow-auto px-1 pt-1">
          <table className="w-full border-collapse" style={{ fontSize: 10 }}>
            <thead>
              <tr>
                {Array.from({ length: cols }, (_, c) => (
                  <th
                    key={c}
                    className="border border-gray-300 bg-gray-100 px-1 py-0.5 text-left font-medium text-gray-600"
                  >
                    {headers[c] ?? `Col ${c + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }, (_, r) => (
                <tr key={r}>
                  {Array.from({ length: cols }, (_, c) => (
                    <td key={c} className="border border-gray-300 px-1 py-0.5">&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'calculated':
      return (
        <div className="w-full h-full flex flex-col justify-center gap-1 px-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}</span>
          <div className="bg-gray-100 border border-gray-300 rounded px-2 py-1" style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>
            {element.formula ?? '= formula'}
          </div>
        </div>
      )

    case 'signature':
      return (
        <div className="w-full h-full flex flex-col justify-end gap-1 px-1 pb-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}</span>
          <div className="border-b border-gray-500" />
        </div>
      )

    case 'image':
      return imageDataUrl ? (
        <img
          src={imageDataUrl}
          alt={label}
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 rounded">
          <ImageIcon size={20} className="text-gray-300" />
          <span className="text-[10px] text-gray-400">Drop image</span>
        </div>
      )

    case 'photo':
      return (
        <div className="w-full h-full flex flex-col gap-1 px-1 pt-1">
          <span style={{ fontSize: 11, color: color ?? '#333' }}>{label}</span>
          <div className="flex-1 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center gap-1 bg-gray-50">
            {(element.photos?.length ?? 0) > 0 ? (
              <div className="flex gap-1 flex-wrap p-1 overflow-hidden">
                {element.photos!.slice(0, 4).map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p.dataUrl} alt="" className="w-12 h-12 object-cover rounded" draggable={false} />
                    {p.comment && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <MessageSquare size={6} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {element.photos!.length > 4 && (
                  <span className="text-[9px] text-gray-400 self-center">+{element.photos!.length - 4}</span>
                )}
              </div>
            ) : (
              <>
                <Camera size={16} className="text-gray-300" />
                <span className="text-[9px] text-gray-400">Drop photos or click to add</span>
                <span className="text-[8px] text-gray-300">Add comments per photo</span>
              </>
            )}
          </div>
        </div>
      )

    case 'divider':
      return <div className="w-full h-full flex items-center"><div className="w-full h-0.5 bg-gray-400" /></div>

    default:
      return <div className="w-full h-full" />
  }
}

// ── Component ────────────────────────────────────────────────

interface FormElementViewProps {
  element: FormElement
  selected: boolean
  hovered: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onResizeStart: (e: React.PointerEvent, handle: HandlePosition) => void
}

export function FormElementView({
  element,
  selected,
  hovered,
  onPointerDown,
  onResizeStart,
}: FormElementViewProps) {
  return (
    <div
      data-element-id={element.id}
      onPointerDown={onPointerDown}
      className="absolute select-none"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        outline: selected
          ? '2px solid #3B82F6'
          : hovered
            ? '1px solid rgba(59,130,246,0.4)'
            : '1px solid transparent',
        borderRadius: 2,
        cursor: 'default',
      }}
    >
      <ElementContent element={element} />

      {/* Resize handles */}
      {selected && getHandlePositions(element.width, element.height).map(({ pos, x, y }) => (
        <div
          key={pos}
          onPointerDown={(e) => { e.stopPropagation(); onResizeStart(e, pos) }}
          className="absolute bg-white border border-[#3B82F6] rounded-sm"
          style={{
            left: x,
            top: y,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            cursor: HANDLE_CURSORS[pos],
          }}
        />
      ))}

      {/* Type badge (selected only) */}
      {selected && (
        <div className="absolute -top-5 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3B82F6] text-white text-[9px] whitespace-nowrap">
          <TypeIcon type={element.type} />
          {element.type}
        </div>
      )}
    </div>
  )
}
