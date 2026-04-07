# Agent A: Settings & Themes + Enhanced Profile + About

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global Settings modal with themes (Night Sky, Blueprint, Clean Dark, Light), enhanced user profile (photo, job title, company), and About section. Surface profile data in PDF Annotate comments, sidebar, and feedback form.

**Architecture:** Extend appStore with theme/settings state, create SettingsModal with 3 tabs, define 4 themes as CSS custom property sets applied via body class, extend UserProfile type with new fields, update consuming components.

**Tech Stack:** React, Zustand, Tailwind CSS custom properties, localStorage, Canvas for avatar compression

**Spec:** `docs/superpowers/specs/2026-04-06-coo-feedback-updates-design.md` (Features 1, 5, 6)

---

### Task 1: Extend App Store with Theme and Settings State

**Files:**
- Modify: `src/stores/appStore.ts`

- [ ] **Step 1: Add theme and settings state**

```typescript
// Add to AppState interface:
export type ThemeId = 'night-sky' | 'blueprint' | 'clean-dark' | 'light'

interface AppState {
  // ... existing fields ...

  // Settings
  showSettings: boolean
  setShowSettings: (show: boolean) => void

  // Theme
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

// Add to create() implementation:
showSettings: false,
setShowSettings: (show) => set({ showSettings: show }),

theme: (localStorage.getItem('lwt-theme') as ThemeId) || 'night-sky',
setTheme: (theme) => {
  localStorage.setItem('lwt-theme', theme)
  set({ theme })
},
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/stores/appStore.ts
git commit -m "feat: add theme and settings state to appStore"
```

---

### Task 2: Define Theme CSS Custom Properties

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add theme classes with CSS custom properties**

Add at the top of index.css (after @tailwind directives):

```css
/* ── Theme System ──────────────────────────────────── */

:root,
.theme-night-sky {
  --bg-primary: #0a0a14;
  --bg-secondary: #12121e;
  --bg-elevated: #1a1a2e;
  --bg-surface: #16162a;
  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.6);
  --text-muted: rgba(255, 255, 255, 0.3);
  --border-color: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.15);
}

.theme-blueprint {
  --bg-primary: #1a2332;
  --bg-secondary: #1f2b3d;
  --bg-elevated: #253347;
  --bg-surface: #213040;
  --text-primary: #e2e8f0;
  --text-secondary: rgba(226, 232, 240, 0.6);
  --text-muted: rgba(226, 232, 240, 0.3);
  --border-color: rgba(226, 232, 240, 0.1);
  --border-hover: rgba(226, 232, 240, 0.2);
}

.theme-blueprint::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(100, 160, 220, 0.06) 39px, rgba(100, 160, 220, 0.06) 40px),
    repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(100, 160, 220, 0.06) 39px, rgba(100, 160, 220, 0.06) 40px);
  pointer-events: none;
  z-index: 0;
}

.theme-clean-dark {
  --bg-primary: #111116;
  --bg-secondary: #18181b;
  --bg-elevated: #1f1f24;
  --bg-surface: #1c1c21;
  --text-primary: #fafafa;
  --text-secondary: rgba(250, 250, 250, 0.6);
  --text-muted: rgba(250, 250, 250, 0.3);
  --border-color: rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.15);
}

.theme-light {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-elevated: #ffffff;
  --bg-surface: #fafafa;
  --text-primary: #1a1a2e;
  --text-secondary: rgba(26, 26, 46, 0.6);
  --text-muted: rgba(26, 26, 46, 0.3);
  --border-color: rgba(0, 0, 0, 0.1);
  --border-hover: rgba(0, 0, 0, 0.2);
}
```

- [ ] **Step 2: Update existing glass/bg classes to use CSS variables**

Find key classes that use hardcoded dark colors and update them to use variables. For example, if `body` or `.glass-sidebar` uses hardcoded `#0a0a14`:

```css
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

Update `.glass-sidebar`, `.dark-base`, `.dark-elevated`, `.dark-surface` etc. to reference CSS variables. Do a targeted search-and-replace — don't rewrite everything, just the main background and text colors that need to adapt.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: define 4 theme classes with CSS custom properties"
```

---

### Task 3: Apply Theme Class and Conditionally Render ShootingStars

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Apply theme class and conditionally render ShootingStars**

```tsx
import { useAppStore } from '@/stores/appStore.ts'
import { useEffect } from 'react'

export function AppShell({ children }: AppShellProps) {
  const focusMode = useAppStore((s) => s.focusMode)
  const theme = useAppStore((s) => s.theme)

  // Apply theme class to document body
  useEffect(() => {
    document.body.className = document.body.className
      .replace(/theme-[\w-]+/g, '')
      .trim()
    document.body.classList.add(`theme-${theme}`)
  }, [theme])

  return (
    <div className="flex h-full w-full">
      {theme === 'night-sky' && <ShootingStars />}
      {!focusMode && <Sidebar />}
      {/* ... rest unchanged ... */}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: apply theme class to body, conditionally render ShootingStars"
```

---

### Task 4: Extend UserProfile Type

**Files:**
- Modify: `src/utils/userProfile.ts`

- [ ] **Step 1: Add new fields to UserProfile**

```typescript
export interface UserProfile {
  name: string
  email: string
  initials: string
  imageDataUrl?: string | null
  jobTitle?: string
  company?: string
}
```

- [ ] **Step 2: Update getUserProfile validation to handle new optional fields**

The existing validation checks for name, email, initials — those stay required. The new fields are optional, so no validation change needed. But ensure they're preserved on save/load:

```typescript
export function getUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'name' in parsed &&
      'email' in parsed &&
      'initials' in parsed &&
      typeof (parsed as UserProfile).name === 'string' &&
      typeof (parsed as UserProfile).email === 'string' &&
      typeof (parsed as UserProfile).initials === 'string'
    ) {
      return parsed as UserProfile
    }
    return null
  } catch {
    return null
  }
}
```

This already works — extra fields in localStorage are preserved through JSON.parse and the type assertion.

- [ ] **Step 3: Add compressAvatar helper**

```typescript
export function compressAvatar(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      const maxSize = 128
      let w = img.width
      let h = img.height
      if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = dataUrl
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/userProfile.ts
git commit -m "feat: extend UserProfile with imageDataUrl, jobTitle, company"
```

---

### Task 5: Update UserProfileModal with New Fields

**Files:**
- Modify: `src/components/common/UserProfileModal.tsx`

- [ ] **Step 1: Add profile picture upload**

Add a circular avatar preview at the top of the form. Below it, upload and remove buttons:

```tsx
{/* Avatar */}
<div className="flex flex-col items-center mb-4">
  <div className="w-20 h-20 rounded-full bg-[#F47B20]/20 flex items-center justify-center overflow-hidden border-2 border-white/10">
    {imageDataUrl ? (
      <img src={imageDataUrl} alt="Profile" className="w-full h-full object-cover" />
    ) : initials ? (
      <span className="text-xl font-bold text-[#F47B20]">{initials}</span>
    ) : (
      <User size={32} className="text-white/30" />
    )}
  </div>
  <div className="flex gap-2 mt-2">
    <button
      type="button"
      onClick={() => avatarInputRef.current?.click()}
      className="text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/15 text-white/70"
    >
      Upload Photo
    </button>
    {imageDataUrl && (
      <button
        type="button"
        onClick={() => setImageDataUrl(null)}
        className="text-xs px-2 py-1 bg-red-500/20 rounded hover:bg-red-500/30 text-red-400"
      >
        Remove
      </button>
    )}
  </div>
  <input
    ref={avatarInputRef}
    type="file"
    accept="image/*"
    className="hidden"
    onChange={async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async () => {
        const compressed = await compressAvatar(reader.result as string)
        setImageDataUrl(compressed)
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    }}
  />
</div>
```

- [ ] **Step 2: Add Job Title and Company fields**

After the Initials field:

```tsx
<div>
  <label className="block text-xs font-medium text-white/60 mb-1">Job Title</label>
  <input
    type="text"
    value={jobTitle}
    onChange={e => setJobTitle(e.target.value)}
    placeholder="e.g. Senior Estimator"
    className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F47B20]/50"
  />
</div>
<div>
  <label className="block text-xs font-medium text-white/60 mb-1">Company</label>
  <input
    type="text"
    value={company}
    onChange={e => setCompany(e.target.value)}
    placeholder="e.g. Multitool"
    className="w-full px-3 py-2 bg-white/[0.06] border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F47B20]/50"
  />
</div>
```

- [ ] **Step 3: Update state and onClose to include new fields**

```typescript
const [imageDataUrl, setImageDataUrl] = useState<string | null>(initialProfile?.imageDataUrl ?? null)
const [jobTitle, setJobTitle] = useState(initialProfile?.jobTitle ?? '')
const [company, setCompany] = useState(initialProfile?.company ?? '')

// In save handler:
onClose({
  name: name.trim(),
  email: email.trim(),
  initials: initials.trim(),
  imageDataUrl,
  jobTitle: jobTitle.trim(),
  company: company.trim(),
})
```

- [ ] **Step 4: Commit**

```bash
git add src/components/common/UserProfileModal.tsx
git commit -m "feat: add profile picture, job title, company to UserProfileModal"
```

---

### Task 6: Create Settings Modal

**Files:**
- Create: `src/components/common/SettingsModal.tsx`

- [ ] **Step 1: Build the SettingsModal component**

```tsx
import { useState } from 'react'
import { Modal } from './Modal.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import type { ThemeId } from '@/stores/appStore.ts'
import { getUserProfile, saveUserProfile, compressAvatar } from '@/utils/userProfile.ts'
import type { UserProfile } from '@/utils/userProfile.ts'
import { Palette, User, Info, Check, Moon, Sun, Grid3X3, Minus } from 'lucide-react'

const THEMES: { id: ThemeId; label: string; description: string; icon: React.ComponentType<{ size?: number }>; preview: { bg: string; accent: string } }[] = [
  { id: 'night-sky', label: 'Night Sky', description: 'Dark with shooting stars', icon: Moon, preview: { bg: '#0a0a14', accent: '#1a1a2e' } },
  { id: 'blueprint', label: 'Blueprint', description: 'Dark navy with grid lines', icon: Grid3X3, preview: { bg: '#1a2332', accent: '#253347' } },
  { id: 'clean-dark', label: 'Clean Dark', description: 'Minimal dark, no animations', icon: Minus, preview: { bg: '#111116', accent: '#1f1f24' } },
  { id: 'light', label: 'Light', description: 'Light mode for bright environments', icon: Sun, preview: { bg: '#f5f5f5', accent: '#ffffff' } },
]

type Tab = 'themes' | 'profile' | 'about'

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('themes')
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)
  const setShowChangelog = useAppStore(s => s.setShowChangelog)

  // Profile state
  const existingProfile = getUserProfile()
  const [name, setName] = useState(existingProfile?.name ?? '')
  const [email, setEmail] = useState(existingProfile?.email ?? '')
  const [initials, setInitials] = useState(existingProfile?.initials ?? '')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(existingProfile?.imageDataUrl ?? null)
  const [jobTitle, setJobTitle] = useState(existingProfile?.jobTitle ?? '')
  const [company, setCompany] = useState(existingProfile?.company ?? '')

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'themes', label: 'Themes', icon: Palette },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'about', label: 'About', icon: Info },
  ]

  function saveProfile() {
    if (!name.trim()) return
    const profile: UserProfile = {
      name: name.trim(),
      email: email.trim(),
      initials: initials.trim() || name.trim().split(/\s+/).map(w => w[0]?.toUpperCase()).slice(0, 3).join(''),
      imageDataUrl,
      jobTitle: jobTitle.trim(),
      company: company.trim(),
    }
    saveUserProfile(profile)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-white/[0.06] pb-2">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-[#F47B20]/15 text-[#F47B20]' : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Themes tab */}
      {tab === 'themes' && (
        <div className="grid grid-cols-2 gap-3">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                theme === t.id
                  ? 'border-[#F47B20] bg-[#F47B20]/5'
                  : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
              }`}
            >
              {/* Preview swatch */}
              <div className="flex gap-1 mb-2">
                <div className="w-8 h-8 rounded" style={{ backgroundColor: t.preview.bg }} />
                <div className="w-8 h-8 rounded" style={{ backgroundColor: t.preview.accent }} />
                <div className="w-8 h-8 rounded bg-[#F47B20]/30" />
              </div>
              <p className="text-xs font-medium text-white">{t.label}</p>
              <p className="text-[10px] text-white/40">{t.description}</p>
              {theme === t.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#F47B20] flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Profile tab */}
      {tab === 'profile' && (
        <div className="space-y-3">
          {/* Avatar section — same as UserProfileModal Task 5 */}
          {/* Name, Email, Initials, Job Title, Company fields */}
          {/* Save button */}
          <button
            onClick={() => { saveProfile(); onClose() }}
            disabled={!name.trim()}
            className="w-full py-2 bg-[#F47B20] text-white text-sm font-medium rounded-lg hover:bg-[#F47B20]/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      )}

      {/* About tab */}
      {tab === 'about' && (
        <div className="text-center py-4 space-y-3">
          <h2 className="text-xl font-display font-bold text-[#F47B20]">Multitool</h2>
          <div className="inline-block px-3 py-1 bg-white/[0.06] rounded-full text-xs text-white/60">
            v{__APP_VERSION__}
          </div>
          <p className="text-sm text-white/50">
            Professional-grade local toolbox for construction professionals.<br/>
            100% offline, zero server calls.
          </p>
          <p className="text-xs text-white/40">15 tools across 5 categories</p>
          <div className="pt-2 border-t border-white/[0.06] mt-4">
            <p className="text-xs text-white/30">Created by <span className="text-white/60 font-medium">Noah Garrett</span></p>
          </div>
          <button
            onClick={() => { onClose(); setShowChangelog(true) }}
            className="text-xs text-[#F47B20] hover:text-[#F47B20]/80 underline underline-offset-2"
          >
            View Changelog
          </button>
        </div>
      )}
    </Modal>
  )
}
```

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/noahgarrett/codebase/multitool && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/common/SettingsModal.tsx
git commit -m "feat: create SettingsModal with Themes, Profile, and About tabs"
```

---

### Task 7: Add Settings Cog and Avatar to Sidebar Footer

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add imports and settings button**

Add `Settings` icon import from lucide-react. Add `getUserProfile` import.

In the footer section, between the feedback button and the version text, add:

```tsx
{/* Settings button */}
<button
  onClick={() => setShowSettings(true)}
  title={sidebarExpanded ? undefined : 'Settings'}
  className={`
    w-full flex items-center gap-2.5 rounded-md transition-all duration-150
    ${sidebarExpanded ? 'px-2.5 py-2' : 'px-0 py-2 justify-center'}
    text-white/50 hover:text-white hover:bg-white/[0.06]
  `}
>
  {/* Avatar circle if profile pic exists */}
  {profile?.imageDataUrl ? (
    <img src={profile.imageDataUrl} className="w-5 h-5 rounded-full object-cover" alt="" />
  ) : (
    <SettingsIcon size={16} />
  )}
  {sidebarExpanded && (
    <span className="text-xs font-medium truncate">Settings</span>
  )}
</button>
```

Get profile and settings action from store:
```typescript
const setShowSettings = useAppStore((s) => s.setShowSettings)
const profile = getUserProfile()
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: add settings cog and profile avatar to sidebar footer"
```

---

### Task 8: Wire Up SettingsModal in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import and render SettingsModal**

```tsx
import { SettingsModal } from '@/components/common/SettingsModal.tsx'

// Inside App component:
const showSettings = useAppStore((s) => s.showSettings)
const setShowSettings = useAppStore((s) => s.setShowSettings)

// In JSX, after UpdateModal:
<SettingsModal
  isOpen={showSettings}
  onClose={() => setShowSettings(false)}
/>
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire up SettingsModal in App.tsx"
```

---

### Task 9: Update PDF Annotate Comments to Show Profile Data

**Files:**
- Modify: `src/tools/pdf-annotate/ChatBubble.tsx`
- Modify: `src/tools/pdf-annotate/CommentsPanel.tsx`
- Modify: `src/tools/pdf-annotate/markupReport.ts`

- [ ] **Step 1: Update ChatBubble to show avatar**

Find where the author initials circle is rendered. Add profile picture support:

```tsx
// Where initials are shown in comment headers:
{comment.authorImageUrl ? (
  <img src={comment.authorImageUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
) : (
  <div className="w-6 h-6 rounded-full bg-[#F47B20]/20 flex items-center justify-center text-[10px] font-bold text-[#F47B20]">
    {comment.authorInitials}
  </div>
)}
```

Note: When creating comments, the current user's profile image should be stored on the Comment object. Update the comment creation logic to include `authorImageUrl` and `authorTitle` from `getUserProfile()`.

- [ ] **Step 2: Update CommentsPanel to show job title**

Where author name is displayed, add the job title:

```tsx
<span className="text-xs font-medium text-white">{comment.authorName}</span>
{comment.authorTitle && (
  <span className="text-[10px] text-white/40"> · {comment.authorTitle}</span>
)}
```

- [ ] **Step 3: Update markupReport to include extended author info**

In the report header or author fields, include job title and company from the profile.

- [ ] **Step 4: Update FeedbackForm sender badge to show profile photo**

In the sender identity badge section, replace the initials circle with the profile image when available.

- [ ] **Step 5: Commit**

```bash
git add src/tools/pdf-annotate/ChatBubble.tsx src/tools/pdf-annotate/CommentsPanel.tsx src/tools/pdf-annotate/markupReport.ts src/tools/feedback/FeedbackForm.tsx
git commit -m "feat: show profile picture and job title in comments, feedback, and reports"
```

---

### Task 10: Final Build Verification

- [ ] **Step 1: Run full build**

```bash
cd /Users/noahgarrett/codebase/multitool && npm run build
```

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Verify:
1. Settings cog appears in sidebar footer
2. Clicking cog opens Settings modal with 3 tabs
3. Theme picker shows 4 themes, click to switch instantly
4. Theme persists across page reload
5. Blueprint theme shows subtle grid lines
6. Light theme renders correctly (all text readable)
7. ShootingStars only shows on Night Sky theme
8. Profile tab shows all fields including photo upload
9. About tab shows "Created by Noah Garrett" and version
10. Profile picture shows in sidebar footer as avatar
11. PDF Annotate comments show profile picture and job title
12. Feedback form shows profile picture in sender badge

- [ ] **Step 3: Final commit if any fixes needed**
