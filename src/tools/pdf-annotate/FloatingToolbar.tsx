import { useState, useCallback } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Plus,
  Minus,
  Pipette,
} from 'lucide-react';

export interface FloatingToolbarProps {
  // Position
  x: number;
  y: number;
  anchor: 'above' | 'below';

  // Current formatting state
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  superscript: boolean;
  subscript: boolean;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  fontSize: number;
  color: string;
  listType: 'none' | 'bullet' | 'numbered';

  // Callbacks
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleUnderline: () => void;
  onToggleStrikethrough: () => void;
  onToggleSuperscript: () => void;
  onToggleSubscript: () => void;
  onSetTextAlign: (align: 'left' | 'center' | 'right' | 'justify') => void;
  onChangeFontSize: (size: number) => void;
  onChangeColor: (color: string) => void;
  onSetListType: (type: 'none' | 'bullet' | 'numbered') => void;

  // Visibility
  visible: boolean;
}

const COLOR_PRESETS = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#14B8A6' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'White', value: '#FFFFFF' },
];

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

const ICON_SIZE = 14;

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
        active
          ? 'bg-[#14B8A6]/20 text-[#14B8A6]'
          : 'text-white/40 hover:text-white/70'
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px h-4 bg-white/10 mx-0.5" />;
}

export default function FloatingToolbar(props: FloatingToolbarProps) {
  const {
    x,
    y,
    anchor,
    bold,
    italic,
    underline,
    strikethrough,
    superscript,
    subscript,
    textAlign,
    fontSize,
    color,
    listType,
    visible,
    onToggleBold,
    onToggleItalic,
    onToggleUnderline,
    onToggleStrikethrough,
    onToggleSuperscript,
    onToggleSubscript,
    onSetTextAlign,
    onChangeFontSize,
    onChangeColor,
    onSetListType,
  } = props;

  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const pickEyeDropper = useCallback(async () => {
    if (!hasEyeDropper) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      if (result?.sRGBHex) {
        onChangeColor(result.sRGBHex);
        setColorPickerOpen(false);
      }
    } catch {
      // User cancelled — silently ignore
    }
  }, [onChangeColor]);

  return (
    <div
      className={`absolute z-50 ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{
        left: x,
        top: y,
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease',
      }}
    >
      {/* Arrow pointing toward the text box (above = arrow at bottom, below = arrow at top) */}
      {anchor === 'below' && (
        <div className="flex justify-center -mb-px">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '6px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
      )}

      <div className="relative bg-[#001a24] border border-white/[0.1] rounded-lg shadow-xl backdrop-blur-sm px-1.5 py-1 flex items-center gap-0.5">
        {/* Bold / Italic / Underline / Strikethrough */}
        <ToolbarButton active={bold} onClick={onToggleBold} title="Bold">
          <Bold size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton active={italic} onClick={onToggleItalic} title="Italic">
          <Italic size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton active={underline} onClick={onToggleUnderline} title="Underline">
          <Underline size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton active={strikethrough} onClick={onToggleStrikethrough} title="Strikethrough">
          <Strikethrough size={ICON_SIZE} />
        </ToolbarButton>

        <Separator />

        {/* Text color */}
        <div className="relative">
          <button
            type="button"
            title="Text color"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setColorPickerOpen(!colorPickerOpen)}
            className="flex items-center justify-center w-6 h-6 rounded text-white/40 hover:text-white/70 transition-colors"
          >
            <div
              className="w-3.5 h-3.5 rounded-full border border-white/20"
              style={{ backgroundColor: color }}
            />
          </button>

          {/* Color palette popover */}
          {colorPickerOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 bg-[#001a24] border border-white/[0.1] rounded-lg shadow-xl p-2 z-10 space-y-1.5">
              <div className="grid grid-cols-3 gap-1">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    title={preset.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChangeColor(preset.value);
                      setColorPickerOpen(false);
                    }}
                    className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                      color === preset.value
                        ? 'border-[#14B8A6] ring-1 ring-[#14B8A6]'
                        : 'border-white/20'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
              </div>
              <div className="h-px bg-white/[0.08]" />
              <div className="flex items-center gap-1.5">
                {/* Custom color picker */}
                <label
                  className="w-5 h-5 rounded-full border border-white/20 cursor-pointer overflow-hidden flex-shrink-0"
                  style={{ backgroundColor: color }}
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={color}
                    onMouseDown={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      onChangeColor(e.target.value);
                    }}
                    className="opacity-0 w-0 h-0"
                  />
                </label>
                <span className="text-[9px] text-white/40 select-none">Custom</span>
                {/* Eyedropper */}
                {hasEyeDropper && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={pickEyeDropper}
                    className="ml-auto flex items-center justify-center w-5 h-5 rounded text-white/30 hover:text-white/70 transition-colors"
                    title="Pick color from screen"
                  >
                    <Pipette size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Font size -/+  */}
        <ToolbarButton active={false} onClick={() => onChangeFontSize(Math.max(1, fontSize - 1))} title="Decrease font size">
          <Minus size={ICON_SIZE} />
        </ToolbarButton>
        <span
          className="text-[10px] text-white/60 w-5 text-center select-none tabular-nums"
          onMouseDown={(e) => e.preventDefault()}
        >
          {fontSize}
        </span>
        <ToolbarButton active={false} onClick={() => onChangeFontSize(fontSize + 1)} title="Increase font size">
          <Plus size={ICON_SIZE} />
        </ToolbarButton>

        <Separator />

        {/* Text alignment */}
        <ToolbarButton active={textAlign === 'left'} onClick={() => onSetTextAlign('left')} title="Align left">
          <AlignLeft size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton active={textAlign === 'center'} onClick={() => onSetTextAlign('center')} title="Align center">
          <AlignCenter size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton active={textAlign === 'right'} onClick={() => onSetTextAlign('right')} title="Align right">
          <AlignRight size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton active={textAlign === 'justify'} onClick={() => onSetTextAlign('justify')} title="Justify">
          <AlignJustify size={ICON_SIZE} />
        </ToolbarButton>

        <Separator />

        {/* Superscript / Subscript */}
        <ToolbarButton active={superscript} onClick={onToggleSuperscript} title="Superscript">
          <Superscript size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton active={subscript} onClick={onToggleSubscript} title="Subscript">
          <Subscript size={ICON_SIZE} />
        </ToolbarButton>

        <Separator />

        {/* List types */}
        <ToolbarButton active={listType === 'bullet'} onClick={() => onSetListType(listType === 'bullet' ? 'none' : 'bullet')} title="Bullet list">
          <List size={ICON_SIZE} />
        </ToolbarButton>
        <ToolbarButton active={listType === 'numbered'} onClick={() => onSetListType(listType === 'numbered' ? 'none' : 'numbered')} title="Numbered list">
          <ListOrdered size={ICON_SIZE} />
        </ToolbarButton>
      </div>

      {/* Arrow pointing toward the text box (above = arrow at bottom) */}
      {anchor === 'above' && (
        <div className="flex justify-center -mt-px">
          <div
            className="w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
      )}
    </div>
  );
}
