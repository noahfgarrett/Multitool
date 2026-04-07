# Agent C: Flowchart — P&ID Shapes + Background Image + Visio Export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 40+ P&ID symbols with search/recents, background image import for tracing, and .vsdx Visio export to the Flowchart tool.

**Architecture:** Extend ShapeType union with `pid-*` prefixed types, add shape definitions to shapes.ts, add search/recent UI to ShapeLibrary, add background image layer to Canvas, generate .vsdx using JSZip.

**Tech Stack:** React, Canvas 2D, SVG paths, JSZip (already bundled), localStorage for recents

**Spec:** `docs/superpowers/specs/2026-04-06-coo-feedback-updates-design.md` (Feature 3)

---

### Task 1: Extend ShapeType Union with P&ID Types

**Files:**
- Modify: `src/tools/flowchart/types.ts`

- [ ] **Step 1: Add all P&ID shape types to ShapeType union**

Add after the existing `'stored-data'` entry:

```typescript
export type ShapeType =
  // ... existing types ...
  | 'stored-data'
  // P&ID: Vessels & Tanks
  | 'pid-horizontal-vessel'
  | 'pid-vertical-vessel'
  | 'pid-open-tank'
  | 'pid-closed-tank'
  | 'pid-column'
  | 'pid-reactor'
  | 'pid-drum'
  // P&ID: Rotating Equipment
  | 'pid-centrifugal-pump'
  | 'pid-pd-pump'
  | 'pid-compressor'
  | 'pid-fan'
  | 'pid-turbine'
  | 'pid-motor'
  // P&ID: Heat Transfer
  | 'pid-shell-tube-hx'
  | 'pid-plate-hx'
  | 'pid-air-cooler'
  | 'pid-condenser'
  | 'pid-boiler'
  | 'pid-furnace'
  // P&ID: Valves
  | 'pid-gate-valve'
  | 'pid-globe-valve'
  | 'pid-ball-valve'
  | 'pid-butterfly-valve'
  | 'pid-check-valve'
  | 'pid-control-valve'
  | 'pid-relief-valve'
  | 'pid-solenoid-valve'
  | 'pid-three-way-valve'
  | 'pid-plug-valve'
  // P&ID: Instruments
  | 'pid-indicator'
  | 'pid-transmitter'
  | 'pid-controller'
  | 'pid-recorder'
  | 'pid-sensor'
  | 'pid-flow-element'
  | 'pid-level-gauge'
  // P&ID: Piping
  | 'pid-reducer'
  | 'pid-tee'
  | 'pid-elbow'
  | 'pid-cap'
  | 'pid-flange'
  | 'pid-strainer'
  // P&ID: Misc
  | 'pid-spray-nozzle'
  | 'pid-mixer'
  | 'pid-cyclone'
  | 'pid-conveyor'
```

- [ ] **Step 2: Add BackgroundImage interface**

```typescript
export interface BackgroundImage {
  dataUrl: string
  opacity: number    // 0.1 – 1.0
  locked: boolean
}
```

- [ ] **Step 3: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/tools/flowchart/types.ts
git commit -m "feat(flowchart): add P&ID shape types and BackgroundImage interface"
```

---

### Task 2: Add P&ID Shape Definitions

**Files:**
- Modify: `src/tools/flowchart/shapes.ts`

- [ ] **Step 1: Add 'pid' to ShapeCategory and create P&ID sub-categories**

```typescript
export type ShapeCategory = 'basic' | 'flowchart' | 'misc' | 'containers' | 'pid-vessels' | 'pid-equipment' | 'pid-heat-transfer' | 'pid-valves' | 'pid-instruments' | 'pid-piping' | 'pid-misc'
```

- [ ] **Step 2: Add all P&ID shape definitions to SHAPE_DEFS array**

Follow the existing pattern. Each shape needs: type, label, category, defaultWidth, defaultHeight, ports, svgPath.

Here's the pattern for each sub-group. SVG paths should follow ISA-5.1 / ISO 14617 conventions:

**Vessels & Tanks (example patterns):**
```typescript
{
  type: 'pid-horizontal-vessel',
  label: 'Horizontal Vessel',
  category: 'pid-vessels',
  defaultWidth: 120,
  defaultHeight: 60,
  ports: standardPorts,
  svgPath: (w, h) => {
    const r = h / 2
    return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`
  },
},
{
  type: 'pid-vertical-vessel',
  label: 'Vertical Vessel',
  category: 'pid-vessels',
  defaultWidth: 60,
  defaultHeight: 120,
  ports: standardPorts,
  svgPath: (w, h) => {
    const r = w / 2
    return `M 0 ${r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 0 ${h - r} Z`
  },
},
{
  type: 'pid-open-tank',
  label: 'Open Tank',
  category: 'pid-vessels',
  defaultWidth: 80,
  defaultHeight: 80,
  ports: standardPorts,
  svgPath: (w, h) => `M 0 0 V ${h} H ${w} V 0`, // Open top
},
```

**Valves (example — bowtie shape):**
```typescript
{
  type: 'pid-gate-valve',
  label: 'Gate Valve',
  category: 'pid-valves',
  defaultWidth: 40,
  defaultHeight: 40,
  ports: (w, h) => ({
    top: { x: w / 2, y: 0 },
    right: { x: w, y: h / 2 },
    bottom: { x: w / 2, y: h },
    left: { x: 0, y: h / 2 },
  }),
  svgPath: (w, h) => {
    // Bowtie: two triangles meeting at center
    return `M 0 0 L ${w} ${h / 2} L 0 ${h} Z M ${w} 0 L 0 ${h / 2} L ${w} ${h} Z`
  },
},
```

**Instruments (circle with line):**
```typescript
{
  type: 'pid-indicator',
  label: 'Indicator',
  category: 'pid-instruments',
  defaultWidth: 50,
  defaultHeight: 50,
  ports: standardPorts,
  svgPath: (w, h) => {
    const r = Math.min(w, h) / 2
    return `M ${r} 0 A ${r} ${r} 0 1 1 ${r} ${h} A ${r} ${r} 0 1 1 ${r} 0 Z M 0 ${h / 2} H ${w}`
  },
},
```

**Pumps (circle with discharge arrow):**
```typescript
{
  type: 'pid-centrifugal-pump',
  label: 'Centrifugal Pump',
  category: 'pid-equipment',
  defaultWidth: 60,
  defaultHeight: 60,
  ports: (w, h) => ({
    top: { x: w / 2, y: 0 },
    right: { x: w, y: h / 2 },
    bottom: { x: w / 2, y: h },
    left: { x: 0, y: h / 2 },
  }),
  svgPath: (w, h) => {
    const r = Math.min(w, h) / 2
    const cx = w / 2, cy = h / 2
    // Circle with discharge triangle pointing right
    return `M ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} Z M ${cx} ${cy - r * 0.6} L ${w} ${cy} L ${cx} ${cy + r * 0.6} Z`
  },
},
```

Implement ALL ~46 shapes following these patterns. Use ISA-5.1 standard geometry:
- Vessels: rounded rectangles, cylinders
- Valves: bowtie variations (gate, globe, ball = filled triangle, butterfly = circle+line, check = triangle with stop)
- Instruments: circles with horizontal line (indicator), circle with dashed line (transmitter), hexagon (controller)
- Heat exchangers: circle with internal lines (shell&tube), rectangle with zig-zag (plate), rectangle with fins (air cooler)
- Pumps: circle with discharge arrow
- Compressor: circle with two opposing arrows
- Fan: circle with blade lines

- [ ] **Step 3: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/tools/flowchart/shapes.ts
git commit -m "feat(flowchart): add 46 P&ID shape definitions with ISA-5.1 SVG paths"
```

---

### Task 3: Add Search and Recently Used to Shape Library

**Files:**
- Modify: `src/tools/flowchart/ShapeLibrary.tsx`

- [ ] **Step 1: Add search bar at top**

```tsx
const [search, setSearch] = useState('')

// Fuzzy filter function
function matchesSearch(label: string, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const l = label.toLowerCase()
  // Direct substring match
  if (l.includes(q)) return true
  // Abbreviation match: "hx" matches "Heat Exchanger", "vlv" matches "Valve"
  const words = l.split(/[\s-]+/)
  const initials = words.map(w => w[0]).join('')
  if (initials.toLowerCase().includes(q)) return true
  // Partial word match
  return words.some(w => w.toLowerCase().startsWith(q))
}

// In JSX, above the categories:
<div className="px-2 py-1.5">
  <input
    type="text"
    value={search}
    onChange={e => setSearch(e.target.value)}
    placeholder="Search shapes..."
    className="w-full px-2 py-1 text-xs bg-white/[0.05] border border-white/10 rounded text-white placeholder-white/30 focus:outline-none focus:border-[#F47B20]/50"
  />
</div>
```

Filter shapes by search when rendering categories:
```typescript
const filteredShapes = search
  ? SHAPE_DEFS.filter(s => matchesSearch(s.label, search))
  : null
```

When `filteredShapes` is set, show a flat list grouped by category with match counts instead of the normal collapsible categories.

- [ ] **Step 2: Add recently used section**

```typescript
const RECENT_KEY = 'lwt-flowchart-recent-shapes'
const MAX_RECENT = 10

function getRecentShapes(): ShapeType[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function addRecentShape(type: ShapeType): void {
  const recent = getRecentShapes().filter(t => t !== type)
  recent.unshift(type)
  if (recent.length > MAX_RECENT) recent.pop()
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent))
}
```

Update `selectShape` to call `addRecentShape(type)` when placing.

Render recent shapes above the category list:
```tsx
{recentShapes.length > 0 && !search && (
  <div className="px-2 py-1.5 border-b border-white/[0.06]">
    <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1">Recent</div>
    <div className="flex flex-wrap gap-1">
      {recentShapes.map(type => {
        const def = SHAPE_DEFS.find(d => d.type === type)
        if (!def) return null
        return (
          <button
            key={type}
            onClick={() => selectShape(type)}
            title={def.label}
            className="w-8 h-8 rounded bg-white/[0.05] hover:bg-white/10 flex items-center justify-center"
          >
            <svg width={20} height={20} viewBox={`0 0 ${def.defaultWidth} ${def.defaultHeight}`}>
              <path d={def.svgPath(def.defaultWidth, def.defaultHeight)} fill="none" stroke="rgba(244,123,32,0.6)" strokeWidth={2} />
            </svg>
          </button>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: Update CATEGORIES array to include P&ID sub-groups**

```typescript
const CATEGORIES: { key: string; label: string }[] = [
  { key: 'basic', label: 'Basic' },
  { key: 'flowchart', label: 'Flowchart' },
  { key: 'containers', label: 'Containers' },
  { key: 'misc', label: 'Miscellaneous' },
  { key: 'pid-vessels', label: 'P&ID: Vessels & Tanks' },
  { key: 'pid-equipment', label: 'P&ID: Equipment' },
  { key: 'pid-heat-transfer', label: 'P&ID: Heat Transfer' },
  { key: 'pid-valves', label: 'P&ID: Valves' },
  { key: 'pid-instruments', label: 'P&ID: Instruments' },
  { key: 'pid-piping', label: 'P&ID: Piping' },
  { key: 'pid-misc', label: 'P&ID: Misc' },
]
```

- [ ] **Step 4: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/tools/flowchart/ShapeLibrary.tsx
git commit -m "feat(flowchart): shape search with fuzzy matching and recently used section"
```

---

### Task 4: Add Background Image Support to Store

**Files:**
- Modify: `src/tools/flowchart/flowchartStore.ts`

- [ ] **Step 1: Add background image state and actions**

Add to the store state:

```typescript
backgroundImage: BackgroundImage | null

setBackgroundImage: (bg: BackgroundImage | null) => void
setBackgroundOpacity: (opacity: number) => void
setBackgroundLocked: (locked: boolean) => void
```

Implementation:
```typescript
const [backgroundImage, setBackgroundImageState] = useState<BackgroundImage | null>(null)

const setBackgroundImage = (bg: BackgroundImage | null) => setBackgroundImageState(bg)
const setBackgroundOpacity = (opacity: number) => {
  setBackgroundImageState(prev => prev ? { ...prev, opacity } : null)
}
const setBackgroundLocked = (locked: boolean) => {
  setBackgroundImageState(prev => prev ? { ...prev, locked } : null)
}
```

Include `backgroundImage` in JSON export/import so it persists in saved diagrams.

- [ ] **Step 2: Commit**

```bash
git add src/tools/flowchart/flowchartStore.ts
git commit -m "feat(flowchart): background image state management"
```

---

### Task 5: Render Background Image on Canvas

**Files:**
- Modify: `src/tools/flowchart/Canvas.tsx`

- [ ] **Step 1: Draw background image before nodes/edges**

In the render function, before drawing edges and nodes:

```typescript
// Draw background image if present
if (backgroundImage) {
  const img = backgroundImageRef.current
  if (img) {
    ctx.save()
    ctx.globalAlpha = backgroundImage.opacity
    ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight)
    ctx.restore()
  }
}
```

Load the image into an `HTMLImageElement` ref when `backgroundImage.dataUrl` changes:

```typescript
const backgroundImageRef = useRef<HTMLImageElement | null>(null)

useEffect(() => {
  if (!store.backgroundImage) {
    backgroundImageRef.current = null
    return
  }
  const img = new window.Image()
  img.onload = () => {
    backgroundImageRef.current = img
    // Trigger re-render/redraw
  }
  img.src = store.backgroundImage.dataUrl
}, [store.backgroundImage?.dataUrl])
```

- [ ] **Step 2: Add right-click "Place Recent" submenu**

In the canvas right-click handler for empty area, add:

```typescript
const recentShapes = getRecentShapes().slice(0, 5)
if (recentShapes.length > 0) {
  menuItems.push({
    label: 'Place Recent',
    submenu: recentShapes.map(type => {
      const def = SHAPE_DEFS.find(d => d.type === type)
      return {
        label: def?.label || type,
        action: () => store.setToolMode({ place: type }),
      }
    }),
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/tools/flowchart/Canvas.tsx
git commit -m "feat(flowchart): render background image layer and Place Recent context menu"
```

---

### Task 6: Add Background Image Toolbar Controls

**Files:**
- Modify: `src/tools/flowchart/Toolbar.tsx`

- [ ] **Step 1: Add background image button and controls**

```tsx
<button
  onClick={() => bgInputRef.current?.click()}
  className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
  title="Background Image"
>
  <ImageIcon size={16} />
</button>
<input
  ref={bgInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      store.setBackgroundImage({
        dataUrl: reader.result as string,
        opacity: 0.3,
        locked: true,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }}
/>

{/* Background controls — shown when background is active */}
{store.backgroundImage && (
  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
    <label className="text-[10px] text-white/40">Opacity</label>
    <input
      type="range"
      min={10}
      max={100}
      value={Math.round(store.backgroundImage.opacity * 100)}
      onChange={e => store.setBackgroundOpacity(Number(e.target.value) / 100)}
      className="w-16 h-1 accent-[#F47B20]"
    />
    <button
      onClick={() => store.setBackgroundLocked(!store.backgroundImage!.locked)}
      className={`p-1 rounded text-xs ${store.backgroundImage.locked ? 'text-[#F47B20]' : 'text-white/40'}`}
      title={store.backgroundImage.locked ? 'Unlock background' : 'Lock background'}
    >
      {store.backgroundImage.locked ? <Lock size={14} /> : <Unlock size={14} />}
    </button>
    <button
      onClick={() => store.setBackgroundImage(null)}
      className="p-1 rounded text-white/40 hover:text-red-400"
      title="Remove background"
    >
      <X size={14} />
    </button>
  </div>
)}
```

Import `Image as ImageIcon`, `Lock`, `Unlock`, `X` from lucide-react.

- [ ] **Step 2: Commit**

```bash
git add src/tools/flowchart/Toolbar.tsx
git commit -m "feat(flowchart): background image toolbar with opacity, lock, and remove controls"
```

---

### Task 7: Implement Visio (.vsdx) Export

**Files:**
- Modify: `src/tools/flowchart/export.ts`

- [ ] **Step 1: Add exportVSDX function**

The .vsdx format is a ZIP (Open Packaging Conventions) containing XML files. Use JSZip:

```typescript
import JSZip from 'jszip'

export async function exportVSDX(nodes: DiagramNode[], edges: DiagramEdge[]): Promise<void> {
  const zip = new JSZip()

  // [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/visio/document.xml" ContentType="application/vnd.ms-visio.drawing.main+xml"/>
  <Override PartName="/visio/pages/pages.xml" ContentType="application/vnd.ms-visio.pages+xml"/>
  <Override PartName="/visio/pages/page1.xml" ContentType="application/vnd.ms-visio.page+xml"/>
</Types>`)

  // _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/document" Target="visio/document.xml"/>
</Relationships>`)

  // visio/document.xml
  zip.file('visio/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VisioDocument xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <DocumentProperties>
    <Creator>Multitool</Creator>
  </DocumentProperties>
</VisioDocument>`)

  // visio/_rels/document.xml.rels
  zip.file('visio/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/pages" Target="pages/pages.xml"/>
</Relationships>`)

  // visio/pages/pages.xml
  zip.file('visio/pages/pages.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Pages xmlns="http://schemas.microsoft.com/office/visio/2012/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <Page ID="0" Name="Page-1">
    <Rel r:id="rId1"/>
  </Page>
</Pages>`)

  // visio/pages/_rels/pages.xml.rels
  zip.file('visio/pages/_rels/pages.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.microsoft.com/visio/2010/relationships/page" Target="page1.xml"/>
</Relationships>`)

  // visio/pages/page1.xml — shapes and connectors
  const VISIO_SCALE = 1 / 96 // Convert px to inches (Visio uses inches)
  let shapesXml = ''
  let shapeId = 1

  // Map node IDs to Visio shape IDs
  const nodeShapeMap = new Map<string, number>()

  for (const node of nodes) {
    const id = shapeId++
    nodeShapeMap.set(node.id, id)
    const pinX = (node.x + node.width / 2) * VISIO_SCALE
    const pinY = (node.y + node.height / 2) * VISIO_SCALE
    const w = node.width * VISIO_SCALE
    const h = node.height * VISIO_SCALE
    const fill = node.style.fill || 'rgba(244,123,32,0.08)'

    shapesXml += `
    <Shape ID="${id}" Type="Shape" Name="${escapeXml(node.label)}">
      <Cell N="PinX" V="${pinX}"/>
      <Cell N="PinY" V="${pinY}"/>
      <Cell N="Width" V="${w}"/>
      <Cell N="Height" V="${h}"/>
      <Cell N="FillForegnd" V="${fill}"/>
      <Text>${escapeXml(node.label)}</Text>
    </Shape>`
  }

  // Connectors for edges
  for (const edge of edges) {
    const id = shapeId++
    const srcId = nodeShapeMap.get(edge.sourceId)
    const tgtId = nodeShapeMap.get(edge.targetId)
    if (!srcId || !tgtId) continue

    shapesXml += `
    <Shape ID="${id}" Type="Shape" Name="Connector">
      <Cell N="BeginX" V="0"/>
      <Cell N="BeginY" V="0"/>
      <Cell N="EndX" V="1"/>
      <Cell N="EndY" V="1"/>
      <Text>${escapeXml(edge.label)}</Text>
    </Shape>`
  }

  zip.file('visio/pages/page1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<PageContents xmlns="http://schemas.microsoft.com/office/visio/2012/main">
  <Shapes>${shapesXml}
  </Shapes>
</PageContents>`)

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.ms-visio.drawing' })
  downloadBlob(blob, 'flowchart.vsdx')
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
```

- [ ] **Step 2: Add background image toggle to existing export functions**

In `exportPNG`, `exportSVG`, `exportPDF`, add an optional `includeBackground` parameter. When true, render the background image before drawing shapes.

- [ ] **Step 3: Wire up Visio export in FlowchartTool.tsx export modal**

Add "Visio (.vsdx)" as an option in the export format selector.

- [ ] **Step 4: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/tools/flowchart/export.ts src/tools/flowchart/FlowchartTool.tsx
git commit -m "feat(flowchart): Visio .vsdx export and background image toggle in exports"
```

---

### Task 8: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
cd /Users/noahgarrett/codebase/multitool && npm run build
```

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Verify:
1. P&ID shapes appear in shape library under sub-categories
2. Search filters shapes across all categories (fuzzy matching works)
3. Recently used shapes appear at top after placing shapes
4. Right-click canvas shows "Place Recent" submenu
5. Background image uploads and renders as transparent underlay
6. Opacity slider, lock, and remove controls work
7. Visio export generates a .vsdx file that opens in Visio (or at least is a valid ZIP)
8. All existing export formats still work

- [ ] **Step 3: Final commit if any fixes needed**
