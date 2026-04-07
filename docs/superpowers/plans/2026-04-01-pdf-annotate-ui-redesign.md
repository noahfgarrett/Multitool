# PDF Annotate UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve PDF Annotate discoverability and maximize canvas space by consolidating icon-only toolbar buttons into labeled dropdowns, making the tool sidebar collapsible with labels, removing duplicate page nav, and compacting the header.

**Architecture:** Five independent UI changes to `PdfAnnotateTool.tsx` and `Header.tsx`. Each task modifies a specific section of the render output. No new components — all changes are inline in existing files. State persistence uses `localStorage`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React icons

---

### Task 1: Compact Header — Hide Subtitle When Tool Active

**Files:**
- Modify: `src/components/layout/Header.tsx` (lines 25-31)

- [ ] **Step 1: Modify Header to hide subtitle when tool is active**

In `src/components/layout/Header.tsx`, change the `toolDef` branch (lines 25-31) to remove the subtitle paragraph. The title alone is sufficient — the sidebar already shows which tool is active.

Change:
```tsx
) : toolDef ? (
  <div className="flex-1 min-w-0">
    <h1 className="text-base font-display font-semibold text-white">
      {toolDef.label}
    </h1>
    <p className="text-xs text-white/50 -mt-0.5">{toolDef.description}</p>
  </div>
```

To:
```tsx
) : toolDef ? (
  <div className="flex-1 min-w-0 flex items-center">
    <h1 className="text-base font-display font-semibold text-white">
      {toolDef.label}
    </h1>
  </div>
```

Also reduce header height from `h-14` (56px) to `h-10` (40px) when a tool is active. Change line 17:

```tsx
<header className={`${toolDef || activeView === 'feedback' ? 'h-10' : 'h-14'} flex items-center px-6 border-b border-white/[0.06] bg-black/10`}>
```

- [ ] **Step 2: Verify build compiles**

Run: `cd ~/codebase/multitool && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Visual verification**

Open `http://localhost:5173`, navigate to PDF Annotate. Header should show just "PDF Annotate" in a 40px bar with no subtitle. Welcome screen should still show full height with subtitle.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: compact header — hide subtitle and reduce height when tool active"
```

---

### Task 2: Top Toolbar — "More" Dropdown

**Files:**
- Modify: `src/tools/pdf-annotate/PdfAnnotateTool.tsx` (lines 4617-4663 for the icon buttons, add dropdown state)

- [ ] **Step 1: Add dropdown state**

Near the existing state declarations (around line 230), add:

```tsx
const [moreMenuOpen, setMoreMenuOpen] = useState(false)
```

Add a click-outside handler ref near the other refs:

```tsx
const moreMenuRef = useRef<HTMLDivElement>(null)
```

In the existing `useEffect` that handles click-outside for other dropdowns, add `moreMenuRef` handling. OR add a dedicated effect:

```tsx
useEffect(() => {
  if (!moreMenuOpen) return
  const handler = (e: MouseEvent) => {
    if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
      setMoreMenuOpen(false)
    }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [moreMenuOpen])
```

- [ ] **Step 2: Add `MoreHorizontal` to lucide imports**

In the import block (line 16-26), add `MoreHorizontal` to the import:

```tsx
import {
  Download, RotateCcw, RotateCw, Undo2, Redo2,
  Eraser, Highlighter,
  ZoomIn, ZoomOut, Maximize, ChevronDown, ChevronLeft, ChevronRight, PanelLeft,
  X, Ruler, TextSelect, MousePointer2, Strikethrough, Paintbrush,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Superscript, Subscript, List, ListOrdered,
  Search, Crop, Tag, Printer, FileSpreadsheet, StickyNote as StickyNoteIcon,
  MessageCircle, Mail, FileText, ScanText, Layers, ImagePlus, Eye, EyeOff, Plus, Trash2,
  Copy, BookOpen, Blend, Star, MoreHorizontal,
} from 'lucide-react'
```

- [ ] **Step 3: Replace icon-only buttons with Find + More dropdown**

Find the toolbar section around lines 4617-4663 where the icon-only buttons are rendered. Replace the 6 individual buttons (Find, Annotation List, Markups, Bookmarks/Presets, Compare, Stamps) with:

1. **Find button** (labeled, stays visible):
```tsx
<button
  onClick={() => setFindOpen(!findOpen)}
  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
    findOpen ? 'bg-[#F47B20]/20 text-[#F47B20]' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
  }`}
  title="Find text (Ctrl+F)"
>
  <Search size={14} />
  <span>Find</span>
</button>
```

2. **"More" dropdown** replacing the remaining 5 buttons:
```tsx
<div className="relative" ref={moreMenuRef}>
  <button
    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
      moreMenuOpen ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
    }`}
    title="More tools"
  >
    <MoreHorizontal size={14} />
    <span>More</span>
    <ChevronDown size={12} className={`transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`} />
  </button>

  {moreMenuOpen && (
    <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a2d40] border border-white/[0.1] rounded-xl shadow-2xl py-1.5 z-50">
      {/* Lists group */}
      <button
        onClick={() => { setAnnListOpen(!annListOpen); setMoreMenuOpen(false) }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
      >
        <List size={15} className="text-white/40" />
        <span>Annotation List</span>
      </button>
      <button
        onClick={() => { setMarkupsListOpen(!markupsListOpen); setMoreMenuOpen(false) }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
      >
        <FileText size={15} className="text-white/40" />
        <span>Markups List</span>
      </button>

      <div className="h-px bg-white/[0.06] my-1 mx-3" />

      {/* Workflow group */}
      <button
        onClick={() => { setPresetsOpen(!presetsOpen); setMoreMenuOpen(false) }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
      >
        <Star size={15} className="text-white/40" />
        <span>Tool Presets</span>
      </button>
      <button
        onClick={() => { setCompareOpen(!compareOpen); setMoreMenuOpen(false) }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
      >
        <Blend size={15} className="text-white/40" />
        <span>Compare PDFs</span>
      </button>

      <div className="h-px bg-white/[0.06] my-1 mx-3" />

      {/* Library group */}
      <button
        onClick={() => { setStampLibraryOpen(!stampLibraryOpen); setMoreMenuOpen(false) }}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.06] transition-colors"
      >
        <BookOpen size={15} className="text-white/40" />
        <span>Stamp Library</span>
      </button>
    </div>
  )}
</div>
```

Remove the old individual icon buttons for these 5 features. Keep the `{/* Bookmarks */}` button only if it's a distinct feature from annotations — check if `bookmarksOpen` is used elsewhere. If it's just bookmarks, add it to the dropdown too.

- [ ] **Step 4: Verify build compiles**

Run: `cd ~/codebase/multitool && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Visual verification**

Open PDF Annotate, load a PDF. Verify:
- Find button visible with label
- "More" dropdown button visible
- Clicking More opens dropdown with 5 items grouped with dividers
- Clicking each item triggers the correct action and closes the dropdown
- Clicking outside closes the dropdown

- [ ] **Step 6: Commit**

```bash
git add src/tools/pdf-annotate/PdfAnnotateTool.tsx
git commit -m "feat: top toolbar 'More' dropdown — replace 5 icon-only buttons with labeled dropdown"
```

---

### Task 3: Right Sidebar — Collapsible Hybrid with Labels

**Files:**
- Modify: `src/tools/pdf-annotate/PdfAnnotateTool.tsx` (lines 5281-5522 for the tool strip)

- [ ] **Step 1: Add sidebar state with localStorage persistence**

Near the state declarations, add:

```tsx
const [toolbarExpanded, setToolbarExpanded] = useState(() => {
  const saved = localStorage.getItem('pdfAnnotate.toolbarExpanded')
  return saved !== null ? saved === 'true' : true  // default: expanded
})
const [moreToolsOpen, setMoreToolsOpen] = useState(false)
```

Add a persistence effect:

```tsx
useEffect(() => {
  localStorage.setItem('pdfAnnotate.toolbarExpanded', String(toolbarExpanded))
}, [toolbarExpanded])
```

- [ ] **Step 2: Restructure the right sidebar container**

Find the right sidebar `div` (around line 5281). It's currently a narrow `w-10` flex column. Replace the container with a width-transitioning wrapper:

```tsx
<div
  className={`border-l border-white/[0.06] flex flex-col items-center py-2 gap-0.5 overflow-y-auto overflow-x-hidden transition-all duration-200 ease-out ${
    toolbarExpanded ? 'w-[140px] px-1.5' : 'w-10 px-0.5'
  }`}
>
```

- [ ] **Step 3: Add collapse/expand toggle at top**

First element inside the sidebar:

```tsx
<button
  onClick={() => setToolbarExpanded(!toolbarExpanded)}
  className="w-full flex items-center justify-center py-1 mb-1 text-white/30 hover:text-white/60 transition-colors"
  title={toolbarExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
>
  {toolbarExpanded ? (
    <ChevronRight size={14} />
  ) : (
    <ChevronLeft size={14} />
  )}
</button>
<div className="w-full h-px bg-white/[0.06] mb-1" />
```

- [ ] **Step 4: Create a ToolButton helper for consistent rendering**

Add this above the return statement (or as a local component):

```tsx
const ToolBtn = ({ icon, label, shortcut, active, onClick, title, disabled }: {
  icon: React.ReactNode
  label: string
  shortcut?: string
  active?: boolean
  onClick: () => void
  title: string
  disabled?: boolean
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center rounded-lg transition-colors ${
      toolbarExpanded ? 'gap-2 px-2.5 py-2' : 'justify-center p-2'
    } ${
      active
        ? 'bg-[#F47B20]/15 border border-[#F47B20]/30 text-[#F47B20]'
        : disabled
        ? 'text-white/20 cursor-default'
        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
    }`}
    title={title}
  >
    {icon}
    {toolbarExpanded && (
      <>
        <span className="text-xs truncate">{label}</span>
        {shortcut && <span className="ml-auto text-[10px] text-white/25">{shortcut}</span>}
      </>
    )}
  </button>
)
```

- [ ] **Step 5: Replace individual tool buttons with ToolBtn + grouping**

Replace each tool button in the sidebar (lines 5284-5522) using `ToolBtn`. Group them with dividers. The primary tools are always visible, secondary tools go behind the "More tools" expander:

**Primary tools (always visible):**
```tsx
<ToolBtn icon={<MousePointer2 size={15} />} label="Select" shortcut="S" active={activeTool === 'select'} onClick={() => setActiveTool('select')} title="Select (S)" />
```
Repeat for: Pencil (Shapes dropdown trigger), Highlight, Strikethrough, Text (Text dropdown trigger), Eraser, Measure.

Note: Shapes and Text are dropdowns. When expanded, clicking them should open their sub-menu. Use the existing dropdown state (`shapesDropdownOpen`, `textDropdownOpen`). The dropdown panels position to the left of the sidebar (already the current behavior).

**Divider:**
```tsx
<div className="w-full h-px bg-white/[0.06] my-1" />
```

**"More tools" expander:**
```tsx
<button
  onClick={() => setMoreToolsOpen(!moreToolsOpen)}
  className={`w-full flex items-center rounded-lg transition-colors ${
    toolbarExpanded ? 'gap-2 px-2.5 py-1.5' : 'justify-center p-2'
  } text-white/30 hover:text-white/50 border border-dashed border-white/[0.08]`}
  title="More tools"
>
  <MoreHorizontal size={14} />
  {toolbarExpanded && (
    <>
      <span className="text-xs">More tools</span>
      <ChevronDown size={12} className={`ml-auto transition-transform ${moreToolsOpen ? 'rotate-180' : ''}`} />
    </>
  )}
</button>
```

**Secondary tools (inside moreToolsOpen):**
```tsx
{moreToolsOpen && (
  <>
    <ToolBtn icon={<Tag size={15} />} label="Stamp" active={activeTool === 'stamp'} onClick={() => ...} title="Stamp" />
    <ToolBtn icon={<Crop size={15} />} label="Crop" active={activeTool === 'crop'} onClick={() => ...} title="Crop page" />
    <ToolBtn icon={<ImagePlus size={15} />} label="Image Stamp" shortcut="I" active={activeTool === 'imageStamp'} onClick={() => ...} title="Image Stamp (I)" />
    <ToolBtn icon={<ScanText size={15} />} label="OCR Scan" active={activeTool === 'ocrRegion'} onClick={() => ...} title="OCR Region Scan" />
    <ToolBtn icon={<StickyNoteIcon size={15} />} label="Sticky Note" shortcut="N" active={activeTool === 'stickyNote'} onClick={() => ...} title="Sticky Note (N)" />
  </>
)}
```

**Divider, then Layers + Comments:**
```tsx
<div className="w-full h-px bg-white/[0.06] my-1" />
<ToolBtn icon={<Layers size={15} />} label="Layers" active={layersPanelOpen} onClick={() => setLayersPanelOpen(!layersPanelOpen)} title="Layers" />
<ToolBtn icon={<MessageCircle size={15} />} label="Comments" active={commentsPanelOpen} onClick={() => setCommentsPanelOpen(!commentsPanelOpen)} title="Comments panel" />
```

**Divider, then Undo/Redo/Rotate pinned at bottom:**
```tsx
<div className="w-full h-px bg-white/[0.06] my-1" />
<div className={`flex ${toolbarExpanded ? 'gap-1 justify-center' : 'flex-col gap-0.5'}`}>
  <button onClick={undo} disabled={!canUndo} className="p-1.5 rounded text-white/30 hover:text-white/60 disabled:text-white/10" title="Undo (Ctrl+Z)">
    <Undo2 size={14} />
  </button>
  <button onClick={redo} disabled={!canRedo} className="p-1.5 rounded text-white/30 hover:text-white/60 disabled:text-white/10" title="Redo (Ctrl+Shift+Z)">
    <Redo2 size={14} />
  </button>
  <button onClick={() => rotatePage(-90)} className="p-1.5 rounded text-white/30 hover:text-white/60" title="Rotate CCW">
    <RotateCcw size={14} />
  </button>
  <button onClick={() => rotatePage(90)} className="p-1.5 rounded text-white/30 hover:text-white/60" title="Rotate CW">
    <RotateCw size={14} />
  </button>
</div>
```

- [ ] **Step 6: Verify build compiles**

Run: `cd ~/codebase/multitool && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 7: Visual verification**

Verify:
- Sidebar renders expanded with labels by default
- Toggle button collapses to icon-only strip
- Collapsed state shows tooltips on hover
- "More tools" expander shows/hides secondary tools
- Active tool highlighting works in both states
- Dropdown sub-menus (Shapes, Text, Measure) still work
- State persists on page reload (localStorage)
- Smooth width transition on toggle

- [ ] **Step 8: Commit**

```bash
git add src/tools/pdf-annotate/PdfAnnotateTool.tsx
git commit -m "feat: collapsible right sidebar — expanded with labels by default, collapse to icons"
```

---

### Task 4: Remove Duplicate Page Navigation from Bottom Bar

**Files:**
- Modify: `src/tools/pdf-annotate/PdfAnnotateTool.tsx` (lines 5802-5833 for bottom bar center section)

- [ ] **Step 1: Remove the center page navigation from the bottom bar**

Find the bottom bar's center section (lines 5802-5833) which contains prev/next buttons and page input. Remove the entire center `div` or replace it with an empty spacer.

The bottom bar is a 3-column grid. Change the center column to empty or remove it and switch to a 2-column layout (file info left, annotation count right):

Change the bottom bar container from `grid-cols-3` to `flex justify-between`:

```tsx
<div className="h-8 border-t border-white/[0.06] flex items-center justify-between px-4 text-xs text-white/40 bg-black/20 shrink-0">
  {/* Left: file info */}
  <div className="flex items-center gap-2">
    <span className="truncate max-w-[200px]">{pdfFile.name}</span>
    <span>{formatFileSize(pdfFile.size)}</span>
    {currentRotation !== 0 && <span className="text-white/25">{currentRotation}°</span>}
  </div>
  {/* Right: annotation count + hint */}
  <div className="flex items-center gap-2">
    <span>{annotationCount} ann</span>
    {measurementCount > 0 && <span>· {measurementCount} meas</span>}
    <span className="text-white/25">· {contextHint}</span>
  </div>
</div>
```

Adapt the variable names to match the actual code — read the existing bottom bar JSX to get exact variable names for annotation count, measurement count, file size formatting, etc.

- [ ] **Step 2: Verify build compiles**

Run: `cd ~/codebase/multitool && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Visual verification**

Open PDF Annotate with a loaded PDF. Bottom bar should show:
- Left: filename, size, rotation (if any)
- Right: annotation count, measurement count, context hint
- NO page navigation (prev/next/input) — that's only in the top toolbar now

- [ ] **Step 4: Commit**

```bash
git add src/tools/pdf-annotate/PdfAnnotateTool.tsx
git commit -m "feat: remove duplicate page nav from bottom bar — top toolbar is the single source"
```

---

### Task 5: Integration Testing & Polish

**Files:**
- All modified files from Tasks 1-4

- [ ] **Step 1: Run full type check**

Run: `cd ~/codebase/multitool && npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run existing PDF Annotate e2e tests**

Run a subset to verify nothing is broken:
```bash
cd ~/codebase/multitool && npx playwright test e2e/documents/pdf-annotate/01-file-handling.spec.ts --workers=1 --reporter=line
```
Expected: All tests pass. If selectors broke due to DOM changes, fix them.

- [ ] **Step 3: Test the full workflow manually via Playwright MCP**

Using the Playwright MCP browser:
1. Navigate to `http://localhost:5173`
2. Open PDF Annotate, upload a PDF
3. Verify compact header (no subtitle, shorter height)
4. Click "More" dropdown, verify all 5 items work
5. Expand/collapse right sidebar, verify labels appear/disappear
6. Use "More tools" expander, verify secondary tools appear
7. Draw with a tool, verify active state highlighting in both sidebar modes
8. Check bottom bar has no page nav
9. Take screenshots for visual verification

- [ ] **Step 4: Commit any test fixes**

```bash
git add -A
git commit -m "fix: update e2e selectors for toolbar UI redesign"
```

- [ ] **Step 5: Final commit with all polish**

```bash
git add -A
git commit -m "feat: PDF Annotate UI redesign — compact header, More dropdown, collapsible sidebar, simplified bottom bar"
```
