# Feedback Form — Report Bug / Idea

**Date:** 2026-03-26
**Status:** Approved

## Overview

A simple feedback form accessible from the bottom of the sidebar that lets users report bugs or suggest enhancements. Submitting the form opens the user's email client with a pre-formatted message to `ngarrett@lotusworks.com`.

## Architecture

The feedback form is **not a registered tool**. It does not appear in `registry.ts` or on the home grid.

- **Sidebar button** added to the footer section of `Sidebar.tsx`, between the last tool category and the version text
- Clicking the button sets a new `activeView` state to `'feedback'` in the Zustand store (separate from `activeTool`, which remains typed as `ToolId | null`)
- When `activeView === 'feedback'`, `App.tsx` renders `FeedbackForm` instead of the active tool component. Setting `activeView` also clears `activeTool` (and vice versa — selecting a tool clears `activeView`).
- No new dependencies — uses existing `lucide-react` icons and `userProfile.ts`. Replicates the `mailto:` / `ms-outlook://compose` protocol handler pattern from `emailUtil.ts` (not importing it — the existing utility is tightly coupled to PDF blobs).

### Files to create/modify

| File | Action | Purpose |
|------|--------|---------|
| `src/tools/feedback/FeedbackForm.tsx` | Create | Form component |
| `src/components/layout/Sidebar.tsx` | Modify | Add feedback button in footer (both expanded and collapsed states) |
| `src/App.tsx` | Modify | Add conditional branch: if `activeView === 'feedback'` render FeedbackForm, else render tool component |
| `src/stores/appStore.ts` | Modify | Add `activeView: 'feedback' | null` state + `setActiveView` action. `setActiveView` clears `activeTool`; `setActiveTool` clears `activeView`. |

No changes to `registry.ts` or `types/common.ts`. The `ToolId` union stays unchanged.

## Form Fields

| Field | Input Type | Required | Default | Details |
|-------|-----------|----------|---------|---------|
| Type | Toggle buttons | Yes | None | Bug Report / Enhancement Idea |
| Tool | `<select>` dropdown | Yes | None | All 15 tools from registry + "New Tool Idea" + "General / App-wide" |
| Subject | Text input | Yes | Empty | Placeholder: "Brief summary of the issue or idea..." |
| Priority | Pill buttons | No | Medium | Low / Medium / High |
| Description | Textarea | Yes | Empty | Conditional placeholder based on Type selection |

## Type Toggle Behavior

Two toggle buttons side by side, mutually exclusive:

- **Bug Report**: `Bug` icon (lucide). Selected state: red tint background (`rgba(239,68,68,0.08)`), red border, red icon and text.
- **Enhancement Idea**: `Lightbulb` icon (lucide). Selected state: blue tint background (`rgba(59,130,246,0.08)`), blue border (`#3B82F6`), blue icon and text.
- Unselected state for both: neutral gray background, gray border, gray icon and text.

## Conditional Description Behavior

The description textarea placeholder and helper text change based on the selected Type:

- **Bug Report selected**:
  - Placeholder: *"Describe what you were doing when the bug occurred. Include any error messages and what you expected to happen instead..."*
  - Helper text (below textarea, red with `Info` icon): *"Bug tip: Describe the steps that led to the issue — this helps us find the root cause faster."*
- **Enhancement Idea selected**:
  - Placeholder: *"Describe the improvement you'd like to see and how it would help your workflow..."*
  - No helper text
- **Neither selected**:
  - Placeholder: *"Provide details..."*

## Tool Dropdown Options

Populated dynamically from `registry.ts` tool list, grouped by category using `<optgroup>` labels, plus two static options at the bottom in an "Other" `<optgroup>`:

1. Tools grouped under their category headers (Documents, Images, Files, Creators, Utilities)
2. **Other** group:
   - **"New Tool Idea"** — for suggesting entirely new tools
   - **"General / App-wide"** — for issues or ideas that aren't tool-specific

## Sender Identity Badge

A read-only display below the description showing who the email will be sent as:

- Initials circle (LotusWorks orange background) + name + email, pulled from `getUserProfile()`
- Label: "From your profile"
- **Edge case**: If no profile exists (`!hasUserProfile()`), show a prompt: "Set up your profile to send feedback" as a clickable link. Clicking it calls `useAppStore.getState().setShowProfileModal(true)` — this requires adding a `showProfileModal: boolean` + `setShowProfileModal` action to `appStore.ts`, and lifting the profile modal trigger out of `App.tsx` local state into the store so `FeedbackForm` can access it.

## Submit Flow

1. **Validate** required fields (Type, Tool, Subject, Description). Show inline error styling on empty required fields.
2. **Build email** with structured subject line and body (see Email Format below).
3. **Try Outlook first**: Open `ms-outlook://compose` protocol handler via `window.location.href`.
4. **After a 500ms delay**, open `mailto:` as fallback — the delay prevents the second assignment from overriding the Outlook protocol handler before the browser processes it.
5. **Show success toast** via `useAppStore.getState().addToast()`: "Email client opened — just hit Send!"

## Email Format

**To:** `ngarrett@lotusworks.com`
**Subject:** `[Bug Report] PDF Annotate — Annotations disappear after export` (format: `[Type] Tool — Subject`)

**Body:**
```
TYPE: Bug Report
TOOL: PDF Annotate
PRIORITY: High
SUBMITTED BY: John Smith (jsmith@company.com)
APP VERSION: v2.7.3

---

DESCRIPTION:

I was annotating a 3-page document with rectangles and text boxes.
After exporting to PDF, the annotations on page 2 were missing.
I expected all annotations to be preserved in the export.

---

Sent from LotusWorks Toolkit v2.7.3
```

The subject line format (`[Type] Tool — Subject`) enables quick inbox scanning and filtering. The "From" address is determined by the user's email client — it cannot be set via `mailto:` or `ms-outlook://`. The user's identity is captured in the body under "SUBMITTED BY."

## Sidebar Integration

### Button Placement

- Located in the Sidebar footer section, directly above the version text
- Separated from tool categories by a `border-top` divider (matches existing `border-white/[0.06]` style)
- Icon: `MessageSquarePlus` from lucide-react, LotusWorks orange color
- Label: "Report Bug / Idea"
- **Important**: The current sidebar footer is wrapped in `{sidebarExpanded && ...}`, hiding it when collapsed. The feedback button must render in both states — place it outside that conditional, or restructure the footer to always render the button (icon-only when collapsed, icon + label when expanded).

### States

- **Default**: Orange icon, muted text, subtle orange-tinted background
- **Active** (form is open): Orange background tint + white text, matching how active tools are highlighted
- **Collapsed sidebar**: Icon only, with tooltip "Report Bug / Idea"

### Click Behavior

Calls `setActiveView('feedback')` on the Zustand store, which also clears `activeTool`. `App.tsx` checks `activeView` first — if set, render the corresponding view; otherwise fall through to the `toolComponents[activeTool]` lookup.

## Visual Design

- Follows the existing dark theme and LotusWorks design language
- All icons from `lucide-react` — no Unicode emoji
- Form uses existing shared components where available (`Button`, label styles)
- Orange accent color (`#F47B20`) for primary actions
- Red accent (`#EF4444`) for Bug type state
- Blue accent (`#3B82F6`) for Enhancement type state
- Responsive within the main content area — max-width constraint for readability on wide screens

## Constraints

- 100% client-side — no external API calls, no form submission services
- No new dependencies
- Must work in the single-HTML distribution build
- Email opens in the user's default email client — the app cannot send emails directly
