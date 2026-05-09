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
    version: '4.4.1',
    date: '2026-05-09T20:47:39Z',
    type: 'fix',
    stats: { fixes: 2 },
    notes: `### PDF Annotate
- Freehand pencil strokes no longer change shape after drawing
- Removed auto shape recognition from pencil tool`,
  },
  {
    version: '4.4.0',
    date: '2026-05-09T18:34:39Z',
    type: 'feature',
    stats: { features: 12, fixes: 30 },
    notes: `### PDF Annotate — Quality of Life Mega-Pass
- Image stamps and cloud shapes
- Angle measurement tool
- Volume and perimeter measurement
- Edge snapping and precision snap mode
- Highlighter and eraser visual feedback
- Super/subscript and strikethrough text formatting
- Dash patterns for shapes and lines
- Fill color with adjustable opacity
- Right-click context menu on annotations
- Arrow key nudge for selected annotations
- Bounding-box multi-select
- Smooth pinch-to-zoom on mobile
- Faster canvas sharpening after zoom
- 30+ bug fixes across all annotation tools`,
  },
  {
    version: '4.3.0',
    date: '2026-05-09T12:20:43Z',
    type: 'feature',
    stats: { features: 6, fixes: 3 },
    notes: `### Org Chart — Typed Connectors & Legend
- Custom connector types with configurable colors and labels
- Connect mode for drawing edges between nodes
- Click or shift-drag to select edges on the canvas
- Connector types modal for renaming and recoloring
- Legend rendering in PNG and SVG exports
- CSV secondary column support
- New Matrix Organization template`,
  },
  {
    version: '4.0.27',
    date: '2026-04-10T17:49:30Z',
    type: 'feature',
    stats: { features: 3, fixes: 5 },
    notes: `### PDF Annotate — iPad Overhaul
- Smooth pinch-to-zoom on large construction drawings
- Full clarity at any zoom level via tiled rendering
- No more white flash when zooming
- Pinch zoom and pan stay locked to your fingers
- Freehand pencil strokes stay freehand
- Tool dropdowns work on tablet in all modes`,
  },
  {
    version: '4.0.8',
    date: '2026-04-09T14:36:09Z',
    type: 'fix',
    stats: { fixes: 2 },
    notes: `### PDF Annotate
- Focus mode now hides the full app chrome on tablet as well as desktop
- Smoother pinch-to-zoom on iPad, especially on large documents`,
  },
  {
    version: '4.0.7',
    date: '2026-04-09T14:07:08Z',
    type: 'fix',
    stats: { fixes: 5 },
    notes: `### PDF Annotate
- Pages no longer blank while zooming
- Focus mode hides the app sidebar and header
- Mobile page counter stays on one line
- Mobile text tool no longer takes over the top of the screen
- Eraser circle matches the actual erase area at every zoom level`,
  },
  {
    version: '4.0.6',
    date: '2026-04-09T12:53:06Z',
    type: 'feature',
    stats: { features: 1, tools: 1 },
    notes: `### PDF Annotate
- New mobile phone layout with a peek bar for core tools
- Swipe gestures for thumbnails, tool drawer, and top toolbar
- Long-press any tool for quick settings
- Three-finger swipe for undo/redo
- PDFs fit to screen on first open`,
  },
  {
    version: '4.0.5',
    date: '2026-04-09T12:02:59Z',
    type: 'fix',
    stats: { fixes: 1 },
    notes: `### PDF Annotate
- Smoother pinch-to-zoom on iPad`,
  },
  {
    version: '4.0.4',
    date: '2026-04-09T03:11:40Z',
    type: 'fix',
    stats: { fixes: 1 },
    notes: `### PDF Annotate
- Fixed pages loading black or upside-down`,
  },
  {
    version: '4.0.3',
    date: '2026-04-07T18:43:59Z',
    type: 'feature',
    stats: { features: 2, tools: 1 },
    notes: `### iPad
- New Stylus Only drawing mode
- Smoother pinch-to-zoom`,
  },
  {
    version: '4.0.2',
    date: '2026-04-07T18:10:07Z',
    type: 'feature',
    stats: { features: 1, tools: 1 },
    notes: `### Performance
- Smoother drawing on iPad`,
  },
  {
    version: '4.0.1',
    date: '2026-04-07T12:22:09Z',
    type: 'fix',
    stats: { fixes: 2 },
    notes: `- Profile photo updates instantly
- More reliable updates`,
  },
  {
    version: '4.0.0',
    date: '2026-04-07T11:33:34Z',
    type: 'major',
    stats: { features: 8, tools: 15 },
    notes: `### Multitool — A New Identity
- Rebranded from LotusWorks Toolkit to Multitool
- 4 new themes (Night Sky, Blueprint, Clean Dark, Light)
- Global settings and user profile
- Org Chart multi-root sections
- Flowchart P&ID symbol library
- "Got an Idea?" feedback button
- PDF Annotate layers and markups overhaul`,
  },
  {
    version: '3.1.5',
    date: '2026-04-02T14:15:22Z',
    type: 'fix',
    stats: { fixes: 1 },
    notes: `- More reliable updates`,
  },
  {
    version: '3.1.4',
    date: '2026-04-02T14:06:35Z',
    type: 'feature',
    stats: { features: 2, fixes: 1 },
    notes: `### Updates
- One-click update
- Changelog shows new version immediately
- "You're all set" confirmation`,
  },
  {
    version: '3.1.3',
    date: '2026-04-02T13:38:16Z',
    type: 'fix',
    stats: { fixes: 1 },
    notes: `### PDF Watermark
- Fixed watermark rotation in exported PDFs`,
  },
  {
    version: '3.1.2',
    date: '2026-04-02T01:30:00Z',
    type: 'fix',
    stats: { fixes: 1 },
    notes: `### PDF Annotate
- Text annotations now rotate with the page`,
  },
  {
    version: '3.1.1',
    date: '2026-04-02T01:00:00Z',
    type: 'fix',
    stats: { features: 1, fixes: 1 },
    notes: `### PDF Annotate
- Velocity-sensitive pencil strokes
- No more settling jolt on release`,
  },
  {
    version: '3.1.0',
    date: '2026-04-02T00:30:00Z',
    type: 'feature',
    stats: { features: 8, fixes: 3, tools: 15 },
    notes: `### Tablet & Touch Support
- All 15 tools now work on iPad and Android tablets
- Apple Pencil support with palm rejection
- Pinch-to-zoom
- Smoother stylus strokes

### Focus Mode
- Full-screen annotation mode
- Slide-out tool drawer on tablets
- Pin the drawer open
- Shift+F keyboard shortcut

### Touch Polish
- Larger touch targets
- Hover-only buttons always visible on touch
- Sidebar auto-collapses on tablets
- Smoother drag-and-drop`,
  },
  {
    version: '3.0.1',
    date: '2026-04-01T22:15:47Z',
    type: 'feature',
    stats: { features: 4 },
    notes: `### Changelog Modal
- Built-in changelog viewer
- Color-coded release type indicators
- "What's New" notification dot
- Clickable version link in sidebar`,
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
    notes: `### PDF Annotate
- Toolbar redesign with labeled buttons
- Collapsible tool sidebar
- More canvas space
- Export PDF moved to far right

### Bug fixes across all tools
- Org Chart undo fix
- Form Builder fillable PDF crash fix
- Text Extract Word export fix
- Flow Chart shape placement fix
- Data Viewer parsing fixes
- Background Remover tooltip fix
- PDF Merge keyboard shortcut fix
- Dashboard Escape key fix
- PDF Split accessibility
- Image Resizer slider fix`,
  },
  {
    version: '2.9.2',
    date: '2026-03-31T20:23:56Z',
    type: 'fix',
    stats: {
      fixes: 1,
      tools: 4,
    },
    notes: `- Fixed borders on Org Chart, Dashboard, Flow Chart, and Form Builder`,
  },
  {
    version: '2.9.1',
    date: '2026-03-31T18:13:23Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `- Dashboard crash fix
- Smoother update downloads`,
  },
  {
    version: '2.9.0',
    date: '2026-03-26T20:08:04Z',
    type: 'feature',
    stats: {
      features: 6,
    },
    notes: `### PDF Merge
- Table of Contents generator
- Page range input
- Select All/None toggle
- Settings remembered between sessions
- Faster thumbnails
- Preview improvements`,
  },
  {
    version: '2.8.1',
    date: '2026-03-26T17:28:44Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Help modal scrollbar fix`,
  },
  {
    version: '2.8.0',
    date: '2026-03-26T17:02:17Z',
    type: 'feature',
    stats: {
      features: 1,
    },
    notes: `- New Report Bug / Idea feedback form`,
  },
  {
    version: '2.7.3',
    date: '2026-03-26T14:50:00Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `- File Converter Windows download fix
- File Compressor Windows download fix`,
  },
  {
    version: '2.7.2',
    date: '2026-03-24T20:29:10Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- HEIC decoder fix for iPhone photos`,
  },
  {
    version: '2.7.1',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- HEIC conversion error fix`,
  },
  {
    version: '2.7.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 2,
    },
    notes: `### File Converter
- HEIC/HEIF iPhone photo support
- Bulk conversion progress bar`,
  },
  {
    version: '2.6.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 28,
    },
    notes: `### Flowchart — Major Upgrade
- Auto-layout
- 8 new shapes
- PDF export
- Print button
- 5 color themes
- Rich text formatting
- Drag-from-palette
- Keyboard creation
- Smart connectors
- Align & distribute
- Find & replace
- Minimap
- Construction templates
- Multi-page
- Layers
- Sketch mode
- Shape rotation
- Format painter
- Grouping`,
  },
  {
    version: '2.5.2',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Grid Stitch neighbor alignment fix`,
  },
  {
    version: '2.5.1',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- PDF Watermark export position fix`,
  },
  {
    version: '2.5.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 8,
    },
    notes: `### PDF Annotate
- Batch markup across pages
- Bookmark navigation
- Tool presets
- Touch and stylus support
- Document comparison
- Markups list with CSV export
- Custom stamp library
- Ink-to-shape recognition`,
  },
  {
    version: '2.4.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 9,
    },
    notes: `### Form Builder
- 11 new construction templates
- New element types (Date/Time, Number, Data Table, Calculated, Photo Evidence)
- Alignment toolbar
- Element grouping
- Tab order overlay
- Conditional visibility
- PDF export improvements
- Print support
- Scrollable modals`,
  },
  {
    version: '2.3.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 12,
    },
    notes: `### PDF Merge
- Page rotation
- Output size preview
- Smart filenames
- Smooth file reordering
- Merge preview
- Bookmarks
- Keyboard shortcuts
- Password support
- Page count badge

### Grid Stitch
- Save/load config
- Multi-page PDF support
- Overlap blending`,
  },
  {
    version: '2.2.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 5,
    },
    notes: `### PDF Annotate
- Polygon tool
- Image/Photo stamps
- Annotation layers
- Volume measurement
- Pressure-sensitive pen`,
  },
  {
    version: '2.1.4',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 2,
      fixes: 3,
    },
    notes: `### Text Extract
- Clean table export
- Row merging fix
- Region accuracy

### PDF Annotate
- OCR search
- Search improvements`,
  },
  {
    version: '2.1.3',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Text Extract clean table export`,
  },
  {
    version: '2.1.2',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 1,
      fixes: 3,
    },
    notes: `### PDF Annotate
- New OCR Region Scan tool
- Search fix
- Copy scanned text
- Search performance`,
  },
  {
    version: '2.1.1',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 1,
      fixes: 1,
    },
    notes: `### PDF Annotate
- Search performance
- Copy scanned text`,
  },
  {
    version: '2.1.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 1,
      fixes: 2,
    },
    notes: `- PDF Annotate OCR search
- Grid Stitch auto-align fix
- Text Extract OCR fix`,
  },
  {
    version: '2.0.10',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Grid Stitch auto-align rewrite`,
  },
  {
    version: '2.0.9',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Grid Stitch improved export labels`,
  },
  {
    version: '2.0.8',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 2,
    },
    notes: `### Grid Stitch
- Auto-align
- Align with neighbor`,
  },
  {
    version: '2.0.7',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 1,
      fixes: 1,
    },
    notes: `### Grid Stitch
- Region Focus improved
- File drop fix`,
  },
  {
    version: '2.0.6',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 1,
    },
    notes: `- Grid Stitch grid-axis label toggle`,
  },
  {
    version: '2.0.5',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 3,
    },
    notes: `### Grid Stitch
- Apply Zoom to All
- Region Focus
- Snap-to-Position`,
  },
  {
    version: '2.0.4',
    date: '2026-03-08T18:26:53Z',
    type: 'fix',
    stats: {
      features: 6,
    },
    notes: `### Grid Stitch
- Presets dropdown
- Undo/redo
- Fill order toggle
- Export page size
- Filename tooltip
- Keyboard shortcuts`,
  },
  {
    version: '2.0.3',
    date: '2026-03-13T11:03:31Z',
    type: 'fix',
    stats: {
      features: 1,
      fixes: 1,
    },
    notes: `### PDF Merge
- Drag-and-drop to cells
- Export clipping fix`,
  },
  {
    version: '2.0.2',
    date: '2026-03-13T10:47:30Z',
    type: 'fix',
    stats: {
      features: 1,
    },
    notes: `- PDF Merge Focus view via right-click`,
  },
  {
    version: '2.0.1',
    date: '2026-03-12T18:24:19Z',
    type: 'fix',
    stats: {
      features: 1,
    },
    notes: `- PDF Merge per-cell file upload`,
  },
  {
    version: '2.0.0',
    date: '2026-03-12T15:30:11Z',
    type: 'major',
    stats: {
      features: 7,
    },
    notes: `### PDF Merge — Grid Stitch
- New Grid Stitch mode
- Per-cell zoom & pan
- Focus Mode
- Editable tile labels
- Export toggles
- Cell swapping
- Compression option`,
  },
  {
    version: '1.9.0',
    date: '2026-03-08T18:26:53Z',
    type: 'feature',
    stats: {
      features: 1,
    },
    notes: `- PDF Annotate text tool overhaul`,
  },
  {
    version: '1.8.7',
    date: '2026-03-09T11:55:53Z',
    type: 'fix',
    stats: {
      features: 6,
    },
    notes: `### PDF Annotate
- Tools stay active after use
- Highlighter defaults to yellow
- Click to edit text
- Right-click edit text option
- Custom colors & eyedropper
- Page centering fix`,
  },
  {
    version: '1.8.6',
    date: '2026-03-09T10:59:49Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `### PDF Annotate
- Drag & resize fix
- Text box interaction improved`,
  },
  {
    version: '1.8.5',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 2,
      fixes: 3,
    },
    notes: `### PDF Annotate
- Opens at 100% zoom
- Fit-to-window fix
- Performance improvements
- Memory fix
- Safari stability`,
  },
  {
    version: '1.8.4',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `### PDF Annotate
- Opens at 100% zoom
- Fit-to-window fix`,
  },
  {
    version: '1.8.3',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      fixes: 4,
    },
    notes: `### PDF Annotate
- Smoother scrolling
- Memory fix
- Safari private browsing fix
- Improved type safety`,
  },
  {
    version: '1.8.2',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- PDF Annotate load crash fix`,
  },
  {
    version: '1.8.1',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Tool load crash fix`,
  },
  {
    version: '1.8.0',
    date: '2026-03-04T18:25:01Z',
    type: 'feature',
    stats: {
      features: 10,
    },
    notes: `### PDF Annotate — Major Update
- 10 new tools (stamp, annotation list, context menu, sticky tool, find, crop, z-order, tooltips, delete shortcut, page jump)
- Sharper rendering at all zoom levels
- Print-quality rasterization
- Faster annotation performance
- Find & highlight improvements
- Right-click context menu
- Annotation list panel
- Stamp presets`,
  },
  {
    version: '1.7.8',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 2,
      fixes: 1,
    },
    notes: `- Double-click to edit text
- Single-click edit mode
- PDF Merge drag-and-drop anytime
- PDF Merge crash fix`,
  },
  {
    version: '1.7.7',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 3,
    },
    notes: `- Double-click to edit text
- Single-click edit mode
- PDF Merge drag-and-drop anytime`,
  },
  {
    version: '1.7.6',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 6,
    },
    notes: `### PDF Annotate
- Vertical tool panel
- Single-click drag for text boxes
- Grab cursor on text and callout boxes
- Improved fit-to-window
- Floating formatting toolbar
- New formatting options
- Direct update downloads`,
  },
  {
    version: '1.7.5',
    date: '2026-03-05T14:55:58Z',
    type: 'fix',
    stats: {
      features: 5,
      fixes: 5,
    },
    notes: `### PDF Annotate
- Shape fill, dashed/dotted outlines, rounded corners
- Double-headed arrows
- Auto-closing cloud polygon
- Smoother freehand strokes
- PDF export curve smoothing
- Session restore file verification
- HiDPI support
- Highlight color presets
- Hit-testing accuracy
- Architecture cleanup`,
  },
  {
    version: '1.7.1',
    date: '2026-03-04T18:25:01Z',
    type: 'fix',
    stats: {
      features: 3,
      fixes: 2,
    },
    notes: `### PDF Annotate
- Zoom stays when switching tools
- PDF loads at fit-to-window
- Single-click to edit text
- I-beam cursor on text
- Seamless tool switching`,
  },
  {
    version: '1.7.0',
    date: '2026-03-04T18:25:01Z',
    type: 'feature',
    stats: {
      fixes: 4,
    },
    notes: `### PDF Annotate
- Drag-and-drop flicker fix
- Multi-page reliability
- Export compatibility
- Stability improvements`,
  },
  {
    version: '1.6.0',
    date: '2026-03-04T18:25:01Z',
    type: 'feature',
    stats: {
      features: 2,
      fixes: 5,
    },
    notes: `### PDF Annotate
- Multi-page continuous scroll
- Session persistence
- Text box dragging fix
- Screen jitter fix
- Zoom centering fix
- Resize centering fix
- Update notification fix`,
  },
  {
    version: '1.5.2',
    date: '2026-03-03T12:55:12Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Text box screen jitter fix`,
  },
  {
    version: '1.5.1',
    date: '2026-03-03T15:30:08Z',
    type: 'fix',
    stats: {
      fixes: 2,
    },
    notes: `### PDF Annotate
- Zoom centering fix
- Resize centering fix`,
  },
  {
    version: '1.5.0',
    date: '2026-03-03T14:53:16Z',
    type: 'feature',
    stats: {
      features: 5,
    },
    notes: `### PDF Annotate — Multi-Page Continuous Scroll
- Continuous vertical scroll
- Smart lazy rendering
- Auto fit-to-width
- Live page tracking
- Full annotation support`,
  },
  {
    version: '1.4.0',
    date: '2026-03-03T12:55:12Z',
    type: 'feature',
    stats: {
      features: 11,
    },
    notes: `### PDF Annotate — Major Overhaul
- Two-tier toolbar
- Cursor-position zoom
- Pan modes
- Property editing
- Text editing improvements
- Hover highlight
- Zoom presets
- Toast notifications
- Compact status bar
- Unsaved changes warning
- New keyboard shortcuts`,
  },
  {
    version: '1.3.1',
    date: '2026-03-02T15:54:13Z',
    type: 'fix',
    stats: {
      fixes: 1,
    },
    notes: `- Annotation rotation fix`,
  },
  {
    version: '1.3.0',
    date: '2026-03-02T15:32:00Z',
    type: 'feature',
    stats: {
      features: 5,
    },
    notes: `### PDF Annotate
- Embedded text selection
- Floating highlight toolbar
- Instant highlight/strikethrough
- Apple Preview-style highlighting
- Text highlight alignment fix`,
  },
  {
    version: '1.2.5',
    date: '2026-02-27T13:28:59Z',
    type: 'fix',
    notes: `- Test release`,
  },
  {
    version: '1.2.4',
    date: '2026-02-27T13:25:17Z',
    type: 'fix',
    notes: `- Download instructions in update modal`,
  },
]
