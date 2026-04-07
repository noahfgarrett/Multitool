# PDF Annotate v2 — Construction-Focused Feature Expansion

**Date:** 2026-03-10
**Target audience:** Construction teams — estimators, engineers, architects, contractors
**Core workflows:** Quantity takeoff, plan review, markup collaboration via email

---

## 1. Measurement Suite Expansion

The current single Measure tool (M) becomes a dropdown with 4 modes, sharing the existing calibration system.

### 1.1 Distance (existing)
- Click two points, displays length
- No changes needed — works as-is

### 1.2 Polylength
- Click multiple points to trace a multi-segment path (walls, pipe runs, conduit)
- Each segment displays its individual length
- Running cumulative total displayed at the end/cursor
- Double-click or Enter to finish the path
- Useful for: walls that turn corners, pipe runs, cable trays

### 1.3 Area / Perimeter
- Click points to define a closed polygon
- Double-click or Enter to close the shape
- Displays enclosed area + perimeter as labels
- Semi-transparent fill color so the measured region is visually obvious
- Useful for: flooring, roofing, concrete pads, paint coverage

### 1.4 Count
- Click to place numbered markers (1, 2, 3...)
- Each count session has a label (e.g., "Doors", "Outlets", "Fire Sprinklers")
- Running total displayed in a badge
- Small panel shows all count groups with totals
- Useful for: fixture counts, quantity takeoffs, inventory

### Shared Features
- All modes use the existing calibration system (set known distance → real-world units)
- Measurements exportable to CSV: Page, Type, Label, Value, Unit
- Dropdown UI sits where the current Measure button is (same pattern as Shapes dropdown)

---

## 2. Edge Snapping (Hybrid)

Pixel-level edge detection for precision measurement placement. The PDF canvas pixel data is already accessible via `getImageData()`.

### 2.1 Threshold Snap (default, always active)
- When placing any measurement point, sample pixels in a ~10-20px radius around the click
- Detect contrast edges (dark-to-light transitions) using threshold comparison
- Snap the point to the nearest detected edge
- Fast — handles 90% of cases (construction drawings are high-contrast black on white)
- Hold Alt to temporarily disable snapping for freehand placement

### 2.2 Precision Mode (toggle)
- Activated via a toolbar toggle or modifier key
- Runs a Sobel filter or gradient-based edge detector in a small region around the cursor
- More accurate for low-contrast or complex drawings
- Slightly heavier computation, limited to a small search area for performance

### Applies To
- All measurement modes (distance, polylength, area, count)
- Calibration tool (most critical use case — pixel-perfect calibration)

---

## 3. Comment System with Chat Bubbles

### 3.1 Sticky Notes — New Tool: Note (N)
- Click anywhere to place a pin icon (colored circle/flag, ~16px)
- Small and unobtrusive on the drawing
- Click the pin to open the chat bubble
- Notes have: author name, timestamp, color coding, text content

### 3.2 Chat Bubble UX
- Clicking any annotation with comments (or a sticky note) opens a chat window anchored to that annotation
- Speech-bubble style, pointing at the markup
- Scrollable message thread (newest at bottom)
- Each message shows: author name, timestamp, text
- Text input at the bottom — Enter to send
- Chat window is draggable if it overlaps content
- Click elsewhere or Escape to dismiss
- Annotations with threads show a chat badge with message count (e.g., "3")

### 3.3 Comment Threading & Status
- Any annotation (not just sticky notes) can have comments attached
- Right-click annotation → "Add Comment" opens the chat bubble
- Comments support threaded replies (indented)
- Each annotation has a status: None → Open → Accepted → Rejected → Resolved
- Status shown as a small colored dot on the annotation
- Status changeable from the chat bubble or context menu

### 3.4 Comments Panel (Sidebar)
- Collapsible sidebar listing all annotations with comment threads
- Filterable by: status, annotation type, page, author
- Click an entry to jump to that annotation and open its chat bubble
- Overview for reviewing all conversations without hunting for pins

---

## 4. Global User Profile

### Storage
- Saved in `localStorage` — persists through toolkit updates (HTML file replacement)
- Same origin (`file://` or localhost) ensures data survives

### Profile Fields
- Name (required — used in comments, author labels)
- Email (used for email integration)
- Initials (auto-generated from name, editable — usable in stamps and markup labels)

### First-Launch Flow
- First time opening the toolkit: modal prompts "What's your name?" with name and email fields
- Small "Edit Profile" option in toolkit settings for changes
- If localStorage is ever cleared, the app detects the missing profile and re-prompts

### Scope
- Global to the toolkit (not per-tool)
- Available to all tools, not just PDF Annotate

---

## 5. Email Integration (Outlook)

### Send Flow
1. Click "Email" button in the PDF Annotate toolbar (next to Export and Print)
2. Pick contacts or groups from a checklist
3. Click Send
4. PDF is exported (For Review mode by default)
5. Attempt `ms-outlook:` protocol to open Outlook with attachment
6. If unsupported, fall back to: auto-download the PDF + open `mailto:` with recipients and subject pre-filled. User drags the file into the email (one extra step)

### Recipient Manager
- Accessible from the Email button or toolkit settings
- Add contacts: name + email address
- Create named groups: "Structural Team", "Client", "Inspectors"
- Assign contacts to one or more groups
- All saved in localStorage (persists through updates)

### Email Content
- Subject line auto-filled: "[Project/File Name] — For Review"
- Body auto-filled with a brief message (editable before send)

---

## 6. Print Button

- "Print" button in the toolbar next to Export and Email
- Opens the browser's native print dialog
- Renders all pages with annotations flattened (WYSIWYG)
- Respects page rotation
- Simple, no configuration needed

---

## 7. Two-Mode Export System

### Export Panel
Replaces the current simple export button. Opens a modal/drawer with two clearly labeled modes.

### 7.1 For Review (default — blue styling)
- Annotations visible in any standard PDF viewer (flattened visuals)
- Hidden metadata stream embedded in the PDF (custom metadata field via pdf-lib)
- Contains full annotation JSON: positions, comments, threads, statuses, author info, measurements
- When opened in the toolkit, detects embedded data and restores everything as editable
- Recipients without the toolkit see a normal annotated PDF

### 7.2 Final Submittal (red/orange styling)
- Flattens everything permanently
- No annotation data embedded — clean deliverable
- Safety measures:
  1. Warning banner when selected: "All annotations will be permanently flattened. Comments, statuses, and edit history will not be recoverable."
  2. Confirmation dialog on Export click: "Are you sure? This cannot be undone. The exported PDF will not be editable in Multitool." with a red "Export Final" button and Cancel
- Visual distinction: red/orange toggle vs blue for Review mode — no ambiguity

### Metadata Embedding
- Annotation data stored as a PDF custom metadata field using pdf-lib
- Invisible to other PDF viewers
- On file upload, the toolkit checks for embedded metadata and offers to restore

---

## 8. Markup Summary Export

### CSV Export
- Columns: Page, Type, Label/Content, Status, Author, Date, Measurement Value, Unit
- Includes all annotations, comments, measurements, and counts
- Useful for importing into spreadsheets for estimating

### PDF Report
- One section per annotated page
- Page thumbnail + table of all markups on that page
- Includes comment threads and statuses
- Clean formatted report for project documentation

---

## Implementation Priority (Suggested)

### Phase 1 — Measurement Suite
1. Measurement dropdown UI (refactor existing tool)
2. Polylength mode
3. Area/Perimeter mode
4. Count tool
5. Edge snapping (threshold)
6. Edge snapping (precision mode)
7. CSV export for measurements

### Phase 2 — Comments & Review
8. Global user profile (first-launch modal, localStorage)
9. Sticky Note tool (N)
10. Chat bubble UX
11. Comment threading & status
12. Comments panel sidebar

### Phase 3 — Export & Distribution
13. Two-mode export (For Review with embedded data, Final Submittal with double confirmation)
14. Metadata embedding/reading via pdf-lib
15. Print button
16. Email integration (Outlook, recipient manager)
17. Markup summary export (CSV + PDF report)

---

## Technical Notes

- **Edge detection** uses canvas `getImageData()` — PDF is already rendered to canvas
- **Annotation embedding** uses pdf-lib custom metadata fields
- **Email** tries `ms-outlook:` protocol first, falls back to `mailto:` + auto-download
- **User profile** stored in localStorage — survives HTML file updates on same origin
- **All features run 100% client-side** — no server, no cloud, single HTML file
