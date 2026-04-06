# Feature Improvement Report: Flowchart Tool vs Visio

**Date:** 2026-03-20
**Scope:** Flowchart tool — exhaustive comparison against Microsoft Visio, Lucidchart, draw.io, Excalidraw, tldraw
**Target audience:** Construction professionals (estimators, engineers, architects, contractors)

## Executive Summary

28 findings: 12 gaps, 10 refinements, 6 UX improvements
Top recommendation: Auto-layout algorithm via dagre (~30KB) — every competitor has this, we don't.

---

## Findings (sorted by ROI)

### 1. [GAP] Auto-Layout Algorithm (dagre integration)
**Impact:** Critical | **Effort:** Medium | **ROI: ★★★★★**

**What:** Add automatic layout that arranges nodes in a clean top-to-bottom or left-to-right flowchart hierarchy.
**Why:** Every competitor (Visio, Lucidchart, draw.io, Excalidraw) has auto-layout. The current tool requires 100% manual positioning. This is the #1 user frustration across all diagramming tools — "other programs expect them to do a lot manually like placing lines, which wastes time." Construction professionals are not daily diagramming users; they need fast results.
**Competitors:** Visio has 5 layout algorithms. draw.io has 9+. Lucidchart has "assisted layout."

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (add layout button + handler), new `src/tools/flowchart/layout.ts`
- **Approach:** Install `@dagrejs/dagre` (~30KB minified). On button click, feed all nodes/edges to dagre with `rankdir: 'TB'`, `nodesep: 60`, `ranksep: 80`. Apply computed positions back to nodes. Push undo state before applying.
- **Key details:** `dagre.graphlib.Graph` → `setNode(id, { width, height })` → `setEdge(source, target)` → `dagre.layout(g)` → read `g.node(id).x/y`. Support TB/LR/BT/RL directions via dropdown.
- **Complexity:** ~150 lines. Main challenge is mapping current node/edge model to dagre's graph model.
- **Watch out for:** Waypoints should be cleared when auto-layout runs. Selection state should be preserved.

---

### 2. [GAP] Drag-from-Palette Shape Creation
**Impact:** Critical | **Effort:** Medium | **ROI: ★★★★★**

**What:** Allow users to drag shapes directly from the shape library panel onto the canvas, in addition to the existing click-to-place mode.
**Why:** This is the universal pattern across Visio, Lucidchart, draw.io. Every user expects it. The current click-in-palette-then-click-on-canvas flow is unintuitive for first-time users. Construction professionals are accustomed to drag-and-drop from CAD tool palettes.
**Competitors:** All competitors use drag-from-palette as the primary shape creation method.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (shape library panel + canvas drop handler)
- **Approach:** Add `draggable` attribute to shape library tiles. On `dragstart`, store shape type in `dataTransfer`. On canvas `drop`, read shape type, compute canvas coordinates from drop position (accounting for pan/zoom), create node at that position.
- **Key details:** Use HTML5 drag-and-drop API. Show a ghost preview of the shape during drag. Snap to grid if enabled.
- **Complexity:** ~80 lines. The shape library already renders tiles; just add drag handlers.
- **Watch out for:** Must account for viewport pan/zoom transform when computing drop coordinates.

---

### 3. [GAP] PDF Export
**Impact:** Critical | **Effort:** Medium | **ROI: ★★★★☆**

**What:** Export flowcharts to PDF format.
**Why:** PDF is the #1 document format in construction. Flowcharts are printed for trailer walls, meeting handouts, and inclusion in project documentation. Current export only supports PNG, SVG, and JSON. Every competitor exports to PDF. Construction professionals frequently need large-format prints (Tabloid, Arch D).
**Competitors:** Visio, Lucidchart, draw.io all export PDF. draw.io even embeds diagram data inside PDFs for re-editing.

**Implementation spec:**
- **Files:** New export handler in `src/tools/flowchart/FlowchartTool.tsx` (export modal), uses existing `pdf-lib` dependency
- **Approach:** Create a `PDFDocument`, add a page sized to the diagram bounds + padding. Render each node as a pdf-lib rectangle/path with fill/stroke. Render text with `StandardFonts.Helvetica`. Render edges as lines/curves. Use `page.drawLine()`, `page.drawRectangle()`, `page.drawText()`.
- **Key details:** Page sizes: Auto (fit content), Letter, Tabloid, A4, A3. Reuse shape path generation logic from existing SVG export. pdf-lib is already a project dependency.
- **Complexity:** ~250 lines. The SVG export already computes all paths/positions; PDF export follows the same pattern but uses pdf-lib drawing primitives instead.
- **Watch out for:** Text wrapping within shapes. Arrow marker rendering. Color conversion (CSS to pdf-lib rgb()).

---

### 4. [REFINEMENT] Rich Text Formatting in Shapes
**Impact:** High | **Effort:** Medium | **ROI: ★★★★☆**

**What:** Support bold, italic, font family, text alignment, and font size per-shape (not just global font size slider).
**Why:** Visio supports full rich text. Lucidchart has bold/italic/underline/alignment. draw.io supports HTML-formatted labels. The current tool only has a global font size slider (8-24px) and single color picker. Construction flowcharts need emphasis (bold for critical steps, italic for notes).
**Competitors:** All competitors support at minimum bold/italic/alignment.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (properties panel), `src/tools/flowchart/useFlowchartStore.ts` (node model)
- **Approach:** Add `fontWeight`, `fontStyle`, `textAlign` fields to `DiagramNode`. Add bold/italic/align buttons to properties panel. Apply via CSS in the SVG `foreignObject` text rendering. Update PNG/SVG export to respect these properties.
- **Key details:** Bold = `font-weight: 700`. Italic = `font-style: italic`. Align = `text-align: left|center|right`. Keep it simple — no per-character formatting, just per-shape.
- **Complexity:** ~100 lines across store + panel + rendering.
- **Watch out for:** Export rendering must match canvas rendering. SVG foreignObject handles CSS naturally; PNG canvas rendering needs manual font string construction.

---

### 5. [GAP] Alignment & Distribution Tools
**Impact:** High | **Effort:** Small | **ROI: ★★★★☆**

**What:** Add Align Left/Center/Right/Top/Middle/Bottom and Distribute Horizontally/Vertically for multi-selected shapes.
**Why:** Every competitor has these. The current tool has smart alignment guides (which are great for dragging) but no explicit alignment commands for already-placed shapes. Construction professionals expect precision — "smart guides and snap-to-grid for alignment. Construction professionals expect precision."
**Competitors:** Visio has full alignment toolbar + keyboard shortcuts. draw.io has Align + Distribute in right-click menu. Lucidchart has align + distribute.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (toolbar or context menu)
- **Approach:** When 2+ nodes selected: compute bounding boxes, then set all selected nodes' x/y to the aligned value (e.g., align-left = all nodes get x = min(selected x values)). Distribute = sort by position, compute equal spacing, apply.
- **Key details:** 6 alignment options + 2 distribution options = 8 buttons. Can go in the toolbar or in a right-click context menu submenu.
- **Complexity:** ~60 lines. Pure arithmetic on node positions.
- **Watch out for:** Push undo state before applying. Preserve edge connections.

---

### 6. [GAP] Swim Lanes / Containers
**Impact:** High | **Effort:** Large | **ROI: ★★★☆☆**

**What:** Add horizontal/vertical swim lane shapes that group process steps by department, role, or phase.
**Why:** Cross-functional flowcharts are a core use case in construction (e.g., RFI workflows routing between contractor → architect → engineer). Visio has a dedicated "Cross-Functional Flowchart" template. Lucidchart and draw.io both support swim lanes. This is common in construction for showing handoffs between trades.
**Competitors:** All competitors support swim lanes. Visio has the most sophisticated implementation with dynamic membership.

**Implementation spec:**
- **Files:** New `SwimLane` shape type in store, rendering in SVG canvas, interaction handlers
- **Approach:** A swim lane is a special node type that renders as a large rectangle with a header. Other nodes can be placed inside it. When the swim lane moves, contained nodes move with it. Implement as a container concept — check if node center is within swim lane bounds.
- **Key details:** Support 2-5 lanes per swim lane group. Horizontal (lanes stacked vertically) and vertical (lanes side by side) orientations. Lane headers are editable text. Color-coded lanes.
- **Complexity:** ~400 lines. Requires containment logic, move propagation, and rendering of lane dividers.
- **Watch out for:** Z-ordering (swim lanes must render behind contained shapes). Resize behavior when lanes are added/removed.

---

### 7. [UX] Keyboard-Driven Flowchart Creation (Excalidraw-style)
**Impact:** High | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** `Cmd/Ctrl+Arrow` from a selected node creates a new connected node in that direction. `Tab` cycles the new node's shape type.
**Why:** Excalidraw introduced this and it's a paradigm shift — "creating flowcharts from the keyboard without touching the mouse." It collapses the multi-step workflow (select tool → draw shape → select connector → draw connector → select tool → draw next shape) into a single key combo. Power users love it.
**Competitors:** Excalidraw has this. Visio has AutoConnect (hover → blue arrows → click shape from mini-palette). Lucidchart has "ghost shapes."

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (keyboard handler in `useEffect`)
- **Approach:** When a single node is selected and `Ctrl+Arrow` is pressed: create a new node offset 200px in the arrow direction, create an edge from the selected node to the new node, select the new node. Default shape type = rectangle. If `Tab` is pressed while the new node is selected, cycle through shape types (rectangle → diamond → pill → parallelogram → rectangle).
- **Key details:** Arrow direction maps to port: ↑=top→bottom, →=right→left, ↓=bottom→top, ←=left→right. New node label defaults to empty (enter edit mode immediately).
- **Complexity:** ~80 lines added to the existing keyboard handler.
- **Watch out for:** Don't conflict with existing Shift+Arrow (nudge 10px) or plain Arrow (nudge 1px).

---

### 8. [GAP] More Flowchart Shapes (ISO 5807 coverage)
**Impact:** High | **Effort:** Small | **ROI: ★★★★☆**

**What:** Add missing standard flowchart shapes: Document, Multi-Document, Predefined Process (subroutine), Manual Operation, Manual Input, Delay, On-Page Reference, Off-Page Reference, Data/IO (parallelogram is there but labeled wrong), Stored Data, Merge, Extract.
**Why:** ISO 5807 defines 28 standard flowchart symbols. The current tool has 13 shapes, but only 4 are proper flowchart shapes (diamond, pill, parallelogram, cylinder). Visio has 25+ flowchart-specific shapes. Construction professionals need Document (for permits/submittals), Predefined Process (for sub-procedures), and Manual Operation (for field tasks).
**Competitors:** Visio has 25+ flowchart shapes. draw.io has all ISO 5807 shapes. Lucidchart has comprehensive flowchart stencil.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (shape definitions + SVG paths)
- **Approach:** Add shape path functions for each new shape. The existing shape system uses SVG path functions (`getShapePath(type, x, y, w, h)`) — just add new cases. Group them under a "Flowchart" category in the shape library.
- **Key details:** Priority shapes for construction: Document (wavy bottom rect), Predefined Process (double-sided rect), Manual Operation (trapezoid), Delay (D-shape), On/Off-Page Reference (circle/pentagon).
- **Complexity:** ~15 lines per shape (SVG path definition). ~120 lines total for 8 new shapes.
- **Watch out for:** Port positions need to make sense for non-rectangular shapes.

---

### 9. [REFINEMENT] Connector Auto-Routing Around Shapes
**Impact:** High | **Effort:** Large | **ROI: ★★★☆☆**

**What:** Orthogonal connectors should automatically route around intermediate shapes instead of passing through them.
**Why:** This is the #1 user frustration across all flowchart tools — "Manual connector routing is the #1 frustration." The current orthogonal routing computes a fixed path based on port positions but doesn't consider other shapes in the way. Visio's dynamic connectors auto-route around obstacles. draw.io's smart routing is a core strength.
**Competitors:** Visio, draw.io, and Lucidchart all auto-route around obstacles.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (edge rendering), new `src/tools/flowchart/routing.ts`
- **Approach:** Implement A* or visibility-graph pathfinding on a grid derived from node bounding boxes (inflated by standoff distance). When computing orthogonal paths, treat each node's bbox as an obstacle and find the shortest path that doesn't cross any obstacle.
- **Key details:** Grid cell size = 10px. Inflate node bboxes by 20px for routing clearance. Cache obstacle grid and invalidate when nodes move. Fall back to direct path if pathfinding fails.
- **Complexity:** ~300 lines for A* grid-based routing. Performance-sensitive — must run quickly during drag.
- **Watch out for:** Performance with many nodes. Consider only routing edges that cross obstacles, not all edges.

---

### 10. [REFINEMENT] Shape Themes / Presets
**Impact:** Medium | **Effort:** Small | **ROI: ★★★★☆**

**What:** One-click theme presets that apply coordinated colors to all shapes (Professional Blue, High Contrast, Blueprint, Monochrome for B&W printing).
**Why:** Construction documents are frequently printed in B&W or viewed on tablets in bright sunlight. Lucidchart has one-click themes. Visio has 16 themes × 4 variants. The current default (dark canvas with orange-tinted shapes) looks great on screen but prints poorly.
**Competitors:** Visio: 16 themes. Lucidchart: preset themes + conditional formatting. draw.io: themes including sketch mode.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (toolbar dropdown), `src/tools/flowchart/useFlowchartStore.ts` (theme state)
- **Approach:** Define 4-5 theme objects, each specifying: canvas background, node fill, node stroke, text color, edge color. A "Apply Theme" dropdown applies the selected theme's colors to all existing nodes/edges. Themes: Classic (current), Professional (light bg, blue shapes), High Contrast (bold colors, thick strokes), Blueprint (dark blue bg, white shapes), Print-Ready (white bg, black outlines).
- **Key details:** Theme only changes colors — not positions, connections, or labels. Store `activeTheme` in state. New nodes use the active theme's colors.
- **Complexity:** ~60 lines for theme definitions + ~30 lines for apply logic.
- **Watch out for:** User-customized colors should be preserved if user explicitly changed them after theme application.

---

### 11. [UX] Ghost Shape / AutoConnect (Visio-style)
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** When hovering over a shape, show directional arrows (↑→↓←) that, when clicked, create a new connected shape in that direction.
**Why:** Visio's AutoConnect and Lucidchart's "ghost shapes" dramatically speed up flowchart construction. The user hovers, sees suggested next shapes, clicks, and the shape appears connected and aligned. This eliminates the need to switch between shape and connector tools.
**Competitors:** Visio: AutoConnect arrows with mini shape palette. Lucidchart: ghost shapes with hotkeys. Excalidraw: Cmd+Arrow keyboard equivalent.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (node hover rendering + click handlers)
- **Approach:** On node hover in select mode, render 4 small "+" circles at the node's port positions (outside the node). On click, create a new rectangle node at a fixed offset (200px in the clicked direction), create an edge connecting them, and select the new node for immediate label editing.
- **Key details:** "+" indicators appear after 300ms hover delay (avoid flashing during mouse movement). Only show in select mode. New node shape defaults to rectangle but could be changed via a small popup palette.
- **Complexity:** ~120 lines for rendering indicators + click handling + node/edge creation.
- **Watch out for:** Don't show indicators when other operations are in progress (dragging, connecting, editing text).

---

### 12. [REFINEMENT] Minimap / Overview Panel
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** A small overview panel (corner of canvas) showing the entire diagram with a viewport rectangle.
**Why:** Large flowcharts become hard to navigate. Visio has a Pan & Zoom window. draw.io has a minimap. React Flow includes a built-in MiniMap component. Construction process flows can get very long (20+ steps with decision branches).
**Competitors:** Visio: Pan & Zoom window. draw.io: minimap. React Flow: MiniMap component.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (new MiniMap component rendered in corner)
- **Approach:** Render a scaled-down version of the diagram in a fixed-size container (200×150px, bottom-right corner). Draw simplified node rectangles (no text, just colored boxes) and edge lines. Overlay a semi-transparent rectangle showing the current viewport bounds. Clicking/dragging in the minimap pans the main canvas.
- **Key details:** Scale = min(200/diagramWidth, 150/diagramHeight). Update on node move, zoom, and pan. Use a separate canvas element for performance.
- **Complexity:** ~150 lines. Rendering simplified shapes is fast; the main work is coordinate mapping between minimap and main canvas.
- **Watch out for:** Performance with many nodes — limit minimap refresh rate to 10fps.

---

### 13. [GAP] Find and Replace
**Impact:** Medium | **Effort:** Small | **ROI: ★★★★☆**

**What:** Search for nodes by label text, with optional replace.
**Why:** Large flowcharts need text search. Lucidchart has Find and Replace. Visio has it. Excalidraw has canvas search. Construction flowcharts often have standardized terminology that needs bulk updating (e.g., changing "GC" to "General Contractor" throughout).
**Competitors:** Visio: full Find & Replace. Lucidchart: Find & Replace. Excalidraw: canvas search. draw.io: search shapes.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (search bar UI + logic)
- **Approach:** `Ctrl+F` opens a search bar. Filter nodes by label text (case-insensitive). Highlight matching nodes with a distinct border. Arrow keys cycle through matches (pan viewport to center on each). Optional "Replace" input for bulk text replacement.
- **Key details:** Use `node.label.toLowerCase().includes(query.toLowerCase())` for matching. Highlight with a yellow/green stroke. "Replace All" iterates all matches and updates labels.
- **Complexity:** ~80 lines for UI + ~20 lines for search/replace logic.
- **Watch out for:** Edge labels should also be searchable. Push undo before replace.

---

### 14. [REFINEMENT] Edge Label Positioning
**Impact:** Medium | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Allow edge labels to be dragged along the edge path, not just fixed at the midpoint.
**Why:** Decision diamond outputs typically need "Yes" and "No" labels near the diamond, not at the midpoint of the connector. Visio allows dragging connector text to any position along the connector. draw.io uses a yellow diamond handle for label positioning. Currently, labels are fixed at the computed midpoint.
**Competitors:** Visio: freely draggable connector text. draw.io: label handle. Lucidchart: label repositioning.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (edge rendering + label drag), `src/tools/flowchart/useFlowchartStore.ts` (edge model)
- **Approach:** Add `labelPosition: number` (0-1, default 0.5) to `DiagramEdge`. Render the label at the interpolated point along the edge path. When the label chip is dragged, compute the nearest point on the edge path and update `labelPosition`.
- **Key details:** For straight edges: simple lerp. For orthogonal edges: walk the segment list. For curved edges: evaluate the bezier at t=labelPosition.
- **Complexity:** ~60 lines for drag handling + position interpolation.
- **Watch out for:** Label should not go past the endpoints (clamp 0.05-0.95).

---

### 15. [UX] Print Button
**Impact:** Medium | **Effort:** Small | **ROI: ★★★★☆**

**What:** A "Print" button that opens the browser print dialog with the flowchart properly formatted.
**Why:** Construction professionals print flowcharts to pin on trailer walls, hand out at meetings, and include in project documentation. Currently there's no print option — users must export to PNG then print. "A print button that opens the browser print dialog with proper page setup is essential."
**Competitors:** Visio: full print with page setup. draw.io: print with page options. Lucidchart: print from export.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (toolbar button + print handler)
- **Approach:** Create a hidden `<iframe>` or `<div>` containing the SVG export of the flowchart on a white background. Call `window.print()` with a print stylesheet that hides everything except the diagram. Use `@media print` CSS to set page size and margins.
- **Key details:** White background (not dark canvas) for printing. Fit diagram to page. Include `@page { size: landscape }` if diagram is wider than tall.
- **Complexity:** ~40 lines.
- **Watch out for:** Browser print dialog differences between Chrome and Edge.

---

### 16. [GAP] Shape Rotation
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Rotate shapes to arbitrary angles (or at least 90° increments).
**Why:** Visio supports arbitrary rotation with a rotation handle. draw.io has `Ctrl+R` for 90° rotation. Some flowchart layouts benefit from rotated shapes, and construction professionals working with process flows sometimes need non-standard orientations.
**Competitors:** Visio: arbitrary rotation. draw.io: 90° rotation via Ctrl+R. Lucidchart: rotation handle.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (rotation handle rendering + drag), `src/tools/flowchart/useFlowchartStore.ts` (node model)
- **Approach:** Add `rotation: number` (degrees, default 0) to `DiagramNode`. Render a rotation handle above the selection. Apply CSS `transform: rotate(Xdeg)` to the SVG group. For keyboard: `Ctrl+R` rotates 90° clockwise. Port positions should rotate with the shape.
- **Key details:** Start with 90° increments only (0, 90, 180, 270). This simplifies port mapping and edge routing.
- **Complexity:** ~100 lines for handle rendering, drag-to-rotate, and transform application.
- **Watch out for:** Edge connection points must rotate with the shape. Export rendering must apply rotation transforms.

---

### 17. [REFINEMENT] Elbow Connectors with Adjustable Segments
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Allow users to drag individual segments of orthogonal (elbow) connectors to reshape them.
**Why:** The current orthogonal routing auto-computes the path, but users can't adjust individual segments. Visio's dynamic connectors have smart handles that let users drag bends. draw.io supports manual waypoint adjustment. This is important when auto-routing produces suboptimal paths.
**Competitors:** Visio: drag segments + smart handles. draw.io: waypoints + segment dragging. Lucidchart: adjustment handles.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (edge segment interaction)
- **Approach:** When an orthogonal edge is selected, show drag handles on each horizontal/vertical segment midpoint. Dragging a handle parallel to the segment direction repositions that segment (and adjusts adjacent segments to maintain orthogonality). Store adjusted segment positions as waypoints.
- **Key details:** Only the dragged segment moves; adjacent segments extend/shrink to compensate. This is fundamentally different from free-form waypoints — it maintains the orthogonal constraint.
- **Complexity:** ~200 lines for segment detection, drag handling, and path recomputation.
- **Watch out for:** Must maintain orthogonality. Segment minimum length enforcement.

---

### 18. [UX] Construction-Specific Templates
**Impact:** Medium | **Effort:** Small | **ROI: ★★★★☆**

**What:** Pre-built flowchart templates for common construction workflows: RFI process, submittal tracking, inspection sequence, safety procedure, permit acquisition.
**Why:** Templates demonstrate immediate value to the target audience. "Construction-specific templates: Pre-built flowcharts for RFI workflows, inspection sequences, safety procedures, and submittal tracking would immediately demonstrate value." The current text-import has 4 generic templates; none are construction-specific.
**Competitors:** Lucidchart: 1000+ templates. draw.io: extensive template library with categories. Visio: starter diagrams.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (template selector in import modal)
- **Approach:** Define 5 construction templates as JSON (nodes + edges arrays). Add a "Construction" category to the existing template dropdown in the Import Text modal. When selected, load the template JSON directly (skip text parsing).
- **Key details:** Templates: (1) RFI Workflow (contractor→architect→engineer→response), (2) Submittal Process (sub→GC→architect→approve/reject), (3) Building Inspection Sequence (foundation→framing→plumbing→electrical→final), (4) Safety Procedure Decision Tree (hazard assessment→controls→PPE), (5) Permit Acquisition (application→review→approved/denied→resubmit).
- **Complexity:** ~200 lines of template data (JSON). ~20 lines of loading logic.
- **Watch out for:** Templates should use auto-layout positioning. Include realistic labels that construction professionals recognize.

---

### 19. [UX] Snap Spacing Guides (Equal Distribution Indicators)
**Impact:** Medium | **Effort:** Small | **ROI: ★★★☆☆**

**What:** When dragging a shape, show guides indicating when the spacing between it and its neighbors matches the spacing between other nearby shapes.
**Why:** The current tool has alignment guides (showing when edges/centers align). Visio's dynamic grid adds spacing guides — showing when gaps between shapes are equal. This is the polish detail that makes manual layout feel precise. "Spacing guides appear when the gap between shapes matches the gap between other nearby shapes."
**Competitors:** Visio: dynamic grid with spacing guides. Lucidchart: smart guides with spacing. draw.io: snap to grid + alignment.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (alignment guide logic in drag handler)
- **Approach:** During node drag, compute distances between all pairs of adjacent nodes. If the gap between the dragged node and its neighbor matches (within 4px) a gap between two other nodes, show a spacing guide (dashed line with distance label). Snap to that spacing.
- **Key details:** Only check horizontal/vertical gaps (not diagonal). Show the gap distance in a small label on the guide line. Color: same blue as existing alignment guides.
- **Complexity:** ~60 lines added to existing alignment guide logic.
- **Watch out for:** Performance with many nodes — limit gap checking to nearby nodes only.

---

### 20. [REFINEMENT] Copy/Paste Style (Format Painter)
**Impact:** Medium | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Copy a shape's style (fill, stroke, font) and apply it to other shapes. `Ctrl+Shift+C` copies style, `Ctrl+Shift+V` applies style.
**Why:** Visio has Format Painter (single-click applies once, double-click applies to many). draw.io has `Ctrl+Shift+C/V` for style copy/paste. Lucidchart has Set Default Style. Making shapes look consistent requires manually setting each property on each shape; format painter makes it one-click.
**Competitors:** Visio: Format Painter. draw.io: Ctrl+Shift+C/V. Lucidchart: Set Default Style.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (keyboard handler + state)
- **Approach:** `Ctrl+Shift+C` on selected node stores `{ fill, stroke, strokeWidth, fontSize, fontColor }` in a `copiedStyle` ref. `Ctrl+Shift+V` applies the stored style to all selected nodes. Show a brief toast "Style copied" / "Style applied."
- **Key details:** Only copies visual style, not label text or position. Works on multi-selection for paste.
- **Complexity:** ~30 lines.
- **Watch out for:** Push undo before applying style.

---

### 21. [GAP] Grouping Shapes
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Select multiple shapes and group them (`Ctrl+G`). Grouped shapes move, resize, and delete as a unit. `Ctrl+Shift+U` to ungroup.
**Why:** Visio, draw.io, and Lucidchart all support grouping. Large flowcharts often have logical sections (e.g., "Pre-Construction Phase", "Construction Phase") that benefit from being grouped. Groups can also be moved as a unit during reorganization.
**Competitors:** Visio: full grouping with nested editing. draw.io: Ctrl+G/Ctrl+Shift+U. Lucidchart: grouping.

**Implementation spec:**
- **Files:** `src/tools/flowchart/useFlowchartStore.ts` (group model), `src/tools/flowchart/FlowchartTool.tsx` (rendering + interaction)
- **Approach:** Add a `groupId: string | null` field to `DiagramNode`. `Ctrl+G` assigns a shared `groupId` to all selected nodes. When any group member is clicked, all members are selected. Moving one moves all. `Ctrl+Shift+U` clears the groupId. Render a subtle dashed border around the group bounding box.
- **Complexity:** ~120 lines for group logic + rendering.
- **Watch out for:** Edges between grouped nodes should stay within the group. Nested groups add significant complexity — start with flat grouping only.

---

### 22. [UX] Dark/Light Mode Toggle
**Impact:** Low | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Toggle between dark canvas (current default) and light canvas (white background, dark shapes) for printing and daytime use.
**Why:** The current dark canvas looks professional on screen but prints as mostly black. Construction sites often have bright lighting where dark UIs are hard to read on tablets. A light mode with white background and dark shapes would be more practical for print and field use.
**Competitors:** draw.io: dark mode toggle. Most competitors default to light mode.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (canvas background + default colors)
- **Approach:** Add a toggle button in the toolbar. Light mode: canvas bg = `#ffffff`, default node fill = `#e8f0fe`, default stroke = `#333333`, text = `#111111`, grid dots = `rgba(0,0,0,0.08)`. Store preference in state. New nodes use the active mode's colors.
- **Complexity:** ~40 lines for toggle + color mapping.
- **Watch out for:** Existing shapes keep their colors unless user explicitly applies a theme/mode.

---

### 23. [GAP] Multi-Page Diagrams
**Impact:** Low | **Effort:** Large | **ROI: ★★☆☆☆**

**What:** Support multiple pages within a single flowchart document, with cross-page navigation.
**Why:** Visio supports multi-page documents with tabbed navigation. draw.io has multi-page with cross-page links. Complex construction processes (entire project lifecycle) span many pages. Off-page reference shapes connect between pages.
**Competitors:** Visio: multi-page with background pages. draw.io: multi-page with tabs.

**Implementation spec:**
- **Files:** Major refactor of store and rendering
- **Approach:** Change the store to hold an array of pages, each with its own nodes/edges/viewport. Add tab bar below canvas for page navigation. Off-page reference shapes link to specific pages.
- **Complexity:** ~500+ lines. Significant architectural change.
- **Watch out for:** Undo/redo must be page-scoped. Export must handle all pages.

---

### 24. [REFINEMENT] Viewport Culling for Large Diagrams
**Impact:** Low | **Effort:** Medium | **ROI: ★★☆☆☆**

**What:** Only render shapes that are within or near the current viewport.
**Why:** tldraw demonstrated 25x performance improvement by setting `display: none` on off-screen shapes. Large construction flowcharts (50+ shapes) could benefit. Currently all shapes render regardless of visibility.
**Competitors:** tldraw: viewport culling with spatial index. Excalidraw: similar approach.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (render loop)
- **Approach:** Before rendering, compute visible bounds from viewport (pan + zoom + canvas size). Filter nodes/edges to only those whose bounding box intersects the visible bounds (with 200px margin). Set `display: none` or skip rendering for off-screen elements.
- **Complexity:** ~40 lines for bounds checking.
- **Watch out for:** Edge rendering — an edge between two off-screen nodes that passes through the viewport must still render.

---

### 25. [GAP] Layers
**Impact:** Low | **Effort:** Large | **ROI: ★★☆☆☆**

**What:** Named layers with show/hide/lock toggles for organizing complex diagrams.
**Why:** Visio has full layer management. draw.io supports layers with visibility controls. Lucidchart has layers. Useful for progressive disclosure (show/hide detail levels) or before/after comparisons.
**Competitors:** Visio: per-page layers with visibility/print/lock/snap/glue/color. draw.io: Ctrl+Shift+L for layers panel. Lucidchart: layer overlay.

**Implementation spec:**
- **Files:** Major addition to store + new LayerPanel component
- **Approach:** Add `layerId: string` to each node/edge. Layer panel lists all layers with checkboxes for visible/locked. Hidden layers' shapes are not rendered. Locked layers' shapes cannot be selected.
- **Complexity:** ~300 lines for layer model + panel + rendering integration.
- **Watch out for:** Undo/redo with layer visibility changes. Default layer for new shapes.

---

### 26. [REFINEMENT] Sketch/Hand-Drawn Mode
**Impact:** Low | **Effort:** Medium | **ROI: ★★☆☆☆**

**What:** A toggle that makes all shapes and connectors render with a rough, hand-drawn aesthetic.
**Why:** Excalidraw's hand-drawn style is wildly popular because it signals "this is a draft." draw.io has a sketch mode. For construction brainstorming sessions, a sketch look lowers the barrier — "teammates are comfortable adding rough ideas instead of worrying about pixel-perfect layouts."
**Competitors:** Excalidraw: 3 roughness levels. draw.io: sketch mode. tldraw: rough.js integration.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (shape rendering)
- **Approach:** Use the `rough.js` library (~10KB) or implement simple path perturbation: add random offsets (±2px) to each path point. Apply to both shape outlines and edge paths. Use a hand-drawn font (or simulated via slight letter spacing variation).
- **Complexity:** ~100 lines for path perturbation + font style switching. rough.js would add ~10KB to bundle but produce better results.
- **Watch out for:** Must still export cleanly. Toggle should not affect existing shape geometry, only rendering.

---

### 27. [UX] Context Menu Enhancements
**Impact:** Low | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Add "Change Shape Type" to the right-click context menu — replace a shape's visual type while preserving connections, label, position, and styling.
**Why:** Visio has "Change Shape" that swaps the visual while preserving everything else. Common scenario: you drew a process rectangle but realize it should be a decision diamond. Currently you must delete and recreate, losing connections.
**Competitors:** Visio: Change Shape. draw.io: Edit Style to change shape.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (context menu)
- **Approach:** Add "Change Shape →" submenu to node context menu. Lists all available shape types. On click, update `node.shape` while preserving all other properties (label, position, size, style, connections).
- **Key details:** May need to adjust size if changing to a shape with very different aspect ratio (e.g., rectangle → circle).
- **Complexity:** ~30 lines for menu item + handler.
- **Watch out for:** Push undo before change. Adjust dimensions if new shape has constraints (e.g., circle should have equal width/height).

---

### 28. [REFINEMENT] Edge Type Quick Toggle
**Impact:** Low | **Effort:** Small | **ROI: ★★★☆☆**

**What:** A toolbar button or keyboard shortcut to quickly cycle edge routing between straight, orthogonal, and curved.
**Why:** Currently edge routing is changed via context menu → submenu. A faster toggle would help when iterating on diagram aesthetics. draw.io has this in the style panel. Having it in the toolbar or as a shortcut speeds up common workflows.
**Competitors:** draw.io: style panel dropdown. Visio: right-click → connector style.

**Implementation spec:**
- **Files:** `src/tools/flowchart/FlowchartTool.tsx` (properties panel or toolbar)
- **Approach:** Add 3 small buttons (straight/orthogonal/curved icons) to the edge properties section of the properties panel. When an edge is selected, clicking a button changes its routing. Add keyboard shortcut `1`/`2`/`3` for route types when an edge is selected.
- **Complexity:** ~20 lines.
- **Watch out for:** Don't conflict with existing keyboard shortcuts.

---

## Research Sources

### Competitors Analyzed
- **Microsoft Visio** — 19 feature categories researched via Microsoft Support docs
- **Lucidchart** — 12 capability areas researched via help.lucid.co, community forums, reviews
- **draw.io (diagrams.net)** — 12 capability areas researched via drawio.com docs, GitHub, reviews
- **Excalidraw** — Features, collaboration, library system via docs.excalidraw.com, GitHub PRs
- **tldraw** — Architecture, performance, UX innovations via tldraw.dev docs, deepwiki analysis

### Libraries Evaluated
- **dagre** (MIT, ~30KB) — Recommended for auto-layout
- **React Flow** (@xyflow, MIT) — Disqualified (React dependency)
- **JointJS** (MPL 2.0, ~503KB) — Viable but heavy
- **GoJS** (Commercial, ~1MB) — Disqualified (license)
- **maxGraph** (Apache 2.0) — Viable but pre-1.0
- **ELK/elkjs** (EPL 2.0, ~1.5MB) — Too large
- **Mermaid.js** (MIT, ~2.8MB) — Too large, non-interactive
- **D3.js** (ISC, ~40-50KB modular) — Viable as rendering layer

### UX Research
- Construction industry workflow patterns (Builder Resources, Procore, Fluix)
- Flowchart UX best practices (Zapier, Slite, Slant reviews)
- Touch target accessibility (WCAG 2.5.8, Material Design)
- Color/styling defaults for professional diagrams (Creately, FlowMapp, ISO standards)
- ISO 5807 flowchart symbol standards
