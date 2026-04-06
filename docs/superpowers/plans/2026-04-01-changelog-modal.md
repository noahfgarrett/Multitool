# Changelog Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an offline changelog to the update modal with tabbed navigation, release type badges, quick stats, "new since last update" highlighting, and a "What's New" notification dot on the sidebar version link.

**Architecture:** New `src/data/changelog.ts` data file provides all release history. `UpdateModal.tsx` gets tabbed UI (Update | Changelog). `Sidebar.tsx` footer version becomes clickable with a notification dot. `isNewer` extracted from `updateChecker.ts` to a shared util. `App.tsx` wires up the changelog-only modal trigger.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, `marked` (already installed)

---

### Task 1: Extract `isNewer` to Shared Utility

**Files:**
- Create: `src/utils/semver.ts`
- Modify: `src/utils/updateChecker.ts`

- [ ] **Step 1: Create `src/utils/semver.ts`**

```typescript
/** Compare two semver strings (e.g. "1.2.3" > "1.2.2"). */
export function isNewer(remote: string, local: string): boolean {
  const r = remote.replace(/^v/, '').split('.').map(Number)
  const l = local.replace(/^v/, '').split('.').map(Number)
  const len = Math.max(r.length, l.length)
  for (let i = 0; i < len; i++) {
    const rv = r[i] ?? 0
    const lv = l[i] ?? 0
    if (rv > lv) return true
    if (rv < lv) return false
  }
  return false
}
```

- [ ] **Step 2: Update `src/utils/updateChecker.ts` to import from shared util**

Remove the local `isNewer` function (lines 27-38) and replace with:

```typescript
import { isNewer } from '@/utils/semver.ts'
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/utils/semver.ts src/utils/updateChecker.ts
git commit -m "refactor: extract isNewer to shared semver utility"
```

---

### Task 2: Create Changelog Data File

**Files:**
- Create: `src/data/changelog.ts`

- [ ] **Step 1: Create `src/data/changelog.ts` with types and all release data**

Fetch all existing release notes from GitHub and populate the file. Run this to get the raw data:

```bash
gh api repos/noahfgarrett/LotusWorksToolkit/releases --paginate --jq '.[] | {tag: .tag_name, date: .created_at[0:10], body}' > /tmp/releases.json
```

Then create the file with every release entry. The structure:

```typescript
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
    version: '3.0.0',
    date: '2026-04-01',
    type: 'major',
    stats: { features: 6, fixes: 21, tools: 15 },
    notes: `### PDF Annotate — Complete toolbar redesign
- **Labeled toolbar buttons** — Icon-only mystery buttons replaced with a clean "More" dropdown
- **Collapsible tool sidebar** — Expanded with labels by default; collapse to icons
- **More canvas space** — Compact header, no duplicate page nav, streamlined bottom bar
- **Export PDF moved to far right** — Natural endpoint for annotation workflow

### Bug fixes across all 15 tools
- Fixed undo deleting entire Org Chart
- Fixed Form Builder PDF export crash
- Fixed Word export failing silently in Text Extract
- Fixed shapes not placeable in Flow Chart
- Fixed TSV parsing in Data Viewer
- Plus 16 more fixes across Image Resizer, BG Remover, PDF Merge, Dashboard, PDF Split`,
  },
  // ... continue with ALL releases from /tmp/releases.json
  // Populate each entry with:
  //   version: tag_name without 'v' prefix
  //   date: created_at date
  //   type: 'major' for x.0.0, 'feature' for x.y.0, 'fix' for x.y.z
  //   stats: count features/fixes from the body text (optional, best-effort)
  //   notes: the release body text
]
```

**Type assignment rule:**
- Version `x.0.0` → `'major'`
- Version `x.y.0` (y > 0) → `'feature'`
- Version `x.y.z` (z > 0) → `'fix'`

Populate ALL releases from the GitHub data. For `stats`, scan the body for bullet points — count lines starting with `- **` or `- ` to estimate features vs fixes. If unclear, omit `stats`.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add src/data/changelog.ts
git commit -m "feat: add changelog data file with all release history"
```

---

### Task 3: Rebuild UpdateModal with Tabs + Changelog Tab

**Files:**
- Modify: `src/components/common/UpdateModal.tsx`

- [ ] **Step 1: Update props to support changelog-only mode**

Change the interface at the top of the file:

```typescript
interface UpdateModalProps {
  open: boolean
  onClose: () => void
  info: UpdateInfo | null  // null = changelog-only mode, no Update tab
  defaultTab?: 'update' | 'changelog'
}
```

- [ ] **Step 2: Add imports**

Add to the imports at the top:

```typescript
import { ChevronDown, Clock, Sparkles, Bug, Zap } from 'lucide-react'
import { CHANGELOG } from '@/data/changelog.ts'
import type { ChangelogEntry } from '@/data/changelog.ts'
import { isNewer } from '@/utils/semver.ts'
```

- [ ] **Step 3: Add tab state and changelog expansion state**

Inside the component, after existing state:

```typescript
const [activeTab, setActiveTab] = useState<'update' | 'changelog'>(
  info ? (defaultTab ?? 'update') : 'changelog'
)
const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
  () => new Set(CHANGELOG.length > 0 ? [CHANGELOG[0].version] : [])
)
const [showAll, setShowAll] = useState(false)

const toggleVersion = (version: string): void => {
  setExpandedVersions(prev => {
    const next = new Set(prev)
    if (next.has(version)) next.delete(version)
    else next.add(version)
    return next
  })
}
```

Reset `activeTab` when `info` changes:

```typescript
const resolvedDefaultTab = info ? (defaultTab ?? 'update') : 'changelog'
useEffect(() => {
  setActiveTab(resolvedDefaultTab)
}, [resolvedDefaultTab])
```

- [ ] **Step 4: Add type badge helper**

```typescript
const typeBadge = (type: ChangelogEntry['type']): React.ReactNode => {
  const styles = {
    major: 'bg-[#F47B20]/20 text-[#F47B20]',
    feature: 'bg-blue-500/20 text-blue-400',
    fix: 'bg-emerald-500/20 text-emerald-400',
  }
  const labels = { major: 'Major', feature: 'Feature', fix: 'Fix' }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}
```

- [ ] **Step 5: Add stats summary helper**

```typescript
const statsLine = (stats: ChangelogEntry['stats']): string | null => {
  if (!stats) return null
  const parts: string[] = []
  if (stats.features) parts.push(`${stats.features} feature${stats.features > 1 ? 's' : ''}`)
  if (stats.fixes) parts.push(`${stats.fixes} fix${stats.fixes > 1 ? 'es' : ''}`)
  if (stats.tools) parts.push(`${stats.tools} tools improved`)
  return parts.join(' · ')
}
```

- [ ] **Step 6: Rewrite the JSX return**

Replace the entire `return (...)` with a structure that has:
1. Modal title stays "Update Available" if `info` is set, otherwise "Changelog"
2. Tab bar (only show "Update" tab if `info` is set)
3. Tab content: Update tab = existing content, Changelog tab = new scrollable list

```tsx
const modalTitle = info ? 'Update Available' : 'Changelog'
const displayedReleases = showAll ? CHANGELOG : CHANGELOG.slice(0, 8)

return (
  <Modal open={open} onClose={onClose} title={modalTitle} width="md">
    <div className="space-y-3">
      {/* Tab bar */}
      <div className="flex border-b border-white/[0.06]">
        {info && (
          <button
            onClick={() => setActiveTab('update')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === 'update'
                ? 'text-[#F47B20] border-b-2 border-[#F47B20]'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            Update
          </button>
        )}
        <button
          onClick={() => setActiveTab('changelog')}
          className={`px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'changelog'
              ? 'text-[#F47B20] border-b-2 border-[#F47B20]'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Changelog
        </button>
      </div>

      {/* Update tab content */}
      {activeTab === 'update' && info && (
        <div className="space-y-4">
          {/* Version badges */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/60">
              v{__APP_VERSION__}
            </span>
            <span className="text-white/30">&rarr;</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F47B20]/20 text-[#F47B20]">
              v{info.version}
            </span>
          </div>

          {/* Release notes */}
          {renderedNotes && (
            <div
              className="release-notes max-h-60 overflow-y-auto overscroll-contain rounded-lg bg-white/[0.03] border border-white/[0.06] p-4 text-sm text-white/70"
              dangerouslySetInnerHTML={{ __html: renderedNotes }}
            />
          )}

          {/* Update instructions */}
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-xs text-white/50 space-y-1.5">
            <p className="text-white/70 font-medium">After downloading:</p>
            <p><span className="text-white/60 font-medium">Option A:</span> Delete your current LotusWorksToolkit.html, then move the new file to the same location.</p>
            <p><span className="text-white/60 font-medium">Option B:</span> Open the downloaded file and update your bookmark to point to the new copy.</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={onClose} icon={<X size={14} />}>
              Skip this version
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void handleDownload()}
              disabled={!info.downloadUrl || downloading}
              icon={downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            >
              {downloading ? 'Downloading...' : `Download v${info.version}`}
            </Button>
          </div>
        </div>
      )}

      {/* Changelog tab content */}
      {activeTab === 'changelog' && (
        <div>
          {/* "New since your version" banner */}
          {isNewer(CHANGELOG[0]?.version ?? '0', __APP_VERSION__) && (
            <p className="text-[11px] text-[#F47B20]/70 mb-3">
              You're on <span className="font-semibold text-[#F47B20]">v{__APP_VERSION__}</span> — here's what's new since then:
            </p>
          )}

          <div className={`${showAll ? '' : 'max-h-[400px]'} overflow-y-auto overscroll-contain space-y-1 pr-1`}>
            {displayedReleases.map((entry) => {
              const isExpanded = expandedVersions.has(entry.version)
              const isNewerThanCurrent = isNewer(entry.version, __APP_VERSION__)
              const isLatest = entry.version === CHANGELOG[0]?.version
              const renderedEntryNotes = marked.parse(entry.notes, { async: false }) as string

              return (
                <div key={entry.version}>
                  {/* Version header */}
                  <button
                    onClick={() => toggleVersion(entry.version)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <span className={`text-[13px] font-semibold ${isLatest ? 'text-[#F47B20]' : 'text-white'}`}>
                      v{entry.version}
                    </span>
                    <span className="text-[10px] text-white/30">{entry.date}</span>
                    {typeBadge(entry.type)}
                    {isLatest && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#F47B20]/15 text-[#F47B20]">
                        latest
                      </span>
                    )}
                    {statsLine(entry.stats) && (
                      <span className="text-[10px] text-white/25 hidden sm:inline">{statsLine(entry.stats)}</span>
                    )}
                    <ChevronDown size={12} className={`ml-auto text-white/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded notes */}
                  {isExpanded && (
                    <div
                      className={`ml-3 pl-3 mb-2 border-l-2 ${
                        isNewerThanCurrent || isLatest ? 'border-[#F47B20]/30' : 'border-white/[0.06]'
                      } text-sm text-white/60 release-notes`}
                      dangerouslySetInnerHTML={{
                        __html: renderedEntryNotes
                          .replace(/<ul>/g, '<ul style="list-style-type:disc;padding-left:1.25rem">')
                          .replace(/<ol>/g, '<ol style="list-style-type:decimal;padding-left:1.25rem">')
                          .replace(/<li>/g, '<li style="margin:0.25rem 0">')
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* See all */}
          {!showAll && CHANGELOG.length > 8 && (
            <div className="text-center pt-3">
              <button
                onClick={() => setShowAll(true)}
                className="text-xs text-[#F47B20] hover:text-[#F47B20]/80 transition-colors"
              >
                See all {CHANGELOG.length} releases
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  </Modal>
)
```

- [ ] **Step 7: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 8: Commit**

```bash
git add src/components/common/UpdateModal.tsx
git commit -m "feat: UpdateModal with tabs — Update + Changelog with type badges, stats, expand/collapse"
```

---

### Task 4: Sidebar Version Link + "What's New" Dot

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (lines 170-178)
- Modify: `src/App.tsx` (lines 50-51, 94-100)

- [ ] **Step 1: Add changelog state to App.tsx**

In `src/App.tsx`, add a new state variable near the existing update state (around line 50):

```typescript
const [showChangelogModal, setShowChangelogModal] = useState(false)
```

Pass a callback down to Sidebar. Find where `<Sidebar />` is rendered and add a prop:

```tsx
<Sidebar onChangelogOpen={() => setShowChangelogModal(true)} />
```

Add a second UpdateModal instance for changelog-only mode (near the existing UpdateModal render, around line 94):

```tsx
<UpdateModal
  open={showChangelogModal}
  onClose={() => {
    setShowChangelogModal(false)
    localStorage.setItem('lastSeenVersion', __APP_VERSION__)
  }}
  info={null}
  defaultTab="changelog"
/>
```

- [ ] **Step 2: Update Sidebar props and footer**

In `src/components/layout/Sidebar.tsx`, add the prop to the component:

```typescript
interface SidebarProps {
  onChangelogOpen: () => void
}

export function Sidebar({ onChangelogOpen }: SidebarProps) {
```

If Sidebar currently takes no props, add the interface. If it uses the app store directly, just add the callback prop.

Replace the version paragraph (around line 176) with a clickable button that has the notification dot:

```tsx
{sidebarExpanded && (
  <button
    onClick={() => {
      onChangelogOpen()
      localStorage.setItem('lastSeenVersion', __APP_VERSION__)
    }}
    className="relative text-[10px] text-white/30 hover:text-white/50 text-center mt-2 w-full transition-colors"
    title="View changelog"
  >
    LotusWorks Toolkit v{__APP_VERSION__}
    {localStorage.getItem('lastSeenVersion') !== __APP_VERSION__ && (
      <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-[#F47B20] animate-pulse" />
    )}
  </button>
)}
```

When sidebar is collapsed, also make the version accessible. Find where the collapsed sidebar renders (if there's a version indicator when collapsed — if not, skip this).

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: clickable sidebar version with What's New dot + changelog-only modal"
```

---

### Task 5: Update CLAUDE.md Release Checklist

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add changelog step to the release checklist**

Find the "### Release Checklist" section in `CLAUDE.md`. After step 2 ("Build"), add a new step:

```markdown
3. **Update changelog** — Add a new entry to the TOP of `src/data/changelog.ts`:
   ```typescript
   {
     version: 'X.Y.Z',
     date: 'YYYY-MM-DD',
     type: 'major' | 'feature' | 'fix',  // major=x.0.0, feature=x.y.0, fix=x.y.z
     stats: { features: N, fixes: N, tools: N },  // optional, count from release notes
     notes: `...release notes markdown...`,
   },
   ```
   - Add to the TOP of the `CHANGELOG` array (newest first)
   - Follow release notes style (short, user-facing, no QA mentions)
   - Rebuild after adding so the changelog is baked into the HTML
```

Renumber subsequent steps (old 3 becomes 4, etc.).

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add changelog update step to release checklist in CLAUDE.md"
```

---

### Task 6: Visual Verification & Polish

**Files:**
- All modified files from Tasks 1-5

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Visual verification via dev server**

Start dev server and verify in browser:
1. Open app — check sidebar footer shows version with orange "What's New" dot (pulsing)
2. Click version link — Changelog modal opens with all releases listed
3. Latest release auto-expanded with orange left border + "latest" badge + type badge
4. Click older releases to expand — notes render with markdown formatting
5. Click "See all releases" — modal expands to show all entries
6. Close modal — "What's New" dot disappears (localStorage updated)
7. Reload — dot stays gone
8. Trigger update check (if possible) — Update tab appears as default, Changelog tab available
9. Check that type badges render correctly: orange for major, blue for feature, green for fix
10. Check quick stats line appears under releases that have stats

- [ ] **Step 3: Fix any visual issues found**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: changelog modal — complete with type badges, stats, What's New dot, sidebar link"
```
