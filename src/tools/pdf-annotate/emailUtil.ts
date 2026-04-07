import type { EmailRecipient, EmailGroup } from './types.ts'

const RECIPIENTS_KEY = 'mt-email-recipients'
const GROUPS_KEY = 'mt-email-groups'

/** Load saved email recipients from localStorage */
export function getRecipients(): EmailRecipient[] {
  try {
    const raw = localStorage.getItem(RECIPIENTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as EmailRecipient[]
  } catch {
    return []
  }
}

/** Save email recipients to localStorage */
export function saveRecipients(recipients: EmailRecipient[]): void {
  localStorage.setItem(RECIPIENTS_KEY, JSON.stringify(recipients))
}

/** Load saved email groups from localStorage */
export function getEmailGroups(): EmailGroup[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as EmailGroup[]
  } catch {
    return []
  }
}

/** Save email groups to localStorage */
export function saveEmailGroups(groups: EmailGroup[]): void {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
}

/** Auto-download a Blob as a file */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Attempt to open Outlook desktop via ms-outlook protocol handler.
 * Pre-fills recipients, subject, and body. Cannot attach files via protocol handler.
 * Returns true if the protocol handler was invoked (no guarantee it actually opened).
 */
export function sendViaOutlook(
  recipients: string[],
  subject: string,
  body: string,
  _pdfBlob: Blob,
  _fileName: string,
): boolean {
  try {
    const to = recipients.join(';')
    const url = `ms-outlook://compose?to=${encodeURIComponent(to)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = url
    return true
  } catch {
    return false
  }
}

/**
 * Fallback email send: auto-downloads the PDF and opens a mailto: link.
 * The user manually attaches the downloaded file to the email.
 */
export function sendViaMailto(
  recipients: string[],
  subject: string,
  body: string,
  pdfBlob: Blob,
  fileName: string,
): void {
  downloadBlob(pdfBlob, fileName)
  const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = mailto
}

/**
 * Send an annotated PDF to recipients.
 * Tries Outlook protocol handler first, always falls back to mailto + download
 * since protocol handler support cannot be reliably detected.
 */
export function sendAnnotatedPDF(
  recipients: string[],
  subject: string,
  body: string,
  pdfBlob: Blob,
  fileName: string,
): void {
  // Always download the PDF so the user has it ready to attach
  downloadBlob(pdfBlob, fileName)

  // Try Outlook first
  sendViaOutlook(recipients, subject, body, pdfBlob, fileName)

  // Always open mailto as fallback since we can't detect if Outlook opened
  const mailto = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = mailto
}
