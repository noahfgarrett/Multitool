import { useState, useEffect, useCallback, useMemo } from 'react'
import { Mail, Users, Plus, X, Trash2, Send, UserPlus } from 'lucide-react'
import { Modal } from '@/components/common/Modal.tsx'
import { Button } from '@/components/common/Button.tsx'
import type { EmailRecipient, EmailGroup } from './types.ts'
import { genId } from './types.ts'
import {
  getRecipients,
  saveRecipients,
  getEmailGroups,
  saveEmailGroups,
} from './emailUtil.ts'

interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
  onSend: (recipients: string[], subject: string, body: string) => void
  fileName: string
}

export function EmailModal({ isOpen, onClose, onSend, fileName }: EmailModalProps) {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([])
  const [groups, setGroups] = useState<EmailGroup[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  // Add contact form
  const [isAddingContact, setIsAddingContact] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newGroupId, setNewGroupId] = useState('')

  // Manage groups
  const [isManagingGroups, setIsManagingGroups] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      setRecipients(getRecipients())
      setGroups(getEmailGroups())
      setSelectedIds(new Set())
      setSubject(`${fileName} — For Review`)
      setBody('Please review the attached document and provide your feedback.')
      setIsAddingContact(false)
      setIsManagingGroups(false)
      setNewName('')
      setNewEmail('')
      setNewGroupId('')
      setNewGroupName('')
      setCollapsedGroups(new Set())
    }
  }, [isOpen, fileName])

  // Derived: recipients grouped
  const groupedRecipientIds = useMemo(() => {
    const assigned = new Set<string>()
    for (const g of groups) {
      for (const rid of g.recipientIds) {
        assigned.add(rid)
      }
    }
    return assigned
  }, [groups])

  const ungroupedRecipients = useMemo(
    () => recipients.filter((r) => !groupedRecipientIds.has(r.id)),
    [recipients, groupedRecipientIds],
  )

  const toggleRecipient = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleGroup = useCallback(
    (group: EmailGroup) => {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        const validIds = group.recipientIds.filter((rid) =>
          recipients.some((r) => r.id === rid),
        )
        const allSelected = validIds.every((rid) => next.has(rid))
        if (allSelected) {
          for (const rid of validIds) next.delete(rid)
        } else {
          for (const rid of validIds) next.add(rid)
        }
        return next
      })
    },
    [recipients],
  )

  const toggleCollapseGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const handleAddContact = useCallback(() => {
    const trimmedName = newName.trim()
    const trimmedEmail = newEmail.trim()
    if (!trimmedName || !trimmedEmail) return

    const contact: EmailRecipient = {
      id: genId(),
      name: trimmedName,
      email: trimmedEmail,
    }

    const updated = [...recipients, contact]
    setRecipients(updated)
    saveRecipients(updated)

    // Assign to group if selected
    if (newGroupId) {
      const updatedGroups = groups.map((g) =>
        g.id === newGroupId
          ? { ...g, recipientIds: [...g.recipientIds, contact.id] }
          : g,
      )
      setGroups(updatedGroups)
      saveEmailGroups(updatedGroups)
    }

    setNewName('')
    setNewEmail('')
    setNewGroupId('')
  }, [newName, newEmail, newGroupId, recipients, groups])

  const handleDeleteContact = useCallback(
    (id: string) => {
      const updated = recipients.filter((r) => r.id !== id)
      setRecipients(updated)
      saveRecipients(updated)

      // Remove from groups
      const updatedGroups = groups.map((g) => ({
        ...g,
        recipientIds: g.recipientIds.filter((rid) => rid !== id),
      }))
      setGroups(updatedGroups)
      saveEmailGroups(updatedGroups)

      // Deselect
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    [recipients, groups],
  )

  const handleCreateGroup = useCallback(() => {
    const trimmed = newGroupName.trim()
    if (!trimmed) return

    const group: EmailGroup = {
      id: genId(),
      name: trimmed,
      recipientIds: [],
    }

    const updated = [...groups, group]
    setGroups(updated)
    saveEmailGroups(updated)
    setNewGroupName('')
  }, [newGroupName, groups])

  const handleDeleteGroup = useCallback(
    (id: string) => {
      const updated = groups.filter((g) => g.id !== id)
      setGroups(updated)
      saveEmailGroups(updated)
    },
    [groups],
  )

  const handleSend = useCallback(() => {
    const emails = recipients
      .filter((r) => selectedIds.has(r.id))
      .map((r) => r.email)
    if (emails.length === 0) return
    onSend(emails, subject, body)
    onClose()
  }, [recipients, selectedIds, subject, body, onSend, onClose])

  const selectedCount = selectedIds.size

  const isGroupAllSelected = useCallback(
    (group: EmailGroup): boolean => {
      const validIds = group.recipientIds.filter((rid) =>
        recipients.some((r) => r.id === rid),
      )
      return validIds.length > 0 && validIds.every((rid) => selectedIds.has(rid))
    },
    [recipients, selectedIds],
  )

  const isGroupPartiallySelected = useCallback(
    (group: EmailGroup): boolean => {
      const validIds = group.recipientIds.filter((rid) =>
        recipients.some((r) => r.id === rid),
      )
      const someSelected = validIds.some((rid) => selectedIds.has(rid))
      const allSelected = validIds.length > 0 && validIds.every((rid) => selectedIds.has(rid))
      return someSelected && !allSelected
    },
    [recipients, selectedIds],
  )

  return (
    <Modal open={isOpen} onClose={onClose} title="Send Annotated PDF" width="lg">
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        {/* Recipient Selection */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Mail size={16} className="text-[#14B8A6]" />
            <span className="text-sm font-medium text-white">Recipients</span>
            {selectedCount > 0 && (
              <span className="text-xs text-white/50">({selectedCount} selected)</span>
            )}
          </div>

          <div className="border border-white/[0.1] rounded-lg bg-[#1a1a2e] max-h-48 overflow-y-auto">
            {recipients.length === 0 && (
              <div className="px-3 py-4 text-sm text-white/40 text-center">
                No contacts yet. Add one below.
              </div>
            )}

            {/* Grouped recipients */}
            {groups.map((group) => {
              const groupRecipients = recipients.filter((r) =>
                group.recipientIds.includes(r.id),
              )
              if (groupRecipients.length === 0) return null
              const isCollapsed = collapsedGroups.has(group.id)

              return (
                <div key={group.id}>
                  <div
                    className="flex items-center gap-2 px-3 py-2 bg-white/[0.04] border-b border-white/[0.06] cursor-pointer hover:bg-white/[0.06]"
                    onClick={() => toggleCollapseGroup(group.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isGroupAllSelected(group)}
                      ref={(el) => {
                        if (el) el.indeterminate = isGroupPartiallySelected(group)
                      }}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleGroup(group)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-[#14B8A6] rounded"
                    />
                    <Users size={14} className="text-[#14B8A6]" />
                    <span className="text-sm font-medium text-white/80">{group.name}</span>
                    <span className="text-xs text-white/40">({groupRecipients.length})</span>
                    <span className="ml-auto text-xs text-white/30">
                      {isCollapsed ? '\u25B6' : '\u25BC'}
                    </span>
                  </div>
                  {!isCollapsed &&
                    groupRecipients.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-center gap-2 px-3 py-1.5 pl-8 hover:bg-white/[0.04] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleRecipient(r.id)}
                          className="accent-[#14B8A6] rounded"
                        />
                        <span className="text-sm text-white/80">{r.name}</span>
                        <span className="text-xs text-white/40">{r.email}</span>
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDeleteContact(r.id)
                          }}
                          className="ml-auto p-1 text-white/20 hover:text-red-400 transition-colors"
                          title="Remove contact"
                        >
                          <Trash2 size={12} />
                        </button>
                      </label>
                    ))}
                </div>
              )
            })}

            {/* Ungrouped recipients */}
            {ungroupedRecipients.length > 0 && groups.length > 0 && (
              <div className="px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.06]">
                <span className="text-xs text-white/40">Ungrouped</span>
              </div>
            )}
            {ungroupedRecipients.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.04] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleRecipient(r.id)}
                  className="accent-[#14B8A6] rounded"
                />
                <span className="text-sm text-white/80">{r.name}</span>
                <span className="text-xs text-white/40">{r.email}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDeleteContact(r.id)
                  }}
                  className="ml-auto p-1 text-white/20 hover:text-red-400 transition-colors"
                  title="Remove contact"
                >
                  <Trash2 size={12} />
                </button>
              </label>
            ))}
          </div>
        </div>

        {/* Add Contact */}
        <div>
          <button
            onClick={() => setIsAddingContact((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-[#14B8A6] hover:text-[#14B8A6]/80 transition-colors"
          >
            <UserPlus size={14} />
            {isAddingContact ? 'Hide' : 'Add Contact'}
          </button>

          {isAddingContact && (
            <div className="mt-2 flex flex-col gap-2 p-3 border border-white/[0.1] rounded-lg bg-[#1a1a2e]">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 h-8 px-2 text-sm bg-white/[0.06] border border-white/[0.1] rounded-md text-white placeholder:text-white/30 focus:outline-none focus:border-[#14B8A6]/50"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1 h-8 px-2 text-sm bg-white/[0.06] border border-white/[0.1] rounded-md text-white placeholder:text-white/30 focus:outline-none focus:border-[#14B8A6]/50"
                />
              </div>
              <div className="flex gap-2 items-center">
                <select
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  className="flex-1 h-8 px-2 text-sm bg-white/[0.06] border border-white/[0.1] rounded-md text-white focus:outline-none focus:border-[#14B8A6]/50"
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={handleAddContact}
                  disabled={!newName.trim() || !newEmail.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Manage Groups */}
        <div>
          <button
            onClick={() => setIsManagingGroups((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            <Users size={14} />
            {isManagingGroups ? 'Hide Groups' : 'Manage Groups'}
          </button>

          {isManagingGroups && (
            <div className="mt-2 p-3 border border-white/[0.1] rounded-lg bg-[#1a1a2e]">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateGroup()
                  }}
                  className="flex-1 h-8 px-2 text-sm bg-white/[0.06] border border-white/[0.1] rounded-md text-white placeholder:text-white/30 focus:outline-none focus:border-[#14B8A6]/50"
                />
                <Button
                  size="sm"
                  icon={<Plus size={14} />}
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                >
                  Create
                </Button>
              </div>
              {groups.length === 0 && (
                <div className="text-xs text-white/30 text-center py-1">No groups yet.</div>
              )}
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between py-1 px-1"
                >
                  <span className="text-sm text-white/70">{g.name}</span>
                  <button
                    onClick={() => handleDeleteGroup(g.id)}
                    className="p-1 text-white/20 hover:text-red-400 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-9 px-3 text-sm bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#14B8A6]/50"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-white/[0.06] border border-white/[0.1] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#14B8A6]/50 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
          <Button variant="secondary" onClick={onClose} icon={<X size={14} />}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={selectedCount === 0}
            icon={<Send size={14} />}
          >
            Send ({selectedCount})
          </Button>
        </div>
      </div>
    </Modal>
  )
}
