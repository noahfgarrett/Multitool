# PDF Annotate UI Redesign — Toolbar & Layout Optimization

**Date:** 2026-04-01
**Status:** Approved
**Goal:** Make PDF Annotate more discoverable for new users and maximize canvas space.

## Problem

The current PDF Annotate UI has:
- 6 icon-only buttons in the top toolbar that new users can't identify
- 18 icon-only buttons in the right sidebar tool strip with zero labels or grouping
- Duplicate page navigation (top toolbar AND bottom bar)
- Comments panel open by default showing empty state, wasting ~250px width
- Header with subtitle consuming ~50px vertical space after a PDF is loaded

Target audience is construction professionals (estimators, engineers, architects) who need to annotate plans. Many are not power users — discoverability matters.

## Changes

### 1. Top Toolbar — "More" Dropdown

**Current:** 6 icon-only buttons between page nav and Export PDF (Find, Annotation List, Markups List, Tool Presets, Compare PDFs, Stamp Library).

**New:**
- **Find** stays in the toolbar as a labeled button (`Search` icon + "Find" text) — high-frequency action
- **Remaining 5** collapse into a single "More" dropdown button (`MoreHorizontal` icon + "More" text + `ChevronDown`)
- Dropdown menu shows each item with Lucide icon + label, grouped with dividers:
  - **Lists:** Annotation List, Markups List
  - **Workflow:** Tool Presets, Compare PDFs
  - **Library:** Stamp Library
- Keyboard shortcuts displayed right-aligned in the dropdown (e.g., `Ctrl+F` for Find stays visible on the toolbar button too)

**Component:** Modify the toolbar section in `PdfAnnotateTool.tsx`. The dropdown can be a simple `useState` toggle with an absolute-positioned menu, consistent with existing dropdown patterns in the app (e.g., `stampDropdownOpen`).

### 2. Right Sidebar — Collapsible Hybrid

**Current:** 48px-wide vertical strip of 18 icon-only buttons, no labels, no grouping.

**New — Expanded (default):**
- Width: ~140px
- Collapse toggle button (double chevron) at top of sidebar
- Primary tools with icon + label + shortcut key:
  - Select (S), Pencil (P), Highlight (H), Strikethrough, Text (T), Eraser (E), Measure (M)
- "More tools" expander (dashed border, `MoreHorizontal` icon + "More tools" + chevron):
  - Opens inline: Stamp, Crop, Image Stamp (I), OCR Region, Sticky Note (N)
- Below divider: Layers, Comments (panel toggles)
- Pinned at bottom: Undo/Redo/Rotate as compact icon-only buttons (2x2 grid)
- Active tool highlighted with orange background + border (matching current active style)

**New — Collapsed (power user):**
- Width: ~48px (same as current)
- Expand toggle button at top
- Same icon-only buttons in same order, with group dividers
- Tooltips on hover showing tool name + shortcut

**Behavior:**
- Default: expanded
- Toggle: persisted in `localStorage` key `pdfAnnotate.toolbarExpanded`
- Animation: `transition: width 200ms ease-out` on the sidebar container
- Keyboard shortcuts work in both states
- "More tools" expander state is independent of collapse state (also persisted)

**Component:** The right sidebar is currently a `div` with flex-col in `PdfAnnotateTool.tsx`. Wrap it in a new `ToolSidebar` component (or keep inline if simpler) that manages expanded/collapsed state.

### 3. Remove Duplicate Page Navigation from Bottom Bar

**Current:** Bottom bar has `< [page input] / N >` navigation duplicating the top toolbar's page nav.

**New:** Bottom bar keeps:
- File name + file size (left)
- Annotation count + selection hint (right)
- Remove the page navigation controls entirely

The top toolbar's page navigation (which includes zoom controls nearby) becomes the single source for page nav.

### 4. Comments Panel Closed by Default

**Current:** Comments panel opens automatically when a PDF loads, showing "No comments yet" and consuming ~250px of canvas width.

**New:**
- `commentsPanelOpen` defaults to `false` instead of `true`
- User opens it by clicking the Comments button in the right sidebar
- Panel state can optionally be persisted in localStorage (open it if the user had it open last session)

### 5. Compact Header When PDF Loaded

**Current:** Header always shows tool title + subtitle ("PDF Annotate" / "Draw, highlight, and annotate PDFs") in ~50px of height.

**New:**
- **Before PDF loaded:** Show full header with title + subtitle (helps orient new users)
- **After PDF loaded:** Collapse to a single-line compact header — just the title "PDF Annotate" with the Help button, in ~32px height
- The subtitle "Draw, highlight, and annotate PDFs" is hidden when a file is active
- This reclaims ~18px of vertical space for the canvas

## What's NOT Changing

- Left sidebar (app navigation) — untouched
- Canvas rendering, annotation behavior, tool functionality — untouched
- Keyboard shortcuts — all stay the same
- Properties panel behavior — untouched
- Export/Email/Print/Report/New buttons — these already have labels, no changes needed
- Zoom controls in top toolbar — untouched

## Technical Notes

- All new state uses `useState` + `localStorage` for persistence
- No new dependencies — Lucide icons already in use, no new packages
- The "More" dropdown follows the same pattern as `stampDropdownOpen` (click outside to close)
- Right sidebar width transition uses CSS `transition` on the container, not JS animation
- Bottom bar page nav removal is purely JSX deletion — no logic changes

## Testing

- Existing e2e tests should continue passing (selectors for tools use `button[title="..."]` which don't change)
- New tests needed:
  - "More" dropdown opens/closes, each item triggers correct action
  - Right sidebar expand/collapse toggle works
  - Collapsed state persists across page reload
  - "More tools" expander shows/hides secondary tools
  - Comments panel starts closed
  - Bottom bar no longer has page navigation
