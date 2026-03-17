# Feature Improvement Report: Form Builder

**Date:** 2026-03-17
**Scope:** Form Builder (Form Creator tool)
**Competitors analyzed:** Adobe Acrobat, JotForm, Typeform, Bluebeam Revu, Google Forms, DocuSign, GoCanvas, Procore

## Executive Summary

15 findings: 6 gaps, 5 refinements, 4 UX improvements
Top recommendation: Construction template library expansion — JotForm has 800+ inspection templates, we have 5. Adding 10-15 construction-specific templates is the highest-ROI improvement.

## Current Capabilities

**Elements:** text-input, textarea, checkbox, radio, select, date, label, heading, signature, image, divider
**Canvas:** WYSIWYG absolute positioning, multi-page (letter/A4), snap guides, marquee select, zoom/pan
**Export:** Fillable PDF (pdf-lib form API), Static PDF, Word (.docx), JSON
**Properties:** Position, size, label, placeholder, required toggle, font size/weight/align, color, options editor
**Management:** Auto-save to localStorage, templates (5), undo/redo, copy/paste, duplicate

---

## Findings (sorted by ROI)

### 1. [GAP] Construction Template Library Expansion
**Impact:** Critical | **Effort:** Small | **ROI: ★★★★★**

**What:** Expand from 5 generic templates to 15-20 construction-specific templates covering daily reports, safety inspections, punch lists, change orders, timesheets, and more.

**Why:** JotForm has 800+ inspection form templates. GoCanvas has 20,000+. Construction teams choose tools based on template availability. Our 5 templates (sign-in sheet, contact form, work order, inspection form) miss the most common construction forms.

**Competitors:** JotForm (800+ construction templates), GoCanvas (20,000+), Procore (built-in construction forms), Fieldwire (pre-built daily reports, punch lists).

**Implementation spec:**
- **Files:** `templates.ts` (add new templates)
- **Approach:** Add 10-12 new template builders using the existing `createElement()` pattern. Each template is a `build()` function returning a `FormDocument`. Target the most-used construction forms: Daily Field Report, Job Hazard Analysis (JHA), Safety Toolbox Talk, Punch List, Change Order, Timesheet, Concrete Pour Log, Hot Work Permit, Equipment Inspection, RFI.
- **Key details:** Use the existing template structure. Each template needs realistic field layout, proper labels, appropriate element types (checkboxes for inspections, signature blocks, date fields).
- **Complexity:** ~200 lines total. Pure data, no logic changes. Each template is ~20 lines.
- **Watch out for:** Templates should use full-width content area (720px) with professional spacing. Include section headings and dividers between logical groups.

---

### 2. [REFINEMENT] Enable PDF Required Field Validation
**Impact:** High | **Effort:** Small | **ROI: ★★★★★**

**What:** Apply pdf-lib's `enableRequired()` to form fields marked as required, so PDF readers enforce completion before submission.

**Why:** Currently the `required` flag only appends " *" to the label text. Adobe Reader, Bluebeam, and other PDF viewers can enforce required fields natively — but only if the PDF field has the required flag set. Every competitor's fillable PDF export does this.

**Competitors:** All competitors that export fillable PDFs set the required attribute.

**Implementation spec:**
- **Files:** `export.ts` (fillable PDF export function)
- **Approach:** After creating each form field, check `el.required` and call `field.enableRequired()`. One line per field type case.
- **Key details:** Works on `PDFTextField`, `PDFCheckBox`, `PDFDropdown`, `PDFRadioGroup`. The `enableRequired()` method exists but is unused.
- **Complexity:** ~10 lines. Add `if (el.required) tf.enableRequired()` after each `addToPage()` call.
- **Watch out for:** Test in Adobe Reader and Chrome's built-in PDF viewer to verify enforcement behavior.

---

### 3. [REFINEMENT] PDF Field Appearance Customization
**Impact:** High | **Effort:** Small | **ROI: ★★★★★**

**What:** Pass `backgroundColor`, `borderColor`, `textColor`, and `font alignment` to PDF form fields during export.

**Why:** Currently all fields export with default gray appearance. pdf-lib supports full appearance customization via `FieldAppearanceOptions` but none of these are used. Professional forms need branded colors and proper alignment.

**Competitors:** Adobe Acrobat (full field styling), Bluebeam (field colors), JotForm (themed fields).

**Implementation spec:**
- **Files:** `export.ts` (both `exportFillablePDF` and `exportStaticPDF`)
- **Approach:** In the `addToPage()` options object, add `textColor`, `borderColor`, `backgroundColor` mapped from `el.color` and new properties. Also call `tf.setAlignment(TextAlignment.Left|Center|Right)` using the existing `el.textAlign` property.
- **Key details:** Import `TextAlignment` from pdf-lib. Map `el.textAlign` to `TextAlignment.Left` (0), `TextAlignment.Center` (1), `TextAlignment.Right` (2).
- **Complexity:** ~20 lines across field type cases.
- **Watch out for:** `backgroundColor` on fields may render differently across PDF viewers. Test with Adobe Reader.

---

### 4. [GAP] Data Table Element
**Impact:** Critical | **Effort:** Medium | **ROI: ★★★★☆**

**What:** Add a table/grid element type with configurable rows and columns, editable cell content, and proper PDF export.

**Why:** Construction forms heavily use tables — Job Hazard Analysis (steps × hazards × controls), timesheets (days × tasks × hours), material logs, punch lists. Without tables, users can't create the most common construction forms. Every competitor supports tables.

**Competitors:** JotForm (table widgets), Bluebeam (table markup), GoCanvas (table fields), Adobe (table tool).

**Implementation spec:**
- **Files:** `types.ts` (add `'table'` element type with `rows`, `cols`, `cellData` properties), `FormElementView.tsx` (render table grid), `PropertiesPanel.tsx` (row/col controls), `export.ts` (render table as PDF grid lines + text)
- **Approach:** Add `'table'` to `FormElementType`. New properties: `tableRows: number`, `tableCols: number`, `tableHeaders: string[]`, `tableCellData: string[][]`. Render as HTML table in the canvas view. Export as drawn grid lines with text cells in PDF.
- **Key details:** Default 3 rows × 4 columns. Editable headers. In PDF export, draw grid lines with `page.drawLine()` and cell text with `page.drawText()`. For fillable PDF, create a `TextField` per cell.
- **Complexity:** ~200 lines across 4 files. New rendering in FormElementView, new properties in panel, new export case.
- **Watch out for:** Cell text overflow, column width distribution, very large tables exceeding page bounds.

---

### 5. [GAP] Conditional Show/Hide Logic
**Impact:** High | **Effort:** Medium | **ROI: ★★★★☆**

**What:** Allow elements to be conditionally visible based on another field's value (e.g., "Show 'Corrective Action' field only when 'Result' = 'Fail'").

**Why:** Inspection forms need conditional sections — if an item fails, show corrective action fields. JotForm, Typeform, DocuSign, GoCanvas, and Procore all have visual conditional logic builders. Adobe and Bluebeam require JavaScript. A no-code builder would be a differentiator.

**Competitors:** JotForm (visual logic builder), Typeform (branching), DocuSign (conditional fields), GoCanvas (if/then rules).

**Implementation spec:**
- **Files:** `types.ts` (add `visibleWhen` to `FormElement`), `FormElementView.tsx` (evaluate visibility), `PropertiesPanel.tsx` (condition editor UI), `formStore.ts` (add form data state for condition evaluation)
- **Approach:** Add optional `visibleWhen?: { fieldId: string; operator: 'equals' | 'notEquals' | 'contains' | 'isEmpty'; value: string }` to `FormElement`. In the canvas, evaluate the condition against a runtime form data map. In the properties panel, add a "Show when..." section with field selector, operator dropdown, and value input. In PDF export, conditionally visible elements are always included (PDF doesn't support runtime logic without JavaScript).
- **Key details:** The condition references another element's ID. The operator compares the referenced element's current value. For the canvas, maintain a `formValues: Record<string, string>` state for interactive preview.
- **Complexity:** ~150 lines. New type field, condition evaluator, UI for condition editor.
- **Watch out for:** Circular dependencies (A shows when B, B shows when A). Validate no cycles on save.

---

### 6. [UX] Drag-From-Palette to Canvas
**Impact:** High | **Effort:** Medium | **ROI: ★★★★☆**

**What:** Allow dragging elements from the left palette directly onto the canvas for precise placement, supplementing the existing click-to-add.

**Why:** Every professional design tool (Figma, Adobe, Bluebeam) supports drag-from-palette. The current click-to-add always places at the bottom of existing content. Users need to click-then-drag to reposition. Direct drag-to-canvas is more intuitive for spatial placement. UX research shows the hybrid approach (click AND drag) is optimal.

**Competitors:** JotForm (drag to canvas), Adobe (drag fields onto PDF), Bluebeam (drag tools), Figma (drag from library).

**Implementation spec:**
- **Files:** `ElementPalette.tsx` (make items draggable), `FormCanvas.tsx` (handle drop)
- **Approach:** Use `@dnd-kit` (already installed) to make palette items draggable. The canvas becomes a drop target. On drop, create the element at the drop position (converted from screen to canvas coordinates via `screenToCanvas()`). Show a ghost preview during drag. Keep click-to-add as the default method.
- **Key details:** `@dnd-kit` is already a project dependency. Use `useDraggable` on palette items, `useDroppable` on the canvas area. The `DragOverlay` shows a preview of the element being placed.
- **Complexity:** ~100 lines. Palette items become draggable, canvas becomes drop target.
- **Watch out for:** Coordinate conversion between screen space and canvas space (zoom/pan). The drop position must account for viewport transform.

---

### 7. [UX] Alignment Toolbar for Multi-Selection
**Impact:** High | **Effort:** Small | **ROI: ★★★★☆**

**What:** Show an alignment toolbar when 2+ elements are selected: Align Left, Center, Right, Top, Middle, Bottom, Distribute Horizontal, Distribute Vertical.

**Why:** The tool already has snap guides, but users frequently need to precisely align groups of elements. Every design tool (Figma, Canva, Adobe XD) shows alignment controls for multi-selection. Construction forms often need perfectly aligned columns of fields.

**Competitors:** Figma (alignment + distribution), Adobe (alignment toolbar), JotForm (auto-alignment).

**Implementation spec:**
- **Files:** `Toolbar.tsx` or new `AlignmentToolbar.tsx` component, `formStore.ts` (add alignment actions)
- **Approach:** When `selectedIds.size >= 2`, render a contextual toolbar with 8 buttons (6 align + 2 distribute). Each action reads the bounding boxes of selected elements and adjusts positions. Align Left: set all x to min(x). Distribute H: equalize horizontal gaps between elements.
- **Key details:** Align actions: `minX`, `maxX`, `centerX`, `minY`, `maxY`, `centerY`. Distribute: sort by position, calculate total gap, divide equally.
- **Complexity:** ~80 lines. Pure position math + 8 buttons.
- **Watch out for:** Distribute with only 2 elements should be a no-op (need 3+).

---

### 8. [GAP] Signature Capture
**Impact:** High | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Replace the static signature line with an interactive signature pad using `signature_pad` (11.9k GitHub stars, ~10KB, zero dependencies).

**Why:** Construction forms require actual signatures — inspector sign-off, supervisor approval, visitor acknowledgment. The current signature element just draws a line. `signature_pad` provides variable-width Bezier curves that look like real pen strokes, supporting mouse, touch, and stylus input.

**Competitors:** DocuSign (signature capture), GoCanvas (signature fields), JotForm (signature widget), Bluebeam (digital signatures).

**Implementation spec:**
- **Files:** `FormElementView.tsx` (signature element render), new `SignaturePad.tsx` component, `export.ts` (embed captured signature image in PDF), `package.json` (add `signature_pad`)
- **Approach:** Wrap `signature_pad` in a React component. When the signature element is in "fill mode" (preview/interactive), render the signature pad. On completion, store the drawn signature as a data URL via `toDataURL('image/png')`. In PDF export, embed the signature image above the signature line.
- **Key details:** `signature_pad` supports `penColor`, `minWidth`, `maxWidth`, `clear()`, `isEmpty()`, `toDataURL()`, `fromDataURL()`.
- **Complexity:** ~120 lines. New component + integration into element view + PDF export.
- **Watch out for:** Need a "fill mode" toggle to distinguish between design mode (layout) and fill mode (data entry). This is a prerequisite for signature capture.

---

### 9. [GAP] Repeating Sections / Add-Row Groups
**Impact:** High | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Allow a group of elements to be marked as "repeating" so users can add/remove rows of that group when filling the form.

**Why:** Construction forms frequently need variable-length data: JHA task steps, timesheet daily entries, material line items, crew member lists, punch list items. Without repeating sections, users must pre-create a fixed number of rows. JotForm and GoCanvas both support this.

**Competitors:** JotForm (repeatable sections), GoCanvas (repeatable groups), SurveyJS (dynamic panels).

**Implementation spec:**
- **Files:** `types.ts` (add `repeatGroup` to `FormElement`), `FormElementView.tsx` (render group with add/remove buttons), `formStore.ts` (clone group action), `export.ts` (duplicate group fields in PDF)
- **Approach:** Add optional `repeatGroupId?: string` to `FormElement`. Elements sharing the same `repeatGroupId` form a repeatable group. In fill mode, show an "Add Row" button below the group that clones all group elements with offset positions. In PDF export, render all instances of the group.
- **Key details:** The group is defined by shared `repeatGroupId`. Cloning creates new elements with new IDs, offset Y positions, and the same `repeatGroupId`.
- **Complexity:** ~150 lines. Group detection, clone logic, UI buttons, PDF export handling.
- **Watch out for:** Groups spanning page boundaries. Auto-page-break when group exceeds page height.

---

### 10. [REFINEMENT] Calculated Fields
**Impact:** Medium | **Effort:** Medium | **ROI: ★★★☆☆**

**What:** Add a `'calculated'` element type that auto-computes values from other fields (SUM, COUNT, basic arithmetic).

**Why:** Construction estimators need auto-summing quantity/cost columns. Timesheets need total hours. Change orders need cost impact totals. JotForm, Bluebeam, and GoCanvas all support calculated fields.

**Competitors:** JotForm (calculation widget), Bluebeam (calculated fields), GoCanvas (formula fields).

**Implementation spec:**
- **Files:** `types.ts` (add `'calculated'` type with `formula` property), `FormElementView.tsx` (render computed value), `PropertiesPanel.tsx` (formula editor), `export.ts` (render static value in PDF)
- **Approach:** Add `formula?: string` to `FormElement`. Simple syntax: `=SUM(field1, field2)` or `={field1} * {field2}`. Parse field references by ID or label. Evaluate against the runtime form data map. Display the computed result in the element.
- **Key details:** Start with SUM, COUNT, AVERAGE, and basic arithmetic (+, -, *, /). Reference fields by label wrapped in `{}`.
- **Complexity:** ~120 lines. Expression parser, evaluator, UI for formula input.
- **Watch out for:** Circular references. Field label changes breaking formulas (use IDs internally, display labels in UI).

---

### 11. [REFINEMENT] Date+Time Field Type
**Impact:** Medium | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Add a `'datetime'` element type that captures both date and time in a single field.

**Why:** Construction forms frequently need timestamps: pour start/end times, incident time, permit expiration time, time in/out on sign-in sheets. The current `'date'` type only captures date. Every competitor supports datetime.

**Competitors:** JotForm (datetime widget), GoCanvas (datetime field), Bluebeam (text fields for time).

**Implementation spec:**
- **Files:** `types.ts` (add `'datetime'` to `FormElementType` and `ELEMENT_DEFAULTS`), `FormElementView.tsx` (render with time display), `export.ts` (export as text field with datetime label)
- **Approach:** Add `'datetime'` as a new element type. Default width 280px (wider than date to show time). In PDF fillable export, create a text field labeled "Date & Time". In canvas view, show a clock icon alongside the date icon.
- **Key details:** Use existing patterns from the `'date'` element. The PDF field is just a wider text field.
- **Complexity:** ~30 lines. New entry in ELEMENT_DEFAULTS, new case in FormElementView and export.
- **Watch out for:** Consistent with existing date element styling.

---

### 12. [UX] Tab Order Overlay/Editor
**Impact:** Medium | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Add a "Tab Order" view that shows numbered badges on each form field indicating the tabbing sequence, with the ability to click to reorder.

**Why:** WYSIWYG absolute positioning creates unpredictable tab order. Construction forms with multi-column layouts need correct tab order for accessibility and usability. The current code sorts fields top-to-bottom by Y position, which breaks for side-by-side fields.

**Competitors:** Adobe Acrobat (tab order editor), Bluebeam (field order panel).

**Implementation spec:**
- **Files:** `types.ts` (add optional `tabOrder?: number` to `FormElement`), `FormCanvas.tsx` or new overlay component (render numbered badges), `Toolbar.tsx` (toggle button), `export.ts` (set page tab order in PDF)
- **Approach:** Add a "Tab Order" toggle button in the toolbar. When active, show numbered circles on each interactive element. Auto-compute order by sorting: Y position first, then X within a Y-band (elements within 20px vertical distance are considered same row). Allow click-to-assign for manual override. In PDF export, set `page.node.set(PDFName.of('Tabs'), PDFName.of('S'))` for structure-based tab order.
- **Key details:** Auto-compute uses row-band grouping: group elements with similar Y values, sort left-to-right within each band, then bands top-to-bottom.
- **Complexity:** ~80 lines. Overlay rendering, sort algorithm, toggle state.
- **Watch out for:** Recalculate when elements are moved. Manual overrides should persist.

---

### 13. [UX] Print Stylesheet
**Impact:** Medium | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Add `@media print` CSS rules so the form can be printed directly from the browser without exporting to PDF first.

**Why:** Quick print is faster than export-then-print for construction PMs who need a hard copy immediately. The print output should hide all UI (toolbars, panels, canvas chrome) and show only the form pages at full width.

**Competitors:** Google Forms (print button), Microsoft Word (native print).

**Implementation spec:**
- **Files:** `FormCreatorTool.tsx` (add print button to toolbar), global CSS or component-level styles
- **Approach:** Add `@media print` rules that hide `.toolbar`, `.element-palette`, `.properties-panel`, and canvas chrome. Show form pages at full width with white background. Add a "Print" button to the toolbar that calls `window.print()`.
- **Key details:** `@media print { .no-print { display: none !important; } }`. The form pages should render at 100% width within the print area.
- **Complexity:** ~30 lines of CSS + 1 button.
- **Watch out for:** Multi-page forms need `page-break-after` between pages. Test in Chrome and Edge print preview.

---

### 14. [GAP] Number/Currency Field Type
**Impact:** Medium | **Effort:** Small | **ROI: ★★★☆☆**

**What:** Add a `'number'` element type with optional currency prefix, min/max validation, and decimal place control.

**Why:** Change orders need cost fields ($). Material logs need quantity fields. Concrete pours need temperature/slump values. A dedicated number field enables future calculated fields (SUM of number fields).

**Competitors:** JotForm (number field with prefix/suffix), GoCanvas (numeric fields), all form builders distinguish text from number.

**Implementation spec:**
- **Files:** `types.ts` (add `'number'` to `FormElementType`, add `numberPrefix?: string`, `numberMin?: number`, `numberMax?: number`, `numberDecimals?: number`), `FormElementView.tsx` (render with prefix), `PropertiesPanel.tsx` (prefix/min/max/decimals controls), `export.ts` (text field with format hint)
- **Approach:** New element type rendered as text input with an optional prefix ($ for currency). In fillable PDF, use `setMaxLength()` if applicable. Properties panel shows prefix, min, max, decimals.
- **Key details:** Default prefix is empty. Common presets: "$", "#", "°F", "°C".
- **Complexity:** ~60 lines. New type entry, render case, property controls, export case.
- **Watch out for:** pdf-lib text fields don't support numeric validation natively — the prefix and format are visual only in the PDF.

---

### 15. [REFINEMENT] Element Grouping (Ctrl+G)
**Impact:** Medium | **Effort:** Medium | **ROI: ★★☆☆☆**

**What:** Allow users to select multiple elements and group them (Ctrl+G). Groups move, resize, and delete as a unit. Ungroup with Ctrl+Shift+G.

**Why:** Complex forms have logical sections (header block, signature block, address block) that should move together. Construction forms often have repeating layout patterns. Every design tool supports grouping.

**Competitors:** Figma (Ctrl+G), Adobe (grouping), Canva (grouping).

**Implementation spec:**
- **Files:** `types.ts` (add optional `groupId?: string` to `FormElement`), `formStore.ts` (add `groupElements`, `ungroupElements` actions), `FormCanvas.tsx` (treat grouped elements as a unit for move/resize), `shortcuts.ts` (Ctrl+G / Ctrl+Shift+G)
- **Approach:** When grouping, assign a shared `groupId` to all selected elements. When any element in a group is selected, auto-select all group members. Move/resize applies to all group members. Group gets a visual bounding box in the canvas.
- **Key details:** Groups are implicit (shared `groupId` field) rather than a container element. This keeps the flat element array structure.
- **Complexity:** ~120 lines. Group detection, auto-selection, group move/resize logic.
- **Watch out for:** Nested groups (don't support initially). Groups spanning multiple pages.

---

## Research Sources

### Competitors
- Adobe Acrobat: PDF-native form builder with precise absolute positioning, field styling, JavaScript support
- JotForm: 800+ construction templates, drag builder, conditional logic, calculated widgets, repeatable sections
- Bluebeam Revu: Construction-specific PDF markup and form fields, $240-360/year, Windows-centric
- GoCanvas: 20,000+ templates, mobile-first, offline-capable, construction-specific
- DocuSign: Signature capture, conditional fields, template library
- Google Forms: Simplicity benchmark, flow layout, conditional sections
- Procore: Construction platform with built-in forms and checklists

### Technical
- `pdf-lib` `enableRequired()` — native required field enforcement, currently unused
- `pdf-lib` `TextAlignment` enum — left/center/right alignment for text fields, currently unused
- `pdf-lib` `FieldAppearanceOptions` — backgroundColor, borderColor, textColor, currently unused
- `pdf-lib` `PDFSignature` — signature placeholder creation, currently unused
- `pdf-lib` `enableCombing()` — equal-width character cells for formatted input
- `signature_pad` — 11.9k stars, ~10KB, variable-width Bezier curves for signature capture
- `@dnd-kit` — already installed, can power drag-from-palette
- `Intl.DateTimeFormat` — zero-bundle-cost date formatting

### UX Research
- NNGroup: Labels above fields perform best on all screen sizes
- W3C: Tab order must follow visual reading order
- Eleken/LogRocket: Hybrid click+drag approach is optimal for form builders
- Figma: Alignment and distribution toolbar for multi-selection is table stakes
- GoFormz: Construction teams report 20-35% productivity gains from digital forms
- SafetyCulture/OSHA: Compliance forms require inspector name, date, signature, pass/fail checkboxes
