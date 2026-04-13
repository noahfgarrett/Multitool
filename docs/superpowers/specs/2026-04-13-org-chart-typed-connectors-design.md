# Org Chart — Typed Connectors & Legend — Design Spec

**Date:** 2026-04-13
**Tool:** Org Chart (`src/tools/org-chart/`)
**Scope:** Multi-parent secondary relationships with 4 connector types, Connect mode UX, Connector Types modal, export-time legend with 4-corner positioning, CSV/JSON/versions persistence.

---

## Overview

Today the Org Chart tool represents reporting as a pure tree — each node has one `reportsTo` parent and the renderer draws one style of connector line. Real organizations have matrix relationships: people often have a primary line manager plus secondary "dotted-line," support, or collaboration relationships with other individuals.

This feature adds **typed secondary connections** on top of the existing tree. The primary tree stays untouched (no layout changes, no breaking changes to existing saves). Secondary connections are a new, additive data layer with 4 built-in connector types (solid, dashed, dotted, double), a user-editable label/color registry, and an export-time legend.

### Decisions reached during brainstorming

| Question | Decision | Rationale |
|---|---|---|
| Single vs multi-parent | **Multi-parent** (Approach B) | Matches how real matrix orgs actually work |
| Connector type source | **Hybrid — 4 fixed presets, editable label/color** (Approach C) | Works out of the box, no configuration, rename/recolor covers 95% of cases |
| Creation interaction | **Connect mode (toolbar button + banner) + Shift-drag bypass** (Approach C) | Discoverable for new users, fast for power users |
| Legend layout | **Vertical titled panel** (Approach B) | Reads unambiguously as a legend, scales to longer labels, anchors cleanly in corners |
| Legend positions | **4 corners only** (TL/TR/BL/BR) | No collision risk with section titles or centered content |
| Legend rendering surface | **Export only (not live canvas)** | Keeps canvas clean during editing; toolbar chip shows position indicator |
| Connector Types editing | **Modal (Approach B)** | Matches existing modal pattern (Templates, Versions, Export) |
| Data model shape | **Flat `connections[]` array on state** (Approach 1) | Zero impact on tree layout algorithm, trivial deletes, clean separation of structure vs annotation |

---

## 1. Data Model

### New types in `src/tools/org-chart/types.ts`

```ts
// Connector type: defines visual appearance + user-editable label
export interface ConnectorType {
  id: ConnectorTypeId          // stable key, never changes
  label: string                // user-editable ("Reports to", "Functional", ...)
  color: string                // user-editable hex
  style: ConnectorStyle        // fixed per type
  lineWidth: number            // fixed per type
}

export type ConnectorTypeId = 'primary' | 'dotted-line' | 'supports' | 'collaborates'
export type ConnectorStyle = 'solid' | 'dashed' | 'dotted' | 'double'

// Secondary edge
export interface Connection {
  id: string                   // unique, for selection/hit-testing
  fromId: string               // source node id
  toId: string                 // target node id
  typeId: ConnectorTypeId      // references a ConnectorType
}

// Legend positioning
export type LegendPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface LegendConfig {
  position: LegendPosition
}

// Extended root state
export interface OrgChartState {
  nodes: OrgNode[]                  // unchanged
  connections: Connection[]         // NEW — only secondary edges (tree edges stay implicit via reportsTo)
  connectorTypes: ConnectorType[]   // NEW — all 4 types, user-editable labels/colors
  legend: LegendConfig              // NEW
}
```

### Default connector types

Factory function `createDefaultConnectorTypes()` returns:

| id | label | color | style | lineWidth |
|---|---|---|---|---|
| `primary` | Reports to | `#e5e7eb` | `solid` | 1.5 |
| `dotted-line` | Dotted-line | `#60a5fa` | `dashed` | 1.75 |
| `supports` | Supports | `#fbbf24` | `dotted` | 1.75 |
| `collaborates` | Collaborates | `#a78bfa` | `double` | 2 |

**Default legend:** `{ position: 'bottom-right' }`.

### Invariants

- `reportsTo` remains the single source of truth for tree structure. `connections[]` never contains primary edges — those are implied by the tree.
- `Connection.typeId` always points at an existing `ConnectorType.id`. The registry always has exactly 4 entries (users can only edit labels/colors, not add/delete types).
- Connections where `fromId === toId` are rejected on create.
- Exact duplicate connections `(fromId, toId, typeId)` are rejected on create.
- Connections whose `fromId` or `toId` reference a deleted node are swept on every node delete.

### Why `primary` lives in `connectorTypes[]` even though no `Connection` uses it

So users can rename "Reports to" → "Line manager" and recolor it in one place, and the legend renderer pulls all labels from the same registry. Renaming travels with JSON export/import.

### Helper

```ts
export function getConnectorType(
  types: ConnectorType[],
  id: ConnectorTypeId,
): ConnectorType
```

Returns the matching type, or — as a safety net — the built-in default for that id if the registry is missing an entry. Rendering, exports, and the legend all go through this helper so there's one place to handle the missing-type fallback.

---

## 2. Rendering Pipeline

### New file: `src/tools/org-chart/connectorStyle.ts`

Shared helpers used by both live canvas and export renderers.

```ts
export function drawStyledLine(
  ctx: CanvasRenderingContext2D,
  path: [number, number][],
  type: ConnectorType,
  zoomForDashScaling?: number,
): void

export function routeSecondaryEdge(
  from: LayoutNode,
  to: LayoutNode,
): [number, number][]
```

### Dash patterns

| style | `setLineDash` pattern | Notes |
|---|---|---|
| `solid` | `[]` | Single stroke |
| `dashed` | `[8, 5]` | Scaled by `1 / zoom` in live canvas so pattern stays visually consistent across zoom levels |
| `dotted` | `[2, 3]` | Same zoom scaling |
| `double` | `[]` | Two strokes offset perpendicular to the path direction by 3px, each at `lineWidth / 2` |

### Primary edge refactor — `Canvas.tsx` and `export.ts`

The existing `drawConnector(parent, child)` function in both files gets a second parameter: the `ConnectorType` for primary edges, pulled from `state.connectorTypes` via `getConnectorType(types, 'primary')`. The parent→child routing (vertical drop → horizontal → vertical rise with `arcTo` bends) is unchanged byte-for-byte. Only the `strokeStyle`, `lineWidth`, and `setLineDash` become driven by the type instead of the hardcoded `CONNECTOR_COLOR`. This makes renaming/recoloring "Reports to" propagate live to every tree edge.

### Secondary edge routing — `routeSecondaryEdge()`

Secondary connections run between arbitrary nodes (not parent→child), so they need new routing.

**v1 routing: edge-anchored straight line.**

1. Compute both node centers
2. From each center, cast a ray toward the other center
3. Clip each ray at the node's rounded-rectangle border (`NODE_WIDTH × NODE_HEIGHT`, corner radius 8)
4. Return `[sourceAnchor, targetAnchor]` — a two-point path

This produces clean diagonals anchored on node borders. Simple (~30 lines), no pathfinding, looks intentional as annotation-over-tree. If both anchors end up at the same point (target on top of source), the renderer skips the connection.

### Rendering pass order in `Canvas.tsx`

```
1. Build layout (unchanged)
2. Draw section dividers (unchanged)
3. Draw PRIMARY edges (tree walk, parameterized by primary ConnectorType)
4. Draw SECONDARY edges:
   for each Connection in state.connections:
     - Look up from/to LayoutNodes in the flat layout
     - Skip if either is missing
     - Compute path via routeSecondaryEdge()
     - Look up type via getConnectorType()
     - Call drawStyledLine()
5. Draw section titles (unchanged)
6. Draw nodes (unchanged — nodes on top so edges tuck under)
7. Draw connection selection halo (if any connection is selected)
```

Secondary edges render **before** nodes so node cards cover line endpoints cleanly. They render **after** primary edges so dotted-line overlays appear on top of the tree backbone where they cross.

### Hit-testing for edge selection

New function in `connectorStyle.ts`:

```ts
export function hitTestConnection(
  x: number,              // canvas-space coordinates (after screenToCanvas conversion)
  y: number,
  connection: Connection,
  layout: LayoutNode[],
  toleranceCanvasPx: number,  // tolerance in canvas units, NOT screen pixels
): boolean
```

Rebuilds the edge path via `routeSecondaryEdge()` and checks if `(x, y)` is within `toleranceCanvasPx` of any segment. The caller converts a screen-space click to canvas coordinates via the existing `screenToCanvas()` helper and passes `6 / viewport.zoom` as the tolerance — this keeps the clickable "thickness" of an edge at a constant 6 screen pixels regardless of zoom level.

Called from `Canvas.tsx` `handleMouseDown` **before** the node hit-test, but only when the click lands in empty space (not on top of a node card).

### Selection state

Add to `orgChartStore.ts`:

```ts
selectedConnectionId: string | null
selectConnection(id: string | null): void
removeConnection(id: string): void
updateConnection(id: string, updates: Partial<Connection>): void
```

Selecting any connection clears node selection and vice versa (mutually exclusive). While selected, the connection renders with a 2px halo in `SELECTION_COLOR` (`#3B82F6`, matching existing node selection). Delete key removes it.

### Viewport bounds

Extend `calcBounds()` in `Canvas.tsx` and `export.ts` to also iterate path points from every secondary edge (via `routeSecondaryEdge()`) so `fitToContent` and export bounds include any diagonals that extend beyond the node rectangles.

---

## 3. Connect Mode

### Store additions (`orgChartStore.ts`)

```ts
type ConnectMode =
  | { state: 'off' }
  | { state: 'awaiting-source' }
  | { state: 'awaiting-target'; sourceId: string }
  | { state: 'picking-type'; sourceId: string; targetId: string; anchorScreenXY: [number, number] }

connectMode: ConnectMode
enterConnectMode(): void                                  // 'off' → 'awaiting-source'
setConnectSource(id: string): void                        // 'awaiting-source' → 'awaiting-target'
setConnectTarget(id: string, xy: [number, number]): void  // 'awaiting-target' → 'picking-type'
confirmConnection(typeId: ConnectorTypeId): void          // creates Connection, returns to 'awaiting-source' for chaining
cancelConnectMode(): void                                 // → 'off'
createConnection(fromId, toId, typeId): Connection | null // direct add — rejects self-loop, duplicates; pushes undo entry
```

### Toolbar button — `Toolbar.tsx`

New **Connect** button next to the Add Person / Delete cluster. Icon: `Link2` from lucide-react. Active state (`connectMode.state !== 'off'`) renders the button with selection-blue background. Clicking while active exits the mode.

Keyboard shortcut `C` toggles connect mode, wired in `shortcuts.ts` with the same "ignore if input focused" guard the existing shortcuts use.

### Banner — new component `ConnectModeBanner.tsx`

Renders at the top of the canvas container (absolute positioned, centered horizontally, 12px from top). Visible whenever `connectMode.state !== 'off'`.

Banner text by state:

- `awaiting-source` → **"Connect mode — click a source node"** + Esc hint + exit button
- `awaiting-target` → **"Click a target node"** + fade-in showing the source node's name + Esc hint
- `picking-type` → banner hidden (popover takes over)

Style: rounded pill, `bg-dark-elevated/90` with `backdrop-blur`, same visual language as the existing context menu and modal chrome.

### Canvas interaction branching — `Canvas.tsx`

`handleMouseDown` branches on `connectMode.state` **before** the existing drag/selection path:

- `'awaiting-source'` — click on a node calls `setConnectSource(nodeId)`; click on empty space does nothing
- `'awaiting-target'` — click on a node that isn't the source calls `setConnectTarget(nodeId, [event.clientX, event.clientY])`; click on source or empty space does nothing
- `'picking-type'` — click outside the popover cancels the type-pick step (returns to `awaiting-target`); Esc cancels all the way

While connect mode is active, the existing node-drag, marquee-select, and reparent logic is short-circuited to prevent accidental drags while the user is trying to select a source.

### Hover preview during `awaiting-target`

As the mouse moves, render a **ghost secondary edge** from the source node center to the current mouse position. Thin dashed line at 50% opacity. On hover over a valid target node, the target renders a blue ring (same visual as the existing reparent-drop highlight, but keyed off connect mode state).

### Type picker popover — new component `ConnectorTypePopover.tsx`

Small floating popover anchored at `anchorScreenXY`. Contains 4 clickable rows, one per `ConnectorType` in stable order. Each row shows:

- Mini SVG line sample (42×10) rendered via the same pipeline as the legend
- The type's current `label`
- Hotkey hint: `1`, `2`, `3`, `4` for keyboard selection (also wired in the popover component)

Click a row → `confirmConnection(typeId)` → connection created → mode returns to `awaiting-source` so users can chain multiple connections without re-clicking the toolbar button. Esc at any step exits all the way.

### Shift-drag bypass

Existing `Canvas.tsx` drag handler gets one new branch. When a drag starts with `Shift` held AND targets a node AND `connectMode.state === 'off'`:

1. Skip the existing move/reparent drag state
2. Enter an inline mini-mode: render the ghost edge from source center → mouse position
3. On mouseup over a valid target node → open `ConnectorTypePopover` at the release point
4. On mouseup over empty or the source itself → cancel silently
5. Esc during drag → cancel

Reuses the same `ConnectorTypePopover` and the same `createConnection()` action as Connect mode. Shift-drag is "one-shot connect mode with an implicit source."

### Visual feedback summary

| State | Source node | Target node | Ghost edge |
|---|---|---|---|
| `awaiting-source` | — | — | — |
| `awaiting-target` + hover | blue filled ring | blue outline on hover | dashed preview line from source center to cursor |
| `picking-type` | blue ring | blue outline | solid line in selected-type style; updates as user hovers type rows |

### Edge cases

- **Only one node in diagram**: `awaiting-source` accepts click, `awaiting-target` shows **"Add another node first"** banner instead; clicking exits the mode
- **Source node deleted while mode active**: `setConnectTarget` detects missing source, resets to `awaiting-source`
- **Duplicate attempt**: popover closes, banner flashes **"Connection already exists"** for 2s, state returns to `awaiting-source`

---

## 4. Connector Types Modal

New component `ConnectorTypesModal.tsx`. Triggered from a new toolbar button (**Connector Types**, icon `Palette` from lucide-react). Opens via the existing `Modal` component in `src/components/common/Modal.tsx`, matching the Export/Templates/Versions pattern.

### Layout

Single modal, no tabs. Fixed width `420px`. Title: **"Connector Types"**. Subtitle: **"Rename or recolor line styles used in this chart. The line style itself (solid, dashed, etc.) is fixed per type."**

Body: vertical stack of 4 editable rows in stable order (`primary` → `dotted-line` → `supports` → `collaborates`).

### Per-row structure

```
┌────────────────────────────────────────────────────────────┐
│ [━━━━━]  Reports to             [color swatch]  [↺]       │
│          Solid · primary structure                        │
└────────────────────────────────────────────────────────────┘
```

- **Left (60×14 SVG sample):** rendered via `drawStyledLine()` at current `color`/`style`/`lineWidth` — guaranteed pixel-identical to actual connectors and the legend
- **Middle (input):** current `label`, full-width, placeholder shows default label. On blur or Enter → `updateConnectorType(id, { label })`. Empty label rejected on blur, reverts to previous value with brief red flash
- **Caption below input:** fixed informational text (`Solid · primary structure` / `Dashed · secondary authority` / `Dotted · supporting relationship` / `Double · peer collaboration`), greyed out
- **Right (color swatch):** click opens the existing `ColorPicker` from `src/components/common/ColorPicker.tsx` inline. Changes apply via `updateConnectorType(id, { color })` live
- **Far right (reset icon, `RotateCcw`):** visible only when row differs from defaults. Reverts that row's label + color to defaults; single undo history entry

### Footer

- **Reset all to defaults** (left): confirms before restoring all 4 types. Single undo history entry
- **Close** (right, primary): no explicit save — edits already applied live

### Store actions

```ts
updateConnectorType(id: ConnectorTypeId, updates: Partial<Omit<ConnectorType, 'id' | 'style' | 'lineWidth'>>): void
resetConnectorType(id: ConnectorTypeId): void
resetAllConnectorTypes(): void
```

Each pushes an undo history entry and triggers a re-render. **Not persisted to localStorage** — connector types travel with JSON export/import and the versions system.

### Live preview

The canvas behind the modal stays partially visible via the existing `Modal` backdrop blur. As the user edits:

- Recoloring `primary` immediately repaints every tree edge
- Recoloring a secondary type immediately repaints every secondary edge of that type
- Renaming a type updates the legend (next export) and the toolbar position chip label

### Validation

- **Label**: non-empty, max 40 characters, trimmed. Duplicate labels across types allowed (user may intentionally want similar labels)
- **Color**: valid 6-digit hex — enforced by `ColorPicker` component
- **Style + id**: not editable, never change

### Accessibility

- Modal keyboard-navigable: Tab cycles through input → swatch → reset per row
- Each input has `aria-label="Label for <default label> connector type"`
- Esc closes modal (existing `Modal` behavior)
- Swatch has `role="button"`; Enter key opens the color picker

---

## 5. Legend Renderer

Legend is rendered **only in export paths** (PNG and SVG) — no live canvas rendering. Toolbar position chip (see below) is the live UX touchpoint.

### When the legend appears

Legend renders only if `state.connections.length > 0`. Content:

- The `primary` type (always, so readers know what solid lines mean)
- Every secondary type that has at least one connection in `state.connections`
- Sorted in stable order: `primary → dotted-line → supports → collaborates`

A diagram with primary + dotted-line only produces a 2-row legend. Primary + all 3 secondary types produces a 4-row legend.

### Layout constants (added to `types.ts`)

```ts
export const LEGEND_PADDING = 14
export const LEGEND_TITLE_HEIGHT = 16
export const LEGEND_UNDERLINE_GAP = 6
export const LEGEND_ROW_HEIGHT = 18
export const LEGEND_LINE_SAMPLE_WIDTH = 42
export const LEGEND_LINE_LABEL_GAP = 10
export const LEGEND_MARGIN = 20          // gap from export edge
```

### Dimension math

```
panelWidth  = 2 × LEGEND_PADDING + max(titleWidth, longestRowWidth)
  where longestRowWidth = LEGEND_LINE_SAMPLE_WIDTH + LEGEND_LINE_LABEL_GAP + max(measureText(label))

panelHeight = 2 × LEGEND_PADDING + LEGEND_TITLE_HEIGHT + LEGEND_UNDERLINE_GAP + (rowCount × LEGEND_ROW_HEIGHT)
```

### Visual spec

- Background: `rgba(10, 10, 20, 0.9)`
- Border: `1px rgba(255, 255, 255, 0.15)`, corner radius `6px`
- Title: `LEGEND` in all caps, 10px, weight 600, letter-spacing `0.8px`, color `rgba(255, 255, 255, 0.55)`
- Underline: 1px horizontal line, full width minus padding, color `rgba(255, 255, 255, 0.1)`
- Row sample: 42px wide, rendered via `drawStyledLine()`
- Row label: 11px, weight 500, color `rgba(255, 255, 255, 0.85)`

### Position math

Legend bounding box `(lgnX, lgnY, lgnW, lgnH)` computed from panel dimensions and chosen corner, with `LEGEND_MARGIN` gutter:

| Position | `lgnX` | `lgnY` |
|---|---|---|
| `top-left` | `minX + LEGEND_MARGIN` | `minY + LEGEND_MARGIN` |
| `top-right` | `maxX - lgnW - LEGEND_MARGIN` | `minY + LEGEND_MARGIN` |
| `bottom-left` | `minX + LEGEND_MARGIN` | `maxY - lgnH - LEGEND_MARGIN` |
| `bottom-right` | `maxX - lgnW - LEGEND_MARGIN` | `maxY - lgnH - LEGEND_MARGIN` |

### Export bounds integration

New function `calcExportBounds()` in `export.ts`:

```ts
function calcExportBounds(
  flat: LayoutNode[],
  connections: Connection[],
  legendBox: { x: number; y: number; w: number; h: number } | null,
): { minX: number; minY: number; maxX: number; maxY: number }
```

Computes `calcBounds()` extended to include secondary edge path points, then unions with `legendBox ± LEGEND_MARGIN`. For most diagrams the legend fits in the existing 50px padding and the union is a no-op; for small diagrams the bounds grow. Result: zero overlap, deterministic placement.

### Rendering function — `drawLegend()` in `export.ts`

```ts
function drawLegend(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  types: ConnectorType[],  // already filtered + sorted
): void
```

Called after nodes so the legend sits on top. Steps:

1. Fill rounded rect at `(x, y, w, h)` with background color
2. Stroke 1px border
3. Draw `LEGEND` text at `(x + pad, y + pad + titleHeight / 2)`
4. Draw underline at `(x + pad, y + pad + titleHeight + 4)` → `(x + w - pad, same y)`
5. For each type at `y = baselineY + i × LEGEND_ROW_HEIGHT`:
   - Compute 2-point horizontal path centered vertically in the row
   - `drawStyledLine(ctx, path, type)`
   - Draw label text 10px right of sample

### SVG version

Same layout math, emitted as SVG elements:

- `<rect>` with `rx="6"` for background
- `<text>` for title
- `<line>` for underline
- Per type: `<path>` with `stroke-dasharray` matching style (or `<g>` with 2 offset `<path>` elements for `double`), followed by `<text>` label

### Toolbar chip — `LegendPositionChip.tsx`

New component placed in `Toolbar.tsx` next to the Export button:

```
┌──────────────────────┐
│ Legend · Bottom-Right │ ▾
└──────────────────────┘
```

Click opens a 2×2 grid popover with 4 clickable cells (TL/TR/BL/BR). Clicking a cell immediately updates `state.legend.position`. No modal, no save button.

Chip visible **only when `state.connections.length > 0`** — appears on first secondary edge creation, disappears when all are deleted.

---

## 6. Persistence & Backward Compatibility

### JSON export — `exportJSON()` in `export.ts`

Changes from `{ nodes }` to full `OrgChartState`:

```json
{
  "nodes": [ ... ],
  "connections": [
    { "id": "k7x3fm", "fromId": "abc12", "toId": "def34", "typeId": "dotted-line" }
  ],
  "connectorTypes": [
    { "id": "primary", "label": "Reports to", "color": "#e5e7eb", "style": "solid", "lineWidth": 1.5 },
    { "id": "dotted-line", "label": "Dotted-line", "color": "#60a5fa", "style": "dashed", "lineWidth": 1.75 },
    { "id": "supports", "label": "Supports", "color": "#fbbf24", "style": "dotted", "lineWidth": 1.75 },
    { "id": "collaborates", "label": "Collaborates", "color": "#a78bfa", "style": "double", "lineWidth": 2 }
  ],
  "legend": { "position": "bottom-right" }
}
```

All 4 connector types are always serialized, even if unused, so renames travel with the file. Overhead ~160 bytes.

### JSON import — `importJSON()` with layered backward-compat defaults

Applied in order after existing `sectionTitle` default:

```ts
// 1. connections: default to []
if (!('connections' in obj)) obj.connections = []
else if (!Array.isArray(obj.connections)) throw new Error('Invalid org chart JSON: connections must be an array')

// 2. connectorTypes: default to factory defaults if missing; otherwise merge/repair
if (!('connectorTypes' in obj)) obj.connectorTypes = createDefaultConnectorTypes()
else obj.connectorTypes = mergeWithDefaults(obj.connectorTypes)

// 3. legend: default to bottom-right
if (!('legend' in obj) || !VALID_POSITIONS.includes(obj.legend?.position)) {
  obj.legend = { position: 'bottom-right' }
}

// 4. Sweep orphan connections (missing fromId or toId)
const nodeIds = new Set(obj.nodes.map(n => n.id))
obj.connections = obj.connections.filter(c => nodeIds.has(c.fromId) && nodeIds.has(c.toId))

// 5. Sweep connections with unknown typeIds (defensive)
const typeIds = new Set(obj.connectorTypes.map(t => t.id))
obj.connections = obj.connections.filter(c => typeIds.has(c.typeId))
```

**Net result:** every existing `{ nodes }`-only JSON file loads without errors, comes up with no secondary connections, default types, and bottom-right legend. Seamless upgrade.

New helpers in `types.ts`:

```ts
export function createDefaultConnectorTypes(): ConnectorType[]
export function mergeWithDefaults(partial: unknown): ConnectorType[]
```

`mergeWithDefaults` handles: empty array, missing type ids, extra/unknown type ids, malformed entries, null/undefined. Always returns a valid 4-element array in stable order.

### Versions — `orgChartStore.ts`

Change `OrgChartVersion.snapshot` from `OrgNode[]` to full `OrgChartState`:

```ts
export interface OrgChartVersion {
  id: string
  name: string
  timestamp: number
  nodeCount: number
  snapshot: OrgChartState   // was OrgNode[]
}
```

`saveVersion()` stores `structuredClone(currentState)` (full state). `restoreVersion()` calls `loadDiagram(version.snapshot)`.

**Backward compat for existing localStorage versions:** `loadVersions()` at `orgChartStore.ts:8` gains a migration step:

```ts
function loadVersions(): OrgChartVersion[] {
  const raw = localStorage.getItem(VERSIONS_KEY)
  if (!raw) return []
  const parsed = JSON.parse(raw) as OrgChartVersion[]
  return parsed.map(v =>
    Array.isArray(v.snapshot)
      ? { ...v, snapshot: upgradeSnapshot(v.snapshot) }
      : v,
  )
}

function upgradeSnapshot(nodes: OrgNode[]): OrgChartState {
  return {
    nodes,
    connections: [],
    connectorTypes: createDefaultConnectorTypes(),
    legend: { position: 'bottom-right' },
  }
}
```

One-way migration on first load; subsequent saves use new shape. No user-visible migration modal.

### CSV export — one new column

Current header: `Name, Title, Department, Section, Reports To, Email, Phone, Location`
New header: `Name, Title, Department, Section, Reports To, Email, Phone, Location, Secondary Relationships`

New column is semicolon-separated list of outgoing secondary connections, formatted as `"Target Name (Type Label); Target Name (Type Label)"`. Empty for people with no outgoing secondary edges. Uses **type label** (not id) so Excel users understand without a key. Semicolons chosen as the intra-cell delimiter because CSV's row delimiter is already comma — a user scanning the cell in a spreadsheet reads the list naturally without seeing every item wrapped in quotes. The existing `csvEscape()` still quotes the full cell if a type label itself contains a comma, newline, or embedded quote.

No new rows — relationships denormalized onto the source person's row.

### `loadDiagram()` and `clearDiagram()` — `orgChartStore.ts`

`loadDiagram(state: OrgChartState)` extended to also reset `connections`, `connectorTypes`, `legend`, clear `selectedConnectionId`, and exit connect mode if active.

`clearDiagram()` resets to a fresh single-node state with **default connector types** and **default legend position**. Any user customization is cleared — same contract as today.

### Import flow in `OrgChartTool.tsx`

`handleImportJSON()` currently calls `store.loadDiagram({ nodes })`. Changes to pass the full parsed state: `store.loadDiagram(importJSON(text))`. Error handling unchanged — validation failures raise a toast.

### Templates — `templates.ts`

Extended template type:

```ts
interface Template {
  name: string
  nodes: OrgNode[]
  connections?: Connection[]
  connectorTypes?: ConnectorType[]
  legend?: LegendConfig
}
```

The 5 existing templates (Blank, Startup, Corporate, Department, Multi-Department) stay untouched — they have no secondary connections. Add **one new template**, **"Matrix Organization"**, that demonstrates the feature: a small 8-node org with 2 primary-report chains plus 3 secondary edges (one each: dotted-line, supports, collaborates). Teaches the feature by example the first time users open the Templates modal.

### localStorage keys

No new keys. `VERSIONS_KEY` (`'mt-orgchart-versions'`) remains the only localStorage touch point.

---

## 7. Testing Strategy & Build Sequence

### Unit test targets

**`types.ts` / factory helpers**
- `createDefaultConnectorTypes()` returns 4 types in stable order with correct `id`, `style`, `lineWidth`
- `mergeWithDefaults()`: empty array, missing types, extra types, malformed entries, null/undefined input → always returns valid 4-element array

**`connectorStyle.ts` / routing**
- `routeSecondaryEdge()` edge cases: target directly below, target directly right, target on top of source (zero-length, skipped), target at 45°, target across section gap

**`export.ts` / import**
- Backward compat: `{nodes}`-only file → upgraded state with defaults
- Orphan sweep: connection referencing deleted `fromId` dropped silently
- Unknown `typeId` sweep: dropped silently
- Invalid legend position → defaults to `bottom-right`
- Malformed `connectorTypes` → merged with defaults

**`export.ts` / legend math**
- `calcExportBounds()`: fits in padding (no growth), spills outside (bounds grow), all 4 positions
- Legend hidden when `connections.length === 0` (no bounds growth)
- Legend content filtering: only used types + primary

**`orgChartStore.ts` / version migration**
- `loadVersions()` reads old-shape version, upgrades transparently
- New-shape versions pass through untouched

**`orgChartStore.ts` / connection invariants**
- `createConnection()` rejects self-loop (`fromId === toId`)
- `createConnection()` rejects exact duplicate `(fromId, toId, typeId)`
- `createConnection()` pushes a single undo entry
- Node delete via `removeNode()` cascades to sweep orphan connections from `state.connections`
- `updateConnectorType()` / `resetConnectorType()` / `resetAllConnectorTypes()` each push one undo entry

### Playwright e2e — new spec file

`e2e/documents/org-chart/typed-connectors.spec.ts`, following `e2e/creators/org-chart.spec.ts` patterns. `data-testid` selectors for new UI.

Coverage flows (one test each):

1. Connect via toolbar — click button → click source → click target → pick type → assert connection exists
2. Connect via Shift-drag — mousedown with Shift on source → mousemove to target → mouseup → pick type → assert
3. Edge selection — create connection → click line mid-segment → assert halo → Delete → assert removed
4. Connect mode chaining — create 3 connections without exiting → Esc exits
5. Duplicate rejection — attempt duplicate → flash message → single connection in state
6. Self-loop rejection — attempt A→A → nothing happens
7. Connector Types rename — rename "Dotted-line" → verify legend and PNG export reflect new label
8. Connector Types recolor — change primary color → verify tree edges repaint
9. Legend position chip — click each of 4 positions → assert state changes; chip hidden when no connections
10. JSON round-trip — create diagram → export → clear → import → assert everything preserved
11. Backward compat — load old `{nodes}`-only JSON → assert no error, diagram renders, defaults applied
12. CSV new column — export → parse → assert "Secondary Relationships" column correct
13. Matrix Organization template — load → assert 3+ connections of 3 types exist
14. Version with connections — save → clear → restore → assert connections preserved
15. Delete node cascades — create A→B → delete A → assert connection removed

### Visual verification (VVP per global CLAUDE.md)

1. **Screenshot matrix**: live canvas with all 4 line styles; Connector Types modal; legend in each of 4 positions (PNG exports); Matrix Organization template; connect mode in each state
2. **Pixel inspection** via `Read` tool: dashes look like dashes, dotted looks dotted, double looks double, colors distinguishable, legend text readable
3. **Zoom matrix**: 0.5×, 1×, 2× — dash patterns scale correctly
4. **Export parity**: PNG and SVG visually identical for same diagram
5. WebP format for inspection (per memory)

### Build sequence — 12 steps

**Phase A — Data model foundation**

1. **Types + defaults** — add new types, `createDefaultConnectorTypes()`, `mergeWithDefaults()`. Extend `OrgChartState`. Update `orgChartStore.ts` initial state. *Verify:* app loads, tree renders identically, devtools show new fields populated
2. **JSON export/import backward compat** — extend serialization; extend `importJSON()` with layered defaults + orphan sweep. Add unit tests. *Verify:* fresh round-trip works, old-format JSON loads
3. **Version migration** — extend `loadVersions()` upgrade; change `saveVersion`/`restoreVersion` to full state. *Verify:* existing localStorage versions load cleanly, new versions round-trip

**Phase B — Rendering infrastructure**

4. **`connectorStyle.ts` helper** — create `drawStyledLine()` with dash patterns and double-line logic. Add `routeSecondaryEdge()` with anchor-on-border math
5. **Primary edge refactor** — change `drawConnector()` in both files to pull from `primary` connector type. *Verify visually:* tree still looks byte-identical; existing e2e tests pass

**Phase C — Secondary edges (read-only)**

6. **Render secondary edges** — add second rendering pass in `Canvas.tsx` and `export.ts`. Extend `calcBounds()` for secondary paths. *Verify:* manually injecting a connection via devtools renders correctly

**Phase D — Connector Types modal**

7. **Modal + store actions** — build `ConnectorTypesModal.tsx`, add `updateConnectorType`/`resetConnectorType`/`resetAllConnectorTypes`. Wire toolbar button. *Verify:* rename primary → tree updates live

**Phase E — Connect mode**

8. **State machine + UI** — add `connectMode` state + actions. Build `ConnectModeBanner.tsx`, `ConnectorTypePopover.tsx`. Wire toolbar button, `C` shortcut, click branches. *Verify:* full click-through creates connection
9. **Shift-drag bypass** — add drag handler branch reusing popover + `createConnection()`. *Verify:* Shift-drag creates connection without entering mode
10. **Edge selection** — `hitTestConnection()`, `selectedConnectionId` state, halo rendering, Delete wiring, properties panel dropdown. *Verify:* click to select, Delete to remove, dropdown changes type

**Phase F — Legend**

11. **Legend renderer + chip** — `drawLegend()` (PNG + SVG), `LegendPositionChip.tsx`, `calcExportBounds()`. *Verify:* export PNG with connections → legend appears; change position → legend moves; delete all connections → chip disappears, export has no legend

**Phase G — Polish**

12. **CSV + template + e2e + VVP** — extend `exportCSV()` with new column, add Matrix Organization template, write 15 e2e flows, run VVP. *Verify:* all tests green, visual inspection passes

---

## 8. File Manifest

### New files

- `src/tools/org-chart/connectorStyle.ts` — `drawStyledLine()`, `routeSecondaryEdge()`, `hitTestConnection()`
- `src/tools/org-chart/ConnectorTypesModal.tsx`
- `src/tools/org-chart/ConnectModeBanner.tsx`
- `src/tools/org-chart/ConnectorTypePopover.tsx`
- `src/tools/org-chart/LegendPositionChip.tsx`
- `e2e/documents/org-chart/typed-connectors.spec.ts`

### Modified files

- `src/tools/org-chart/types.ts` — new interfaces, constants, factory helpers
- `src/tools/org-chart/orgChartStore.ts` — `connections`/`connectorTypes`/`legend` state, connect mode state machine, new actions, version migration
- `src/tools/org-chart/Canvas.tsx` — two-pass edge rendering, connect mode branching, hit-testing, Shift-drag bypass, edge selection halo
- `src/tools/org-chart/export.ts` — typed primary edges, secondary edge rendering, `drawLegend()`, `calcExportBounds()`, CSV new column, JSON serialization/import backward compat
- `src/tools/org-chart/Toolbar.tsx` — Connect button, Connector Types button, `LegendPositionChip` integration
- `src/tools/org-chart/PropertiesPanel.tsx` — connection-selected state shows type dropdown + delete
- `src/tools/org-chart/OrgChartTool.tsx` — wire up new modals and the updated `loadDiagram()` call
- `src/tools/org-chart/shortcuts.ts` — `C` toggles connect mode
- `src/tools/org-chart/templates.ts` — extended type, new Matrix Organization template

---

## 9. Out of Scope (explicit)

- **Curved/Bezier connector routing** — v1 uses edge-anchored straight lines. Curves can be added later by swapping `routeSecondaryEdge()` without touching the data model
- **User-definable connector types beyond the 4 presets** — type registry is always exactly 4 entries in v1 (labels/colors only)
- **Legend styling customization beyond position** — no font size, no hide-title, no horizontal layout, no multi-legend
- **Secondary edges influencing tree layout** — layout algorithm ignores `connections[]`; dotted lines drawn on top, don't pull nodes together
- **Connection labels** — connections carry only `typeId`, not individual annotations. Additive later as an optional field
- **`left-right` layout direction** — still not implemented; this spec doesn't add it
