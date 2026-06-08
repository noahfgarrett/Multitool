// src/tools/image-bg-remove/ControlPanel.tsx
import { Button } from '@/components/common/Button.tsx'
import { Slider } from '@/components/common/Slider.tsx'
import { ProgressBar } from '@/components/common/ProgressBar.tsx'
import { formatFileSize } from '@/utils/fileReader.ts'
import {
  Wand2, Pipette, Eraser, Brush, Undo2, Redo2, Download, RotateCcw, Eye, EyeOff, X,
} from 'lucide-react'
import type { Tool, MaskDoc, PreviewBackground } from './types'

type SliderKey = 'tolerance' | 'softness' | 'defringe'

interface ControlPanelProps {
  tool: Tool
  onToolChange: (t: Tool) => void
  doc: MaskDoc
  brushSize: number
  onBrushSizeChange: (n: number) => void
  onRemoveSample: (index: number) => void
  onSliderChange: (key: SliderKey, value: number) => void
  onSliderGestureStart: () => void
  onSliderGestureEnd: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onReset: () => void
  onExport: () => void
  onLoadNew: () => void
  isExporting: boolean
  exportProgress: number
  outputSize: number | null
  originalSize: { width: number; height: number }
  fileSize: number
  previewBg: PreviewBackground
  onPreviewBgChange: (b: PreviewBackground) => void
  showOriginal: boolean
  onToggleOriginal: () => void
  error: string | null
  onDismissError: () => void
}

const TOOLS: { id: Tool; label: string; icon: typeof Wand2; key: string }[] = [
  { id: 'wand', label: 'Magic Wand', icon: Wand2, key: 'W' },
  { id: 'picker', label: 'Color Picker', icon: Pipette, key: 'I' },
  { id: 'erase', label: 'Erase', icon: Eraser, key: 'E' },
  { id: 'restore', label: 'Restore', icon: Brush, key: 'R' },
]

const PREVIEW_BGS: PreviewBackground[] = ['checkerboard', 'white', 'black']

export function ControlPanel(props: ControlPanelProps) {
  const { tool, doc, brushSize } = props
  const isBrush = tool === 'erase' || tool === 'restore'

  const sliderGestureProps = {
    onPointerDown: props.onSliderGestureStart,
    onPointerUp: props.onSliderGestureEnd,
    onKeyDown: props.onSliderGestureStart,
    onBlur: props.onSliderGestureEnd,
  }

  return (
    <div className="w-72 flex-shrink-0 space-y-5 overflow-y-auto pr-2">
      {/* Undo / redo */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary" size="sm" onClick={props.onUndo} disabled={!props.canUndo}
          icon={<Undo2 size={14} />} className="flex-1"
        >
          Undo
        </Button>
        <Button
          variant="secondary" size="sm" onClick={props.onRedo} disabled={!props.canRedo}
          icon={<Redo2 size={14} />} className="flex-1"
        >
          Redo
        </Button>
      </div>

      {/* Tool palette */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/70">Tool</span>
        <div className="grid grid-cols-2 gap-2">
          {TOOLS.map(({ id, label, icon: Icon, key }) => (
            <button
              key={id}
              data-testid={`tool-${id}`}
              onClick={() => props.onToolChange(id)}
              title={`${label} (${key})`}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                tool === id
                  ? 'bg-[#14B8A6]/15 border-[#14B8A6]/40 text-white'
                  : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:text-white/90'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Color samples */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/70">Background colors</span>
        {doc.samples.length === 0 ? (
          <p className="text-[11px] text-white/40 italic">
            Use the Color Picker to sample background colors, or click with the Magic Wand.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {doc.samples.map((s, i) => (
              <button
                key={i}
                data-testid="sample-swatch"
                onClick={() => props.onRemoveSample(i)}
                title={`Remove rgb(${s.r}, ${s.g}, ${s.b})`}
                className="group relative w-8 h-8 rounded-md border-2 border-white/20 hover:border-red-400/60 transition-colors"
                style={{ backgroundColor: `rgb(${s.r}, ${s.g}, ${s.b})` }}
              >
                <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded">
                  <X size={12} className="text-white" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sliders */}
      <Slider
        label="Tolerance" value={doc.tolerance} min={1} max={100} step={1} suffix="%"
        onChange={(e) => props.onSliderChange('tolerance', Number((e.target as HTMLInputElement).value))}
        {...sliderGestureProps}
      />
      <Slider
        label="Edge softness" value={doc.softness} min={0} max={100} step={1} suffix="%"
        onChange={(e) => props.onSliderChange('softness', Number((e.target as HTMLInputElement).value))}
        {...sliderGestureProps}
      />
      <Slider
        label="Defringe" value={doc.defringe} min={0} max={100} step={1} suffix="%"
        onChange={(e) => props.onSliderChange('defringe', Number((e.target as HTMLInputElement).value))}
        {...sliderGestureProps}
      />
      {isBrush && (
        <Slider
          label="Brush size" value={brushSize} min={2} max={300} step={1} suffix="px"
          onChange={(e) => props.onBrushSizeChange(Number((e.target as HTMLInputElement).value))}
        />
      )}

      {/* Preview background + before/after */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-white/70">Preview on</span>
        <div className="flex gap-2">
          {PREVIEW_BGS.map((bg) => (
            <button
              key={bg}
              data-testid={`preview-bg-${bg}`}
              onClick={() => props.onPreviewBgChange(bg)}
              className={`flex-1 px-2 py-1.5 rounded-md border text-[11px] capitalize transition-colors ${
                props.previewBg === bg
                  ? 'bg-[#14B8A6]/15 border-[#14B8A6]/40 text-white'
                  : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:text-white/90'
              }`}
            >
              {bg === 'checkerboard' ? 'Checker' : bg}
            </button>
          ))}
        </div>
        <button
          onClick={props.onToggleOriginal}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          {props.showOriginal ? <EyeOff size={12} /> : <Eye size={12} />}
          {props.showOriginal ? 'Show result' : 'Show original'}
        </button>
      </div>

      {/* Error */}
      {props.error && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-[11px] text-red-400 flex-1">{props.error}</p>
          <button onClick={props.onDismissError} className="p-0.5 rounded text-red-400/60 hover:text-red-400" aria-label="Dismiss error">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-1">
        {props.isExporting ? (
          <ProgressBar value={Math.round(props.exportProgress * 100)} label="Exporting…" />
        ) : (
          <Button onClick={props.onExport} icon={<Download size={14} />} className="w-full">
            Download PNG
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={props.onReset} icon={<RotateCcw size={14} />} className="flex-1">
            Reset
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.06] space-y-1">
        <p className="text-xs text-white/40">Original</p>
        <p className="text-sm text-white">{props.originalSize.width} × {props.originalSize.height}px</p>
        <p className="text-xs text-white/40">{formatFileSize(props.fileSize)}</p>
        {props.outputSize !== null && (
          <>
            <p className="text-xs text-white/40 pt-1">Output (PNG)</p>
            <p className="text-sm text-white">{formatFileSize(props.outputSize)}</p>
          </>
        )}
      </div>

      <button onClick={props.onLoadNew} className="text-xs text-white/30 hover:text-white/60 transition-colors">
        Load different image
      </button>
    </div>
  )
}
