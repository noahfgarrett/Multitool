# Feedback Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Report Bug / Idea" feedback form to the sidebar that opens the user's email client with a pre-formatted message to ngarrett@lotusworks.com.

**Architecture:** A new `activeView` state in the Zustand store handles non-tool views like the feedback form. The sidebar gets a dedicated button in the footer, and `App.tsx` checks `activeView` before falling through to the tool component lookup. The form builds a structured mailto: URL with Outlook protocol handler fallback.

**Tech Stack:** React, TypeScript, Zustand, lucide-react, mailto:/ms-outlook:// protocol handlers

**Spec:** `docs/superpowers/specs/2026-03-26-feedback-form-design.md`

---

### Task 1: Add `activeView` and `showProfileModal` to the Zustand store

**Files:**
- Modify: `src/stores/appStore.ts`

- [ ] **Step 1: Add state and actions to the interface**

In `src/stores/appStore.ts`, add to the `AppState` interface (after line 11, before `// Actions`):

```typescript
  // Views (non-tool screens)
  activeView: 'feedback' | null
  showProfileModal: boolean
```

Add to the actions section (after line 20, before the closing `}`):

```typescript
  setActiveView: (view: 'feedback' | null) => void
  setShowProfileModal: (show: boolean) => void
```

- [ ] **Step 2: Add initial values and action implementations**

Add initial values in the store creation (after `toasts: [],` on line 33):

```typescript
  activeView: null,
  showProfileModal: false,
```

Add action implementations (after the `goHome` line 36):

```typescript
  setActiveView: (view) => set({ activeView: view, activeTool: null }),
  setShowProfileModal: (show) => set({ showProfileModal: show }),
```

Update `setActiveTool` (line 35) to also clear `activeView`:

```typescript
  setActiveTool: (tool) => set({ activeTool: tool, activeView: null }),
```

Update `goHome` (line 36) to also clear `activeView`:

```typescript
  goHome: () => set({ activeTool: null, activeView: null }),
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat: add activeView and showProfileModal to app store"
```

---

### Task 2: Update Header to show feedback view title

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Read activeView from store**

In `Header.tsx`, add `activeView` selector after line 9:

```typescript
  const activeView = useAppStore((s) => s.activeView)
```

- [ ] **Step 2: Add feedback view branch to the header rendering**

Replace the conditional block (lines 17-31) with a three-way branch:

```typescript
      {activeView === 'feedback' ? (
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-display font-semibold text-white">
            Report Bug / Idea
          </h1>
          <p className="text-xs text-white/50 -mt-0.5">Help us improve the toolkit</p>
        </div>
      ) : toolDef ? (
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-display font-semibold text-white">
            {toolDef.label}
          </h1>
          <p className="text-xs text-white/50 -mt-0.5">{toolDef.description}</p>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-display font-semibold text-white">
            Welcome
          </h1>
          <p className="text-xs text-white/50 -mt-0.5">Select a tool from the sidebar</p>
        </div>
      )}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: show feedback view title in header"
```

---

### Task 3: Add feedback button to Sidebar footer

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add imports**

Add `MessageSquarePlus` to the lucide-react import (line 9, add to the existing import):

```typescript
  QrCode, Table, ChevronDown, PanelLeftClose, PanelLeft,
  Home, MessageSquarePlus,
```

Add `activeView` and `setActiveView` selectors inside the `Sidebar` component (after line 33):

```typescript
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)
```

- [ ] **Step 2: Fix Home button highlight when feedback view is active**

The Home button (lines 66-67 and 73-74) uses `!activeTool` to determine its active state. When the feedback view is open, `activeTool` is `null`, so the Home button would incorrectly appear highlighted alongside the feedback button. Update both conditions to `!activeTool && !activeView`:

In the Home button className (line 66-67), replace:
```typescript
            ${!activeTool
```
with:
```typescript
            ${!activeTool && !activeView
```

In the Home button indicator bar (line 73), replace:
```typescript
          {!activeTool && (
```
with:
```typescript
          {!activeTool && !activeView && (
```

- [ ] **Step 3: Replace the footer section**

Replace the entire footer block (lines 149-156) with a footer that always renders (both expanded and collapsed states):

```typescript
      {/* Footer */}
      <div className="px-1.5 pb-2 pt-1 border-t border-white/[0.06] mt-auto">
        <button
          onClick={() => setActiveView('feedback')}
          title={sidebarExpanded ? undefined : 'Report Bug / Idea'}
          className={`
            w-full flex items-center gap-2.5 rounded-md transition-all duration-150
            ${sidebarExpanded ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
            ${activeView === 'feedback'
              ? 'bg-[#F47B20]/15 text-[#F47B20]'
              : 'text-[#F47B20]/70 hover:text-[#F47B20] hover:bg-[#F47B20]/[0.06]'
            }
            relative
          `}
        >
          {activeView === 'feedback' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#F47B20] rounded-r-full" />
          )}
          <MessageSquarePlus size={16} />
          {sidebarExpanded && (
            <span className="text-xs font-medium truncate">Report Bug / Idea</span>
          )}
        </button>
        {sidebarExpanded && (
          <p className="text-[10px] text-white/30 text-center mt-2">
            Multitool v{__APP_VERSION__}
          </p>
        )}
      </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add Report Bug / Idea button to sidebar footer"
```

---

### Task 4: Create the FeedbackForm component

**Files:**
- Create: `src/tools/feedback/FeedbackForm.tsx`

- [ ] **Step 1: Create the feedback directory**

```bash
mkdir -p src/tools/feedback
```

- [ ] **Step 2: Write the FeedbackForm component**

Create `src/tools/feedback/FeedbackForm.tsx` with the complete form implementation:

```typescript
import { useState } from 'react'
import { useAppStore } from '@/stores/appStore.ts'
import { getUserProfile, hasUserProfile } from '@/utils/userProfile.ts'
import { categories } from '@/tools/registry.ts'
import {
  Bug, Lightbulb, Mail, Info, RotateCcw,
} from 'lucide-react'

type FeedbackType = 'bug' | 'enhancement' | null
type Priority = 'low' | 'medium' | 'high'

const RECIPIENT = 'ngarrett@lotusworks.com'

function buildToolOptions(): { group: string; tools: { value: string; label: string }[] }[] {
  const groups = categories.map((cat) => ({
    group: cat.label,
    tools: cat.tools.map((t) => ({ value: t.label, label: t.label })),
  }))
  groups.push({
    group: 'Other',
    tools: [
      { value: 'New Tool Idea', label: 'New Tool Idea' },
      { value: 'General / App-wide', label: 'General / App-wide' },
    ],
  })
  return groups
}

const TOOL_OPTIONS = buildToolOptions()

function buildEmailBody(
  type: FeedbackType,
  tool: string,
  priority: Priority,
  description: string,
  userName: string,
  userEmail: string,
): string {
  const typeLabel = type === 'bug' ? 'Bug Report' : 'Enhancement Idea'
  const priorityLabel = priority.charAt(0).toUpperCase() + priority.slice(1)
  const version = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'unknown'

  return [
    `TYPE: ${typeLabel}`,
    `TOOL: ${tool}`,
    `PRIORITY: ${priorityLabel}`,
    `SUBMITTED BY: ${userName}${userEmail ? ` (${userEmail})` : ''}`,
    `APP VERSION: v${version}`,
    '',
    '---',
    '',
    'DESCRIPTION:',
    '',
    description,
    '',
    '---',
    '',
    `Sent from Multitool v${version}`,
  ].join('\n')
}

function buildSubject(type: FeedbackType, tool: string, subject: string): string {
  const prefix = type === 'bug' ? 'Bug Report' : 'Enhancement'
  return `[${prefix}] ${tool} — ${subject}`
}

export default function FeedbackForm() {
  const addToast = useAppStore((s) => s.addToast)
  const setShowProfileModal = useAppStore((s) => s.setShowProfileModal)
  const profile = getUserProfile()
  const hasProfile = hasUserProfile()

  const [type, setType] = useState<FeedbackType>(null)
  const [tool, setTool] = useState('')
  const [subject, setSubject] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  function validate(): boolean {
    const newErrors: Record<string, boolean> = {}
    if (!type) newErrors.type = true
    if (!tool) newErrors.tool = true
    if (!subject.trim()) newErrors.subject = true
    if (!description.trim()) newErrors.description = true
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(): void {
    if (!validate()) return
    if (!hasProfile || !profile) {
      addToast({ type: 'error', message: 'Please set up your profile first' })
      return
    }

    const emailSubject = buildSubject(type, tool, subject.trim())
    const emailBody = buildEmailBody(
      type, tool, priority, description.trim(),
      profile.name, profile.email,
    )

    const encodedSubject = encodeURIComponent(emailSubject)
    const encodedBody = encodeURIComponent(emailBody)

    // Try Outlook protocol handler first
    try {
      window.location.href = `ms-outlook://compose?to=${encodeURIComponent(RECIPIENT)}&subject=${encodedSubject}&body=${encodedBody}`
    } catch {
      // Outlook not available — fall through to mailto
    }

    // After a delay, open mailto as fallback
    setTimeout(() => {
      window.location.href = `mailto:${RECIPIENT}?subject=${encodedSubject}&body=${encodedBody}`
    }, 500)

    addToast({ type: 'success', message: 'Email client opened — just hit Send!' })
  }

  function handleClear(): void {
    setType(null)
    setTool('')
    setSubject('')
    setPriority('medium')
    setDescription('')
    setErrors({})
  }

  const descriptionPlaceholder = type === 'bug'
    ? 'Describe what you were doing when the bug occurred. Include any error messages and what you expected to happen instead...'
    : type === 'enhancement'
      ? 'Describe the improvement you\'d like to see and how it would help your workflow...'
      : 'Provide details...'

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-white">Report a Bug or Share an Idea</h2>
          <p className="text-xs text-white/40 mt-1">
            Your feedback helps us improve the toolkit. We&apos;ll review every submission.
          </p>
        </div>

        {/* Type toggle */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Type <span className="text-red-400">*</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => { setType('bug'); setErrors((e) => ({ ...e, type: false })) }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-[1.5px] transition-all ${
                type === 'bug'
                  ? 'bg-red-500/[0.08] border-red-500/30 text-red-400'
                  : 'bg-white/[0.03] border-white/10 text-white/50 hover:border-white/20'
              } ${errors.type ? 'ring-1 ring-red-500/50' : ''}`}
            >
              <Bug size={16} />
              <span className="text-sm font-medium">Bug Report</span>
            </button>
            <button
              onClick={() => { setType('enhancement'); setErrors((e) => ({ ...e, type: false })) }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-[1.5px] transition-all ${
                type === 'enhancement'
                  ? 'bg-blue-500/[0.08] border-blue-500/30 text-blue-400'
                  : 'bg-white/[0.03] border-white/10 text-white/50 hover:border-white/20'
              } ${errors.type ? 'ring-1 ring-red-500/50' : ''}`}
            >
              <Lightbulb size={16} />
              <span className="text-sm font-medium">Enhancement Idea</span>
            </button>
          </div>
        </div>

        {/* Tool dropdown */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Tool <span className="text-red-400">*</span>
          </label>
          <select
            value={tool}
            onChange={(e) => { setTool(e.target.value); setErrors((prev) => ({ ...prev, tool: false })) }}
            className={`w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border text-sm text-white/80 appearance-none cursor-pointer focus:outline-none focus:border-[#F47B20]/40 ${
              errors.tool ? 'border-red-500/50' : 'border-white/10'
            }`}
          >
            <option value="" disabled className="bg-[#1a1a2e]">Select a tool...</option>
            {TOOL_OPTIONS.map((group) => (
              <optgroup key={group.group} label={group.group} className="bg-[#1a1a2e]">
                {group.tools.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#1a1a2e]">{t.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-[10px] text-white/25 mt-1 ml-0.5">
            Select the tool where you found the bug, or choose &ldquo;New Tool Idea&rdquo;
          </p>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Subject <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => { setSubject(e.target.value); setErrors((prev) => ({ ...prev, subject: false })) }}
            placeholder="Brief summary of the issue or idea..."
            className={`w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#F47B20]/40 ${
              errors.subject ? 'border-red-500/50' : 'border-white/10'
            }`}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Priority
          </label>
          <div className="flex gap-1.5">
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  priority === p
                    ? 'bg-[#F47B20]/10 border border-[#F47B20]/30 text-[#F47B20]'
                    : 'bg-white/[0.04] border border-white/10 text-white/40 hover:text-white/60'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-medium text-white/50 uppercase tracking-wider mb-2">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors((prev) => ({ ...prev, description: false })) }}
            placeholder={descriptionPlaceholder}
            rows={5}
            className={`w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border text-sm text-white placeholder-white/25 resize-y focus:outline-none focus:border-[#F47B20]/40 ${
              errors.description ? 'border-red-500/50' : 'border-white/10'
            }`}
          />
          {type === 'bug' && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Info size={11} className="text-red-400/50 flex-shrink-0" />
              <p className="text-[10px] text-red-400/50">
                Bug tip: Describe the steps that led to the issue — this helps us find the root cause faster.
              </p>
            </div>
          )}
        </div>

        {/* Sender identity badge */}
        {hasProfile && profile ? (
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-full bg-[#F47B20]/15 flex items-center justify-center text-xs font-semibold text-[#F47B20] flex-shrink-0">
              {profile.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white/70 truncate">Sending as {profile.name}</p>
              {profile.email && (
                <p className="text-[11px] text-white/30 truncate">{profile.email}</p>
              )}
            </div>
            <span className="text-[10px] text-white/20 flex-shrink-0">From your profile</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3.5 py-3 rounded-lg bg-yellow-500/[0.04] border border-yellow-500/20">
            <Info size={14} className="text-yellow-400/60 flex-shrink-0" />
            <p className="text-xs text-yellow-400/70 flex-1">
              <button
                onClick={() => setShowProfileModal(true)}
                className="underline hover:text-yellow-300 transition-colors"
              >
                Set up your profile
              </button>
              {' '}to send feedback
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!hasProfile}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#F47B20] text-white text-sm font-semibold hover:bg-[#F47B20]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Mail size={14} />
            Open in Email Client
          </button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-white/40 text-sm hover:text-white/60 transition-colors"
          >
            <RotateCcw size={12} />
            Clear
          </button>
        </div>
        <p className="text-[10px] text-white/20">
          Opens your default email client with a pre-formatted message to {RECIPIENT}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/tools/feedback/FeedbackForm.tsx
git commit -m "feat: add FeedbackForm component with mailto and Outlook support"
```

---

### Task 5: Wire up App.tsx routing and profile modal

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports**

Add the lazy import for FeedbackForm after the existing tool imports (after line 32):

```typescript
const FeedbackForm = lazy(() => import('@/tools/feedback/FeedbackForm.tsx'))
```

- [ ] **Step 2: Read activeView and showProfileModal from store**

Replace the local `showProfileModal` state on line 46 by reading from the store. Update the component to read both `activeView` and `showProfileModal` from the store:

After `const activeTool = useAppStore((s) => s.activeTool)` (line 43), add:

```typescript
  const activeView = useAppStore((s) => s.activeView)
  const showProfileModal = useAppStore((s) => s.showProfileModal)
  const setShowProfileModal = useAppStore((s) => s.setShowProfileModal)
```

Remove the local `showProfileModal` state declaration (line 46):
```typescript
// DELETE: const [showProfileModal, setShowProfileModal] = useState(false)
```

- [ ] **Step 3: Update profile initialization**

In the `useEffect` (line 53-54), replace the local `setShowProfileModal(true)` with the store version — it will now call the same function name from the store, so the code doesn't actually change here. Just verify the deletion of the local state doesn't break anything.

- [ ] **Step 4: Update the main rendering logic**

Replace the rendering conditional (lines 69-79) to check `activeView` first:

```typescript
      {activeView === 'feedback' ? (
        <ToolContainer key="feedback">
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <FeedbackForm />
            </Suspense>
          </ErrorBoundary>
        </ToolContainer>
      ) : ActiveComponent ? (
        <ToolContainer key={activeTool}>
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              <ActiveComponent />
            </Suspense>
          </ErrorBoundary>
        </ToolContainer>
      ) : (
        <WelcomeScreen />
      )}
```

- [ ] **Step 5: Update UserProfileModal onClose**

Replace the `UserProfileModal` block (lines 87-95) to use the store action:

```typescript
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={(profile) => {
          saveUserProfile(profile)
          setUserProfile(profile)
          setShowProfileModal(false)
        }}
        initialProfile={userProfile}
      />
```

This now calls the store's `setShowProfileModal` instead of local state.

- [ ] **Step 6: Clean up unused imports**

Remove `useState` from the import if `showProfileModal` was the only useState using boolean (check — `updateInfo`, `showUpdateModal`, `userProfile` still use local useState, so keep `useState`).

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up feedback view routing and store-driven profile modal"
```

---

### Task 6: Build verification and manual test

**Files:** None (verification only)

- [ ] **Step 1: Full TypeScript check**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 2: Start dev server and test manually**

Run: `cd /Users/noahgarrett/codebase/multitool && npx vite --port 5173 --host 127.0.0.1`

Test checklist via Playwright MCP browser at `http://localhost:5173`:
1. Sidebar shows "Report Bug / Idea" button at bottom with MessageSquarePlus icon
2. Clicking it shows the feedback form in the main content area
3. Header shows "Report Bug / Idea" title
4. Sidebar button has active orange highlight
5. Type toggle: clicking "Bug Report" turns red, "Enhancement Idea" turns blue
6. Tool dropdown shows all 15 tools grouped by category + "New Tool Idea" + "General / App-wide"
7. Priority pills default to Medium, clicking changes selection
8. Description placeholder changes based on type selection
9. Bug tip helper text appears only when Bug Report is selected
10. Sender identity badge shows profile info
11. Submit with empty fields shows error states
12. Clicking a tool in the sidebar clears the feedback view
13. Clicking Home clears the feedback view
14. Collapsed sidebar shows just the icon with tooltip

- [ ] **Step 3: Production build**

Run: `cd /Users/noahgarrett/codebase/multitool && npm run build`
Expected: Build succeeds, `dist/Multitool.html` produced

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: feedback form polish from manual testing"
```
