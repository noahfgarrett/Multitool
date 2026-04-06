# Full App Improvement Audit: LotusWorksToolkit
**Date:** 2026-03-23
**Scope:** Full app audit — all 15 tools + new tool ideas + cross-cutting UX
**Competitors analyzed:** Bluebeam Revu, PlanSwift, Adobe Acrobat Pro, Foxit PDF Editor, Smallpdf, iLovePDF, PDF24, Canva, Procore, Fieldwire

## Executive Summary

**75 findings:** 30 new tool ideas, 22 feature gaps, 14 refinements, 9 UX improvements
**Top recommendation:** Construction Material Calculator — daily use by every estimator, pure math, small effort, massive impact.

The audit reveals three strategic themes:
1. **New construction-specific tools** (calculators, trackers, punch lists) would transform this from a PDF toolkit into a construction professional's daily driver
2. **Table-stakes PDF features** (password protection, e-signatures, page numbers, redaction) are expected by users who compare against Adobe/Smallpdf
3. **App-wide UX** (command palette, favorites, global file drop) would dramatically improve navigation as the tool count grows

---

## Part A: New Tool Ideas (sorted by ROI)

### A1. [NEW TOOL] Construction Material Calculator ★★★★★
**Impact:** Critical | **Effort:** Small | **Category:** Utilities

**What:** Unified calculator for concrete (cubic yards), lumber (board feet), drywall (sheets), paint (gallons), tile/flooring (SF with waste factor), roofing, gravel/fill, rebar spacing and weight. Imperial + metric. Outputs a material list with optional cost column.
**Why:** Estimators and field engineers do these calculations dozens of times daily. Currently done with $40 physical calculators or fragmented websites. Every competitor analysis confirms this is the #1 missing utility for construction users.
**Competitors:** Calculated Industries (hardware), Omni Calculator (web, but generic), PlanSwift (embedded in takeoff).

**Implementation spec:**
- **Files:** New `src/tools/material-calculator/MaterialCalculatorTool.tsx`, register in `registry.ts`
- **Approach:** Tab-based UI with one tab per material type (Concrete, Lumber, Drywall, Paint, Flooring, Roofing, Aggregate, Rebar). Each tab has dimension inputs, computes quantities, shows formula. Summary tab aggregates all calculations with optional unit cost column. Export to PDF/CSV.
- **Key details:** Pure math — no npm dependencies needed. Use existing pdf-lib for PDF export. Formulas: concrete = L×W×D/27 CY, board feet = T×W×L/12, drywall sheets = wall area / 32 SF, paint gallons = area / coverage rate / coats.
- **Complexity:** ~800-1200 lines. 8 calculator tabs + summary + export.
- **Watch out for:** Imperial fractions (feet-inches like 10'-6") need a parser. Waste factor percentages vary by material.

---

### A2. [NEW TOOL] Construction Unit Converter ★★★★★
**Impact:** High | **Effort:** Small | **Category:** Utilities

**What:** Convert between construction-specific units: feet-inches fractions ↔ decimal feet ↔ meters, architectural scale conversions (1/4"=1'-0"), area (SF/SY/SM/acres), volume (CY/CF/CM/gallons/liters), weight (tons/lbs/kg), pressure (PSI/kPa/MPa), slope/pitch (rise:run ↔ degrees ↔ percentage), nominal ↔ actual lumber sizes.
**Why:** Construction uses a bewildering mix of imperial, metric, and trade-specific units. Generic converters don't understand architectural scales or nominal lumber dimensions.
**Competitors:** No construction-specific converter exists as a standalone tool.

**Implementation spec:**
- **Files:** New `src/tools/unit-converter/UnitConverterTool.tsx`, register in `registry.ts`
- **Approach:** Category tabs (Length, Area, Volume, Weight, Pressure, Slope/Pitch, Scale, Lumber). Bidirectional instant conversion — type in any field, all others update live. Include a "favorites" section for frequently used conversions.
- **Key details:** Pure math, zero dependencies. Feet-inches parser: regex `(\d+)'-?(\d+)"?(?:\s*(\d+)/(\d+))?`. Architectural scales: lookup table of standard scales.
- **Complexity:** ~500-700 lines. Could be combined with Material Calculator or kept separate.
- **Watch out for:** Feet-inches fraction input needs intuitive UX (e.g., "10-6-3/8" or "10' 6 3/8\"").

---

### A3. [NEW TOOL] Digital Signature Tool ★★★★★
**Impact:** High | **Effort:** Small | **Category:** Utilities

**What:** Draw, type, or upload a signature. Export as transparent PNG. Save signatures for reuse. Place signatures onto PDFs via the existing PDF Annotate image stamp workflow.
**Why:** E-signatures are a table-stakes feature across all PDF competitors (Adobe, Foxit, Smallpdf, iLovePDF, PDF24). Field workers need to sign change orders, daily reports, and inspection forms constantly. The `signature_pad` library is already installed.
**Competitors:** Every PDF tool has this. Adobe Sign is the market leader.

**Implementation spec:**
- **Files:** New `src/tools/signature/SignatureTool.tsx`, register in `registry.ts`
- **Approach:** Three modes: (1) Draw with mouse/touch/stylus using existing `signature_pad` dependency, (2) Type name and render in script fonts (use Canvas font rendering with 4-5 built-in script styles), (3) Upload image. Color picker for ink color. Pen thickness slider. Save to localStorage for reuse across sessions. Export as transparent PNG. "Send to PDF Annotate" button that opens PDF Annotate with the signature pre-loaded as an image stamp.
- **Key details:** `signature_pad` v5.1.3 already in package.json. Canvas `toDataURL('image/png')` for export. Store saved signatures as base64 in localStorage under `lwt-signatures`.
- **Complexity:** ~400-600 lines. Library already installed — mostly UI work.
- **Watch out for:** Script font rendering varies by browser. Bundle 2-3 web fonts or use Canvas path-based text rendering.

---

### A4. [NEW TOOL] Punch List Generator ★★★★☆
**Impact:** Critical | **Effort:** Medium | **Category:** Documents

**What:** Upload floor plans/photos, pin punch list items to locations with descriptions, priority (high/medium/low), trade assignment, status (open/in-progress/resolved/closed), and photo attachments. Filter/sort by status, trade, or location. Export to a polished PDF report grouped by trade or status.
**Why:** Punch lists are used on every single construction project during closeout. Currently done with paper clipboards or expensive SaaS (Fieldwire $39/user/mo, Procore $$$). This is the single most universal construction workflow after document markup. Bluebeam, Procore, and Fieldwire all have this.
**Competitors:** Fieldwire, Procore, Bluebeam (all $$$). No free offline tool exists.

**Implementation spec:**
- **Files:** New `src/tools/punch-list/PunchListTool.tsx`, `types.ts`, `export.ts`, register in `registry.ts`
- **Approach:** Two-panel layout: left = uploaded plan/photo with pin overlay (reuse Konva.js pattern from PDF Annotate), right = item list with filters. Click plan to place pin, opens item form. Items have: number (auto-increment), description, trade (dropdown), priority, status, assignee, photo attachments (FileReader API), notes. Grid/list view toggle. Export generates PDF with plan thumbnail + pin legend + item table.
- **Key details:** Pin placement uses Canvas 2D overlay (same pattern as PDF Annotate annotations). PDF export via pdf-lib. Photo attachments stored as base64 data URLs.
- **Complexity:** ~1500-2000 lines. Moderate complexity — the pin-on-image pattern already exists in the codebase.
- **Watch out for:** Memory management with many photo attachments. Compress photos on attachment (reuse existing image compression logic from `compression.ts`).

---

### A5. [NEW TOOL] Daily Report Builder ★★★★☆
**Impact:** Critical | **Effort:** Medium | **Category:** Documents

**What:** Structured form for construction daily reports: date, weather conditions (temp, precip, wind), crew counts by trade, equipment on site, work performed summary, safety incidents, visitor log, material deliveries, delays/issues, and photo attachments. Generates a professional PDF report.
**Why:** Daily reports are legally required documentation on most construction projects. Raken built a $100M+ business on this alone. Field superintendents currently use paper forms. A free, offline tool would be immediately adopted.
**Competitors:** Raken ($16/user/mo), Procore (bundled), Fieldwire (bundled). No free standalone tool exists.

**Implementation spec:**
- **Files:** New `src/tools/daily-report/DailyReportTool.tsx`, `types.ts`, `templates.ts`, `export.ts`, register in `registry.ts`
- **Approach:** Section-based form: Project Info header (project name, number, date, weather — persisted across reports), then expandable sections for each category. Trade crew section is a table with trade name + headcount + hours columns. "Add Row" buttons for dynamic sections. Photo attachment per section. Export to branded PDF using pdf-lib. Save/load reports in localStorage/IndexedDB. Pre-built templates: General Contractor, Concrete, Electrical, Mechanical.
- **Key details:** Reuse the Form Builder's PDF export patterns. Use existing photo compression from `compression.ts`. Store report templates as JSON.
- **Complexity:** ~1200-1600 lines. Form-based — straightforward but many fields.
- **Watch out for:** PDF layout needs to handle variable-length sections gracefully. Weather section should remember last entry for auto-fill.

---

### A6. [NEW TOOL] RFI Tracker ★★★★☆
**Impact:** High | **Effort:** Medium | **Category:** Documents

**What:** Create, number, and track Requests for Information. Fields: RFI number (auto-increment), question, drawing/spec reference, date submitted, date required, assigned to, response, status (open/pending/answered/closed), cost/schedule impact. Filter/sort/search. Export full log or individual RFIs to PDF.
**Why:** RFIs are generated on every construction project (dozens to thousands per project). Most teams track them in error-prone Excel spreadsheets. A structured tracker with PDF export fills a real gap for small-to-mid contractors who can't afford Procore ($$$).
**Competitors:** Procore, PlanGrid (now Autodesk Build). Both expensive. Excel templates are the common alternative.

**Implementation spec:**
- **Files:** New `src/tools/rfi-tracker/RfiTrackerTool.tsx`, `types.ts`, `export.ts`, register in `registry.ts`
- **Approach:** Data grid layout using `@tanstack/react-table` (already installed). CRUD modal for creating/editing RFIs. Status badges with color coding. Column sorting, text search, status filter. Individual RFI export as formatted PDF. Full log export as PDF table or CSV/Excel. Persist in IndexedDB for durability. Import from CSV/Excel for migrating existing logs.
- **Key details:** Reuse `@tanstack/react-table` for the grid. PDF export via pdf-lib. Excel export via exceljs (already installed). Auto-number: `RFI-001`, `RFI-002`, etc.
- **Complexity:** ~1000-1400 lines. The "tracker" pattern is reusable — build this first, then Submittal Tracker and Change Order Tracker follow the same architecture.
- **Watch out for:** IndexedDB schema versioning for future field additions. Need a good import/export format for data portability.

---

### A7. [NEW TOOL] Submittal Tracker ★★★★☆
**Impact:** High | **Effort:** Small (after RFI Tracker) | **Category:** Documents

**What:** Track submittals through their lifecycle: spec section, description, subcontractor, date submitted, date required, review status (approved/approved-as-noted/revise-resubmit/rejected), reviewer, transmittal number. Generate transmittal cover sheets and submittal log PDF reports.
**Why:** Submittal tracking is mandatory on commercial construction projects. Teams currently use Excel templates. Directly complements the RFI Tracker — same architecture, different fields.
**Competitors:** Procore, Smartsheet templates. No free standalone tool.

**Implementation spec:**
- **Files:** New `src/tools/submittal-tracker/SubmittalTrackerTool.tsx` — reuse the tracker architecture from RFI Tracker
- **Approach:** Same grid + CRUD + filter + export pattern as RFI Tracker. Additional feature: "Generate Transmittal" button creates a formatted cover sheet PDF with sender/recipient, document list, and purpose checkbox (For Approval / For Information / For Review / As Requested).
- **Complexity:** ~800-1000 lines if tracker infrastructure is shared from RFI Tracker.
- **Watch out for:** Transmittal cover sheet layout is standardized in the industry — match the AIA G810 format.

---

### A8. [NEW TOOL] Change Order Tracker ★★★★☆
**Impact:** High | **Effort:** Small (after RFI Tracker) | **Category:** Documents

**What:** Create change order forms with CO number, date, description, reason code, cost breakdown (labor, material, equipment, subcontractor, overhead, profit), schedule impact (days added/removed), and approval signatures. Track COs in a log with running cost total and schedule impact summary.
**Why:** Change orders happen on virtually every project and are a major source of disputes. A structured generator with automatic cost calculations and PDF output reduces errors and professionalizes the process.
**Competitors:** Procore, Excel templates. No free standalone tool.

**Implementation spec:**
- **Files:** New `src/tools/change-order/ChangeOrderTool.tsx` — reuse tracker architecture
- **Approach:** Same grid + CRUD pattern. Additional: cost breakdown table with auto-sum, markup percentage calculation, running total across all COs. Export individual CO as formatted PDF with cost table + signature block (integrate with Signature Tool). Full log export.
- **Complexity:** ~900-1200 lines with shared tracker infrastructure.
- **Watch out for:** Cost calculations need proper decimal handling (use integer cents internally). Markup calculation order matters (overhead on subtotal, then profit on overhead+subtotal).

---

### A9. [NEW TOOL] Photo Markup Tool ★★★★☆
**Impact:** High | **Effort:** Small-Medium | **Category:** Images

**What:** Load site photos and annotate them with arrows, circles, rectangles, text labels, numbered markers, freehand drawing, and measurement callouts. Export annotated photos as PNG/JPG. Batch process multiple photos.
**Why:** Photo documentation with markup is critical for punch lists, safety issues, quality control, and RFI clarification. Field teams currently use phone markup tools with limited capabilities. This directly extends the existing Images category with the annotation engine already built for PDF Annotate.
**Competitors:** Procore (bundled), Raken (bundled). Markup Hero ($4/mo). No free offline tool.

**Implementation spec:**
- **Files:** New `src/tools/photo-markup/PhotoMarkupTool.tsx`, register in `registry.ts`
- **Approach:** Simplified version of PDF Annotate's canvas-based annotation system. Load image onto Canvas, provide toolbar with: arrow, rectangle, circle, line, text, freehand, numbered marker. Color picker, stroke width. Undo/redo. Export as PNG with annotations flattened. Batch mode: load multiple photos, annotate each, export all as ZIP.
- **Key details:** Reuse drawing patterns from `pdf-annotate/drawing.ts`. Use Canvas 2D API directly (no need for Konva.js). The perfect-freehand library (already installed) handles smooth pen strokes.
- **Complexity:** ~800-1200 lines. Much of the drawing logic exists in PDF Annotate.
- **Watch out for:** High-res photos (4000x3000+) need canvas dimension capping. Reuse the existing hard-cap pattern from PDF Annotate.

---

### A10. [NEW TOOL] Text Diff / Compare Tool ★★★★☆
**Impact:** High | **Effort:** Medium | **Category:** Utilities

**What:** Paste or upload two text files/documents. Side-by-side diff view with synchronized scrolling. Inline diff view. Line-level and word-level granularity toggle. Statistics (lines added/removed/changed). Export diff as PDF or HTML.
**Why:** Comparing spec revisions and contract changes is a daily task in construction. Currently requires expensive tools or manual side-by-side reading. Pairs naturally with the existing document tools.
**Competitors:** No offline text diff tool exists. Online tools (Diffchecker) require internet. Adobe has PDF Compare but at $$$/year.

**Implementation spec:**
- **Files:** New `src/tools/text-diff/TextDiffTool.tsx`, register in `registry.ts`
- **Approach:** Two text areas (paste or file upload for .txt/.md/.csv). Use the `diff` npm library (jsdiff, ~48KB) for computation. Render with color-coded additions (green) and deletions (red). Toggle between side-by-side and inline modes. Synchronized scroll in side-by-side mode. Summary statistics bar. Export highlighted diff as PDF.
- **Key details:** New dependency: `diff` (MIT, ~48KB, no sub-dependencies). Rendering: map diff hunks to styled `<span>` elements. Side-by-side uses CSS grid with synchronized `onScroll`.
- **Complexity:** ~700-1000 lines.
- **Watch out for:** Large files (10k+ lines) need virtualized rendering. Use `@tanstack/react-virtual` (already installed).

---

### A11. [NEW TOOL] Gantt Chart / Project Schedule ★★★☆☆
**Impact:** Critical | **Effort:** Large | **Category:** Creators

**What:** Create construction project schedules with tasks, durations, start/finish dates, dependencies (FS/FF/SS/SF with lag), milestones, and critical path highlighting. Organize by CSI division or custom WBS. Export to PDF. Import/export CSV.
**Why:** Scheduling is fundamental to construction. MS Project costs $700+, Primavera costs thousands. Small contractors need a lightweight scheduling tool. The Gantt chart is the universal language of construction scheduling.
**Competitors:** MS Project ($$$), Primavera ($$$), Frappe Gantt (open-source library).

**Implementation spec:**
- **Files:** New `src/tools/gantt-chart/GanttChartTool.tsx`, `types.ts`, `criticalPath.ts`, `export.ts`, register in `registry.ts`
- **Approach:** Use Frappe Gantt (MIT, zero deps, ~50KB) or build custom with SVG. Task list panel (left) + timeline bar chart (right). Drag to reschedule. Click to edit task details. View modes: day/week/month/quarter. Critical path: topological sort + forward/backward pass algorithm. Milestones as diamond markers. Export as PDF (landscape) and CSV.
- **Key details:** New dependency: `frappe-gantt` (MIT, 0 deps, ~50KB). Critical path algorithm is ~100 lines of topological sort + slack calculation.
- **Complexity:** ~2000-2500 lines. This is the most complex new tool but also the most impressive.
- **Watch out for:** Gantt UX is notoriously complex. Start with a simple version (tasks + dependencies + view modes) and iterate.

---

### A12. [NEW TOOL] Meeting Minutes Generator ★★★☆☆
**Impact:** Medium | **Effort:** Small-Medium | **Category:** Documents

**What:** Structured template for OAC meetings: attendees, agenda items, discussion notes, decisions made, action items with assignee and due date, next meeting date. Track action items across meetings. Export to PDF.
**Why:** Weekly OAC meetings happen on every commercial project. Meeting minutes are contractual documents. Currently done in Word with inconsistent formatting.
**Competitors:** No standalone tool. Word/Google Docs templates are the standard.

**Implementation spec:**
- **Files:** New `src/tools/meeting-minutes/MeetingMinutesTool.tsx`, register in `registry.ts`
- **Approach:** Section-based form: Meeting Info (project, date, location, attendees table), Agenda Items (numbered, with discussion notes), Action Items (description, assignee, due date, status), Next Meeting. Auto-carry forward open action items from previous meetings. Export to branded PDF. Save/load meetings in IndexedDB.
- **Complexity:** ~800-1100 lines.
- **Watch out for:** Action item carry-forward requires linking meetings by project. Keep the data model simple.

---

### A13. [NEW TOOL] SOV / AIA Billing Generator ★★★☆☆
**Impact:** High | **Effort:** Medium | **Category:** Creators

**What:** Build a Schedule of Values with line items, original contract values, change orders, percentage complete, previous billings, current billing, retainage, and balance to finish. Auto-calculate AIA G702/G703-style payment applications. Export to PDF matching industry-standard format.
**Why:** Every contractor on every commercial project submits monthly pay applications. The SOV/AIA billing process is standardized but tedious. Small contractors fill out G702/G703 forms by hand or in Excel.
**Competitors:** Procore (bundled), Excel templates. No free standalone tool.

**Implementation spec:**
- **Files:** New `src/tools/sov-billing/SovBillingTool.tsx`, `types.ts`, `export.ts`, register in `registry.ts`
- **Approach:** Spreadsheet-like grid using `@tanstack/react-table` for the G703 continuation sheet (line items). Auto-calculating header page (G702 summary). Retainage calculation. Period-over-period tracking (save multiple billing periods). PDF export matching the standard AIA G702/G703 layout.
- **Complexity:** ~1500-2000 lines.
- **Watch out for:** The AIA form layout is very specific — the PDF export must match exactly for contractors to use it with confidence.

---

### A14. [NEW TOOL] Transmittal Cover Sheet Generator ★★★☆☆
**Impact:** Medium | **Effort:** Small | **Category:** Documents

**What:** Generate professional transmittal cover sheets for sending documents between parties. Fields for to/from, project, date, transmittal number (auto-increment), list of enclosed documents (with quantities and format), purpose checkboxes (for approval/for information/for review/as requested), and remarks.
**Why:** Every document exchange in construction is accompanied by a transmittal. Currently uses Word templates. A quick generator with auto-numbering and PDF export saves daily time for project coordinators.
**Competitors:** No standalone tool exists. Usually a feature within Procore/Bluebeam.

**Implementation spec:**
- **Files:** New `src/tools/transmittal/TransmittalTool.tsx`, register in `registry.ts`
- **Approach:** Simple form: header (to, from, project, date, transmittal #), document table (description, copies, format, purpose), remarks textarea. Auto-number transmittals. Save project info for reuse. Export to PDF.
- **Complexity:** ~400-600 lines. Very straightforward.
- **Watch out for:** Numbering sequence should persist in localStorage per project.

---

### A15. [NEW TOOL] Kanban / Task Board ★★★☆☆
**Impact:** Medium-High | **Effort:** Medium | **Category:** Creators

**What:** Customizable column-based task board (To Do → In Progress → Done, or custom columns). Drag cards between columns. Card details: title, description, priority, due date, assignee, color label. Export board as JSON. Print-friendly view.
**Why:** Punch lists in construction are essentially kanban boards. The `@dnd-kit` library is already installed, making this very feasible. Lightweight alternative to Trello/Asana for field teams.
**Competitors:** Trello (free tier), Asana, Monday.com. All require internet.

**Implementation spec:**
- **Files:** New `src/tools/kanban/KanbanTool.tsx`, register in `registry.ts`
- **Approach:** Use `@dnd-kit/core` + `@dnd-kit/sortable` (already installed) for drag-and-drop. Columns rendered as vertical drop zones. Card component with color-coded priority. Column CRUD (add/rename/delete/reorder). Export/import JSON. Print CSS for field distribution.
- **Complexity:** ~1000-1400 lines. `@dnd-kit` handles the hard part.
- **Watch out for:** Card count per column could get large — may need virtualized rendering.

---

### A16. [NEW TOOL] Safety Inspection Checklist ★★★☆☆
**Impact:** High | **Effort:** Medium | **Category:** Utilities

**What:** OSHA-aligned safety inspection checklists: fall protection, scaffolding, excavation, electrical, PPE, housekeeping, fire prevention. Check/fail/NA per item, add photos and notes for deficiencies, assign corrective actions. Generate signed inspection report PDF.
**Why:** Safety inspections are legally required and happen daily/weekly on every jobsite. SafetyCulture and GoAudits charge per user. A free offline checklist tool with PDF export and signature would be immediately useful.
**Competitors:** SafetyCulture/iAuditor ($24/user/mo), GoAudits. No free standalone tool.

**Implementation spec:**
- **Files:** New `src/tools/safety-checklist/SafetyChecklistTool.tsx`, `templates.ts`, register in `registry.ts`
- **Approach:** Template-based: select a checklist template, each item has Pass/Fail/NA radio, notes field, photo attachment. Summary scores (% pass, # deficiencies). Corrective action assignment per deficiency. Inspector signature (integrate with Signature Tool). Export to PDF with photos embedded.
- **Complexity:** ~1200-1500 lines.
- **Watch out for:** OSHA checklist content must be accurate. Source from OSHA 29 CFR 1926 standards.

---

### A17. [NEW TOOL] PDF Page Stamper / Numbering ★★★☆☆
**Impact:** Medium | **Effort:** Small | **Category:** Documents

**What:** Add page numbers, date stamps, revision numbers, status stamps ("DRAFT"/"FOR REVIEW"/"APPROVED"), company logos, or custom text to every page of a PDF. Position in corners/header/footer. Batch process multiple PDFs.
**Why:** Document control requires stamping drawings with revision numbers, dates, and status markers. Extends the existing PDF Watermark tool with construction-specific presets and opaque (non-watermark) stamping.
**Competitors:** Bluebeam (batch stamp), Adobe, PDF24, Smallpdf, iLovePDF all offer page numbering.

**Implementation spec:**
- **Files:** Could extend `src/tools/pdf-watermark/WatermarkTool.tsx` or create new `src/tools/pdf-stamper/`
- **Approach:** Add "Page Numbers" tab alongside existing Text/Image watermark tabs. Stamp presets: page number (with format options: "Page 1 of N", "1/N", "Sheet A-1"), date stamp, revision stamp, status stamp. Position grid (9 positions). Font/size/color. Apply to all pages or page range.
- **Complexity:** ~500-800 lines (mostly UI, reuse existing pdf-lib rendering).
- **Watch out for:** Page number positioning must account for varying page sizes/orientations in the same document.

---

### A18. [NEW TOOL] Warranty Tracker ★★☆☆☆
**Impact:** Medium | **Effort:** Small-Medium | **Category:** Documents

**What:** Track warranties: item, manufacturer, installer/sub, start date, expiration date, coverage type, certificate reference, contact info. Dashboard showing upcoming expirations. Export to PDF/CSV.
**Why:** Required during closeout, continues for years post-construction. Most teams lose track of warranty expirations.
**Competitors:** No standalone tool. Usually tracked in Excel or the facility management system.

**Implementation spec:**
- **Files:** New `src/tools/warranty-tracker/WarrantyTrackerTool.tsx` — reuse tracker architecture
- **Approach:** Same grid + CRUD pattern as RFI Tracker. Additional: expiration countdown column, color-coded status (green=active, yellow=expiring soon, red=expired). Summary dashboard with timeline visualization using recharts (already installed).
- **Complexity:** ~800-1000 lines with shared tracker infrastructure.

---

### A19. [NEW TOOL] Timesheet / Labor Tracker ★★☆☆☆
**Impact:** Medium | **Effort:** Medium | **Category:** Utilities

**What:** Track daily labor hours by worker, trade, cost code, and project. Calculate regular, overtime, and double-time hours. Generate weekly timesheets and labor summaries by cost code. Export to CSV/PDF.
**Why:** Labor is typically 40-60% of construction costs. Accurate time tracking is critical for job costing and payroll. Small contractors still use paper timesheets.
**Competitors:** Busybusy, Procore, Raken (all paid). Excel templates.

**Implementation spec:**
- **Files:** New `src/tools/timesheet/TimesheetTool.tsx`, register in `registry.ts`
- **Approach:** Weekly grid view: rows = workers, columns = days. Enter hours per day. OT rules configurable (>8h/day or >40h/week). Cost code assignment per entry. Summary tab: total hours by worker, by trade, by cost code. Export weekly timesheet PDF and CSV.
- **Complexity:** ~1200-1600 lines.

---

### A20. [NEW TOOL] Barcode / QR Scanner ★★☆☆☆
**Impact:** Medium | **Effort:** Small-Medium | **Category:** Utilities

**What:** Live camera feed with barcode/QR detection. Support 1D barcodes (Code 128, EAN, UPC) and 2D (QR, Data Matrix). Scan history with timestamps. Upload image to scan. Copy values to clipboard.
**Why:** Natural complement to the existing QR Code generator. Scanning material barcodes, equipment tags, and QR codes on plans. Camera integration feels impressive.
**Competitors:** Phone camera apps. No desktop-quality scanner as a web tool.

**Implementation spec:**
- **Files:** New `src/tools/barcode-scanner/BarcodeScannerTool.tsx`, register in `registry.ts`
- **Approach:** Use `html5-qrcode` (MIT, lightweight) or the native BarcodeDetector API (Chrome 83+, Edge 83+). Camera preview with scan region overlay. Scan history list with copy-to-clipboard. Also accept image file upload for scanning photos of barcodes.
- **Key details:** BarcodeDetector API is available in Chrome/Edge (the target browsers) — no external dependency needed. Fallback to `html5-qrcode` if BarcodeDetector is unavailable.
- **Complexity:** ~500-700 lines.
- **Watch out for:** Camera permissions UX. getUserMedia requires HTTPS or localhost.

---

## Part B: Existing Tool Improvements (sorted by ROI)

### B1. [GAP] PDF Annotate — Tool Presets / Tool Chest ★★★★★
**Impact:** Critical | **Effort:** Medium

**What:** Save named tool configurations (e.g., "Red 2px Cloud", "Blue Highlight") for one-click recall. Bluebeam's most-loved feature.
**Why:** Construction professionals reuse the same 5-6 markup styles constantly. Currently must reconfigure color, stroke width, and opacity every time. Bluebeam's Tool Chest is cited as its #1 productivity feature in every review.
**Competitors:** Bluebeam Tool Chest, Foxit Favorites toolbox.

**Implementation spec:**
- **Files:** New `src/tools/pdf-annotate/ToolPresets.tsx`, modify `PdfAnnotateTool.tsx`
- **Approach:** Store presets in localStorage: `{ name, toolType, color, strokeWidth, opacity, fontSize, fillColor, dashPattern }[]`. Show as a collapsible preset bar below the main toolbar. "Save current tool as preset" button. Click preset to apply all settings. Drag to reorder. Right-click to rename/delete.
- **Complexity:** ~300-500 lines new code.
- **Watch out for:** Preset bar must not crowd the already-dense toolbar. Consider a slide-out panel.

---

### B2. [GAP] PDF Password Protection (Protect / Unlock) ★★★★★
**Impact:** Critical | **Effort:** Small

**What:** Add/remove password encryption on PDFs. Standalone tool or integrated into existing PDF tools.
**Why:** Every single competitor has this (Adobe, Foxit, Smallpdf, iLovePDF, PDF24, Bluebeam). Its absence is the most obvious gap when users compare against any other PDF toolkit. Table-stakes feature.
**Competitors:** All 10 competitors analyzed offer this.

**Implementation spec:**
- **Files:** New `src/tools/pdf-protect/PdfProtectTool.tsx` or extend `src/tools/pdf-merge/PdfMergeTool.tsx` export, register in `registry.ts`
- **Approach:** Two modes: (1) Protect — upload PDF, set user password and/or owner password, optionally restrict printing/copying/editing, save encrypted PDF. (2) Unlock — upload encrypted PDF, enter password, save decrypted PDF. Use `pdf-lib`'s `PDFDocument.save({ userPassword, ownerPassword, permissions })`.
- **Key details:** pdf-lib already supports AES-256 encryption. `permissions` object controls print, copy, modify, annotate flags.
- **Complexity:** ~300-500 lines. Simple UI wrapping existing pdf-lib capability.
- **Watch out for:** pdf-lib's encryption support has some edge cases with certain PDF versions. Test with PDFs from multiple sources.

---

### B3. [GAP] Command Palette (Cmd+K) ★★★★★
**Impact:** Very High | **Effort:** Medium

**What:** Global Cmd+K shortcut opens a search overlay for quick tool access, recent tools, and actions.
**Why:** With 15 tools (growing to 25+), sidebar scanning becomes slow. Command palettes are the standard power-user pattern in modern apps (Notion, Linear, Slack, Figma, VS Code). Shows recently used tools when empty.
**Competitors:** Not applicable (app-level UX).

**Implementation spec:**
- **Files:** New `src/components/common/CommandPalette.tsx`, modify `src/App.tsx` (global keydown listener)
- **Approach:** Modal overlay with search input. Fuzzy match against tool names and descriptions from `registry.ts`. Show recently used tools (last 5) when query is empty. Arrow key navigation, Enter to select. Escape to close. Include keyboard hint badges. ARIA: `role="combobox"` + `role="listbox"`.
- **Key details:** No external deps — simple scoring: exact prefix match (100), word start match (80), contains (60), fuzzy (40). Store recent tools in localStorage.
- **Complexity:** ~400-600 lines.
- **Watch out for:** Must not conflict with tool-specific Cmd+K shortcuts (none exist currently). Focus management when opening/closing.

---

### B4. [GAP] Favorites & Recent Tools ★★★★★
**Impact:** High | **Effort:** Small

**What:** Pin favorite tools to the sidebar top. Track recently used tools. Show both on the Welcome Screen.
**Why:** Construction pros use 3-4 tools daily. Forcing sidebar scanning every time wastes cumulative time. Pairs perfectly with Command Palette.

**Implementation spec:**
- **Files:** Modify `src/components/layout/Sidebar.tsx`, `src/components/WelcomeScreen.tsx`, `src/stores/appStore.ts`
- **Approach:** Add `favorites: ToolId[]` and `recentTools: { id: ToolId, timestamp: number }[]` to appStore. Star icon on hover in sidebar. "Favorites" section above categories when favorites exist. "Recently Used" row on Welcome Screen. Persist in localStorage.
- **Complexity:** ~200-300 lines of changes across existing files.
- **Watch out for:** Sidebar must not become too tall. Cap favorites at 5-6 tools.

---

### B5. [GAP] Global File Drop Auto-Routing ★★★★☆
**Impact:** High | **Effort:** Medium

**What:** Drag any file onto the app and it auto-detects the right tool. `.pdf` → asks Annotate/Merge/Split/Watermark. Images → asks Resize/Remove BG/Compress. `.csv/.xlsx` → asks Dashboard/Data Viewer.
**Why:** The "magic moment" of dropping a file and the app just knowing what to do. Construction users deal with PDFs and images constantly — removing the extra clicks to find the right tool first is a significant UX win.

**Implementation spec:**
- **Files:** Modify `src/components/layout/AppShell.tsx` (global drop handler), new `src/components/common/FileRouterOverlay.tsx`
- **Approach:** Global `dragover`/`drop` handler on AppShell. When file dropped on home screen, show overlay with file type icon and suggested tools as large buttons. Clicking a tool opens it with the file pre-loaded. If a tool is already active, pass the file to that tool's existing drop handler.
- **Key details:** File routing logic: `.pdf` (1 file) → [Annotate, Split, Watermark, Extract], `.pdf` (multiple) → [Merge, Compress], `.jpg/.png/.webp` → [Resize, Remove BG, Compress], `.csv/.json/.xlsx` → [Dashboard, Data Viewer], `.docx/.md` → [Converter].
- **Complexity:** ~400-600 lines.
- **Watch out for:** Must integrate with each tool's file loading API without tight coupling. Use a store-based approach: set `pendingFile` in appStore, tools check for it on mount.

---

### B6. [GAP] PDF Annotate — Angle Measurement ★★★★☆
**Impact:** High | **Effort:** Small

**What:** Measure angles between two lines. Click three points (vertex + two endpoints) to display the angle in degrees.
**Why:** Construction professionals measure angles for roof pitches, wall corners, pipe bends, and structural connections. Bluebeam has this. Critical gap in the measurement suite.
**Competitors:** Bluebeam (full angle measurement with snap).

**Implementation spec:**
- **Files:** Modify `src/tools/pdf-annotate/measurementDrawing.ts`, `types.ts`, add UI in `PdfAnnotateTool.tsx`
- **Approach:** Three-point click: first click = line 1 endpoint, second click = vertex, third click = line 2 endpoint. Calculate angle using `Math.atan2`. Draw arc indicator at vertex with degree label. Add to measurement dropdown alongside existing Distance/Polylength/Area/Count tools.
- **Complexity:** ~150-250 lines.
- **Watch out for:** Reflex vs non-reflex angles (>180°). Show the interior angle by default with a toggle for exterior.

---

### B7. [GAP] PDF Annotate — Dimension Lines ★★★★☆
**Impact:** High | **Effort:** Small-Medium

**What:** Professional dimension markup: line with extension lines at endpoints and centered measurement text above. Standard for construction drawing markup.
**Why:** While distance measurement exists, it doesn't render like a proper dimension line. Construction professionals expect extension lines, tick marks, and centered text — the universal standard on engineering/architectural drawings.
**Competitors:** Bluebeam (full dimension markup with leader lines).

**Implementation spec:**
- **Files:** Modify `src/tools/pdf-annotate/measurementDrawing.ts`, `types.ts`
- **Approach:** New measurement sub-tool: "Dimension". Two-point click like distance, but renders with: extension lines (perpendicular at each endpoint, extending ~10px beyond the measurement line), tick marks at intersections, measurement text centered above the line (respecting calibration), offset dimension line (slightly away from the measured edge). Use the existing calibration system for real-world unit display.
- **Complexity:** ~200-350 lines.
- **Watch out for:** Text must remain readable at all zoom levels. Offset direction should follow the side the user draws from.

---

### B8. [REFINEMENT] PDF Annotate — Page Virtualization ★★★★☆
**Impact:** Critical | **Effort:** Medium

**What:** Only render pages in/near the viewport. Release canvas memory for off-screen pages.
**Why:** Currently all pages render simultaneously. A 100+ page Arch D plan set will exhaust canvas memory and crash the browser. This is the most critical performance gap for construction use where plan sets routinely exceed 100 pages.
**Competitors:** All competitors handle large documents (Bluebeam regularly handles 500+ page sets).

**Implementation spec:**
- **Files:** Modify `src/tools/pdf-annotate/PdfAnnotateTool.tsx` (page rendering loop)
- **Approach:** Use IntersectionObserver to detect which pages are in/near viewport (render current + 2 pages above/below). Show placeholder divs with correct dimensions for non-rendered pages. When a page scrolls out of range, release its canvas memory (`canvas.width = 0`). Preserve annotations in state regardless of render status. Re-render canvas when page scrolls back into view.
- **Complexity:** ~300-500 lines of refactoring.
- **Watch out for:** Annotation interactions on non-rendered pages (e.g., batch operations). Page thumbnails in sidebar should remain rendered (small canvases). Scroll position must be stable during render/unrender.

---

### B9. [REFINEMENT] PDF Split — Quick Split Modes ★★★★☆
**Impact:** High | **Effort:** Small

**What:** Add preset split modes: "By Bookmark" (auto-detect PDF bookmarks), "Every N Pages", "By File Size (<25MB)". Currently users must manually paint every page.
**Why:** Splitting a 200-page PDF into 10-page chunks requires 200 manual clicks. "Split by bookmark" is critical for construction plan sets where bookmarks mark sheet boundaries.
**Competitors:** Adobe, Foxit, Smallpdf, iLovePDF all offer split-by-bookmark and split-by-page-count.

**Implementation spec:**
- **Files:** Modify `src/tools/pdf-split/PdfSplitTool.tsx`
- **Approach:** Add a "Quick Split" toolbar above the page grid. Three buttons: (1) "By Bookmarks" — call `pdfDoc.getOutline()`, if bookmarks exist, auto-create one output document per top-level bookmark. (2) "Every N Pages" — number input, auto-assign pages to groups of N. (3) "By File Size" — input max MB, estimate page sizes from rendered canvas, auto-group. All populate the existing paint-select model — user can then adjust before exporting.
- **Complexity:** ~200-350 lines.
- **Watch out for:** Not all PDFs have bookmarks. Show a disabled "By Bookmarks" button with tooltip "No bookmarks found" when none exist.

---

### B10. [GAP] PDF Watermark — Page Range & Text Presets ★★★★☆
**Impact:** Medium | **Effort:** Small

**What:** (1) Page range selector: All, First Page Only, Odd/Even, Custom range. (2) Quick-select presets for common watermarks: "CONFIDENTIAL", "DRAFT", "DO NOT COPY", "FOR REVIEW ONLY", "VOID", "SAMPLE".
**Why:** Currently watermark applies to all pages with no exceptions, and users must type text from scratch. Every competitor offers page range control. Text presets eliminate repetitive typing for standard construction document control stamps.
**Competitors:** Adobe, Foxit, Smallpdf, iLovePDF, PDF24 all offer page range and presets.

**Implementation spec:**
- **Files:** Modify `src/tools/pdf-watermark/WatermarkTool.tsx`
- **Approach:** Add "Pages" dropdown above the opacity slider: All (default), First Only, Odd, Even, Custom (shows text input accepting "1-5,8,10-15"). Add "Quick Text" dropdown in text mode with preset values. Selecting a preset populates the text input.
- **Complexity:** ~100-200 lines.
- **Watch out for:** Reuse `validatePageRange` from `/src/utils/pdf.ts` for the custom range parser.

---

### B11. [REFINEMENT] Org Chart — CSV/Excel Import ★★★★☆
**Impact:** High | **Effort:** Small

**What:** Import organizational data from CSV/Excel with columns: Name, Title, Department, Reports To. Auto-build the tree hierarchy.
**Why:** HR departments maintain employee lists in spreadsheets. Manually entering 50+ people is the #1 barrier to using the Org Chart tool. Every user expects spreadsheet import.
**Competitors:** Most org chart tools (Lucidchart, Organimi, Creately) support CSV import.

**Implementation spec:**
- **Files:** Modify `src/tools/org-chart/OrgChartTool.tsx`, new `importCSV.ts`
- **Approach:** "Import" button opens modal with file drop zone + column mapping UI. Parse CSV/XLSX using SheetJS (already installed). Auto-detect columns by header name ("Name", "Title", "Department", "Reports To" / "Manager"). Preview the detected hierarchy. "Import" button builds nodes and parent-child relationships. Handle missing "Reports To" by creating a root node.
- **Complexity:** ~300-400 lines.
- **Watch out for:** "Reports To" column might contain names or IDs. Support both by fuzzy-matching names.

---

### B12. [REFINEMENT] Org Chart — PDF Export ★★★☆☆
**Impact:** Medium | **Effort:** Small

**What:** Export org chart as PDF. Currently only PNG/SVG/JSON/CSV.
**Why:** PDF is essential for printing org charts in construction trailers and including in project submittals. The Flowchart tool already has PDF export — pattern can be reused.
**Competitors:** Most org chart tools offer PDF export.

**Implementation spec:**
- **Files:** Modify `src/tools/org-chart/export.ts`
- **Approach:** Render the canvas to an image, embed in a pdf-lib page. Match the Flowchart's PDF export pattern: auto-detect page size from canvas bounds, add margins, scale to fit. Reuse pdf-lib (already installed).
- **Complexity:** ~100-200 lines. Straightforward pattern copy from Flowchart.

---

### B13. [GAP] Dashboard — Undo/Redo ★★★☆☆
**Impact:** Medium | **Effort:** Small

**What:** Add undo/redo to the Dashboard tool. Currently the only creator tool without it.
**Why:** Accidentally deleting a configured widget with no way to recover is frustrating. The other 3 creator tools (Form Builder, Org Chart, Flowchart) all have undo/redo.
**Competitors:** Expected behavior in any editor.

**Implementation spec:**
- **Files:** Modify `src/tools/dashboard/dashboardStore.ts`
- **Approach:** Follow the exact same ref-based undo/redo pattern used in Form Builder, Org Chart, and Flowchart stores: `historyRef` (array of `structuredClone` snapshots, max 50), `historyIndexRef`, `pushHistory()` / `undo()` / `redo()` functions. Wire to Ctrl+Z / Ctrl+Shift+Z.
- **Complexity:** ~100-150 lines. Pattern exists in 3 other stores.

---

### B14. [REFINEMENT] Dashboard — Construction Templates ★★★☆☆
**Impact:** Medium | **Effort:** Small

**What:** Pre-built dashboard templates: "Daily Progress" (weather + crew + work completed + safety), "Budget Tracker" (budget vs actual + change orders), "Safety Dashboard" (incident rate + training), "Schedule Dashboard" (milestones + percent complete).
**Why:** The Dashboard tool has no templates — users start from scratch. Construction-specific templates with sample data would dramatically improve first-use experience and demonstrate the tool's power.
**Competitors:** Procore, Fieldwire have pre-built construction analytics views.

**Implementation spec:**
- **Files:** New `src/tools/dashboard/templates.ts`, modify `DashboardTool.tsx`
- **Approach:** Define 4 template objects with pre-configured widget layouts, chart types, and sample data columns. "New Dashboard" modal shows template cards alongside "Blank". Loading a template creates the widgets and populates with sample CSV data that users replace with their own.
- **Complexity:** ~300-500 lines (mostly template data definitions).

---

### B15. [REFINEMENT] Data Viewer — XLSX Support & Virtualization ★★★☆☆
**Impact:** Medium | **Effort:** Small

**What:** (1) Add XLSX file support (the `xlsx` and `exceljs` libraries are already installed but the Data Viewer only accepts JSON/CSV). (2) Add virtualized scrolling for large files using `@tanstack/react-virtual` (already installed).
**Why:** Construction professionals work with Excel files constantly. Having to convert XLSX→CSV before viewing in the Data Viewer is unnecessary friction when the libraries are already in the bundle.

**Implementation spec:**
- **Files:** Modify `src/tools/json-csv-viewer/JsonCsvViewerTool.tsx`
- **Approach:** (1) Accept `.xlsx`/`.xls` in the file drop zone. Parse with `xlsx` library's `read()` function. Convert first sheet to array-of-arrays. (2) Wrap the table body in a `@tanstack/react-virtual` virtualizer for rows — only render visible rows. Both libraries already installed.
- **Complexity:** ~100-200 lines.
- **Watch out for:** XLSX files may have multiple sheets — show a sheet selector tab bar.

---

### B16. [REFINEMENT] File Compressor — PDF Compression Warning ★★★☆☆
**Impact:** Medium | **Effort:** Small

**What:** Add a clear warning that PDF compression converts text to images, losing searchability and text selection. Add a "Lossless" option that removes metadata and optimizes streams without rasterizing.
**Why:** The current PDF compression is destructive (converts text to images) with no warning. Users expecting size reduction may not realize they're losing text content.

**Implementation spec:**
- **Files:** Modify `src/tools/file-compressor/CompressorTool.tsx`, `src/utils/compression.ts`
- **Approach:** Show an orange warning banner when PDF files are detected: "PDF compression converts text to images. Searchable text will be lost." Add a toggle: "Lossy (smaller, images only)" vs "Lossless (metadata removal, stream optimization)". Lossless mode: strip metadata, remove unused objects, optimize streams via pdf-lib's `save({ useObjectStreams: true })`.
- **Complexity:** ~100-200 lines.

---

### B17. [UX] QR Code — SVG Export & vCard Input ★★★☆☆
**Impact:** Medium | **Effort:** Small

**What:** (1) Add SVG download option (the `qrcode` library supports SVG output). (2) Add vCard input tab for contact card QR codes. (3) Flip default colors to black-on-white.
**Why:** QR codes are inherently vector — PNG-only is limiting for print/signage. vCard QR codes are extremely useful for construction professionals exchanging contact info on job sites.

**Implementation spec:**
- **Files:** Modify `src/tools/qr-code/QrCodeTool.tsx`
- **Approach:** (1) Add "SVG" download button using `QRCode.toString(text, { type: 'svg' })`. (2) New "Contact" tab: name, phone, email, company fields → generate vCard 3.0 string → encode as QR. (3) Change default foreground to #000000, background to #FFFFFF.
- **Complexity:** ~100-200 lines.

---

### B18. [UX] Image Resizer — Crop & Rotation ★★★☆☆
**Impact:** Medium | **Effort:** Medium

**What:** Add basic crop functionality with aspect ratio presets (free, 1:1, 4:3, 16:9) and rotation buttons (90 CW/CCW).
**Why:** Resize + crop are almost always needed together. Currently users must use a separate tool to crop before resizing. Rotation is expected in any image tool.

**Implementation spec:**
- **Files:** Modify `src/tools/image-resizer/ImageResizerTool.tsx`
- **Approach:** Add a crop overlay on the preview canvas with draggable handles. Aspect ratio preset buttons. "Apply Crop" button that creates a new canvas with the cropped region. Add rotation buttons that rotate the source image by 90° using canvas transform. Apply rotation before resize.
- **Complexity:** ~400-600 lines.
- **Watch out for:** Crop handles on a small preview canvas need careful hit-testing. Consider a larger preview area.

---

### B19. [UX] Text Extract — OCR Confidence Indicator ★★★☆☆
**Impact:** Medium | **Effort:** Small

**What:** After OCR extraction, show an average confidence score (e.g., "OCR Confidence: 87%"). Color-code low-confidence words in the preview.
**Why:** Tesseract.js returns word-level confidence scores that are currently discarded. Users have no way to assess OCR quality, leading to errors in exported data.

**Implementation spec:**
- **Files:** Modify `src/tools/text-extract/TextExtractTool.tsx`
- **Approach:** In the `ocrPositionedText` function, collect `word.confidence` values. Compute average. Display as a badge: green (>85%), yellow (70-85%), red (<70%). Optionally: in the preview, highlight low-confidence words (<70%) with a red underline.
- **Complexity:** ~50-100 lines.
- **Watch out for:** Confidence values from Tesseract are 0-100. Some versions return 0 for whitespace — filter those out of the average.

---

### B20. [UX] Form Builder — Live Preview Mode ★★★☆☆
**Impact:** Medium | **Effort:** Medium

**What:** A "Preview" toggle that renders form elements as interactive HTML inputs for test-filling before exporting.
**Why:** Users currently cannot test their forms without exporting to PDF and opening externally. A live preview mode lets them verify the form works as expected.

**Implementation spec:**
- **Files:** Modify `src/tools/form-creator/FormCreatorTool.tsx`, new `FormPreview.tsx`
- **Approach:** Add a "Preview" button in the toolbar. When active, replace the canvas with a rendered version of the form where text-input elements become `<input>`, checkboxes become `<input type="checkbox">`, etc. Non-interactive in preview (no editing form structure). "Exit Preview" button returns to editor.
- **Complexity:** ~400-600 lines.

---

### B21. [GAP] PDF Annotate — Markup List Filtering & Sorting ★★★☆☆
**Impact:** High | **Effort:** Small-Medium

**What:** In the MarkupsList panel, add column sorting (by type, page, status, author), filter dropdowns (by type, status, color), and text search.
**Why:** On a heavily annotated plan set (100+ markups), finding a specific annotation is currently impossible without scrolling. Bluebeam's Markup List with filtering is one of its most-used features for construction review workflows.
**Competitors:** Bluebeam (full sorting/filtering/grouping in markup list).

**Implementation spec:**
- **Files:** Modify `src/tools/pdf-annotate/MarkupsList.tsx`
- **Approach:** Add a filter bar at the top: type dropdown (multi-select), status dropdown, color dropdown, text search. Add clickable column headers for sorting. Use the existing annotation state — no new data needed, just UI filtering/sorting logic.
- **Complexity:** ~200-400 lines.

---

### B22. [GAP] PDF Annotate — Batch Markup to Pages ★★★☆☆
**Impact:** Medium | **Effort:** Small

**What:** Right-click an annotation → "Duplicate to pages..." → enter page range → clone the annotation to all specified pages.
**Why:** Stamping "REVISED" or a company logo on all 50 pages of a plan set currently requires placing the annotation manually on each page. Bluebeam's batch stamp is a major productivity feature.
**Competitors:** Bluebeam (batch stamp, batch link, batch overlay).

**Implementation spec:**
- **Files:** Modify `src/tools/pdf-annotate/PdfAnnotateTool.tsx` (context menu handler)
- **Approach:** Add "Duplicate to pages..." to the existing right-click context menu. Show a modal with page range input (reuse `validatePageRange`). Clone selected annotation(s) with new UUIDs and updated `page` field to each target page. Push to history as a single undo-able action.
- **Complexity:** ~100-200 lines.

---

## Part C: Cross-Cutting Improvements (sorted by ROI)

### C1. [UX] Global Keyboard Shortcuts ★★★★☆
**Impact:** Medium | **Effort:** Small

**What:** App-level keyboard shortcuts: Cmd+K (command palette), Cmd+\ (toggle sidebar), Cmd+H (go home), Cmd+1-5 (jump to category), Cmd+/ (shortcuts cheat sheet).
**Why:** Individual tools have excellent shortcuts (Flowchart: 20+, Form Builder: 15+) but zero app-level shortcuts exist. Power users can't navigate without a mouse.

**Implementation spec:**
- **Files:** Modify `src/App.tsx` or `src/components/layout/AppShell.tsx`
- **Approach:** Add a global `keydown` listener. Switch on key combos. Prevent default when handling. Show a shortcuts cheat sheet modal via Cmd+/.
- **Complexity:** ~100-150 lines.

---

### C2. [UX] User Profile Visibility in Sidebar ★★★★☆
**Impact:** Medium | **Effort:** Very Small

**What:** Show user initials avatar in the sidebar footer. Click to open UserProfileModal in edit mode.
**Why:** The user profile is collected on first launch but never shown in the UI again. Users can't see or edit it without inspecting localStorage.

**Implementation spec:**
- **Files:** Modify `src/components/layout/Sidebar.tsx`
- **Approach:** Read profile from `userProfile.ts`. Render initials circle at sidebar bottom. Click handler opens the existing `UserProfileModal` in edit mode.
- **Complexity:** ~30-50 lines.

---

### C3. [UX] Welcome Screen Enhancements ★★★☆☆
**Impact:** Medium | **Effort:** Medium

**What:** Add "Recently Used" row (last 5 tools with timestamps), "Favorites" pinned section, inline search bar, and a "tip of the day" from existing help content.
**Why:** The Welcome Screen is currently a static grid. As tool count grows to 25+, users need faster ways to find what they need.

**Implementation spec:**
- **Files:** Modify `src/components/WelcomeScreen.tsx`, `src/stores/appStore.ts`
- **Approach:** Add `recentTools` tracking to appStore (update on tool open). Render "Recent" section at top of Welcome Screen. Add search input that filters tool cards. Pull random tip from `toolHelp.ts` data.
- **Complexity:** ~300-400 lines.

---

### C4. [UX] Settings Panel ★★★☆☆
**Impact:** Medium | **Effort:** Medium

**What:** Gear icon in sidebar → settings modal with: Profile editing, Appearance (sidebar default, animation toggle for motion sensitivity), Default tool settings (export quality, zoom level), About (version, release notes), Keyboard shortcuts reference.
**Why:** No global settings exist. Enterprise users expect customization. The `prefers-reduced-motion` accessibility concern (shooting stars animation) needs a manual override.

**Implementation spec:**
- **Files:** New `src/components/common/SettingsModal.tsx`, new `src/stores/settingsStore.ts`, modify `Sidebar.tsx`
- **Approach:** Zustand store for settings, persisted to localStorage. Gear icon in sidebar footer. Tabbed modal with sections. Settings include: `{ sidebarDefault: 'expanded' | 'collapsed', animations: boolean, defaultExportQuality: number, theme: 'dark' }`.
- **Complexity:** ~400-600 lines.

---

### C5. [UX] Accessibility Improvements ★★★☆☆
**Impact:** High | **Effort:** Small

**What:** Focus trapping in modals, ARIA attributes (role="dialog", aria-modal, aria-label on sidebar buttons), skip-to-content link, `prefers-reduced-motion` respect.
**Why:** Enterprise/construction software must be accessible. Current Modal.tsx listens for Escape but doesn't trap focus — Tab can escape to background elements. Some low-opacity text may fail WCAG AA contrast ratios.

**Implementation spec:**
- **Files:** Modify `src/components/common/Modal.tsx`, `src/components/layout/Sidebar.tsx`, `src/index.css`
- **Approach:** Modal: trap focus with first/last focusable element detection, add `role="dialog"` + `aria-modal="true"`. Sidebar: add `aria-label` to tool buttons. CSS: add `@media (prefers-reduced-motion: reduce)` to disable shooting stars and twinkling. Add hidden "Skip to content" link before sidebar.
- **Complexity:** ~150-250 lines across files.

---

### C6. [UX] Onboarding Tour ★★☆☆☆
**Impact:** Medium | **Effort:** Medium

**What:** After first profile modal, show a 3-step tooltip tour: (1) sidebar categories, (2) tool grid, (3) help button. Show once via localStorage flag.
**Why:** New users have no guidance beyond the profile modal. A brief tour increases feature discovery.

**Implementation spec:**
- **Files:** New `src/components/common/OnboardingTour.tsx`, modify `src/App.tsx`
- **Approach:** Lightweight tooltip component that highlights UI regions. Step array with target element selectors, tooltip text, and position. `lwt-onboarding-complete` flag in localStorage. "Skip" and "Next" buttons.
- **Complexity:** ~300-400 lines.

---

### C7. [UX] Clipboard Integration ★★☆☆☆
**Impact:** Medium | **Effort:** Small

**What:** Intercept Cmd+V on the home screen. If clipboard contains an image, offer Image Resizer/Compress. If text, offer QR Code. If URL, offer QR Code.
**Why:** Removes friction for common workflows. "Copy screenshot → paste into toolkit → resize" is faster than "save screenshot → open tool → upload file."

**Implementation spec:**
- **Files:** Modify `src/App.tsx` or `src/components/WelcomeScreen.tsx`
- **Approach:** Global `paste` event listener when no tool is active. Read clipboard items via `navigator.clipboard.read()`. Detect type (image/text/url). Show a toast or small modal suggesting the appropriate tool. Click to open tool with content pre-loaded.
- **Complexity:** ~100-200 lines.
- **Watch out for:** Clipboard API requires user gesture and secure context. May need HTTPS or localhost.

---

## Research Sources

### Competitor Research
- Bluebeam Revu: tools menu, product page, Capterra reviews, Revu Max AI announcement
- PlanSwift: features page, specialty takeoff items, Capterra reviews
- Adobe Acrobat Pro: features list, what's new, version comparison
- Foxit PDF Editor: v2025.3 release, G2 features list
- Smallpdf: tools page, G2 reviews
- iLovePDF: features page, Capterra reviews
- PDF24: all tools page
- Canva: Visual Suite 2.0, Capterra reviews
- Procore: project management features, drawing markup docs, Capterra reviews
- Fieldwire: features page, markup tools docs, Capterra reviews

### Industry Research
- Construction Coverage: best construction PM software
- Planera: best construction management platforms
- TAVCO: what is Bluebeam Revu
- VDCI: Bluebeam in construction industry
- Zentek: practical construction use of Bluebeam
- Vitruvi: top construction field management software
- Novatr: most used software for construction engineers
- ProjectPro365: document management issues in construction
- Autodesk: construction document management challenges
- Workyard: best punch list software
- Raken: daily reports features
- Procore: daily report template, RFI management
- Smartsheet: construction submittal templates
- Omni Calculator: construction calculators
- Inch Calculator: construction calculators
- AIA Contract Documents: AIA billing explained
- SmartPM: weather delays in construction

### UX Research
- ContentSquare: web app design patterns 2026
- UX Design CC: UX design shifts 2026
- OneThingDesign: enterprise UX patterns
- Pencil and Paper: enterprise UX design guide
- Mobbin: command palette UI design
- Superhuman: how to build a command palette
- Maggie Appleton: command K bars
- Appcues: user onboarding UX patterns
- UX Design Institute: onboarding best practices
- Medium: keyboard shortcuts for web applications
- AlterSquare: construction tech UX
- UI-Patterns: favorites design pattern
- Creative Bloq: recently viewed UI pattern
- Tailwind: command palette UI blocks

### Library Research
- Frappe Gantt (MIT, zero deps)
- DHTMLX Gantt (GPL)
- Handsontable (commercial)
- jsPDF (MIT)
- marker.js (image annotation)
- html5-qrcode (MIT)
- diff / jsdiff (MIT)
- ag-Grid Community (MIT)
