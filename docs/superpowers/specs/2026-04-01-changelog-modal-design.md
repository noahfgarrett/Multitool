# Changelog Modal — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Goal:** Add an offline changelog to the update modal with release history, type badges, update-gap highlighting, and a "What's New" notification dot.

## Problem

Users have no way to see what changed between versions. The update modal only shows the latest release notes when an update is available. Upper management and users can't see the development velocity or understand the value of updating.

## Data Layer

### `src/data/changelog.ts`

Exports a typed array of release entries:

```typescript
interface ChangelogEntry {
  version: string          // "3.0.0"
  date: string             // "2026-04-01"
  type: 'major' | 'feature' | 'fix'  // determines badge color
  stats?: {                // optional quick stats
    features?: number
    fixes?: number
    tools?: number         // "X tools improved"
  }
  notes: string            // markdown bullet points
}

const CHANGELOG: ChangelogEntry[] = [
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
  // ... older entries prepended with each release
]
```

Newest version first. Each release gets added to the top of the array during the release process.

## UI Changes

### 1. UpdateModal — Tab Bar + Changelog Tab

**Tab bar** rendered below the modal title, above content:
- "Update" tab — all existing content (version badges, notes, download button, instructions)
- "Changelog" tab — scrollable release history

**Default tab:**
- "Update" when opened by the update checker (there's an update available)
- "Changelog" when opened by clicking the sidebar version link (no update context)

**Changelog tab content:**
- Scrollable list of all releases from `CHANGELOG` array
- Each release is a collapsible accordion row:
  - **Header row:** version number, date, type badge, stats summary, chevron
  - **Expanded content:** rendered markdown notes with left-border accent
- Latest release auto-expanded, older ones collapsed
- "See all releases" link at bottom — removes the `max-h` constraint on the container so all releases are visible

### 2. Release Type Badges

Color-coded pills next to each version in the changelog:
- `Major` — orange background (`bg-[#F47B20]/20 text-[#F47B20]`)
- `Feature` — blue background (`bg-blue-500/20 text-blue-400`)
- `Fix` — green background (`bg-emerald-500/20 text-emerald-400`)

Derived from the `type` field in each changelog entry.

### 3. Quick Stats Per Release

Small metadata line below the version header (visible even when collapsed):
- Format: "4 features · 21 fixes · 15 tools improved"
- Only shows stats that are present (if `stats.features` is undefined, skip it)
- Muted text color (`text-white/30`), small font (`text-[10px]`)

### 4. "New Since You Last Updated" Highlighting

When the user's current version (`__APP_VERSION__`) is older than the latest:
- All releases BETWEEN their version and the latest get a subtle left-border accent (orange, like the latest release)
- A small label above the first "old" release: "You're on v{current} — here's what you're missing:"
- This only appears when there's an actual gap (user isn't on latest)

Compare versions using the same `isNewer` semver logic from `updateChecker.ts`.

### 5. Sidebar Version Link — Clickable with "What's New" Dot

**Make version text clickable:**
- The existing `Multitool v3.0.0` text in the sidebar footer becomes a clickable link
- Click opens the UpdateModal with the Changelog tab active and no update info (just changelog browsing)

**"What's New" orange dot:**
- On first launch after an update (version changed from what was previously stored), show a small orange dot next to the version number
- Store `lastSeenVersion` in `localStorage`
- Dot appears when `__APP_VERSION__ !== localStorage.getItem('lastSeenVersion')`
- Dot clears when the user opens the changelog (set `lastSeenVersion` to current version)
- Dot is a 6px orange circle, positioned top-right of the version text, with a subtle pulse animation

### 6. UpdateModal Props Change

Current: `UpdateModal({ open, onClose, info: UpdateInfo })`

New: Support two modes:
- **Update mode:** `open={true}` with `info` provided — shows Update tab by default
- **Changelog-only mode:** `open={true}` with `info={null}` — shows Changelog tab only, no Update tab visible (since there's no update)

```typescript
interface UpdateModalProps {
  open: boolean
  onClose: () => void
  info: UpdateInfo | null  // null = changelog-only mode
}
```

## CLAUDE.md Release Checklist Update

Add to the existing release checklist in CLAUDE.md:

```
7. **Update changelog** — Add new entry to the TOP of `src/data/changelog.ts`:
   - version, date, type ('major' | 'feature' | 'fix'), stats, notes (markdown)
   - Follow release notes style from CLAUDE.md (short, user-facing, no QA mentions)
   - Rebuild after adding the entry so it's baked into the HTML
```

## What's NOT Changing

- Update checker logic (`checkForUpdate` in `updateChecker.ts`)
- Download flow (GitHub API blob download)
- The core Update tab content (version badges, release notes from GitHub, download button, instructions)
- The Update tab still shows the LIVE release notes from GitHub (not from the baked changelog) so it always matches the actual release

## Technical Notes

- `marked` is already a dependency — reuse it for rendering changelog markdown
- The `isNewer` function from `updateChecker.ts` should be extracted to a shared utility so the changelog can use it for the "new since last update" highlighting
- The orange notification dot uses CSS animation: `animate-pulse` from Tailwind (already available)
- No new dependencies needed
- All state (tab selection, expanded releases, "see all" mode) is local `useState` — no persistence needed except for `lastSeenVersion` in localStorage
