import { useState, useRef, useCallback } from 'react'
import { Modal } from './Modal.tsx'
import { Tabs } from './Tabs.tsx'
import { useAppStore } from '@/stores/appStore.ts'
import { THEMES } from '@/utils/theme.ts'
import type { ThemeId } from '@/utils/theme.ts'
import {
  loadUserProfile,
  saveUserProfile,
  compressProfilePhoto,
} from '@/utils/userProfile.ts'
import type { UserProfile } from '@/utils/userProfile.ts'
import { Check, Upload, User, Palette, Info } from 'lucide-react'

const SETTINGS_TABS = [
  { id: 'themes', label: 'Themes' },
  { id: 'profile', label: 'Profile' },
  { id: 'about', label: 'About' },
]

export function SettingsModal() {
  const open = useAppStore((s) => s.settingsOpen)
  const closeSettings = useAppStore((s) => s.closeSettings)
  const [activeTab, setActiveTab] = useState('themes')

  return (
    <Modal open={open} onClose={closeSettings} title="Settings" width="lg">
      <Tabs tabs={SETTINGS_TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-5" />
      {activeTab === 'themes' && <ThemesTab />}
      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'about' && <AboutTab />}
    </Modal>
  )
}

/* ── Themes Tab ─────────────────────────────────────────────── */

function ThemesTab() {
  const currentTheme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Palette size={16} className="text-[#F47B20]" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Choose a theme</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((theme) => {
          const isActive = currentTheme === theme.id
          return (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id as ThemeId)}
              className={`
                relative flex flex-col items-start gap-2 p-4 rounded-xl
                border transition-all duration-200 text-left
                ${isActive ? 'border-[#F47B20] bg-[#F47B20]/10' : ''}
              `}
              style={!isActive ? { borderColor: 'var(--border-default)', background: 'color-mix(in srgb, var(--bg-surface) 30%, transparent)' } : undefined}
            >
              {/* Preview swatch */}
              <div className="flex items-center gap-2 w-full">
                <div
                  className="w-8 h-8 rounded-lg border border-white/10 flex-shrink-0"
                  style={{ background: theme.preview.bg }}
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 ml-1.5"
                    style={{ background: theme.preview.accent }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{theme.label}</p>
                </div>
                {isActive && (
                  <div className="w-5 h-5 rounded-full bg-[#F47B20] flex items-center justify-center flex-shrink-0">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-disabled)' }}>{theme.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Profile Tab ────────────────────────────────────────────── */

function ProfileTab() {
  const existing = loadUserProfile()
  const [name, setName] = useState(existing?.name ?? '')
  const [jobTitle, setJobTitle] = useState(existing?.jobTitle ?? '')
  const [company, setCompany] = useState(existing?.company ?? '')
  const [photo, setPhoto] = useState(existing?.photo ?? '')
  const [saved, setSaved] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const addToast = useAppStore((s) => s.addToast)

  const handlePhotoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressProfilePhoto(file)
      setPhoto(compressed)
      setSaved(false)
    } catch {
      addToast({ type: 'error', message: 'Failed to process photo' })
    }
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }, [addToast])

  const handleSave = useCallback(() => {
    const profile: UserProfile = { name: name.trim(), jobTitle: jobTitle.trim(), company: company.trim(), photo }
    saveUserProfile(profile)
    setSaved(true)
    addToast({ type: 'success', message: 'Profile saved' })
    setTimeout(() => setSaved(false), 2000)
  }, [name, jobTitle, company, photo, addToast])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <User size={16} className="text-[#F47B20]" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Your Profile</h3>
      </div>

      {/* Photo */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer hover:border-[#F47B20]/50 transition-colors"
          style={{ background: 'color-mix(in srgb, var(--bg-surface) 50%, transparent)', border: '1px solid var(--border-default)' }}
          onClick={() => fileInputRef.current?.click()}
          title="Upload photo"
        >
          {photo ? (
            <img src={photo} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={24} style={{ color: 'var(--text-disabled)' }} />
          )}
        </div>
        <div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-[#F47B20] hover:text-[#FFAB40] transition-colors"
          >
            <Upload size={12} />
            {photo ? 'Change photo' : 'Upload photo'}
          </button>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-disabled)' }}>Max 128x128, compressed to JPEG</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false) }}
            placeholder="Your name"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[#F47B20]/50 transition-colors"
            style={{ background: 'color-mix(in srgb, var(--bg-surface) 60%, transparent)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Job Title</span>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => { setJobTitle(e.target.value); setSaved(false) }}
            placeholder="e.g. Senior Estimator"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[#F47B20]/50 transition-colors"
            style={{ background: 'color-mix(in srgb, var(--bg-surface) 60%, transparent)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>Company</span>
          <input
            type="text"
            value={company}
            onChange={(e) => { setCompany(e.target.value); setSaved(false) }}
            placeholder="e.g. LotusWorks"
            className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[#F47B20]/50 transition-colors"
            style={{ background: 'color-mix(in srgb, var(--bg-surface) 60%, transparent)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
          />
        </label>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`
          w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
          ${saved
            ? 'bg-green-600 text-white'
            : 'bg-[#F47B20] text-white hover:bg-[#FFAB40]'
          }
        `}
      >
        {saved ? 'Saved!' : 'Save Profile'}
      </button>
    </div>
  )
}

/* ── About Tab ──────────────────────────────────────────────── */

function AboutTab() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Info size={16} className="text-[#F47B20]" />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>About</h3>
      </div>

      <div className="rounded-xl p-5 space-y-4" style={{ background: 'color-mix(in srgb, var(--bg-surface) 30%, transparent)', border: '1px solid var(--border-subtle)' }}>
        {/* Title + version */}
        <div className="text-center">
          <h4 className="text-lg font-display font-bold text-[#F47B20]">LotusWorks Toolkit</h4>
          <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>Version {__APP_VERSION__}</p>
        </div>

        {/* Description */}
        <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          A professional-grade local toolbox for construction professionals.
          All tools run 100% in your browser with zero server calls — your
          documents never leave your machine.
        </p>

        {/* Creator */}
        <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-disabled)' }}>
            Created by <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Noah Garrett</span>
          </p>
        </div>

        {/* Links */}
        <div className="flex justify-center gap-4 pt-1">
          <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
            15 tools &middot; Single HTML file &middot; Offline-ready
          </span>
        </div>
      </div>
    </div>
  )
}
