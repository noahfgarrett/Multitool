# Feature Improvement Report: PDF Annotate

**Date:** 2026-03-16
**Scope:** PDF Annotate (full tool)
**Competitors analyzed:** Bluebeam Revu, PlanGrid/Autodesk Build, Adobe Acrobat Pro, Drawboard PDF

## Executive Summary

18 findings: 8 gaps, 6 refinements, 4 UX improvements
Top recommendation: Image/Photo Stamp tool — all competitors have it, we don't, and construction users need to embed site photos directly onto plans.

## Current Capabilities

**18 tools:** select, pencil, highlighter, rectangle, circle, arrow, line, text, callout, eraser, cloud, measure (distance/polylength/area/count), stamp (preset text), crop, sticky note, OCR region, textHighlight, textStrikethrough

**Measurement:** 4 modes (distance, polylength, area, count), calibration, edge snapping, CSV export

**Export:** PDF (review/final), print, email, markup report

**Session:** Auto-save to sessionStorage, file hash matching for restore

---

## Findings (sorted by ROI)

### 1. [GAP] Image/Photo Stamp — Embed Photos Onto Plans
**Impact:** Critical | **Effort:** Medium | **ROI: ★★★★★**

**What:** Allow users to place images (photos from job site, company logos, detail sketches) directly onto PDF pages as annotations.

**Why:** Every competitor has this. Bluebeam, Adobe, Drawboard, and PlanGrid all support image stamps. Construction users regularly need to embed site photos onto plans to document conditions, attach detail drawings, or place company logos. Currently the only "stamp" option is preset text labels (APPROVED, DRAFT, etc.).

**Competitors:** Bluebeam (custom stamps from any image), Adobe (stamp library + custom), Drawboard (markup library), PlanGrid (photo annotations linked to locations).

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (add image stamp tool), `types.ts` (new annotation type), `drawing.ts` (render image on canvas), `storage.ts` (serialize image data URL)
- **Approach:** Add a new tool type `'imageStamp'` that opens a file picker for PNG/JPG/SVG. On canvas click, place the image at the click point as a resizable annotation. Store the image as a data URL in the annotation object. Render with `ctx.drawImage()` at annotation coordinates.
- **Key details:** Use `loadImage()` from existing `imageProcessing.ts`. Support resize via the same 8-handle system used for text/callout. Export to PDF via `pdfDoc.embedPng/embedJpg()`.
- **Complexity:** ~200 lines. New tool handler + drawing + export integration.
- **Watch out for:** Large images bloating sessionStorage. May need to downscale on import (max 1024px). Data URL size limits in session serialization.

---

### 2. [GAP] Polygon Tool — Closed Multi-Point Shape
**Impact:** High | **Effort:** Small | **ROI: ★★★★★**

**What:** Add a polygon annotation tool (click to place vertices, double-click or click near first vertex to close).

**Why:** Bluebeam, Adobe, and Drawboard all have polygon tools. Construction users need to outline irregular areas (rooms, zones, sections) that aren't rectangular or circular. The cloud tool is similar but draws bumpy edges — a clean polygon is needed.

**Competitors:** All four competitors have this as a standard shape tool.

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (pointer handlers), `types.ts` (add `'polygon'` to ToolType), `drawing.ts` (render polygon)
- **Approach:** Reuse the cloud tool's vertex-placement interaction (click to add points, double-click to close) but render with straight line segments instead of cloud bumps. Fill with configurable fill color (already exists for shapes).
- **Key details:** The cloud tool already implements vertex management, close-on-first-vertex, Backspace-to-undo-vertex. Clone the cloud interaction, swap the drawing from `drawCloudEdge()` to simple `ctx.lineTo()` calls.
- **Complexity:** ~60 lines. Mostly reusing cloud tool patterns.
- **Watch out for:** Need to add polygon to the shapes dropdown, update the DRAW_TOOLS array, and add export support.

---

### 3. [REFINEMENT] Annotation Layers — Toggle Visibility by User/Category
**Impact:** High | **Effort:** Medium | **ROI: ★★★★☆**

**What:** Organize annotations into layers that can be toggled visible/hidden (e.g., "Structural markups", "Electrical notes", "Field photos").

**Why:** Bluebeam's layer support is a major differentiator for complex plans with hundreds of markups from different disciplines. When reviewing large plan sets, being able to hide/show categories of annotations is essential. Currently all annotations are always visible.

**Competitors:** Bluebeam (full layer support with import/export), Adobe (basic layer support via OCGs). Drawboard and PlanGrid have limited layer capabilities.

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (layer state, filter logic, UI panel), `types.ts` (add `layer?: string` to Annotation interface)
- **Approach:** Add an optional `layer` string to each annotation. Default to "Default" layer. Add a layers panel (collapsible sidebar) showing layer names with eye toggle icons. Filter annotations in `redrawPage()` to only render visible layers. Export only visible layers in final mode.
- **Key details:** Keep it simple — flat list of named layers, not nested. Auto-create "Default" layer. New annotations go to the active layer. Layer visibility stored in component state (not per-annotation).
- **Complexity:** ~150 lines for state + panel + filter. Low risk since it's additive.
- **Watch out for:** Session persistence needs to save layer definitions and active layer. Undo/redo should not undo layer visibility toggles.

---

### 4. [GAP] Volume Measurement — Area × Depth
**Impact:** High | **Effort:** Small | **ROI: ★★★★☆**

**What:** After measuring an area, allow the user to enter a depth to compute volume (cubic feet/meters).

**Why:** Bluebeam's volume tool is heavily used by estimators for concrete pours, excavation, fill calculations. Currently we have area measurement but no way to multiply by depth for volume.

**Competitors:** Bluebeam has a dedicated volume tool. No other competitor does.

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (add depth input after area measurement), `measurementDrawing.ts` (display volume), `csvExport.ts` (include volume column)
- **Approach:** After an area polygon is closed, show a small input field in the measurement label area asking for "Depth". Compute volume = area × depth. Display as "Area: X ft² | Volume: Y ft³".
- **Key details:** Use the existing calibration for unit conversion. Store depth as a field on the PolyMeasurement type.
- **Complexity:** ~40 lines. Tiny feature, huge value for estimators.
- **Watch out for:** Unit conversion — if calibration is in inches, depth should also be in inches, and volume displayed in cubic inches (or auto-converted to cubic feet).

---

### 5. [UX] Pressure-Sensitive Pen Strokes
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Use `PointerEvent.pressure` to vary stroke width for freehand drawing tools (pencil, highlighter), producing natural-looking ink.

**Why:** Drawboard's pen experience is their #1 differentiator — pressure-sensitive inking that "feels like real pen on paper." Construction users increasingly use tablets (Surface, iPad) for field markup. The browser's PointerEvent API provides pressure data (0.0-1.0) for free on supported devices.

**Competitors:** Drawboard (full pressure support with back-of-pen eraser). No other construction tool does this well.

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (capture pressure in pointer events), `drawing.ts` (variable-width stroke rendering)
- **Approach:** During pencil/highlighter drawing, capture `e.pressure` on each `pointermove`. Store pressure alongside each point: `{x, y, pressure}`. In `drawSmoothPath()`, vary `ctx.lineWidth` based on pressure (e.g., `baseWidth * (0.3 + pressure * 0.7)`). Use the `perfect-freehand` npm package for beautiful stroke rendering if desired.
- **Key details:** `PointerEvent.pressure` returns 0.5 for mouse clicks (no pressure data). Only vary width when pressure !== 0.5 (indicating a real stylus). Fallback to uniform width for mouse.
- **Complexity:** ~80 lines + optional `perfect-freehand` dependency (~4KB gzipped).
- **Watch out for:** Existing annotation format stores `points: Point[]`. Would need to extend to `{x, y, p?}[]` without breaking existing annotations. Default `p` to `undefined` for backward compat.

---

### 6. [GAP] Dimension Line Tool — Length with Extension Lines
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** A dimension line annotation that shows a measured distance with proper dimension-style rendering (extension lines, arrowheads at endpoints, measurement text centered above the line).

**Why:** Bluebeam's dimension tool is standard for construction drawings. It looks like a proper technical dimension (extension lines at endpoints, measurement text centered) rather than a simple measurement overlay. This is visual — the measurement values are the same, but the rendering matches what users expect on construction plans.

**Competitors:** Bluebeam (full dimension lines), Adobe (basic distance measurement). Drawboard and PlanGrid don't have dedicated dimension tools.

**Implementation spec:**
- **Files:** `measurementDrawing.ts` (new rendering function), `types.ts` (add dimension line render option)
- **Approach:** When rendering a distance measurement, draw extension lines perpendicular to the measurement line at each endpoint (small tick marks). Draw the measurement line between extension lines with arrowheads. Center the calibrated text above the line. This is a rendering-only change — the measurement data is the same as existing distance measurements.
- **Key details:** Extension lines extend 10px past the measurement endpoints, perpendicular to the measurement direction. Use `Math.atan2()` for angle calculation.
- **Complexity:** ~100 lines in rendering code. No new data structures needed.
- **Watch out for:** Text rotation — measurement text should be readable (not upside down) regardless of line angle.

---

### 7. [REFINEMENT] Tool Presets / Custom Tool Library
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Save configured tool settings (color, stroke width, opacity, font) as named presets for quick reuse.

**Why:** Bluebeam's "Tool Chest" is one of its most praised features. Construction users have standard markup conventions (e.g., red 2px for RFI markups, blue 3px for field notes, yellow highlight for specifications). Currently, users must manually adjust properties every time they switch between markup styles.

**Competitors:** Bluebeam (Tool Chest with shareable libraries), Drawboard (Markup Library). Adobe and PlanGrid don't have this.

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (preset state, save/load UI), `types.ts` (ToolPreset interface), `storage.ts` (persist presets to localStorage)
- **Approach:** Add a "Presets" dropdown near the tool buttons. Save current tool configuration (color, stroke width, opacity, font settings) as a named preset. Apply preset with one click. Store in localStorage (separate from session).
- **Key details:** Each preset = `{name, tool, color, strokeWidth, opacity, fontSize?, fontFamily?, fillColor?, dashPattern?}`. Show 5-8 recent presets as quick-access buttons. Full list in dropdown.
- **Complexity:** ~120 lines for state management + UI.
- **Watch out for:** Don't conflate with the existing tool memory (which remembers last-used settings per tool). Presets are explicit, named configurations.

---

### 8. [UX] Smart Alignment Guides During Drag
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Show temporary alignment guides (blue dashed lines) when dragging annotations near other annotations' edges/centers, snapping to alignment.

**Why:** Figma, Excalidraw, and Drawboard all show smart alignment guides when moving objects. This helps users create clean, professional-looking markup layouts without manually aligning. Drawboard's "content snapping" that snaps to PDF geometry is their unique differentiator.

**Competitors:** Drawboard (content snapping to PDF geometry), Figma/Excalidraw (alignment guides between objects). Bluebeam has grid snap but not smart guides.

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (snap detection during drag), `drawing.ts` (render guide lines)
- **Approach:** During annotation drag, compute the moving annotation's edges/center. Compare against all other annotations on the same page. If an edge or center aligns within 5px, snap to it and draw a blue dashed guide line across the canvas. Use the existing edge snapping infrastructure as a pattern.
- **Key details:** Check 5 alignment points per annotation (center, left, right, top, bottom). Draw guides as full-canvas-width dashed lines at the snap position. Remove guides on mouse-up.
- **Complexity:** ~100 lines.
- **Watch out for:** Performance with many annotations (limit comparison to visible annotations).

---

### 9. [REFINEMENT] Markup Summary Panel — Filter/Sort/Search Annotations
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Enhance the annotation list panel with filtering (by type, color, page, layer), sorting (by position, type, date), and search (by text content).

**Why:** Bluebeam's Markups List is a central workflow tool — users filter by author, status, type, or custom columns to review specific categories of markups. The current annotation list shows all annotations but has no filtering or search.

**Competitors:** Bluebeam (full markups list with custom columns, filtering, sorting, CSV export), Adobe (comments panel with filtering). Drawboard and PlanGrid have basic lists.

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (enhance existing annotation list panel)
- **Approach:** Add a filter bar at the top of the annotation list panel with: type filter dropdown (pencil, rectangle, text, etc.), page filter, text search input. Add sort options (by page, by type, by position). Clicking a filtered item still navigates to it on canvas.
- **Key details:** Use the existing `annListOpen` state. Filter is client-side (just filter the annotations array before rendering).
- **Complexity:** ~80 lines for filter/sort UI + logic.
- **Watch out for:** The annotation list already exists — this is enhancement, not creation.

---

### 10. [GAP] PDF Form Filling
**Impact:** Medium | **Effort:** Large | **ROI: ★★☆☆☆**

**What:** Detect and fill interactive form fields (text inputs, checkboxes, radio buttons, dropdowns) embedded in PDF documents.

**Why:** Construction submittals, permit applications, and inspection forms are often fillable PDFs. Adobe Acrobat is the standard for form filling. Currently our tool ignores form fields entirely — users can annotate over them but can't fill them.

**Competitors:** Adobe (full form creation and filling), Bluebeam (form filling + creation). Drawboard and PlanGrid have limited/no form support.

**Implementation spec:**
- **Files:** New module `formFields.ts`, modifications to `PdfAnnotateTool.tsx` for rendering form overlay
- **Approach:** Use pdf.js's `page.getAnnotations()` API to detect form fields. Render HTML input elements positioned over the PDF canvas at form field locations. On export, use pdf-lib's form filling APIs (`pdfDoc.getForm()`, `form.getTextField()`, etc.) to write values into the PDF.
- **Key details:** pdf-lib supports `getForm()`, `getTextField()`, `getCheckBox()`, `getDropdown()`, `getRadioGroup()`. pdf.js provides field positions and types via `getAnnotations()`.
- **Complexity:** ~300+ lines. New rendering layer + export integration. Moderate risk.
- **Watch out for:** Form field coordinate mapping between pdf.js viewport and pdf-lib page coordinates. XFA forms (rarely used in construction) are not supported by pdf-lib.

---

### 11. [UX] Keyboard Shortcut Quick Reference Overlay
**Impact:** Low | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Show a modal/overlay listing all keyboard shortcuts when the user presses `?` or `Shift+?`.

**Why:** The tool has 40+ shortcuts but no discoverable reference. Users have to remember them or read documentation. A quick reference overlay (like VS Code's Ctrl+K Ctrl+S, or Gmail's `?`) is standard in professional tools.

**Competitors:** Most professional tools have this pattern. Bluebeam has keyboard shortcuts in Help menu. Adobe has a shortcuts reference page.

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (add `?` keybind + modal component)
- **Approach:** On `?` keypress (when not editing text), show a modal with a grid of all shortcuts organized by category (Tools, Operations, Navigation, Formatting). Close on Escape or clicking outside.
- **Key details:** Source the shortcuts from the existing `TOOL_SHORTCUTS` map and the keyboard handler. Render as a 2-column grid: shortcut key on left, action on right.
- **Complexity:** ~60 lines for the modal + shortcut data.
- **Watch out for:** Don't trigger while editing text (check `editingTextId` and `findOpen` state).

---

### 12. [REFINEMENT] Snap-to-PDF-Geometry (Content Snapping)
**Impact:** Medium | **Effort:** Large | **ROI: ★★☆☆☆**

**What:** When placing measurements or annotations, snap the cursor to detected edges and intersections in the underlying PDF drawing (walls, lines, corners).

**Why:** Drawboard's content snapping is their top differentiator for AEC users. It enables precise measurements that align exactly with drawing geometry. Currently our edge snapping only works for measurement endpoints using luminance/Sobel detection — extending it to annotation placement would improve precision across the board.

**Competitors:** Drawboard (content snapping for all tools). Bluebeam has limited snap capabilities.

**Implementation spec:**
- **Files:** `edgeSnapping.ts` (extend to general use), `PdfAnnotateTool.tsx` (integrate snap into drag handlers)
- **Approach:** The existing edge snapping in `edgeSnapping.ts` uses Sobel edge detection on canvas pixels. Extend this to run during annotation drag/placement — when the cursor is within 10px of a detected edge, snap to it. Cache edge maps per page/zoom to avoid recomputation.
- **Key details:** Currently edge snapping only fires on measurement endpoint click. Would need to run on every pointermove during drag, which requires caching the edge map. Use `OffscreenCanvas` or `requestIdleCallback` for background edge detection.
- **Complexity:** ~200 lines. Performance-sensitive — need efficient caching.
- **Watch out for:** Edge detection is expensive on large construction drawings. Must be optional (toggle) and lazily computed.

---

### 13. [UX] Double-Click Annotation to Edit Properties
**Impact:** Low | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Double-clicking a shape annotation (rectangle, circle, line, arrow, cloud) opens an inline properties popover for quick editing (color, stroke, opacity, fill).

**Why:** Currently you must select the annotation and then modify properties in the toolbar. A double-click popover (like Figma's) provides faster access without moving the mouse to the toolbar. Text/callout already has double-click-to-edit — extending this pattern to shapes is natural.

**Competitors:** Figma, Excalidraw (double-click to edit), Drawboard (radial menu near cursor).

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (double-click handler for shapes), `FloatingToolbar.tsx` (adapt for inline use)
- **Approach:** On double-click of a non-text annotation, show a small floating panel near the cursor with color, stroke width, opacity, and fill controls. Reuse the `FloatingToolbar` component or a subset of the properties bar.
- **Key details:** The double-click detection already exists (`dblClickRef`). Just need to check if the hit annotation is a shape type, then show a positioned popover.
- **Complexity:** ~50 lines to wire up the interaction + position the popover.
- **Watch out for:** Don't conflict with text/callout double-click-to-edit behavior.

---

### 14. [GAP] Revision Cloud with Status
**Impact:** Medium | **Effort:** Small | **ROI: ★★☆☆☆**

**What:** Enhance the existing cloud tool with revision-specific metadata: revision number, date, description, and status (Issued, Revised, Approved).

**Why:** Revision clouds in construction are not just shapes — they carry revision metadata. Bluebeam and other tools allow users to associate revision information with cloud markups for tracking changes across plan versions.

**Competitors:** Bluebeam (revision tracking with clouds), Adobe (basic cloud shape, no revision data).

**Implementation spec:**
- **Files:** `types.ts` (add revision fields to Annotation), `PdfAnnotateTool.tsx` (revision input on cloud creation), `drawing.ts` (render revision label inside cloud)
- **Approach:** When a cloud annotation is created, show an optional popover for revision number and description. Store as `revisionNumber?: string` and `revisionNote?: string` on the annotation. Render the revision number as a small label inside the cloud shape.
- **Key details:** Keep it optional — users can dismiss the popover and create a plain cloud. Export the revision text in markup reports.
- **Complexity:** ~60 lines.
- **Watch out for:** Don't make it intrusive — the cloud tool should still be fast for quick markup.

---

### 15. [REFINEMENT] Export Markup Summary as Standalone PDF Report
**Impact:** Medium | **Effort:** Small | **ROI: ★★☆☆☆**

**What:** The existing markup report (`markupReport.ts`) generates a PDF summary of all annotations. Enhance it with: thumbnail preview per annotation, page reference, filtering by type/page, and a cover page with document info.

**Why:** Bluebeam's markup summary export is used for formal review documentation. The current report is basic — enhancing it with thumbnails and structured formatting makes it more useful for formal submittals.

**Competitors:** Bluebeam (detailed markup summary with custom columns), Adobe (comment summary).

**Implementation spec:**
- **Files:** `markupReport.ts` (enhance formatting + add thumbnails)
- **Approach:** For each annotation, capture a small screenshot of the annotation area (crop the canvas around the annotation bounds). Include this thumbnail in the PDF report next to the annotation description. Add a cover page with document name, date, author, and annotation count summary.
- **Key details:** Use the existing `getAnnotationBounds()` function from `geometry.ts` to compute crop regions. Render thumbnail via `canvas.getImageData()` at annotation bounds.
- **Complexity:** ~100 lines.
- **Watch out for:** Thumbnail generation for 100+ annotations could be slow. Consider generating on-demand during export, not upfront.

---

### 16. [GAP] Multi-Select + Bulk Property Change
**Impact:** Medium | **Effort:** Medium | **ROI: ★★☆☆☆**

**What:** Select multiple annotations (Shift+Click or drag-select) and change their properties (color, stroke, opacity) all at once.

**Why:** When reviewing a plan with 50+ markups, needing to change each annotation's color individually is tedious. All professional tools support multi-select with bulk property editing.

**Competitors:** Bluebeam (full multi-select with group operations), Adobe (multi-select with bulk properties), Drawboard (limited multi-select).

**Implementation spec:**
- **Files:** `PdfAnnotateTool.tsx` (multi-select state, drag-to-select rectangle, bulk property handlers)
- **Approach:** Add a `selectedAnnIds: Set<string>` state alongside the existing `selectedAnnId`. Shift+Click to add to selection. Drag-to-select with the select tool (draw selection rectangle). When multiple are selected, property changes apply to all.
- **Key details:** Render a blue selection highlight around all selected annotations. The properties bar shows common properties (or "mixed" if values differ). Delete key deletes all selected.
- **Complexity:** ~150 lines for selection management + 50 lines for bulk property application.
- **Watch out for:** Undo/redo needs to handle bulk operations as a single undo step.

---

### 17. [UX] Radial/Pie Menu for Quick Tool Access
**Impact:** Low | **Effort:** Medium | **ROI: ★★☆☆☆**

**What:** A circular floating menu (like Drawboard's radial menu) that appears on right-click or long-press, showing frequently used tools around the cursor.

**Why:** Drawboard's radial menu is their signature UX element — it keeps the user's hand near the work area instead of reaching to the toolbar. For stylus/tablet users, this is especially valuable.

**Competitors:** Drawboard (radial menu with 8 customizable slots).

**Implementation spec:**
- **Files:** New component `RadialMenu.tsx`, integrate into `PdfAnnotateTool.tsx`
- **Approach:** On configurable gesture (long-press or middle-click), show an 8-slot circular menu centered on the cursor. Slots contain the most-used tools (pencil, highlighter, text, select, eraser, cloud, measure, undo). Moving toward a slot and releasing selects it.
- **Key details:** CSS `transform: rotate()` for positioning slots in a circle. Highlight the slot nearest to the pointer. Close on release.
- **Complexity:** ~150 lines for the component + interaction logic.
- **Watch out for:** Don't conflict with right-click context menu. Use middle-click or a dedicated gesture.

---

### 18. [GAP] PDF Page Comparison / Overlay
**Impact:** High | **Effort:** Large | **ROI: ★★☆☆☆**

**What:** Compare two versions of a plan by overlaying them with color-coded differences (e.g., old revision in red, new in blue, unchanged in gray).

**Why:** Bluebeam's Batch Overlay is one of its most-used features in construction — when a revised plan set arrives, users need to quickly identify what changed. This is a major differentiator that no lightweight web tool offers.

**Competitors:** Bluebeam (Batch Overlay with color-coded layers), PlanGrid (basic side-by-side comparison).

**Implementation spec:**
- **Files:** New module/component for comparison view
- **Approach:** Upload two PDFs (old and new revision). Render both pages to canvases at the same scale. Compute pixel differences using ImageData comparison. Display as a color-coded overlay: pixels only in old version → red, only in new → blue, unchanged → gray. Provide a slider to adjust overlay opacity.
- **Key details:** Use `getImageData()` on both canvases and compare pixel-by-pixel. For construction drawings (high contrast black-on-white), a simple luminance threshold works well.
- **Complexity:** ~400+ lines. Separate view/mode from annotation. Significant effort but huge construction value.
- **Watch out for:** Page alignment — if the two PDFs aren't exactly the same dimensions or have slight offsets, the comparison will be noisy. May need manual alignment controls.

---

## Research Sources

### Competitors
- Bluebeam Revu: Markup tools, measurement/calibration, Studio Sessions, batch tools, Tool Chest, user reviews (Capterra 4.7/5, G2 4.6/5)
- PlanGrid/Autodesk Build: Mobile-first markup, pushpin annotations, plan versioning, RFI/submittal linking
- Adobe Acrobat Pro: Full annotation suite, true content editing, accessibility tools, form creation
- Drawboard PDF: Radial menu, content snapping, pressure-sensitive inking, measurement tools

### Technical
- `PointerEvent.pressure` — W3C specification, baseline-available in all modern browsers since July 2020. Returns 0-1 float for stylus, 0.5 for mouse.
- `perfect-freehand` (by Steve Ruiz / tldraw) — ~3KB, zero dependencies. Takes `[x, y, pressure][]` points, returns polygon outline for variable-width strokes. Has `simulatePressure: true` mode that derives pressure from velocity (works with mouse too). Used by tldraw, Excalidraw, and many other drawing tools.
- `pdf-lib` form filling — `PDFDocument.getForm()` already supports `getTextField()`, `getCheckBox()`, `getDropdown()`, `getRadioGroup()`, `getOptionList()`, `getButton()`. Can `flatten()` forms to bake values permanently. Full XFA form support.
- `@signpdf/placeholder-pdf-lib` + `@signpdf/signpdf` — Cryptographic PDF signing (PKCS#7 with X.509 certificates). Visual signature stamps are simpler — just embed an image with pdf-lib's `page.drawImage()`.
- `OffscreenCanvas` — Supported in Chrome 69+, Edge 79+, Firefox 105+, Safari 16.4+. Can offload annotation rendering to web workers via `canvas.transferControlToOffscreen()`. pdf.js worker already handles parsing but rendering is still main-thread.
- `pdf.js` `page.getAnnotations()` — Returns form field types and positions for interactive form detection.
- Excalidraw snapping algorithm — Collects all snap targets (centers, edges, midpoints) from non-dragged shapes, checks proximity on each mouse move, snaps when distance < threshold (5-8px), renders dashed guide lines independently on X and Y axes.
- Hybrid SVG+Canvas — tldraw uses SVG for shapes + Canvas for freehand. SVG gives crisp zoom + free hit-testing + DOM events; Canvas gives real-time freehand performance. Migration path: render structured annotations as SVG elements over the PDF canvas.

### UX Patterns
- Figma: Smart alignment guides during drag, double-click to edit
- Excalidraw: Multi-select with bulk properties, alignment snapping
- Drawboard: Radial menu, content snapping, pressure-sensitive inking
- Bluebeam: Tool Chest presets, Markups List filtering, revision clouds with metadata
