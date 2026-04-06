# COO Feedback Updates — Design Spec

**Date:** 2026-04-06
**Source:** COO meeting notes
**Scope:** 6 features across settings, org chart, flowchart, feedback UX, profile, and about

---

## Feature 1: Global Settings & Themes

### Entry Point
- New **cog icon** in sidebar footer (between feedback button and version text)
- Click opens a **Settings modal** with 3 tabs: Themes, Profile, About

### Themes Tab
- 4 visual preview cards in a 2x2 grid, click to apply instantly
- **Night Sky** (current default) — dark background `#0a0a14` + `ShootingStars.tsx` animation
- **Blueprint** — dark navy `#1a2332` with subtle CSS grid lines, engineering aesthetic
- **Clean Dark** — flat `#111116`, no animation, minimal distractions
- **Light** — white/light gray `#f5f5f5`, dark text, for well-lit environments
- Theme persisted in localStorage key `lwt-theme`
- On app load, read localStorage and apply theme class to `<body>` before first paint (no flash of wrong theme)
- `ShootingStars.tsx` only renders when theme is `night-sky`

### Profile Tab
- See Feature 5 (Enhanced User Profile) for full field list
- Always editable — no more "first launch only" gate for editing
- Save button persists to `lwt-user-profile` in localStorage

### About Tab
- See Feature 6 for content details

### Architecture
- Extend `appStore.ts` with `theme` state and `setTheme()` action, `showSettings` boolean and `setShowSettings()`
- Each theme is a set of CSS custom properties applied via a class on `<html>` or `<body>` (e.g., `.theme-night-sky`, `.theme-blueprint`, `.theme-clean-dark`, `.theme-light`)
- CSS variables: `--bg-primary`, `--bg-secondary`, `--bg-elevated`, `--text-primary`, `--text-secondary`, `--border-color`, etc.
- Tailwind config references these variables so all existing `dark-base`, `dark-elevated` etc. classes adapt
- New component: `SettingsModal.tsx` in `src/components/common/`
- `ShootingStars.tsx` conditionally rendered based on theme state

### Theme Definitions

**Night Sky (default):**
```
--bg-primary: #0a0a14
--bg-secondary: #12121e
--bg-elevated: #1a1a2e
--text-primary: #ffffff
--text-secondary: rgba(255,255,255,0.6)
--border-color: rgba(255,255,255,0.08)
Shooting stars: enabled
```

**Blueprint:**
```
--bg-primary: #1a2332
--bg-secondary: #1f2b3d
--bg-elevated: #253347
--text-primary: #e2e8f0
--text-secondary: rgba(226,232,240,0.6)
--border-color: rgba(226,232,240,0.1)
Grid overlay: enabled (subtle CSS repeating-linear-gradient lines)
```

**Clean Dark:**
```
--bg-primary: #111116
--bg-secondary: #18181b
--bg-elevated: #1f1f24
--text-primary: #fafafa
--text-secondary: rgba(250,250,250,0.6)
--border-color: rgba(255,255,255,0.08)
No decoration
```

**Light:**
```
--bg-primary: #f5f5f5
--bg-secondary: #ffffff
--bg-elevated: #ffffff
--text-primary: #1a1a2e
--text-secondary: rgba(26,26,46,0.6)
--border-color: rgba(0,0,0,0.1)
No decoration, lotus-orange stays as accent
```

### Files Changed
- `src/stores/appStore.ts` — add theme + settings state
- `src/components/common/SettingsModal.tsx` — new file
- `src/components/layout/Sidebar.tsx` — add cog icon button in footer
- `src/components/layout/AppShell.tsx` — apply theme class to wrapper, conditionally render ShootingStars
- `src/index.css` — CSS custom properties per theme class, blueprint grid overlay
- `src/App.tsx` — render SettingsModal

---

## Feature 2: Org Chart — Multi-Root Sections + Revision Control

### Multi-Root Support
- Remove single-root constraint. Multiple nodes with `reportsTo: ''` are allowed.
- Each root node becomes the head of an independent **section**.
- Layout algorithm iterates over root nodes and positions each section's tree independently, spaced horizontally with generous gaps (~100px between sections).

### Section Headers & Dividers
- Each root node has a new optional field: `sectionTitle: string` (default: `''`)
- When `sectionTitle` is non-empty, a **title bar** renders above the root node — styled as larger, bold text centered above the section's tree
- **Visual divider**: Subtle dashed vertical line between sections (rendered in canvas)
- Section titles are editable via double-click on the canvas (inline text editing)
- Section titles included in all exports (PNG, SVG, PDF, JSON, CSV)

### Adding Sections
- **"Add Section" button** in toolbar (plus icon with vertical divider) — creates a new root node with default section title "New Section" and placeholder name "Department Head", placed to the right of existing sections
- **Right-click canvas** (empty area) → context menu includes "Add New Section"
- **Templates modal** → new template "Multi-Department" with 3 sections (Operations, Engineering, Admin), 5-6 people each

### Revision Control
- New **"Versions" button** in toolbar (history/bookmark icon)
- Opens a **Versions panel** (dropdown or slide-out) showing saved snapshots
- Each version: `{ id: string, name: string, timestamp: number, nodeCount: number, snapshot: OrgNode[] }`
- **Save Version** button — captures `structuredClone` of full node array, prompts for name (default: "Version N" or auto-timestamp)
- **Restore Version** — loads snapshot back with confirmation dialog ("This will replace your current chart. Continue?")
- **Delete Version** — removes a snapshot with confirmation
- **Rename Version** — inline editable name
- Stored in localStorage key `lwt-orgchart-versions`
- Limit: 20 saved versions. On exceeding, prompt to delete oldest.
- Separate from undo/redo — undo is in-session, versions are named milestones.

### Data Model Changes

```typescript
// Extended OrgNode
interface OrgNode {
  // ... existing fields ...
  sectionTitle?: string  // Only meaningful when reportsTo === ''
}

// New type
interface OrgChartVersion {
  id: string
  name: string
  timestamp: number
  nodeCount: number
  snapshot: OrgNode[]
}
```

### Architectural Changes
- `types.ts`: Add `sectionTitle` to `OrgNode`, add `OrgChartVersion` interface
- `orgChartStore.ts`:
  - Remove single-root deletion guard (allow deleting roots if >1 root exists)
  - Add `addSection()` action — creates new root node
  - Layout algorithm: loop over roots, compute each subtree's layout independently, offset horizontally
  - Add version methods: `saveVersion()`, `restoreVersion()`, `deleteVersion()`, `renameVersion()`, `getVersions()`
- `Canvas.tsx`: Render section titles (large bold text above root), dividers between sections, hit-test titles for inline editing
- `Toolbar.tsx`: Add "Add Section" button, "Versions" button
- `export.ts`: Include section titles in PNG/SVG/PDF/CSV exports
- `templates.ts`: Add "Multi-Department" template

### Files Changed
- `src/tools/org-chart/types.ts`
- `src/tools/org-chart/orgChartStore.ts`
- `src/tools/org-chart/Canvas.tsx`
- `src/tools/org-chart/Toolbar.tsx`
- `src/tools/org-chart/OrgChartTool.tsx`
- `src/tools/org-chart/export.ts`
- `src/tools/org-chart/templates.ts`

---

## Feature 3: Flowchart — P&ID Shapes + Background Image + Visio Export

### P&ID Symbol Library (~40+ shapes)

New shape category **"P&ID"** in the shape library, organized into sub-groups:

**Vessels & Tanks (7):**
Horizontal vessel, Vertical vessel, Open tank, Closed tank, Column/Tower, Reactor, Drum

**Rotating Equipment (6):**
Centrifugal pump, Positive displacement pump, Compressor, Fan/Blower, Turbine, Motor

**Heat Transfer (6):**
Shell & tube heat exchanger, Plate heat exchanger, Air cooler, Condenser, Boiler, Furnace/Heater

**Valves (10):**
Gate valve, Globe valve, Ball valve, Butterfly valve, Check valve, Control valve, Relief/Safety valve, Solenoid valve, 3-way valve, Plug valve

**Instruments (7):**
Indicator, Transmitter, Controller, Recorder, Sensor, Flow element, Level gauge

**Piping (6):**
Reducer, Tee, Elbow, Cap/Blind, Flange, Strainer/Filter

**Misc (4):**
Spray nozzle, Mixer/Agitator, Cyclone, Conveyor

Each shape:
- Custom SVG path following ISA-5.1 / ISO 14617 conventions where practical
- Proper port positions (inlet/outlet aligned to real piping connection points)
- Default size appropriate to the symbol type
- Label position that doesn't overlap the symbol graphic

### Shape Search
- **Search bar** at top of shape library panel — always visible
- Filters all shapes across all categories as user types
- Fuzzy matching: "hx" finds "Heat Exchanger", "vlv" finds valve types
- Results grouped by category with match count badges
- Empty state: "No shapes match" with clear button

### Recently Used Shapes
- Track last 10 placed shapes in localStorage (`lwt-flowchart-recent-shapes`)
- **"Recent" section** pinned at top of shape library (above category list, always visible)
- Shows shape icons in a horizontal row for quick access
- **Right-click canvas** (empty area) → context menu includes "Place Recent" submenu with last 5 shapes + icons — click enters placement mode
- List updates each time a shape is placed

### Background Image Import
- New toolbar button: **"Background Image"** (image icon)
- Opens file picker for PNG, JPG, or single PDF page
- Image renders as semi-transparent underlay beneath flowchart nodes/edges
- **Controls** (shown in toolbar or floating mini-panel when background is active):
  - Opacity slider: 10–100% (default 30%)
  - Lock toggle: prevents accidental drag/interaction with background
  - Remove button: clears the background
- Image scales/pans with the viewport (stays aligned during zoom/pan)
- Stored as base64 `dataUrl` in diagram state (included in JSON save/load)
- **Export behavior**: Not included by default in PNG/SVG/PDF exports. Toggle checkbox "Include background image" in export modal.

### Visio (.vsdx) Export
- New option in export modal: **"Visio (.vsdx)"**
- Built using JSZip (already in project) — hand-rolled minimal .vsdx generator
- Generated XML structure:
  - `[Content_Types].xml` — MIME type declarations
  - `_rels/.rels` — root relationships
  - `visio/document.xml` — document metadata
  - `visio/pages/pages.xml` — page list
  - `visio/pages/page1.xml` — shapes and connectors
- Node mapping: Each `DiagramNode` → Visio `<Shape>` with position, size, text, fill color
- Edge mapping: Each `DiagramEdge` → Visio `<Connect>` with source/target + route points
- Limitations: No Visio-native stencils or ShapeSheet behaviors. Shapes open as basic rectangles/paths with labels. Fully editable in Visio.
- Filename: `flowchart.vsdx`

### Data Model Changes

```typescript
// Extended DiagramState (or new fields in store)
interface BackgroundImage {
  dataUrl: string
  opacity: number    // 0.1 – 1.0
  locked: boolean
}

// Extended ShapeType union — add all P&ID shape names
type ShapeType = /* existing */ | 'pid-centrifugal-pump' | 'pid-gate-valve' | /* ... all ~40 */
```

### Files Changed
- `src/tools/flowchart/types.ts` — new ShapeType entries, BackgroundImage interface
- `src/tools/flowchart/shapes.ts` — ~40 new shape definitions with SVG paths and port positions
- `src/tools/flowchart/flowchartStore.ts` — background image state, recent shapes tracking
- `src/tools/flowchart/Canvas.tsx` — render background image layer, right-click recent shapes menu
- `src/tools/flowchart/ShapeLibrary.tsx` — search bar, P&ID category with sub-groups, recent shapes section
- `src/tools/flowchart/export.ts` — add `exportVSDX()`, background toggle for other exports
- `src/tools/flowchart/Toolbar.tsx` — background image button + controls
- `src/tools/flowchart/FlowchartTool.tsx` — wire up export modal option

---

## Feature 4: "Got an Idea?" Welcome Screen Button

### The Button
- Position: **top-right** of welcome screen content area
- Text: **"Got an Idea?"** with `Lightbulb` icon (from lucide-react)
- Style: Rounded pill shape, orange gradient border (`lotus-orange`), semi-transparent background
- Animation: **Shimmer effect** — a soft light sweep across the button using CSS `@keyframes`. Gentle, not aggressive. Animation runs 3-4 cycles on page load then pauses (via `animation-iteration-count` or JS timeout to add a `paused` class).

### Behavior
- Click → `setActiveView('feedback')` with payload `{ preselectedType: 'enhancement' }`
- FeedbackForm reads the payload and sets initial type to "Enhancement Idea"
- If no user profile exists, form still opens (existing profile gate handles it)

### Architecture
- `appStore.ts`: Extend `setActiveView` signature to accept optional payload: `setActiveView(view: 'feedback' | null, payload?: { preselectedType?: 'bug' | 'enhancement' })`
- Add `feedbackPayload` state that FeedbackForm reads on mount
- `WelcomeScreen.tsx`: Add the button with shimmer animation
- `FeedbackForm.tsx`: On mount, check `feedbackPayload` from store, set initial type, then clear the payload
- `index.css`: Add shimmer keyframe animation

### Files Changed
- `src/stores/appStore.ts` — feedbackPayload state
- `src/components/WelcomeScreen.tsx` — new button
- `src/tools/feedback/FeedbackForm.tsx` — read preselected type
- `src/index.css` — shimmer animation keyframes

---

## Feature 5: Enhanced User Profile

### Extended Fields

| Field | Type | Required | Details |
|-------|------|----------|---------|
| Name | string | Yes | Same as today |
| Email | string | No | Same as today |
| Initials | string | Auto | Auto-generated from name, manual override, max 3 chars |
| Profile Picture | string (base64) | No | Upload image, auto-crop circle, compress 128px JPEG 0.85 |
| Job Title | string | No | e.g. "Senior Estimator", "Project Engineer" |
| Company | string | No | e.g. "LotusWorks" |

### Profile Picture Handling
- Upload: Accept `image/*`, read as data URL
- Processing: Scale to fit 128x128px max (preserve aspect ratio), canvas resize, JPEG 0.85 quality
- Same compression pipeline as org chart avatars
- Circular crop preview in the settings modal
- Remove button to clear the photo

### Where Profile Data Appears

**Profile Picture:**
- Settings modal — large circular preview with upload/remove
- PDF Annotate ChatBubble — avatar in comment header (falls back to colored initials if no photo)
- PDF Annotate CommentsPanel — avatar next to each comment
- Sidebar footer — small avatar circle (24px) next to cog icon, clicking opens Settings → Profile
- Feedback form — sender identity badge shows photo

**Job Title & Company:**
- PDF Annotate comments — subtitle line: "Noah Garrett · Senior Estimator"
- Feedback emails — included in SUBMITTED BY block
- Markup reports — author info header

### Storage
- All fields stored in existing `lwt-user-profile` localStorage key
- Extended `UserProfile` type:

```typescript
interface UserProfile {
  name: string
  email: string
  initials: string
  imageDataUrl?: string | null
  jobTitle?: string
  company?: string
}
```

### First-Launch Flow
- Still shows standalone `UserProfileModal` (forced, can't escape)
- Now includes the new fields (photo, title, company) but they remain optional
- After first launch, editing is via Settings → Profile tab

### Files Changed
- `src/utils/userProfile.ts` — extend UserProfile type
- `src/components/common/UserProfileModal.tsx` — add photo upload, job title, company fields
- `src/components/common/SettingsModal.tsx` — Profile tab reuses the form
- `src/tools/pdf-annotate/ChatBubble.tsx` — render avatar image
- `src/tools/pdf-annotate/CommentsPanel.tsx` — render avatar image, show job title
- `src/tools/feedback/FeedbackForm.tsx` — show photo in sender badge, include title/company
- `src/tools/pdf-annotate/markupReport.ts` — include title/company in author info
- `src/components/layout/Sidebar.tsx` — small avatar in footer

---

## Feature 6: About Section (Settings → About Tab)

### Content
- **App title**: "LotusWorks Toolkit" with orange branding
- **Version**: v{__APP_VERSION__}
- **Created by**: Noah Garrett
- **Description**: "Professional-grade local toolbox for construction professionals. 100% offline, zero server calls."
- **Tool count**: "15 tools across 5 categories"
- **Changelog link**: "View Changelog" button — closes Settings, opens changelog modal

### Layout
- Clean, centered layout within the About tab
- LotusWorks orange accent on the title
- Version number styled as a subtle badge
- Minimal — informational only, no interactive elements beyond the changelog link

### Files Changed
- `src/components/common/SettingsModal.tsx` — About tab content (part of the same new file from Feature 1)

---

## Implementation Strategy

These 6 features decompose into **5 independent worktree agents** that can run in parallel:

| Agent | Features | Files Touched |
|-------|----------|---------------|
| **A: Settings & Themes** | F1 (Settings modal + themes) + F5 (Enhanced Profile) + F6 (About tab) | appStore (theme + settings + profile fields), SettingsModal (new), UserProfileModal, userProfile.ts, Sidebar (cog + avatar), AppShell, index.css, App.tsx, ChatBubble, CommentsPanel, markupReport |
| **B: Org Chart Overhaul** | F2 (Multi-root + sections + versions) | All org-chart/ files |
| **C: Flowchart P&ID + Visio** | F3 (P&ID shapes + background + .vsdx export) | All flowchart/ files |
| **D: Feedback + Welcome** | F4 ("Got an Idea?" button) | WelcomeScreen, appStore (feedbackPayload only), FeedbackForm (preselect logic), index.css (shimmer) |

### Merge Conflicts to Watch
- **appStore.ts** is touched by A and D — A handles theme + settings + profile state, D adds feedbackPayload. Merge order: A first, then D.
- **Sidebar.tsx** — only A touches it (cog icon + avatar)
- **FeedbackForm.tsx** — A touches it (profile photo in sender badge), D touches it (preselect type). A first, D second.
- **index.css** is touched by A (theme variables) and D (shimmer animation) — no conflicts, different sections.

### Merge Order
1. **B** (Org Chart) — isolated, no shared files
2. **C** (Flowchart) — isolated, no shared files
3. **A** (Settings + Profile + About) — establishes appStore changes, settings modal, profile enhancements
4. **D** (Feedback + Welcome) — adds feedbackPayload to appStore, shimmer button
