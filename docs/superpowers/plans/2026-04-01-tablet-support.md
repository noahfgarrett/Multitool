# Tablet Support + Full-Screen Annotation Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all 15 tools functional on iPad/Android tablets, add full-screen annotation mode with slide-out tool drawer.

**Architecture:** Three independent phases: (1) Fix broken tools by migrating mouse→pointer events, (2) Global touch polish via CSS media queries, (3) Full-screen focus mode with slide-out drawer. All changes use feature detection — zero impact on desktop.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Pointer Events API, CSS media queries (`any-pointer: coarse`, `hover: none`), dnd-kit TouchSensor

---

## PHASE 1: Fix Broken Tools

*Checkpoint: After Phase 1, all 15 tools are functional on touch devices.*

---

### Task 1: Flowchart Canvas — Mouse to Pointer Migration

**Files:**
- Modify: `src/tools/flowchart/Canvas.tsx` (lines 1155-1166)

- [ ] **Step 1: Migrate SVG event handlers from mouse to pointer**

In `src/tools/flowchart/Canvas.tsx`, find the SVG element at ~line 1163. Replace:
- `onMouseDown` → `onPointerDown`
- `onMouseMove` → `onPointerMove`
- `onMouseUp` → `onPointerUp`
- `onMouseLeave` → `onPointerLeave`

Add to the SVG element:
```tsx
style={{ touchAction: 'none' }}
```

- [ ] **Step 2: Add pointer capture to the pointerdown handler**

Find the function that `onMouseDown` currently calls (follow the reference). At the start of that handler, add:
```typescript
(e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId)
```

This ensures dragging works even if the pointer moves outside the SVG bounds.

- [ ] **Step 3: Add multi-touch pan detection**

Add a ref to track active pointers:
```typescript
const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
```

In the pointerdown handler, track the pointer:
```typescript
activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
if (activePointersRef.current.size >= 2) {
  // Switch to pan mode — cancel any active shape interaction
  return
}
```

In pointerup/pointerleave, remove:
```typescript
activePointersRef.current.delete(e.pointerId)
```

In pointermove, if 2+ pointers active, calculate pan delta from the average pointer movement and apply to viewport offset. If single pointer, use existing logic.

- [ ] **Step 4: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: flowchart canvas — migrate mouse to pointer events for tablet touch support"`

---

### Task 2: Flowchart Minimap — Mouse to Pointer Migration

**Files:**
- Modify: `src/tools/flowchart/Minimap.tsx` (lines 209-212)

- [ ] **Step 1: Migrate minimap event handlers**

Same pattern as Task 1. Replace `onMouseDown/Move/Up/Leave` with `onPointerDown/Move/Up/Leave` on the container div at ~line 209. Add `style={{ touchAction: 'none' }}`.

- [ ] **Step 2: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: flowchart minimap — pointer events for touch support"`

---

### Task 3: Flowchart Shape Library — Click-to-Place on Touch

**Files:**
- Modify: `src/tools/flowchart/ShapeLibrary.tsx` (lines 122-123)
- Modify: `src/tools/flowchart/Canvas.tsx` (lines 1155-1156)
- Modify: `src/tools/flowchart/flowchartStore.ts` (add pendingShape state)

- [ ] **Step 1: Add pendingShape state to flowchart store**

In `src/tools/flowchart/flowchartStore.ts`, add:
```typescript
pendingShape: string | null
setPendingShape: (shape: string | null) => void
```

And in the store implementation:
```typescript
pendingShape: null,
setPendingShape: (shape) => set({ pendingShape: shape }),
```

- [ ] **Step 2: Detect touch device**

In `ShapeLibrary.tsx`, add at component level:
```typescript
const isTouchDevice = typeof window !== 'undefined' && matchMedia('(any-pointer: coarse)').matches
```

- [ ] **Step 3: Modify shape palette buttons**

At ~line 122-123, the buttons have `draggable` and `onDragStart`. Make these conditional:
```tsx
<button
  draggable={!isTouchDevice}
  onDragStart={!isTouchDevice ? handleDragStart : undefined}
  onClick={isTouchDevice ? () => setPendingShape(shape.type) : undefined}
  // ... existing className and children
>
```

When a shape is selected in placement mode, add a visual indicator (orange ring on the selected shape button).

- [ ] **Step 4: Add click-to-place handler on Canvas**

In `Canvas.tsx`, in the SVG's pointerdown handler, check for pending shape:
```typescript
const pendingShape = store.pendingShape
if (pendingShape && isTouchDevice) {
  // Place the shape at the click position
  const point = screenToCanvas(e.clientX, e.clientY)
  store.addNode({ type: pendingShape, x: point.x, y: point.y })
  store.setPendingShape(null)
  return
}
```

Also add Escape key handler to cancel placement mode:
```typescript
useEffect(() => {
  if (!store.pendingShape) return
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') store.setPendingShape(null)
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}, [store.pendingShape])
```

- [ ] **Step 5: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: flowchart shape library — click-to-place on touch devices"`

---

### Task 4: Org Chart Canvas — Mouse to Pointer Migration + Zoom Buttons

**Files:**
- Modify: `src/tools/org-chart/Canvas.tsx` (lines 584-588)
- Modify: `src/tools/org-chart/OrgChartTool.tsx` (add zoom buttons to toolbar)

- [ ] **Step 1: Migrate canvas event handlers**

In `Canvas.tsx` at ~line 584, replace:
- `onMouseDown` → `onPointerDown`
- `onMouseMove` → `onPointerMove`
- `onMouseUp` → `onPointerUp`
- `onMouseLeave` → `onPointerLeave`

Add `style={{ touchAction: 'none' }}` to the canvas element. Add `setPointerCapture` in the pointerdown handler.

- [ ] **Step 2: Add multi-touch pan detection**

Same pattern as Flowchart Task 1 Step 3. Track active pointers, 2+ pointers = pan mode.

- [ ] **Step 3: Add zoom buttons to Org Chart toolbar**

In `OrgChartTool.tsx`, find the toolbar area. Add zoom buttons:
```tsx
<button onClick={() => setZoom(z => Math.min(2, z + 0.25))} title="Zoom in" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
  <ZoomIn size={16} />
</button>
<button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} title="Zoom out" className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06]">
  <ZoomOut size={16} />
</button>
<button onClick={() => setZoom(1)} title="Reset zoom" className="text-xs text-white/40 hover:text-white/80 px-1.5 rounded hover:bg-white/[0.06]">
  {Math.round(zoom * 100)}%
</button>
```

Import `ZoomIn`, `ZoomOut` from lucide-react if not already imported.

- [ ] **Step 4: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: org chart — pointer events, multi-touch pan, zoom buttons"`

---

### Task 5: PDF Split Page Painting — Mouse to Pointer Migration

**Files:**
- Modify: `src/tools/pdf-split/PdfSplitTool.tsx` (lines 128-129, 467, 883-884)

- [ ] **Step 1: Replace mouse event handlers on page thumbnails**

At ~lines 128-129 (`SourcePageItem` component), replace:
- `onMouseDown` → `onPointerDown`
- `onMouseEnter` → remove (touch can't hover)

In the pointerdown handler, add `setPointerCapture(e.pointerId)` so pointermove events fire on adjacent thumbnails during drag.

- [ ] **Step 2: Add pointermove handler for paint-to-assign**

Replace the `onMouseEnter`-while-dragging pattern with `onPointerMove` on the thumbnail container:
```typescript
onPointerMove={(e) => {
  if (!isPainting) return
  // Find which thumbnail the pointer is over using elementFromPoint
  const el = document.elementFromPoint(e.clientX, e.clientY)
  const pageEl = el?.closest('[data-page-num]')
  if (pageEl) {
    const pageNum = Number(pageEl.getAttribute('data-page-num'))
    assignPageToGroup(pageNum, activeGroup)
  }
}}
```

Add `data-page-num={pageNum}` attribute to each thumbnail wrapper for detection.

- [ ] **Step 3: Replace global mouseup with pointerup**

At ~line 467, replace:
```typescript
window.addEventListener('mouseup', handleMouseUp)
```
with:
```typescript
window.addEventListener('pointerup', handleMouseUp)
```

And the corresponding removeEventListener.

- [ ] **Step 4: Add touch-action during painting**

When painting starts, set `touch-action: none` on the thumbnail container. When painting ends, restore it.

- [ ] **Step 5: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: pdf split — pointer events for touch page painting"`

---

### Task 6: Form Builder Canvas — Add touch-action

**Files:**
- Modify: `src/tools/form-creator/FormCanvas.tsx` (line 475)

- [ ] **Step 1: Add touch-action: none to canvas container**

At ~line 475, add `style={{ touchAction: 'none' }}` to the container div that has `ref={containerRef}`.

- [ ] **Step 2: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: form builder — add touch-action none for tablet support"`

---

## PHASE 1 CHECKPOINT

*All 15 tools are now functional on touch devices. Run `npx tsc --noEmit` to verify full build. Manual test on iPad/Android if available.*

---

## PHASE 2: Global Touch Polish

*Checkpoint: After Phase 2, the app feels native on tablets — proper touch targets, visible buttons, responsive layout.*

---

### Task 7: Global Touch Target CSS

**Files:**
- Modify: `src/index.css` (or equivalent global stylesheet)

- [ ] **Step 1: Add coarse-pointer media query for touch targets**

Add to the global stylesheet:
```css
@media (any-pointer: coarse) {
  /* Enlarge small toolbar buttons for touch */
  button.p-1 { padding: 0.5rem; }      /* 4px → 8px, icon 14px → 30px total */
  button.p-1\.5 { padding: 0.625rem; }  /* 6px → 10px, icon 16px → 36px total */

  /* Ensure minimum touch target */
  [role="button"], button {
    min-height: 2.5rem; /* 40px — close to Apple's 44pt minimum */
  }
}
```

Note: This is intentionally conservative (40px not 44px) to avoid breaking layouts. The padding increase gets most buttons close enough.

- [ ] **Step 2: Verify desktop is unaffected**

Open the app on desktop — verify toolbar buttons look identical (media query should not fire on desktop with mouse pointer).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: global touch targets — enlarge buttons on coarse pointer devices"
```

---

### Task 8: Hover-Hidden Buttons — Touch Visibility

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add hover:none media query**

Add to global stylesheet:
```css
@media (hover: none) {
  /* Make hover-hidden action buttons visible on touch devices */
  .group:hover .group-hover\:opacity-100 { opacity: 0.7; }
  [class*="group-hover\:opacity-100"] { opacity: 0.7; }
  [class*="group-hover\:text-white"] { color: rgba(255, 255, 255, 0.5); }

  /* group-hover patterns with /0 text color */
  [class*="group-hover\:text-white\\/70"] { color: rgba(255, 255, 255, 0.5); }
  [class*="group-hover\:text-white\\/40"] { color: rgba(255, 255, 255, 0.3); }
}
```

This single CSS block fixes all 10+ instances: PDF Merge page actions, annotation list delete, presets delete, PDF Split chip remove, Dashboard actions, Stamp Library delete, TOC Editor pencil, changelog type labels.

- [ ] **Step 2: Verify on desktop**

Desktop with mouse should show no change — `hover: none` only matches touch-only devices.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: hover-hidden buttons visible on touch devices via hover:none media query"
```

---

### Task 9: Sidebar Auto-Collapse on Narrow Viewports

**Files:**
- Modify: `src/stores/appStore.ts` (line 35)

- [ ] **Step 1: Change initial sidebarExpanded value**

At line 35, change:
```typescript
sidebarExpanded: true,
```
to:
```typescript
sidebarExpanded: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
```

This makes the sidebar start collapsed on tablets (< 1024px) and expanded on desktop. User can still toggle manually.

- [ ] **Step 2: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: sidebar auto-collapses on viewports under 1024px"`

---

### Task 10: dnd-kit TouchSensor Configuration

**Files:**
- Modify: `src/tools/pdf-merge/PdfMergeTool.tsx` (lines 302, 330)
- Modify: `src/tools/pdf-merge/TocEditorModal.tsx` (lines 272-274)

- [ ] **Step 1: Add TouchSensor to PDF Merge file sensors**

At ~line 302 in `PdfMergeTool.tsx`, update the imports and sensor config:

Add to imports:
```typescript
import { PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
```

Replace the `fileSensors` useSensors call:
```typescript
const fileSensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
)
```

- [ ] **Step 2: Add TouchSensor to PDF Merge page sensors**

At ~line 330, same pattern:
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
)
```

- [ ] **Step 3: Add TouchSensor to TOC Editor**

At ~line 272 in `TocEditorModal.tsx`, same pattern:
```typescript
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
)
```

Import `TouchSensor` from `@dnd-kit/core`.

- [ ] **Step 4: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: add dnd-kit TouchSensor to prevent accidental drags on touch"`

---

## PHASE 2 CHECKPOINT

*App feels native on tablets. Touch targets are 40px+, hover-hidden buttons visible, sidebar auto-collapses, drag-and-drop respects touch scrolling.*

---

## PHASE 3: Full-Screen Annotation Mode + Slide-Out Drawer

*Checkpoint: After Phase 3, PDF Annotate has a dedicated tablet annotation experience.*

---

### Task 11: Add focusMode to App Store

**Files:**
- Modify: `src/stores/appStore.ts`

- [ ] **Step 1: Add focusMode state**

Add to the AppState interface:
```typescript
focusMode: boolean
setFocusMode: (focus: boolean) => void
```

Add to the store implementation:
```typescript
focusMode: false,
setFocusMode: (focus) => set({ focusMode: focus }),
```

- [ ] **Step 2: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: add focusMode state to app store"`

---

### Task 12: AppShell — Conditionally Hide Sidebar and Header in Focus Mode

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Read focusMode from store and conditionally render**

```typescript
import { useAppStore } from '@/stores/appStore.ts'

export function AppShell({ children }: AppShellProps) {
  const focusMode = useAppStore((s) => s.focusMode)

  return (
    <div className="flex h-full w-full">
      <ShootingStars />
      {!focusMode && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        {!focusMode && <Header />}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>
      </div>
      <Toast />
    </div>
  )
}
```

- [ ] **Step 2: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: AppShell hides sidebar and header in focus mode"`

---

### Task 13: PDF Annotate — Focus Mode Toggle Button + Logic

**Files:**
- Modify: `src/tools/pdf-annotate/PdfAnnotateTool.tsx`

- [ ] **Step 1: Add focus mode imports and state**

Add `Maximize2, Minimize2` to lucide-react imports. Add store access:
```typescript
const focusMode = useAppStore((s) => s.focusMode)
const setFocusMode = useAppStore((s) => s.setFocusMode)
```

- [ ] **Step 2: Add Focus button to top toolbar**

In the top toolbar, after the Fit to Window button (after ~line 4618) and before the page jump input, add:
```tsx
<button
  onClick={() => {
    const next = !focusMode
    setFocusMode(next)
    if (next && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else if (!next && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }}
  title={focusMode ? 'Exit focus mode' : 'Focus mode'}
  className={`p-1 rounded-lg transition-colors ${
    focusMode ? 'bg-[#F47B20]/15 text-[#F47B20] ring-1 ring-inset ring-[#F47B20]/30' : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
  }`}
>
  {focusMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
</button>
```

- [ ] **Step 3: Add Exit Focus button in top-left when in focus mode**

When `focusMode` is true, add a small button in the top-left of the toolbar (where the sidebar used to be):
```tsx
{focusMode && (
  <button
    onClick={() => { setFocusMode(false); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }}
    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.06] mr-2"
    title="Exit focus mode"
  >
    <Minimize2 size={12} />
    <span>Exit Focus</span>
  </button>
)}
```

- [ ] **Step 4: Hide bottom status bar in focus mode**

Find the bottom status bar (the `<div>` with `border-t` at the bottom). Wrap it:
```tsx
{!focusMode && (
  <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/[0.06] flex-shrink-0">
    ...
  </div>
)}
```

- [ ] **Step 5: Listen for fullscreen exit**

If the user presses Escape to exit browser fullscreen, sync focusMode:
```typescript
useEffect(() => {
  const handler = () => {
    if (!document.fullscreenElement && focusMode) {
      setFocusMode(false)
    }
  }
  document.addEventListener('fullscreenchange', handler)
  return () => document.removeEventListener('fullscreenchange', handler)
}, [focusMode, setFocusMode])
```

- [ ] **Step 6: Add keyboard shortcut**

In the existing keyboard shortcut handler, add `Shift+F` for focus toggle:
```typescript
if (e.shiftKey && e.key === 'F') {
  e.preventDefault()
  setFocusMode(!focusMode)
}
```

- [ ] **Step 7: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: PDF Annotate focus mode — full-screen annotation with keyboard shortcut"`

---

### Task 14: Slide-Out Tool Drawer for Tablet Focus Mode

**Files:**
- Modify: `src/tools/pdf-annotate/PdfAnnotateTool.tsx`

- [ ] **Step 1: Add drawer state**

```typescript
const isTouchDevice = typeof window !== 'undefined' && matchMedia('(any-pointer: coarse)').matches
const [drawerOpen, setDrawerOpen] = useState(false)
const [drawerPinned, setDrawerPinned] = useState(() => {
  return localStorage.getItem('pdfAnnotate.drawerPinned') === 'true'
})

useEffect(() => {
  localStorage.setItem('pdfAnnotate.drawerPinned', String(drawerPinned))
}, [drawerPinned])
```

- [ ] **Step 2: Conditionally render sidebar vs drawer**

Find the right tool sidebar container. Wrap the rendering decision:

```tsx
{/* Right tool panel — sidebar on desktop, drawer on tablet focus mode */}
{focusMode && isTouchDevice ? (
  <>
    {/* Handle tab — always visible at right edge */}
    <button
      onClick={() => setDrawerOpen(true)}
      className="fixed right-0 top-1/2 -translate-y-1/2 z-40 w-6 h-20 bg-white/10 hover:bg-white/20 rounded-l-lg flex items-center justify-center transition-colors"
      style={{ display: drawerOpen ? 'none' : 'flex' }}
      title="Open tools"
    >
      <ChevronsLeft size={14} className="text-white/50" />
    </button>

    {/* Backdrop */}
    {drawerOpen && !drawerPinned && (
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={() => setDrawerOpen(false)}
      />
    )}

    {/* Drawer */}
    <div className={`fixed top-0 right-0 h-full w-[200px] bg-[#0a1929] border-l border-white/[0.06] z-50 transform transition-transform duration-200 ease-out ${
      drawerOpen ? 'translate-x-0' : 'translate-x-full'
    } flex flex-col py-2 px-1.5 overflow-y-auto`}>
      {/* Drawer header with pin toggle and close */}
      <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-white/[0.06]">
        <span className="text-xs text-white/40 font-medium">Tools</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDrawerPinned(p => !p)}
            className={`p-1 rounded text-white/30 hover:text-white/60 ${drawerPinned ? 'text-[#F47B20]' : ''}`}
            title={drawerPinned ? 'Unpin drawer' : 'Pin drawer open'}
          >
            <Pin size={12} className={drawerPinned ? 'text-[#F47B20]' : ''} />
          </button>
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-1 rounded text-white/30 hover:text-white/60"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Tool buttons — same as expanded sidebar, always show labels */}
      {/* Render all the ToolBtn buttons here in expanded mode */}
      {/* When a tool is clicked: set the active tool AND auto-close if not pinned */}
    </div>
  </>
) : (
  // Normal sidebar (existing code — the collapsible w-[140px] / w-10 sidebar)
  <div className={`border-l border-white/[0.06] bg-black/20 flex flex-col py-2 gap-0.5 flex-shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-200 ease-out ${
    toolbarExpanded ? 'w-[140px] px-1.5 items-stretch' : 'w-10 px-0.5 items-center'
  }`}>
    {/* ... existing sidebar content ... */}
  </div>
)}
```

- [ ] **Step 3: Add Pin icon to lucide imports**

Add `Pin` to the lucide-react import line.

- [ ] **Step 4: Wire tool selection to auto-close drawer**

For each tool button rendered inside the drawer, wrap the onClick:
```typescript
const handleDrawerToolClick = (toolAction: () => void) => {
  toolAction()
  if (!drawerPinned) setDrawerOpen(false)
}
```

Apply this wrapper to every tool button's onClick in the drawer.

- [ ] **Step 5: Add edge-swipe detection**

On the main canvas area, detect swipe from right edge:
```typescript
const swipeStartRef = useRef<{ x: number; y: number } | null>(null)

// On the canvas container:
onPointerDown={(e) => {
  // Only detect edge swipes when in focus mode on touch
  if (focusMode && isTouchDevice && e.clientX > window.innerWidth - 24) {
    swipeStartRef.current = { x: e.clientX, y: e.clientY }
  }
  // ... existing pointerdown logic
}}
onPointerMove={(e) => {
  if (swipeStartRef.current) {
    const dx = swipeStartRef.current.x - e.clientX
    if (dx > 50) {
      setDrawerOpen(true)
      swipeStartRef.current = null
    }
  }
  // ... existing pointermove logic
}}
onPointerUp={() => {
  swipeStartRef.current = null
  // ... existing pointerup logic
}}
```

- [ ] **Step 6: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: slide-out tool drawer for tablet focus mode"`

---

### Task 15: Phase 3 Extras — getCoalescedEvents + Pinch-to-Zoom

**Files:**
- Modify: `src/tools/pdf-annotate/PdfAnnotateTool.tsx`

- [ ] **Step 1: Add getCoalescedEvents for smoother Apple Pencil strokes**

In the `handlePointerMove` function, replace the single-point processing with coalesced points:
```typescript
const coalescedEvents = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent as PointerEvent]
for (const ce of coalescedEvents) {
  const point = getPointFromEvent(ce, pageNum)
  // Process point (add to current path, store pressure)
  currentPtsRef.current.push(point)
  currentPressureRef.current.push(ce.pressure ?? 0.5)
}
```

This is feature-detected — falls back to single event if `getCoalescedEvents` isn't available (older browsers).

- [ ] **Step 2: Enhance multi-touch to support pinch-to-zoom**

In the existing multi-touch detection code (where 2+ active pointers trigger pan), add zoom calculation:

```typescript
if (activePointersRef.current.size === 2) {
  const [p1, p2] = Array.from(activePointersRef.current.values())
  const prevDist = prevPinchDistRef.current
  const currDist = Math.hypot(p2.x - p1.x, p2.y - p1.y)

  if (prevDist !== null) {
    const delta = currDist - prevDist
    if (Math.abs(delta) > 2) {
      // Pinch zoom
      const zoomDelta = delta > 0 ? 0.02 : -0.02
      zoomAtCenter(Math.max(0.25, Math.min(4, zoom + zoomDelta)))
    }
  }
  prevPinchDistRef.current = currDist

  // Also pan from average pointer movement
  // ... existing pan logic
}
```

Add `prevPinchDistRef`:
```typescript
const prevPinchDistRef = useRef<number | null>(null)
```

Reset on pointerup when pointers drop below 2:
```typescript
if (activePointersRef.current.size < 2) {
  prevPinchDistRef.current = null
}
```

- [ ] **Step 3: Verify build and commit**

Run: `npx tsc --noEmit`
Commit: `git commit -m "feat: getCoalescedEvents for smooth Apple Pencil + pinch-to-zoom on canvas"`

---

### Task 16: Integration Testing & Polish

**Files:**
- All modified files

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run existing e2e tests**

```bash
npx playwright test e2e/documents/pdf-annotate/01-file-handling.spec.ts --workers=1 --reporter=line
```

Pointer events are a superset of mouse events — existing tests should pass. Fix any broken selectors.

- [ ] **Step 3: Visual verification on desktop**

Open the app in Chrome desktop. Verify:
- All tools look and behave identically to before
- Focus mode button visible in PDF Annotate toolbar
- Focus mode works: hides sidebar + header, shows Exit Focus button
- Shift+F shortcut works
- ESC exits browser fullscreen and syncs focus mode state

- [ ] **Step 4: Manual tablet testing (if available)**

On iPad Safari or Android Chrome:
- Touch works on Flowchart, Org Chart, PDF Split
- Touch targets are large enough
- Hover-hidden buttons are visible
- Sidebar starts collapsed
- dnd-kit drag-and-drop works without accidental drags
- PDF Annotate focus mode: canvas fills screen
- Slide-out drawer: handle visible, tap to open, tap tool to select + auto-close
- Pin toggle keeps drawer open
- Apple Pencil: pressure-sensitive strokes, smooth curves

- [ ] **Step 5: Final commit**

```bash
git commit -m "feat: tablet support — all 3 phases complete, 15 tools touch-compatible"
```
