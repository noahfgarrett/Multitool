# Tablet Support + Full-Screen Annotation Mode — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Goal:** Make all 15 tools functional on iPad/Android tablets with touch and stylus support, add a full-screen annotation mode with a slide-out tool drawer for tablet use.

## Approach

All changes use **feature detection** — CSS media queries (`any-pointer: coarse`, `hover: none`) and Pointer Events. Desktop users see zero changes. No "tablet mode" toggle; it just works.

---

## Phase 1: Fix Broken Tools

Three tools use mouse-only event handlers and are completely broken on touch. One tool is missing `touch-action`.

### Flowchart Canvas (`src/tools/flowchart/Canvas.tsx`)
- Migrate `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave` to `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerLeave` on the SVG element (~line 1163)
- Add `style={{ touchAction: 'none' }}` to the SVG
- Add `setPointerCapture(e.pointerId)` in the pointer-down handler for reliable drag
- Add multi-touch detection: if 2+ pointers active, switch to pan mode (same pattern as PDF Annotate)

### Flowchart Minimap (`src/tools/flowchart/Minimap.tsx`)
- Same migration: `onMouse*` → `onPointer*` (~line 209)
- Add `touch-action: none`

### Flowchart Shape Library (`src/tools/flowchart/ShapeLibrary.tsx`)
- Currently uses HTML5 `draggable` + `onDragStart` which doesn't work on touch
- On touch devices (`@media (any-pointer: coarse)`): replace drag with **click-to-place**
  - Tapping a shape in the palette enters "placement mode"
  - Cursor/visual indicator shows the selected shape
  - Tapping on the canvas places it at that location
  - Escape or tapping another shape cancels
- On desktop: keep existing drag behavior (no change)
- Detection: `const isTouchDevice = matchMedia('(any-pointer: coarse)').matches`

### Flowchart Canvas Drop Handler (`src/tools/flowchart/Canvas.tsx`)
- `onDragOver`/`onDrop` (~line 1155) stay for desktop
- Add corresponding `onClick` handler that places the shape at click position when in placement mode
- Placement mode state: `const [pendingShape, setPendingShape] = useState<string | null>(null)`

### Org Chart Canvas (`src/tools/org-chart/Canvas.tsx`)
- Migrate `onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave` to `onPointer*` (~line 584)
- Add `style={{ touchAction: 'none' }}` on the canvas element
- Add `setPointerCapture` in pointer-down
- Add multi-touch pan detection (same pattern as PDF Annotate)
- Add zoom buttons to the toolbar (currently wheel-only — `onWheel` at line 588). Buttons for Zoom In, Zoom Out, Fit, placed in the Org Chart toolbar area

### PDF Split Page Painting (`src/tools/pdf-split/PdfSplitTool.tsx`)
- Replace `onMouseDown` + `onMouseEnter` paint-to-assign (~lines 128-129, 883-884) with `onPointerDown` + `onPointerMove` with pointer capture
- The current pattern detects hovering over page thumbnails while mouse-button is held. On touch, this becomes: pointer-down on a thumbnail starts paint mode, pointer-move over adjacent thumbnails (with capture) paints them
- Replace `window.addEventListener('mouseup', ...)` (~line 467) with `pointerup`
- Add `touch-action: none` on the thumbnail container during active painting

### Form Builder Canvas (`src/tools/form-creator/FormCanvas.tsx`)
- Add `style={{ touchAction: 'none' }}` to the canvas container
- Already uses pointer events — no event migration needed

---

## Phase 2: Global Touch Polish

### Touch Targets
Add a global CSS rule in the app's main stylesheet (or Tailwind layer):

```css
@media (any-pointer: coarse) {
  /* Toolbar buttons */
  .touch-target { min-width: 44px; min-height: 44px; }
}
```

Apply `touch-target` class (or equivalent Tailwind utility) to:
- PDF Annotate top toolbar buttons (zoom, find, more)
- PDF Annotate right sidebar tool buttons
- Flowchart toolbar buttons
- Org Chart toolbar buttons
- All modal close buttons
- PDF Merge/Split action buttons

Alternatively, use a Tailwind `@layer` to target existing button patterns:
```css
@media (any-pointer: coarse) {
  button.p-1, button.p-1\.5 { padding: 0.625rem; /* 10px → 44px with 14-16px icon */ }
}
```

### Hover-Hidden Buttons
All instances of `opacity-0 group-hover:opacity-100` get an additional media query override. Two approaches:

**Option A (CSS override):** Add to global styles:
```css
@media (hover: none) {
  .group:hover .group-hover\:opacity-100,
  [class*="group-hover:opacity-100"] { opacity: 0.7 !important; }
}
```

**Option B (per-component):** Add `[@media(hover:none)]:opacity-70` Tailwind class alongside each `group-hover:opacity-100`. More explicit but more changes.

Use **Option A** — one CSS rule fixes all 10+ instances.

Affected locations:
- PDF Merge page actions (rotate/delete)
- PDF Merge remove button
- PDF Annotate annotation list delete
- PDF Annotate presets delete
- PDF Split page chip remove
- Dashboard widget actions
- Org Chart photo overlay
- Stamp Library delete button
- TOC Editor pencil icon
- Changelog type labels

### Sidebar Auto-Collapse
In `src/components/layout/Sidebar.tsx`, modify the initial sidebar state:

```typescript
const [sidebarExpanded, setSidebarExpanded] = useState(() => {
  return window.innerWidth >= 1024
})
```

On viewports under 1024px (iPad portrait and smaller), sidebar starts collapsed. User can still expand manually. No `resize` listener needed — just initial state.

### dnd-kit TouchSensor
In every file that configures dnd-kit sensors, add `TouchSensor` alongside `PointerSensor`:

```typescript
import { PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
)
```

Files to update:
- `src/tools/pdf-merge/PdfMergeTool.tsx`
- `src/tools/pdf-split/PdfSplitTool.tsx`
- `src/tools/pdf-merge/TocEditorModal.tsx`

The 250ms delay prevents accidental drags when users intend to scroll.

### Changelog Hover Labels
The type labels in `UpdateModal.tsx` (`opacity-0 group-hover:opacity-100`) are already handled by the global CSS rule in the hover-hidden buttons fix above.

---

## Phase 3: Full-Screen Annotation Mode + Slide-Out Drawer

### 3A: Full-Screen Toggle (Desktop + Tablet)

**Activation:**
- New button in PDF Annotate top toolbar: Lucide `Maximize2` icon + "Focus" label (between Find and More)
- Keyboard shortcut: `F` key (when no text input is focused) — already used for "Fit to window", so use `Shift+F` instead, or a dedicated `F11`-style binding
- The button toggles full-screen on/off

**What happens on activation:**
1. Hide the app sidebar (`Sidebar` component)
2. Hide the `Header` component
3. Hide the bottom status bar
4. The PDF Annotate tool fills the entire viewport
5. The top toolbar remains but slimmed: only zoom controls, page nav, Find, More, Export PDF
6. The right tool sidebar remains (expanded or collapsed per user preference)
7. A small "Exit Focus" button appears in the top-left corner (replaces where the sidebar was)

**Desktop full-screen:** Additionally calls `document.documentElement.requestFullscreen()` for true browser fullscreen. Falls back gracefully if blocked (just hides app chrome without browser fullscreen).

**iPad:** No Fullscreen API available. The hide-app-chrome approach gives the same visual result — canvas fills the viewport. When running as a home-screen PWA (standalone mode), this is effectively true fullscreen since there's no browser chrome either.

**State:** `isAnnotateFocusMode` boolean in the PDF Annotate component. When active, the app store's sidebar is forced hidden, header is hidden. Exiting restores previous state.

**Communication with App Shell:**
Add to appStore:
```typescript
focusMode: boolean
setFocusMode: (focus: boolean) => void
```

In `AppShell.tsx`, conditionally hide Sidebar and Header when `focusMode` is true:
```tsx
{!focusMode && <Sidebar />}
<div className="flex-1 flex flex-col min-w-0">
  {!focusMode && <Header />}
  <main>...</main>
</div>
```

### 3B: Slide-Out Tool Drawer (Tablet Full-Screen)

**When active:** `focusMode === true && matchMedia('(any-pointer: coarse)').matches`

**Behavior:**
- The right tool sidebar transforms into a slide-out drawer
- Drawer is hidden off-screen to the right by default
- A **handle tab** is visible at the right edge of the screen: a small vertical strip (~24px wide, ~80px tall) with a subtle chevron icon, vertically centered
- **Opening:** Tap the handle OR swipe left from the right edge (within 24px of viewport right)
- **Closing:** Tap outside the drawer, tap a tool (auto-close after selection), or swipe right on the drawer
- **Pinning:** A pin/unpin toggle in the drawer header. When pinned, selecting a tool does NOT auto-close the drawer. Pin state saved in localStorage.

**Drawer content:**
Same tools as the right sidebar (Select, Pencil, Highlight, etc.) but rendered in the expanded label format always (not collapsible — there's plenty of room in a drawer). Includes "More tools" expander, Layers, Comments, Undo/Redo/Rotate.

**Visual design:**
- Drawer width: ~200px on tablets
- Semi-transparent backdrop (`bg-black/30`) overlays the canvas when drawer is open (unless pinned — no backdrop when pinned)
- Drawer slides in from the right with `transform: translateX()` transition (~200ms ease-out)
- Drawer background: same dark theme as the current sidebar (`bg-black/20 border-l border-white/[0.06]`)
- Handle tab: `bg-white/10 rounded-l-lg` with a `ChevronsLeft` icon

**Swipe detection:**
Use `onPointerDown`/`onPointerMove`/`onPointerUp` on the canvas area to detect edge swipes. If `pointerdown` starts within 24px of the right edge AND moves >50px to the left, open the drawer. Use a ref to avoid interfering with drawing (only detect when pointer starts in the edge zone).

**Desktop full-screen:** Drawer is NOT used. Normal sidebar remains. The handle tab is not rendered.

---

## Phase 3 Extras (if time permits)

### getCoalescedEvents for Smoother Apple Pencil Strokes
In `PdfAnnotateTool.tsx` `handlePointerMove`, check for `getCoalescedEvents()`:
```typescript
const events = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent]
for (const ce of events) {
  // Process each coalesced point for smoother curves
}
```
Feature-detected — falls back to single event if not available.

### Pinch-to-Zoom on PDF Annotate Canvas
Currently 2-finger touch triggers pan mode. Enhance to detect pinch (track distance between 2 active pointers). If distance changes by >10px, zoom instead of pan.

### Long-Press Context Menus
Add a `useLongPress` hook that fires after 500ms hold:
```typescript
function useLongPress(callback: (e: PointerEvent) => void, delay = 500)
```
Apply to Flowchart nodes and PDF Annotate annotations as an alternative to right-click.

### Virtual Keyboard Handling
In PDF Annotate's text editing overlay (`position: fixed`), listen to `window.visualViewport` resize events and reposition the overlay above the keyboard:
```typescript
useEffect(() => {
  const vv = window.visualViewport
  if (!vv) return
  const handler = () => {
    // Adjust overlay position based on vv.height and vv.offsetTop
  }
  vv.addEventListener('resize', handler)
  return () => vv.removeEventListener('resize', handler)
}, [])
```

---

## What's NOT Changing
- PDF Annotate drawing/annotation logic — untouched
- Desktop experience without focus mode — identical to current
- File upload flows — already touch-friendly
- Any tool's core functionality
- The build output — still a single HTML file

## Testing Strategy
- Existing Playwright e2e tests continue to pass (pointer events are a superset of mouse events)
- Manual testing on iPad Safari and Android Chrome for:
  - Each of the 3 migrated tools (Flowchart, Org Chart, PDF Split)
  - Touch target sizes
  - Hover-hidden button visibility
  - Full-screen focus mode entry/exit
  - Slide-out drawer open/close/pin
  - Apple Pencil drawing in PDF Annotate (pressure, tilt)
