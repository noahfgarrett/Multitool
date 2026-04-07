export interface ChangelogEntry {
  version: string
  date: string
  type: 'major' | 'feature' | 'fix'
  stats?: {
    features?: number
    fixes?: number
    tools?: number
  }
  notes: string
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '4.0.3',
    date: 'PLACEHOLDER',
    type: 'feature',
    stats: { features: 2, tools: 1 },
    notes: `### iPad Experience
- **Stylus Only Drawing** — New setting that locks drawing to Apple Pencil only. Finger gestures are reserved for panning and zooming, just like GoodNotes and Notability
- **Smooth pinch-to-zoom** — Zooming now scales proportionally to your finger distance and anchors to where you're pinching, eliminating the jittery step-based zoom`,
  },
  {
    version: '4.0.2',
    date: '2026-04-07T18:10:07Z',
    type: 'feature',
    stats: { features: 1, tools: 1 },
    notes: `### Performance
- **PDF Annotate — smoother drawing on iPad** — Completely reworked the drawing engine with a three-canvas architecture and frame-rate batching for dramatically reduced lag when using Apple Pencil or touch`,
  },
  {
    version: '4.0.1',
    date: '2026-04-07T12:22:09Z',
    type: 'fix',
    stats: { fixes: 2 },
    notes: `### Fixes
- **Profile photo updates instantly** — Saving your profile now immediately updates your photo and name everywhere without needing to refresh
- **Improved update reliability** — The update button now works on more networks and corporate environments`,
  },
  {
    version: '4.0.0',
    date: '2026-04-07T11:33:34Z',
    type: 'major',
    stats: { features: 8, tools: 15 },
    notes: `### Multitool — A New Identity
- **Full rebrand** — LotusWorks Toolkit is now **Multitool** by Visualize Build LLC, with a fresh teal color palette and Sacramento cursive logo
- **4 new themes** — Night Sky, Blueprint, Clean Dark, and Light — switch instantly from Settings
- **Global settings & user profile** — Set your name, photo, job title, and company for a personalized experience
- **Org Chart — multi-root sections** — Create separate org trees (e.g. Management, Engineering, Field) with section titles and revision control
- **Flowchart — P&ID symbol library** — 46 ISA-5.1 / ISO 14617 shapes across 7 categories with search, recents, and Visio .vsdx export
- **"Got an Idea?" button** — Submit feature requests and bug reports right from the welcome screen
- **PDF Annotate — layers & markups overhaul** — Layer management, markup list with filtering, inline delete, and layer assignment
- **PDF Annotate — code refactor** — Extracted state, keyboard shortcuts, and export logic into dedicated modules for faster future development`,
  },
  {
    version: '3.1.5',
    date: '2026-04-02T14:15:22Z',
    type: 'fix',
    stats: { fixes: 1 },
    notes: `### Stability
- **Improved update reliability** — Fixed an issue that could prevent updates from downloading correctly`,
  },
  {
    version: '3.1.4',
    date: '2026-04-02T14:06:35Z',
    type: 'feature',
    stats: { features: 2, fixes: 1 },
    notes: `### Update Experience Improvements
- **One-click update** — Clicking "Update" now opens the new version in a new tab automatically, no digging through your Downloads folder
- **Changelog shows new version immediately** — The Changelog tab now displays the incoming version's release notes before you even download it
- **"You're all set" confirmation** — After updating, the modal confirms success and reminds you to close the old tab`,
  },
  {
    version: '3.1.3',
    date: '2026-04-02T13:38:16Z',
    type: 'fix',
    stats: { fixes: 1 },
    notes: `### PDF Watermark — Export Rotation Fix
- **Watermarks now export with the correct rotation** — Previously, watermark rotation in the exported PDF was mirrored compared to the preview. Text and image watermarks now match the preview exactly at all angles and positions.`,
  },
  {
    version: '3.1.2',
    date: '2026-04-02T01:30:00Z',
    type: 'fix',
    stats: { fixes: 1 },
    notes: `### PDF Annotate — Text Rotation Fix
- **Text annotations now rotate with the page** — When you rotate a page, text and callout annotations rotate with it instead of staying horizontal. What you see is what you get.`,
  },
  {
    version: '3.1.1',
    date: '2026-04-02T01:00:00Z',
    type: 'fix',
    stats: { features: 1, fixes: 1 },
    notes: `### PDF Annotate — Draw Tool Overhaul
- **Velocity-sensitive strokes** — Drawing fast creates thin lines, drawing slow creates thick lines. Works with both mouse and Apple Pencil.
- **No more settling jolt** — Strokes no longer visibly jump or shift when you release the mouse button. What you see while drawing is exactly what you get.`,
  },
  {
    version: '3.1.0',
    date: '2026-04-02T00:30:00Z',
    type: 'feature',
    stats: { features: 8, fixes: 3, tools: 15 },
    notes: `### Tablet & Touch Support
- **All 15 tools now work on iPad and Android tablets** — Touch input works across every tool
- **Apple Pencil support** — Pressure-sensitive drawing with palm rejection in PDF Annotate
- **Pinch-to-zoom** — Two-finger zoom on the PDF canvas
- **Smoother stylus strokes** — Uses coalesced pointer events for higher-fidelity curves

### Focus Mode
- **Full-screen annotation** — New Focus button hides the sidebar, header, and status bar for maximum canvas space
- **Slide-out tool drawer** — On tablets in focus mode, tools slide out from the right edge with a tap or swipe
- **Pin the drawer open** — Keep tools visible while you work, or let them auto-hide after selection
- **Keyboard shortcut** — Shift+F toggles focus mode

### Touch Polish
- **Larger touch targets** — Buttons automatically enlarge on touch devices
- **Hover-hidden buttons now visible** — Action buttons that were only visible on mouse hover are always visible on touch
- **Sidebar auto-collapses** — On tablet-sized screens, the sidebar starts collapsed for more workspace
- **Smoother drag-and-drop** — PDF Merge and Split now distinguish between scroll and drag on touch`,
  },
  {
    version: '3.0.1',
    date: '2026-04-01T22:15:47Z',
    type: 'feature',
    stats: { features: 4 },
    notes: `### Changelog Modal
- **Built-in changelog** — View the full release history right inside the app, no internet required
- **Release type indicators** — Color-coded left bars show major releases, features, and fixes at a glance (hover to see the label)
- **"What's New" notification** — Orange dot on the version number lets you know when you're running a new version
- **Clickable version link** — Click "Multitool v3.0.1" in the sidebar footer to open the changelog anytime`,
  },
  {
    version: '3.0.0',
    date: '2026-04-01T20:00:50Z',
    type: 'major',
    stats: {
      features: 4,
      fixes: 10,
      tools: 15,
    },
    notes: `### PDF Annotate — Complete toolbar redesign
- **Labeled toolbar buttons** — Icon-only mystery buttons replaced with a clean "More" dropdown showing each tool's name
- **Collapsible tool sidebar** — Expanded with labels by default for new users; collapse to icon-only strip once you know the tools
- **More canvas space** — Compact header, no duplicate page navigation, streamlined bottom bar
- **Export PDF moved to far right** — Natural endpoint for the annotation workflow

### Bug fixes across all 15 tools (v2.9.3)
- **Org Chart** — Fixed undo deleting the entire chart
- **Form Builder** — Fixed fillable PDF export crash
- **Text Extract** — Fixed Word (.docx) export failing silently
- **Flow Chart** — Fixed shapes not placeable + Replace All only replacing last match
- **Data Viewer** — Fixed TSV parsing, malformed JSON error handling, header-only CSV display
- **Background Remover** — Fixed color picker clicks being blocked by tooltip overlay
- **PDF Merge** — Fixed keyboard shortcuts targeting wrong file
- **Dashboard** — Fixed Escape key not closing modals
- **PDF Split** — Improved accessibility labels and DOM structure
- **Image Resizer** — Fixed quality slider default alignment`,
  },
  {
    version: '2.9.2',
    date: '2026-03-31T20:23:56Z',
    type: 'fix',
    stats: {
      fixes: 1,
      tools: 4,
    },
    notes: `- Fixed borders not being flush on Org Chart, Dashboard, Flow Chart, and Form Builder`,
  },
  {
    version: '2.9.1',
    date: '2026-03-31T18:13:23Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `- **Dashboard — crash fix** — Fixed a crash that prevented the Dashboard tool from loading
- **Update modal — smoother downloads** — Downloading a new version now saves the file directly instead of opening a browser tab`,
  },
  {
    version: '2.9.0',
    date: '2026-03-26T20:08:04Z',
    type: 'feature',
    stats: {
      features: 6,
    },
    notes: `- **PDF Merge — Table of Contents** — Add an optional TOC to merged PDFs. Toggle it on from the toolbar, customize entry names, indent sections into parent/child hierarchy, choose numbering formats (1/2/3, A/B/C, I/II/III, or custom), and auto-detect names from page content. The exported PDF gets a professional tabular TOC page with clickable links plus sidebar bookmarks.
- **PDF Merge — page range input** — Type page ranges like "1-5, 8, 12-15" to quickly include/exclude pages without clicking individually.
- **PDF Merge — Select All/None toggle** — One-click include or exclude all pages per file.
- **PDF Merge — settings remembered** — Zoom level, thumbnail resolution, and TOC numbering preferences persist between sessions.
- **PDF Merge — faster thumbnails** — Switched to WebP encoding with JPEG fallback and added a sessionStorage cache. Thumbnails load significantly faster, and re-expanding files is instant.
- **PDF Merge — preview improvements** — Preview mode now shows actual page thumbnails instead of placeholders, and includes TOC page cards when the TOC is enabled.`,
  },
  {
    version: '2.8.1',
    date: '2026-03-26T17:28:44Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- **Help modal — scrollbar fix** — Fixed double scrollbar that appeared in the help/instructions modal across all tools.`,
  },
  {
    version: '2.8.0',
    date: '2026-03-26T17:02:17Z',
    type: 'feature',
    stats: {
      features: 1,
    },
    notes: `- **Report Bug / Idea** — New feedback form at the bottom of the sidebar. Report bugs or suggest enhancements directly from the toolkit — opens your email client with a pre-formatted message, or copies the details to your clipboard if no email client is available.`,
  },
  {
    version: '2.7.3',
    date: '2026-03-26T14:50:00Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `- **File Converter — Windows download fix** — Converted files (PDFs, ZIPs) are no longer blocked by Windows SmartScreen when downloaded. The converter now uses a native Save As dialog where available, bypassing the security restriction that was preventing users from opening or extracting converted files.
- **File Compressor — same fix applied** — Compressed file downloads also use the improved download method for Windows compatibility.`,
  },
  {
    version: '2.7.2',
    date: '2026-03-24T20:29:10Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- **File Converter — HEIC fix** — Replaced HEIC decoder with full libheif build for broad iPhone photo compatibility. No more ERR_HEIF errors.`,
  },
  {
    version: '2.7.1',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `Fixed HEIC conversion showing Unknown error. Also handles iPhone photos that are JPEG files with a .heic extension.`,
  },
  {
    version: '2.7.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 2,
    },
    notes: `- **File Converter — HEIC/HEIF support** — Convert iPhone photos (.heic, .heif) to PNG, JPEG, WebP, or PDF. All processing happens locally in your browser — no uploads, no server.

- **File Converter — bulk progress bar** — When converting multiple files at once, a progress bar now shows which file is being processed and how long it's been running. The "Convert All" button is hidden during conversion to prevent accidental double-clicks.`,
  },
  {
    version: '2.6.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 28,
    },
    notes: `Major upgrade to the Flowchart builder with 28 new features:

- **Flowchart — auto-layout** — One-click layout that arranges your diagram in clean top-to-bottom, left-to-right, or other directions
- **Flowchart — 8 new shapes** — Document, Predefined Process, Manual Operation, Manual Input, Delay, On/Off-Page Reference, Stored Data, and Swim Lane
- **Flowchart — PDF export** — Export flowcharts to PDF with page size options (Letter, Tabloid, A4, auto-fit)
- **Flowchart — print button** — Print directly from the browser with auto-detected orientation
- **Flowchart — 5 color themes** — Classic, Professional, High Contrast, Blueprint, and Print-Ready — one-click theme switching
- **Flowchart — rich text** — Bold, italic, and text alignment per shape
- **Flowchart — drag-from-palette** — Drag shapes directly from the library onto the canvas
- **Flowchart — keyboard creation** — Ctrl+Arrow from any shape instantly creates a connected node in that direction
- **Flowchart — smart connectors** — Connectors now auto-route around other shapes instead of passing through them
- **Flowchart — align & distribute** — Align and evenly distribute multiple selected shapes
- **Flowchart — find & replace** — Ctrl+F to search across all shapes, with optional replace
- **Flowchart — minimap** — Overview panel for navigating large diagrams
- **Flowchart — construction templates** — 5 pre-built templates: RFI Workflow, Submittal Process, Building Inspection, Safety Procedure, Permit Acquisition
- **Flowchart — multi-page** — Create multiple pages within a single diagram with a tab bar
- **Flowchart — layers** — Organize shapes into layers with show/hide and lock controls
- **Flowchart — sketch mode** — Hand-drawn aesthetic toggle for brainstorming sessions
- **Flowchart — shape rotation** — Ctrl+R to rotate shapes 90 degrees
- **Flowchart — format painter** — Copy/paste styles between shapes with Ctrl+Shift+C/V
- **Flowchart — grouping** — Group shapes together with Ctrl+G so they move as a unit`,
  },
  {
    version: '2.5.2',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- **Grid Stitch — neighbor alignment fix** — Fixed an issue where aligning a cell with its neighbor via the right-click menu moved it in the wrong direction`,
  },
  {
    version: '2.5.1',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- **PDF Watermark — export accuracy fix** — Watermark text in exported PDFs now appears in the same position as shown in the preview, fixing a bug where watermarks would shift during export`,
  },
  {
    version: '2.5.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 8,
    },
    notes: `- **PDF Annotate — batch markup** — Right-click any annotation and "Duplicate to Pages..." to copy it across multiple pages at once
- **PDF Annotate — bookmark navigation** — PDF bookmarks (table of contents) now auto-load and display for quick navigation
- **PDF Annotate — tool presets** — Save your favorite tool configurations (color, stroke, opacity) as named presets for one-click recall
- **PDF Annotate — touch/stylus support** — Pen draws while fingers pan/zoom simultaneously on tablets (iPad, Surface)
- **PDF Annotate — document comparison** — Compare two PDF revisions side-by-side, overlaid, or with pixel-diff highlighting (new component)
- **PDF Annotate — markups list** — Sortable/filterable table of all annotations with CSV export (new component)
- **PDF Annotate — custom stamp library** — Create, save, and reuse custom stamps with IndexedDB persistence (new component)
- **PDF Annotate — ink-to-shape** — Draw rough shapes freehand and snap them to clean geometry (new recognizer)`,
  },
  {
    version: '2.4.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 9,
    },
    notes: `- **Form Builder — 11 new construction templates** — Daily Field Report, Job Hazard Analysis, Punch List, Change Order, Timesheet, Concrete Pour Log, Hot Work Permit, Equipment Inspection, RFI, Safety Toolbox Talk, and QCx Commissioning Report
- **Form Builder — new element types** — Date & Time, Number (with $ / # / °F / °C prefix), Data Table, Calculated fields (formulas), and Photo Evidence (with per-image comments)
- **Form Builder — alignment toolbar** — Align and distribute multiple elements with one click (left, center, right, top, middle, bottom, distribute horizontal/vertical)
- **Form Builder — element grouping** — Group elements with Ctrl+G, ungroup with Ctrl+Shift+G
- **Form Builder — tab order overlay** — Visualize form tab order for accessibility
- **Form Builder — conditional visibility** — Show/hide fields based on other field values
- **Form Builder — PDF export improvements** — Required fields now enforced in fillable PDFs, field text alignment preserved
- **Form Builder — print support** — Print forms directly from the browser
- **Form Builder — scrollable modals** — Long template lists now scroll properly`,
  },
  {
    version: '2.3.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 12,
    },
    notes: `- **PDF Merge — page rotation** — Rotate individual pages 90°/180°/270° before merging
- **PDF Merge — output size preview** — See estimated output file size before merging
- **PDF Merge — smart filenames** — Auto-generated output filename based on input files
- **PDF Merge — smooth file reordering** — Animated drag-and-drop file reorder with visual feedback
- **PDF Merge — merge preview** — Preview all pages in final order before downloading
- **PDF Merge — bookmarks** — Auto-generated PDF bookmarks (table of contents) per input file
- **PDF Merge — keyboard shortcuts** — Delete to remove files, arrow keys to navigate
- **PDF Merge — password support** — Unlock password-protected PDFs with a prompt
- **PDF Merge — page count badge** — See included/total page count at a glance
- **Grid Stitch — save/load config** — Save grid layout to JSON and restore it later
- **Grid Stitch — multi-page PDF** — Select which page to use from multi-page PDFs per cell
- **Grid Stitch — overlap blending** — Optional gradient blending at tile seams`,
  },
  {
    version: '2.2.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 5,
    },
    notes: `Five new PDF Annotate features:

- **PDF Annotate — Polygon tool** — Draw closed shapes with straight edges by clicking vertices, double-click to close. Great for outlining rooms, zones, and irregular areas.
- **PDF Annotate — Image/Photo stamps** — Embed site photos, company logos, or detail sketches directly onto plans. Click the image button, pick a file, click to place.
- **PDF Annotate — Annotation layers** — Organize markups into named layers (Structural, Electrical, etc.) and toggle visibility per layer. New Layers panel in the right toolbar.
- **PDF Annotate — Volume measurement** — Area measurements now support depth entry for volume calculation (area x depth = cubic units).
- **PDF Annotate — Pressure-sensitive pen** — Pencil tool now responds to stylus pressure for natural-looking variable-width strokes on tablets.`,
  },
  {
    version: '2.1.4',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 2,
      fixes: 3,
    },
    notes: `- **Text Extract — clean table export** — Table extraction no longer includes titles, paragraphs, and other non-table text as garbage rows in exports.
- **Text Extract — row merging fix** — Fixed a bug where multiple rows of table data were incorrectly collapsed into a single cell, especially on tables with sparse columns.
- **Text Extract — region accuracy** — Drawing a region over a table now correctly clips to the selected area instead of detecting columns outside the region.
- **PDF Annotate — OCR search** — Search (Ctrl+F) now falls back to OCR for scanned PDFs. New OCR Region Scan tool for drawing a box to scan and copy text.
- **PDF Annotate — search improvements** — Search triggers on Enter (not every keystroke), highlights only matching characters, and keybinds are blocked while typing in the search bar.`,
  },
  {
    version: '2.1.3',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- **Text Extract — clean table export** — Table extraction no longer includes titles, paragraphs, and other non-table text as garbage rows. Exports to CSV, Excel, and other formats now contain only the actual table data.`,
  },
  {
    version: '2.1.2',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 1,
      fixes: 3,
    },
    notes: `- **PDF Annotate — OCR Region Scan** — New tool on the right toolbar lets you draw a box over any area to scan and copy text from scanned documents.
- **PDF Annotate — search fix** — Keybinds no longer fire while typing in the search bar. Highlights now cover only the matching characters, not the entire word.
- **PDF Annotate — copy scanned text** — Select tool works on scanned PDFs — drag to select OCR'd words, then copy to clipboard.
- **PDF Annotate — search performance** — Search triggers on Enter instead of every keystroke.`,
  },
  {
    version: '2.1.1',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 1,
      fixes: 1,
    },
    notes: `- **PDF Annotate — search performance** — Search now triggers on Enter instead of every keystroke, preventing slowdown during OCR processing.
- **PDF Annotate — copy scanned text** — Select tool now works on scanned PDFs — drag to select OCR'd text, then copy to clipboard.`,
  },
  {
    version: '2.1.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 1,
      fixes: 2,
    },
    notes: `- **PDF Annotate — OCR search** — Find (Ctrl+F) now works on scanned PDFs with no embedded text. Tesseract.js automatically scans pages and highlights matched words.
- **Grid Stitch — auto-align fix** — Smart pixel detection now correctly finds overlapping content regardless of zoom level.
- **Text Extract — OCR fix** — Fixed word-level bounding box extraction for positioned text output.`,
  },
  {
    version: '2.0.10',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- **Grid Stitch — auto-align rewrite** — Fixed critical bug where alignment was comparing blank canvases instead of actual tile content. Algorithm now properly loads images before analysis, with wider edge detection strips and improved correlation accuracy`,
  },
  {
    version: '2.0.9',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- **Grid Stitch — improved export labels** — Labels are now large, centered in each tile, and mostly transparent (15% opacity) — easy to read without obscuring the drawing content`,
  },
  {
    version: '2.0.8',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 2,
    },
    notes: `- **Grid Stitch — Auto-align** — Automatically detects overlapping edges between adjacent tiles and snaps them into alignment. Select an anchor cell and click Auto-align to line up the entire grid
- **Grid Stitch — Align with neighbor** — Right-click any cell to align it with a specific adjacent neighbor for fine-tuning`,
  },
  {
    version: '2.0.7',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 1,
      fixes: 1,
    },
    notes: `- **Grid Stitch — Region Focus improved** — Now shows Apply/Discard buttons instead of auto-saving changes. Esc discards, Apply keeps your edits
- **Grid Stitch — file drop fix** — Fixed an issue where dropping a file into a specific cell would also duplicate it into the next empty cell`,
  },
  {
    version: '2.0.6',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 1,
    },
    notes: `- **Grid Stitch — grid-axis label toggle** — Switch cell labels to match construction drawing grid conventions (A1 at bottom-left, columns as letters, rows as numbers counting up)`,
  },
  {
    version: '2.0.5',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 3,
    },
    notes: `- **Grid Stitch — Apply Zoom to All** — Set zoom and position on one cell, then apply it to every other filled cell with one click
- **Grid Stitch — Region Focus** — Ctrl+click to select multiple cells, then zoom into just those tiles for precise editing in large grids
- **Grid Stitch — Snap-to-Position** — Content snaps to center and edge alignment while dragging, with a brief visual guide on snap`,
  },
  {
    version: '2.0.4',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 6,
    },
    notes: `- **Grid Stitch — presets dropdown** — Quickly set common grid layouts (2×2, 3×3, side-by-side, stacked, etc.) with one click
- **Grid Stitch — undo/redo** — Full undo/redo support (Ctrl+Z / Ctrl+Y) for all grid actions
- **Grid Stitch — fill order toggle** — Choose row-first or column-first when bulk-uploading files into the grid
- **Grid Stitch — export page size** — Select a standard page size (Letter, Tabloid, A3, A1, Arch D/E, etc.) for the exported PDF
- **Grid Stitch — filename tooltip** — Hover over any filled cell to see the source filename
- **Grid Stitch — keyboard shortcuts** — Tab/Shift+Tab to cycle cells, Delete to clear, arrow keys to nudge content`,
  },
  {
    version: '2.0.3',
    date: '2026-03-13T11:03:31Z',
    type: 'fix',
    stats: {
      features: 1,
      fixes: 1,
    },
    notes: `- **PDF Merge — drag-and-drop to cells** — Drag files from your desktop directly onto any grid cell to place them exactly where you want
- **PDF Merge — export clipping fix** — Zoomed or repositioned content no longer bleeds outside cell boundaries in exported PDFs`,
  },
  {
    version: '2.0.2',
    date: '2026-03-13T10:47:30Z',
    type: 'fix',
    stats: {
      features: 1,
    },
    notes: `- **PDF Merge — Focus view via right-click** — Right-click any filled cell in Grid Stitch and select "Focus view" to open full-screen zoom and pan mode, useful when grid tiles are too small for the toolbar buttons`,
  },
  {
    version: '2.0.1',
    date: '2026-03-12T18:24:19Z',
    type: 'fix',
    stats: {
      features: 1,
    },
    notes: `- **PDF Merge — per-cell file upload** — Empty cells in Grid Stitch now show a "+" button to add a file directly to that specific grid position, making it easy to place files exactly where you want them`,
  },
  {
    version: '2.0.0',
    date: '2026-03-12T15:30:11Z',
    type: 'major',
    stats: {
      features: 7,
    },
    notes: `- **PDF Merge — Grid Stitch mode** — New tab that lets you arrange documents and images in a grid layout (2×2, 3×3, or any custom combination up to 15×15) and export as a single stitched PDF. Perfect for construction drawing quadrants.
- **PDF Merge — per-cell zoom & pan** — Click a cell to select it, then scroll to zoom or drag to reposition the content within its tile
- **PDF Merge — Focus Mode** — Expand a selected cell for a full-size editing view with precise zoom and pan controls
- **PDF Merge — editable tile labels** — Double-click any label (A1, B2, etc.) to rename it; custom labels export onto the PDF
- **PDF Merge — export toggles** — Toggle gridlines and labels on or off for export independently; preview gridlines in the editor with a separate toggle
- **PDF Merge — cell swapping** — Drag a label badge onto another cell to swap their contents
- **PDF Merge — compression option** — Optional compression toggle for smaller file sizes when detail preservation isn't critical`,
  },
  {
    version: '1.9.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 1,
    },
    notes: `- **PDF Annotate — text tool overhaul** — Rebuilt text editing with improved Retina/HiDPI support. Text boxes can now be moved by dragging and edited by clicking.`,
  },
  {
    version: '1.8.7',
    date: '2026-03-09T11:55:53Z',
    type: 'fix',
    stats: {
      features: 6,
    },
    notes: `- **PDF Annotate — tools stay active** — Drawing tools now remain selected after each use, so you can place multiple annotations without re-selecting the tool each time
- **PDF Annotate — highlighter improved** — Highlighter now defaults to yellow with a thicker stroke for better visibility
- **PDF Annotate — click to edit text** — Single-click any text annotation to immediately edit it; I-beam cursor appears on hover
- **PDF Annotate — right-click to edit** — New "Edit Text" option in the right-click context menu for text annotations
- **PDF Annotate — custom colors & eyedropper** — All color pickers now include a custom color option and an eyedropper tool to pick any color from your screen
- **PDF Annotate — page centering fixed** — PDF pages now stay properly centered on HiDPI/Retina displays and respond correctly to window resizing`,
  },
  {
    version: '1.8.6',
    date: '2026-03-09T10:59:49Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `- **PDF Annotate — drag & resize fix** — Fixed an issue where moving or resizing an annotation could accidentally affect a different annotation if you clicked away during the drag
- **PDF Annotate — text box interaction improved** — Single-clicking a selected text box now moves it; double-click to edit. Previously, clicking the body of an already-selected text box did nothing`,
  },
  {
    version: '1.8.5',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 2,
      fixes: 3,
    },
    notes: `- **PDF Annotate — opens at 100% zoom** — PDFs now always open at 100% zoom for a consistent, predictable starting point on any screen
- **PDF Annotate — fit to window fixed** — The fit-to-window button (F key / Ctrl+0) now correctly fits the entire page in the viewport instead of over-zooming to fill just the container width
- **Performance** — Reduced unnecessary re-renders while hovering over the canvas
- **Memory** — Fixed unbounded text cache growth in long PDF sessions
- **Safari stability** — Form Creator now handles private browsing storage gracefully`,
  },
  {
    version: '1.8.4',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `- **PDF Annotate — opens at 100% zoom** — PDFs now always open at 100% zoom for a consistent, predictable starting point on any screen
- **PDF Annotate — fit to window fixed** — The fit-to-window button (F key / Ctrl+0) now correctly fits the entire page in the viewport instead of over-zooming to fill just the container width`,
  },
  {
    version: '1.8.3',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      fixes: 4,
    },
    notes: `- **PDF Annotate — smoother scrolling** — Fixed unnecessary re-renders on every mouse move while hovering over the canvas; the annotation hover highlight now only triggers a re-render when the hovered annotation actually changes
- **PDF Annotate — memory fix** — Text cache for large PDFs now caps at 200 entries to prevent unbounded memory growth in long sessions with multi-rotation documents
- **Safari private browsing fix** — Form Creator now handles storage errors gracefully instead of crashing when local storage is unavailable
- **Improved type safety** — Removed last remaining \`any\` casts from PDF Merge export handler`,
  },
  {
    version: '1.8.2',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Fixed crash when loading PDF Annotate — a hook was placed after an early return, causing React to detect a hook count mismatch on re-render`,
  },
  {
    version: '1.8.1',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Fixed crash when opening PDF Annotate and other tools (React error #310)`,
  },
  {
    version: '1.8.0',
    date: '2026-03-04T18:25:01Z',
    type: 'feature',
    stats: {
      features: 10,
    },
    notes: `- **10 new PDF Annotate features** — stamp tool, annotation list panel, right-click context menu, sticky tool mode, find & highlight, page crop, z-order control, hover tooltips, delete key shortcut, and page jump input
- **Sharper PDF rendering at all zoom levels** — pages now render at full resolution matched to your display and zoom level, eliminating blurriness
- **PDF.js quality improvements** — print-quality rasterization, native annotation suppression, and compositing optimizations for crisper text and graphics
- **Faster annotation performance** — eliminated canvas re-renders on every mouse move; React.memo on thumbnails; O(1) annotation lookup
- **Find & highlight improvements** — case-sensitive toggle, scroll-to-match, F3/Shift+F3 keyboard shortcuts
- **Right-click context menu** — duplicate, delete, copy/paste style, z-order, with keyboard shortcut hints
- **Annotation list panel** — browse all annotations by page, click to jump, delete inline
- **Stamp presets in properties** — change stamp type on selected stamps without re-drawing`,
  },
  {
    version: '1.7.8',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 2,
      fixes: 1,
    },
    notes: `- Double-click any text or callout box to edit it, regardless of which tool is active
- Text and callout tools now enter edit mode on single-click for faster editing
- PDF Merge now accepts drag-and-drop files at any time, even with documents already loaded
- Fixed a crash when opening PDF Merge`,
  },
  {
    version: '1.7.7',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 3,
    },
    notes: `- Double-click any text or callout box to edit it, regardless of which tool is active
- Text and callout tools now enter edit mode on single-click for faster editing
- PDF Merge now accepts drag-and-drop files at any time, even with documents already loaded`,
  },
  {
    version: '1.7.6',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 6,
    },
    notes: `- Tool icons moved to vertical panel on right side for more vertical viewing space
- Text boxes now movable with single-click drag, double-click to edit
- Grab hand cursor when moving text and callout boxes
- Fit-to-window zoom improved
- Floating formatting toolbar for text editing
- Added justify alignment, superscript/subscript, bullet and numbered lists
- Update modal downloads directly`,
  },
  {
    version: '1.7.5',
    date: '2026-03-05T14:55:58Z',
    type: 'fix',
    stats: {
      features: 5,
      fixes: 5,
    },
    notes: `- Shapes now support fill colors, dashed/dotted outlines, and rounded corners
- Arrows can be double-headed
- Cloud polygon auto-closes when cursor nears the starting point
- Smoother freehand strokes with optimized point storage
- PDF export renders smooth curves instead of jagged line segments
- Session restore verifies file identity for more reliable persistence
- HiDPI display support for sharper canvas rendering
- Highlight color presets (yellow, green, blue, pink, orange)
- Improved hit-testing accuracy at all zoom levels
- Internal architecture cleanup for better maintainability`,
  },
  {
    version: '1.7.1',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 3,
      fixes: 2,
    },
    notes: `- **Fixed zoom jumping when switching tools** — zoom level now stays exactly where you set it
- **PDF loads at fit-to-window zoom** — documents are properly centered and sized on open
- **Single-click to edit text** — click any text box to start editing immediately, from any tool
- **I-beam cursor on text boxes** — cursor changes to I-beam when hovering over text annotations in select mode
- **Seamless tool switching** — clicking a text box from the select tool automatically switches to text mode`,
  },
  {
    version: '1.7.0',
    date: '2026-03-04T18:25:01Z',
    type: 'feature',
    stats: {
      fixes: 4,
    },
    notes: `- **Fixed drag-and-drop flicker** — File upload drop zone no longer flashes when hovering
- **Improved multi-page annotation reliability** — Drawing and editing on page 2+ is now more consistent
- **Improved PDF export compatibility** — Export works reliably across all browsers
- **General stability improvements** — Various fixes across annotation tools for a smoother experience`,
  },
  {
    version: '1.6.0',
    date: '2026-03-04T18:25:01Z',
    type: 'feature',
    stats: {
      features: 2,
      fixes: 5,
    },
    notes: `- Added multi-page continuous scroll to PDF Annotate
- Added session persistence — your annotations are saved and restored automatically
- Fixed text boxes and callouts not being draggable after placing
- Fixed screen jitter when placing text boxes
- Fixed pages hugging the left side when zoomed out
- Fixed page not re-centering on window resize
- Fixed update notifications not appearing when a new version is available`,
  },
  {
    version: '1.5.2',
    date: '2026-03-03T12:55:12Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Fixed screen jitter when placing or editing text boxes`,
  },
  {
    version: '1.5.1',
    date: '2026-03-03T15:30:08Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `- Fixed pages snapping to the left when zoomed out — they now stay centered
- Fixed centering breaking when the window is resized`,
  },
  {
    version: '1.5.0',
    date: '2026-03-03T14:53:16Z',
    type: 'feature',
    stats: {
      features: 5,
    },
    notes: `### PDF Annotate: Multi-Page Continuous Scroll
All PDF pages now display in a single scrollable view — just like Adobe Acrobat or Preview. No more clicking prev/next arrows to navigate between pages.

#### Key Features
- **Continuous vertical scroll** — See all pages at once, scroll naturally through the document
- **Smart lazy rendering** — Pages load as you scroll to them, keeping performance fast even on 100+ page documents
- **Auto fit-to-width** — Documents open zoomed to fill the window width
- **Live page tracking** — Status bar and thumbnail sidebar update as you scroll
- **Full annotation support** — Draw, erase, add text, measure, and highlight on any page. Annotations stay on the page where you placed them

#### Technical Details
- Each page gets its own canvas pair (avoids browser canvas size limits)
- IntersectionObserver with 1000px preload margin for smooth scrolling
- Pointer capture prevents drawing from accidentally crossing page boundaries
- All existing features (export, undo/redo, rotation, zoom) work unchanged`,
  },
  {
    version: '1.4.0',
    date: '2026-03-03T12:55:12Z',
    type: 'feature',
    stats: {
      features: 11,
    },
    notes: `### PDF Annotate — Major Overhaul
- **Two-tier toolbar**: Clean top row for tools, contextual bottom row for properties (color, stroke, opacity, text formatting)
- **Cursor-position zoom**: Ctrl+scroll zooms at cursor location instead of center
- **Pan modes**: Middle-mouse drag and Space+drag for quick navigation
- **Property editing**: Select any annotation to edit its visual properties live — fully undoable
- **Text editing improvements**: Single-click re-edit, auto-height text boxes (PowerPoint-style), no text overflow
- **Hover highlight**: Dashed blue outline preview on hover in select mode
- **Zoom presets**: Click the percentage to jump to 25%–300%, Fit Page, or Fit Width
- **Toast notifications**: Visual feedback for copy, export, and delete actions
- **Compact status bar**: Three-column layout replacing the verbose footer
- **Unsaved changes warning**: Prompt before navigating away with annotations
- **New keyboard shortcuts**: Ctrl+]/[ layer order, F fit page, +/- zoom, Space pan`,
  },
  {
    version: '1.3.1',
    date: '2026-03-02T15:54:13Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- **Fix annotation rotation:** Annotations now stay in their correct position when the page is rotated (90°, 180°, 270°). Previously, annotations would drift to incorrect positions after rotation.`,
  },
  {
    version: '1.3.0',
    date: '2026-03-02T15:32:00Z',
    type: 'feature',
    stats: {
      features: 5,
    },
    notes: `- **Embedded text selection in Select tool** — hover over PDF text to see I-beam cursor, click-drag to select with character-level precision
- **Floating toolbar** on text selection with Highlight, Strikethrough, and Copy buttons
- **Instant highlight/strikethrough** — toolbar buttons apply directly when text is selected
- **Apple Preview-style highlighting** — mix-blend-mode multiply keeps text perfectly crisp through highlights
- **Fixed text highlight alignment** — highlights now sit precisely on the text`,
  },
  {
    version: '1.2.5',
    date: '2026-02-27T13:28:59Z',
    type: 'fix',
    notes: `Test release — verifying update instructions appear in modal`,
  },
  {
    version: '1.2.4',
    date: '2026-02-27T13:25:17Z',
    type: 'fix',
    notes: `Added download instructions to update modal`,
  },
]
