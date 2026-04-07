import { useState, useCallback, useEffect } from 'react'
import { User } from 'lucide-react'
import { Modal } from '@/components/common/Modal.tsx'
import { Button } from '@/components/common/Button.tsx'
import { generateInitials } from '@/utils/userProfile.ts'
import type { UserProfile } from '@/utils/userProfile.ts'

interface UserProfileModalProps {
  isOpen: boolean
  onClose: (profile: UserProfile) => void
  initialProfile?: UserProfile | null
}

export function UserProfileModal({ isOpen, onClose, initialProfile }: UserProfileModalProps) {
  const isEditing = initialProfile != null

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [initials, setInitials] = useState('')
  const [hasManualInitials, setHasManualInitials] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setName(initialProfile?.name ?? '')
      setEmail(initialProfile?.email ?? '')
      setInitials(initialProfile?.initials ?? '')
      setHasManualInitials(false)
    }
  }, [isOpen, initialProfile])

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setName(value)
    if (!hasManualInitials) {
      setInitials(generateInitials(value))
    }
  }, [hasManualInitials])

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }, [])

  const handleInitialsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().slice(0, 3)
    setInitials(value)
    setHasManualInitials(value.length > 0)
  }, [])

  const handleSave = useCallback(() => {
    const trimmedName = name.trim()
    if (trimmedName.length === 0) return

    const profile: UserProfile = {
      name: trimmedName,
      email: email.trim(),
      initials: initials || generateInitials(trimmedName),
      jobTitle: initialProfile?.jobTitle ?? '',
      company: initialProfile?.company ?? '',
      photo: initialProfile?.photo ?? '',
    }
    onClose(profile)
  }, [name, email, initials, onClose])

  const handleCancel = useCallback(() => {
    if (initialProfile) {
      onClose(initialProfile)
    }
  }, [initialProfile, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && name.trim().length > 0) {
        handleSave()
      }
    },
    [handleSave, name],
  )

  // Prevent the base Modal's Escape from closing without a profile on first launch
  const handleModalClose = useCallback(() => {
    if (isEditing && initialProfile) {
      onClose(initialProfile)
    }
    // If not editing (first launch), do nothing — user must save
  }, [isEditing, initialProfile, onClose])

  const isValid = name.trim().length > 0

  return (
    <Modal
      open={isOpen}
      onClose={handleModalClose}
      title={isEditing ? 'Edit Profile' : 'Set Up Your Profile'}
      width="sm"
    >
      <div className="space-y-4" onKeyDown={handleKeyDown}>
        {/* Avatar preview */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-[#14B8A6]/20 border-2 border-[#14B8A6]/40 flex items-center justify-center">
            {initials ? (
              <span className="text-xl font-bold text-[#14B8A6]">{initials}</span>
            ) : (
              <User size={28} className="text-[#14B8A6]/60" />
            )}
          </div>
        </div>

        {/* Name field */}
        <div className="space-y-1.5">
          <label htmlFor="profile-name" className="block text-xs font-medium text-white/60">
            Name <span className="text-[#14B8A6]">*</span>
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Your full name"
            autoFocus
            className="w-full h-9 px-3 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white placeholder-white/30 outline-none focus:border-[#14B8A6]/50 focus:ring-1 focus:ring-[#14B8A6]/30 transition-colors"
          />
        </div>

        {/* Email field */}
        <div className="space-y-1.5">
          <label htmlFor="profile-email" className="block text-xs font-medium text-white/60">
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="your.email@company.com"
            className="w-full h-9 px-3 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white placeholder-white/30 outline-none focus:border-[#14B8A6]/50 focus:ring-1 focus:ring-[#14B8A6]/30 transition-colors"
          />
        </div>

        {/* Initials field */}
        <div className="space-y-1.5">
          <label htmlFor="profile-initials" className="block text-xs font-medium text-white/60">
            Initials
          </label>
          <input
            id="profile-initials"
            type="text"
            value={initials}
            onChange={handleInitialsChange}
            placeholder="Auto-generated from name"
            maxLength={3}
            className="w-20 h-9 px-3 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white text-center font-semibold tracking-wider placeholder-white/30 outline-none focus:border-[#14B8A6]/50 focus:ring-1 focus:ring-[#14B8A6]/30 transition-colors"
          />
          <p className="text-[11px] text-white/30">Auto-filled from your name. Edit to customize.</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end pt-1">
          {isEditing && (
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!isValid}>
            {isEditing ? 'Save Changes' : 'Get Started'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
