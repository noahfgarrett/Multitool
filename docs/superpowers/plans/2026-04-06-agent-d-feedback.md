# Agent D: "Got an Idea?" Welcome Button + Feedback Preselect

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a glowing "Got an Idea?" button to the welcome screen that opens the feedback form with Enhancement Idea pre-selected.

**Architecture:** Add feedbackPayload to appStore, add shimmer button to WelcomeScreen, read payload in FeedbackForm to set initial type.

**Tech Stack:** React, Zustand, CSS animations

**Spec:** `docs/superpowers/specs/2026-04-06-coo-feedback-updates-design.md` (Feature 4)

**IMPORTANT:** This agent merges AFTER Agent A. The appStore will already have theme/settings additions. Add feedbackPayload state carefully alongside existing state.

---

### Task 1: Add feedbackPayload to App Store

**Files:**
- Modify: `src/stores/appStore.ts`

- [ ] **Step 1: Add feedbackPayload state**

```typescript
// Add to AppState interface:
feedbackPayload: { preselectedType?: 'bug' | 'enhancement' } | null
clearFeedbackPayload: () => void

// Update setActiveView to accept optional payload:
setActiveView: (view: 'feedback' | null, payload?: { preselectedType?: 'bug' | 'enhancement' }) => void
```

Implementation:
```typescript
feedbackPayload: null,
clearFeedbackPayload: () => set({ feedbackPayload: null }),

setActiveView: (view, payload) => set({
  activeView: view,
  activeTool: null,
  feedbackPayload: payload ?? null,
}),
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat: add feedbackPayload state for pre-selecting feedback type"
```

---

### Task 2: Add Shimmer Animation CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add shimmer keyframes**

```css
/* ── Shimmer animation for "Got an Idea?" button ─── */

@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

@keyframes glow-pulse {
  0%, 100% {
    box-shadow: 0 0 8px rgba(244, 123, 32, 0.3), 0 0 16px rgba(244, 123, 32, 0.1);
  }
  50% {
    box-shadow: 0 0 16px rgba(244, 123, 32, 0.5), 0 0 32px rgba(244, 123, 32, 0.2);
  }
}

.btn-idea-shimmer {
  background: linear-gradient(
    110deg,
    rgba(244, 123, 32, 0.1) 0%,
    rgba(244, 123, 32, 0.05) 40%,
    rgba(244, 123, 32, 0.2) 50%,
    rgba(244, 123, 32, 0.05) 60%,
    rgba(244, 123, 32, 0.1) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2.5s ease-in-out 4, glow-pulse 2s ease-in-out 4;
}
```

The `animation: ... 4` means 4 iterations then stops.

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: add shimmer and glow-pulse CSS animations for idea button"
```

---

### Task 3: Add "Got an Idea?" Button to Welcome Screen

**Files:**
- Modify: `src/components/WelcomeScreen.tsx`

- [ ] **Step 1: Add the button**

Import `Lightbulb` from lucide-react and `useAppStore`:

```tsx
import { Lightbulb } from 'lucide-react'

export function WelcomeScreen() {
  const setActiveTool = useAppStore((s) => s.setActiveTool)
  const setActiveView = useAppStore((s) => s.setActiveView)

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero — add relative positioning for the idea button */}
        <div className="text-center mb-12 pt-8 relative">
          {/* "Got an Idea?" button — top right */}
          <button
            onClick={() => setActiveView('feedback', { preselectedType: 'enhancement' })}
            className="
              btn-idea-shimmer
              absolute top-8 right-0
              flex items-center gap-2
              px-4 py-2 rounded-full
              border border-[#F47B20]/40
              text-[#F47B20] text-sm font-medium
              hover:bg-[#F47B20]/15 hover:border-[#F47B20]/60
              transition-colors duration-200
            "
          >
            <Lightbulb size={16} />
            Got an Idea?
          </button>

          <h1 className="text-4xl font-display font-bold text-[#F47B20] mb-3">
            LotusWorks Toolkit
          </h1>
          <p className="text-lg text-white/50 max-w-lg mx-auto">
            Your all-in-one productivity suite. Select a tool to get started.
          </p>
        </div>

        {/* Tool grid — unchanged */}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/WelcomeScreen.tsx
git commit -m "feat: add glowing 'Got an Idea?' button to welcome screen"
```

---

### Task 4: Read Preselected Type in FeedbackForm

**Files:**
- Modify: `src/tools/feedback/FeedbackForm.tsx`

- [ ] **Step 1: Read feedbackPayload on mount and set initial type**

```typescript
export default function FeedbackForm() {
  const addToast = useAppStore((s) => s.addToast)
  const setShowProfileModal = useAppStore((s) => s.setShowProfileModal)
  const feedbackPayload = useAppStore((s) => s.feedbackPayload)
  const clearFeedbackPayload = useAppStore((s) => s.clearFeedbackPayload)
  const profile = getUserProfile()
  const hasProfile = hasUserProfile()

  // Initialize type from payload if present
  const [type, setType] = useState<FeedbackType>(feedbackPayload?.preselectedType ?? null)

  // Clear payload after reading it (one-shot)
  useEffect(() => {
    if (feedbackPayload) {
      if (feedbackPayload.preselectedType) {
        setType(feedbackPayload.preselectedType)
      }
      clearFeedbackPayload()
    }
  }, []) // Only on mount
```

Add `useEffect` import if not already present.

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/lotusworkstoolkit && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/tools/feedback/FeedbackForm.tsx
git commit -m "feat: read feedbackPayload to pre-select Enhancement Idea type"
```

---

### Task 5: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
cd /Users/noahgarrett/codebase/lotusworkstoolkit && npm run build
```

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Verify:
1. Welcome screen shows "Got an Idea?" button in top-right
2. Button has orange shimmer animation that plays ~4 times then stops
3. Clicking button navigates to feedback form
4. Feedback form has "Enhancement Idea" pre-selected
5. Sidebar "Report Bug / Idea" still works normally (no pre-selection)
6. Navigating away and back to home shows the button again

- [ ] **Step 3: Final commit if any fixes needed**
