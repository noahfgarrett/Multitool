# Agent B: Org Chart — Multi-Root Sections + Revision Control

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-root sections with titles/dividers and named version snapshots to the Org Chart tool.

**Architecture:** Extend OrgNode with `sectionTitle`, allow multiple root nodes, update layout to position independent section trees side-by-side, add version CRUD stored in localStorage.

**Tech Stack:** React, Zustand-style hook store, Canvas 2D API, localStorage, structuredClone

**Spec:** `docs/superpowers/specs/2026-04-06-coo-feedback-updates-design.md` (Feature 2)

---

### Task 1: Extend Data Model

**Files:**
- Modify: `src/tools/org-chart/types.ts`

- [ ] **Step 1: Add sectionTitle to OrgNode and create OrgChartVersion type**

```typescript
// In types.ts, add sectionTitle to OrgNode interface:
export interface OrgNode {
  id: string
  name: string
  title: string
  reportsTo: string           // parent node id, '' for root
  department: string
  email: string
  phone: string
  location: string
  imageDataUrl: string | null
  nodeColor: string
  offsetX: number
  offsetY: number
  sectionTitle: string        // NEW — only meaningful when reportsTo === ''
}

// Add new interface after OrgChartState:
export interface OrgChartVersion {
  id: string
  name: string
  timestamp: number
  nodeCount: number
  snapshot: OrgNode[]
}

// Add constant:
export const MAX_VERSIONS = 20
export const SECTION_TITLE_HEIGHT = 40
export const SECTION_GAP = 100

// Update createNode to include sectionTitle:
export function createNode(overrides: Partial<OrgNode> = {}): OrgNode {
  return {
    id: genId(),
    name: 'New Person',
    title: 'Title',
    reportsTo: '',
    department: '',
    email: '',
    phone: '',
    location: '',
    imageDataUrl: null,
    nodeColor: '#F47B20',
    offsetX: 0,
    offsetY: 0,
    sectionTitle: '',
    ...overrides,
  }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/tools/org-chart/types.ts
git commit -m "feat(org-chart): add sectionTitle to OrgNode and OrgChartVersion type"
```

---

### Task 2: Update Store for Multi-Root + Sections

**Files:**
- Modify: `src/tools/org-chart/orgChartStore.ts`

- [ ] **Step 1: Add addSection action**

Add to the store hook return value:

```typescript
addSection: () => {
  const next = [...nodes]
  const newRoot = createNode({
    name: 'Department Head',
    title: 'Head of Department',
    reportsTo: '',
    sectionTitle: 'New Section',
  })
  next.push(newRoot)
  setNodes(next)
  pushHistory(next)
  setSelectedNodeIds(new Set([newRoot.id]))
}
```

- [ ] **Step 2: Update removeNode to allow deleting roots when >1 root exists**

Find the guard that prevents root deletion. Change from "cannot delete root" to "cannot delete the LAST root":

```typescript
removeNode: (id: string) => {
  const roots = nodes.filter(n => n.reportsTo === '')
  const target = nodes.find(n => n.id === id)
  if (!target) return
  // Only prevent deleting the very last root
  if (target.reportsTo === '' && roots.length <= 1) return
  // ... rest of cascade delete logic stays the same
}
```

- [ ] **Step 3: Update layout algorithm for multi-root**

The layout function currently finds a single root and builds one tree. Change it to:
1. Find all roots: `const roots = nodes.filter(n => n.reportsTo === '')`
2. For each root, compute its subtree layout independently
3. Position each section's tree side-by-side with `SECTION_GAP` between them
4. If `sectionTitle` is non-empty, offset the tree downward by `SECTION_TITLE_HEIGHT` to make room for the title

The key change is the horizontal offset accumulator:

```typescript
let xOffset = 0
const sectionLayouts: LayoutNode[][] = []

for (const root of roots) {
  const subtree = buildLayoutTree(root, nodes)
  layoutSubtree(subtree, direction) // existing layout logic
  // Shift entire subtree by xOffset
  shiftTree(subtree, xOffset, root.sectionTitle ? SECTION_TITLE_HEIGHT : 0)
  sectionLayouts.push(flattenTree(subtree))
  xOffset += getTreeWidth(subtree) + SECTION_GAP
}
```

- [ ] **Step 4: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/tools/org-chart/orgChartStore.ts
git commit -m "feat(org-chart): multi-root support with addSection and updated layout"
```

---

### Task 3: Render Section Titles and Dividers on Canvas

**Files:**
- Modify: `src/tools/org-chart/Canvas.tsx`

- [ ] **Step 1: Add section title rendering**

In the draw/render function, after computing layout but before drawing nodes, iterate over root nodes and draw their section titles:

```typescript
// Draw section titles and dividers
const roots = layoutNodes.filter(n => n.reportsTo === '')
roots.forEach((root, idx) => {
  if (root.sectionTitle) {
    ctx.save()
    ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.textAlign = 'center'
    // Title centered above the root node
    const titleX = root.x + root.width / 2
    const titleY = root.y - 16
    ctx.fillText(root.sectionTitle, titleX, titleY)
    ctx.restore()
  }

  // Draw vertical dashed divider between sections (not after last)
  if (idx < roots.length - 1) {
    const nextRoot = roots[idx + 1]
    // Find the rightmost x of current section + gap/2
    const dividerX = (getRightmostX(root, layoutNodes) + nextRoot.x) / 2
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(dividerX, -10000)
    ctx.lineTo(dividerX, 10000)
    ctx.stroke()
    ctx.restore()
  }
})
```

- [ ] **Step 2: Add inline editing for section titles**

On double-click, check if the click position is in a section title area. If so, show an overlay `<input>` for editing:

```typescript
// In double-click handler:
const clickedTitle = roots.find(root => {
  if (!root.sectionTitle) return false
  const titleX = root.x + root.width / 2
  const titleY = root.y - SECTION_TITLE_HEIGHT
  return Math.abs(wx - titleX) < 120 && Math.abs(wy - titleY) < 20
})
if (clickedTitle) {
  setEditingTitleId(clickedTitle.id)
  return
}
```

Render an `<input>` overlay when `editingTitleId` is set, positioned absolutely over the canvas at the title location.

- [ ] **Step 3: Add right-click "Add New Section" to canvas context menu**

In the right-click handler for empty canvas area, add a menu item:

```typescript
{ label: 'Add New Section', action: () => store.addSection() }
```

- [ ] **Step 4: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/tools/org-chart/Canvas.tsx
git commit -m "feat(org-chart): render section titles, dividers, and inline title editing"
```

---

### Task 4: Add Toolbar Buttons for Sections and Versions

**Files:**
- Modify: `src/tools/org-chart/Toolbar.tsx`

- [ ] **Step 1: Add "Add Section" button**

Add between the "Add Person" and "Templates" buttons:

```tsx
<button
  onClick={() => store.addSection()}
  className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
  title="Add Section"
>
  <LayoutPanelLeft size={16} />
</button>
```

Import `LayoutPanelLeft` and `History` from `lucide-react`.

- [ ] **Step 2: Add "Versions" button**

```tsx
<button
  onClick={() => setShowVersions(!showVersions)}
  className={`p-1.5 rounded-md transition-colors ${
    showVersions ? 'text-[#F47B20] bg-[#F47B20]/15' : 'text-white/60 hover:text-white hover:bg-white/10'
  }`}
  title="Version History"
>
  <History size={16} />
</button>
```

Pass `showVersions` / `setShowVersions` as props from OrgChartTool.tsx.

- [ ] **Step 3: Commit**

```bash
git add src/tools/org-chart/Toolbar.tsx
git commit -m "feat(org-chart): add Section and Versions toolbar buttons"
```

---

### Task 5: Implement Version Control Store Methods

**Files:**
- Modify: `src/tools/org-chart/orgChartStore.ts`

- [ ] **Step 1: Add version CRUD methods**

```typescript
const VERSIONS_KEY = 'lwt-orgchart-versions'

function loadVersions(): OrgChartVersion[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function persistVersions(versions: OrgChartVersion[]): void {
  localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions))
}

// Add to store return:
getVersions: (): OrgChartVersion[] => loadVersions(),

saveVersion: (name: string) => {
  const versions = loadVersions()
  if (versions.length >= MAX_VERSIONS) {
    versions.pop() // remove oldest (last in array)
  }
  const version: OrgChartVersion = {
    id: genId(),
    name,
    timestamp: Date.now(),
    nodeCount: nodes.length,
    snapshot: structuredClone(nodes),
  }
  versions.unshift(version) // newest first
  persistVersions(versions)
},

restoreVersion: (versionId: string) => {
  const versions = loadVersions()
  const version = versions.find(v => v.id === versionId)
  if (!version) return
  const restored = structuredClone(version.snapshot)
  setNodes(restored)
  pushHistory(restored)
  setSelectedNodeIds(new Set())
},

deleteVersion: (versionId: string) => {
  const versions = loadVersions().filter(v => v.id !== versionId)
  persistVersions(versions)
},

renameVersion: (versionId: string, newName: string) => {
  const versions = loadVersions()
  const version = versions.find(v => v.id === versionId)
  if (version) {
    version.name = newName
    persistVersions(versions)
  }
},
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/tools/org-chart/orgChartStore.ts
git commit -m "feat(org-chart): version control CRUD with localStorage persistence"
```

---

### Task 6: Build Versions Panel UI

**Files:**
- Modify: `src/tools/org-chart/OrgChartTool.tsx`

- [ ] **Step 1: Add versions panel state and UI**

Add state: `const [showVersions, setShowVersions] = useState(false)`

Render a slide-out panel (or dropdown) when `showVersions` is true:

```tsx
{showVersions && (
  <div className="absolute right-0 top-12 w-72 max-h-96 overflow-y-auto bg-dark-elevated border border-white/10 rounded-lg shadow-xl z-50 p-3">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-white">Version History</h3>
      <button
        onClick={() => {
          const name = prompt('Version name:', `Version ${store.getVersions().length + 1}`)
          if (name) store.saveVersion(name)
          // Force re-render by toggling state
          setShowVersions(false)
          setTimeout(() => setShowVersions(true), 0)
        }}
        className="text-xs px-2 py-1 bg-[#F47B20] text-white rounded hover:bg-[#F47B20]/80"
      >
        Save Current
      </button>
    </div>
    {store.getVersions().length === 0 ? (
      <p className="text-xs text-white/40 text-center py-4">No saved versions yet</p>
    ) : (
      <div className="space-y-2">
        {store.getVersions().map(v => (
          <div key={v.id} className="p-2 rounded bg-white/[0.03] border border-white/[0.06] group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white truncate">{v.name}</span>
              <span className="text-[10px] text-white/30">{v.nodeCount} people</span>
            </div>
            <div className="text-[10px] text-white/30 mt-0.5">
              {new Date(v.timestamp).toLocaleDateString()} {new Date(v.timestamp).toLocaleTimeString()}
            </div>
            <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  if (confirm('Restore this version? Current chart will be replaced.')) {
                    store.restoreVersion(v.id)
                  }
                }}
                className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
              >
                Restore
              </button>
              <button
                onClick={() => {
                  const newName = prompt('Rename version:', v.name)
                  if (newName) {
                    store.renameVersion(v.id, newName)
                    setShowVersions(false)
                    setTimeout(() => setShowVersions(true), 0)
                  }
                }}
                className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/50 rounded hover:bg-white/10"
              >
                Rename
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this version?')) {
                    store.deleteVersion(v.id)
                    setShowVersions(false)
                    setTimeout(() => setShowVersions(true), 0)
                  }
                }}
                className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

Pass `showVersions` and `setShowVersions` to Toolbar.

- [ ] **Step 2: Verify build compiles and test manually**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/tools/org-chart/OrgChartTool.tsx
git commit -m "feat(org-chart): versions panel UI with save/restore/rename/delete"
```

---

### Task 7: Update Exports to Include Section Titles

**Files:**
- Modify: `src/tools/org-chart/export.ts`

- [ ] **Step 1: Update PNG export**

In the PNG render function, draw section titles above root nodes (same logic as Canvas.tsx rendering).

- [ ] **Step 2: Update SVG export**

Add `<text>` elements for section titles, positioned above root nodes.

- [ ] **Step 3: Update CSV export**

Add a "Section" column that shows the `sectionTitle` of each node's root ancestor.

- [ ] **Step 4: Update JSON export/import**

The `sectionTitle` field is already part of `OrgNode`, so JSON export works automatically. For import, ensure backward compatibility: default `sectionTitle` to `''` if missing.

- [ ] **Step 5: Commit**

```bash
git add src/tools/org-chart/export.ts
git commit -m "feat(org-chart): include section titles in all export formats"
```

---

### Task 8: Add Multi-Department Template

**Files:**
- Modify: `src/tools/org-chart/templates.ts`

- [ ] **Step 1: Add new template**

```typescript
{
  name: 'Multi-Department',
  description: '3 independent departments with section headers',
  build: (): OrgChartState => ({
    nodes: [
      // Operations section
      createNode({ id: 'ops-head', name: 'Operations Director', title: 'Director of Operations', reportsTo: '', department: 'Operations', nodeColor: '#F97316', sectionTitle: 'Operations' }),
      createNode({ name: 'Site Manager', title: 'Site Manager', reportsTo: 'ops-head', department: 'Operations', nodeColor: '#F97316' }),
      createNode({ name: 'Safety Officer', title: 'Safety Officer', reportsTo: 'ops-head', department: 'Operations', nodeColor: '#F97316' }),
      createNode({ name: 'Logistics Lead', title: 'Logistics Lead', reportsTo: 'ops-head', department: 'Operations', nodeColor: '#F97316' }),
      createNode({ name: 'QA Inspector', title: 'QA Inspector', reportsTo: 'ops-head', department: 'Operations', nodeColor: '#F97316' }),
      // Engineering section
      createNode({ id: 'eng-head', name: 'Engineering Director', title: 'Director of Engineering', reportsTo: '', department: 'Engineering', nodeColor: '#3B82F6', sectionTitle: 'Engineering' }),
      createNode({ name: 'Lead Engineer', title: 'Lead Mechanical Engineer', reportsTo: 'eng-head', department: 'Engineering', nodeColor: '#3B82F6' }),
      createNode({ name: 'Design Engineer', title: 'Design Engineer', reportsTo: 'eng-head', department: 'Engineering', nodeColor: '#3B82F6' }),
      createNode({ name: 'CAD Technician', title: 'CAD Technician', reportsTo: 'eng-head', department: 'Engineering', nodeColor: '#3B82F6' }),
      createNode({ name: 'Project Engineer', title: 'Project Engineer', reportsTo: 'eng-head', department: 'Engineering', nodeColor: '#3B82F6' }),
      // Admin section
      createNode({ id: 'admin-head', name: 'Admin Director', title: 'Director of Administration', reportsTo: '', department: 'HR', nodeColor: '#EC4899', sectionTitle: 'Administration' }),
      createNode({ name: 'HR Manager', title: 'HR Manager', reportsTo: 'admin-head', department: 'HR', nodeColor: '#EC4899' }),
      createNode({ name: 'Office Manager', title: 'Office Manager', reportsTo: 'admin-head', department: 'HR', nodeColor: '#EC4899' }),
      createNode({ name: 'Accountant', title: 'Senior Accountant', reportsTo: 'admin-head', department: 'Finance', nodeColor: '#8B5CF6' }),
      createNode({ name: 'IT Support', title: 'IT Support Specialist', reportsTo: 'admin-head', department: 'Engineering', nodeColor: '#3B82F6' }),
    ],
  }),
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/tools/org-chart/templates.ts
git commit -m "feat(org-chart): add Multi-Department template with 3 sections"
```

---

### Task 9: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
cd /Users/noahgarrett/codebase/lotusworkstoolkit && npm run build
```

- [ ] **Step 2: Start dev server and manually verify**

```bash
npm run dev
```

Open Org Chart tool, verify:
1. Default single-root chart still works
2. "Add Section" creates a new independent tree
3. Section titles render above roots and are editable
4. Dividers appear between sections
5. Versions panel opens, can save/restore/rename/delete
6. Multi-Department template loads correctly
7. All exports include section titles

- [ ] **Step 3: Final commit if any fixes needed**
