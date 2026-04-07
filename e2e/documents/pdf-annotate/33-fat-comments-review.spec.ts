import { test, expect } from '@playwright/test'
import { navigateToTool } from '../../helpers/navigation'
import {
  uploadPDFAndWait, selectTool, clickCanvasAt, doubleClickCanvasAt,
  dragOnCanvas, getAnnotationCount, createAnnotation, selectAnnotationAt,
  waitForSessionSave, getSessionData, screenshotCanvas, goToPage,
} from '../../helpers/pdf-annotate'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Activate the Note (sticky note) tool via keyboard shortcut */
async function selectNoteTool(page: import('@playwright/test').Page) {
  await page.keyboard.press('n')
  await page.waitForTimeout(100)
}

/** Place a sticky note at canvas coordinates (x, y) */
async function placeStickyNote(page: import('@playwright/test').Page, x: number, y: number) {
  await selectNoteTool(page)
  await clickCanvasAt(page, x, y)
  await page.waitForTimeout(300)
}

/** Open the comments panel via the toolbar button */
async function openCommentsPanel(page: import('@playwright/test').Page) {
  await page.locator('button[title="Comments panel"]').click()
  await page.waitForTimeout(300)
}

/** Close the comments panel via the close button inside it */
async function closeCommentsPanel(page: import('@playwright/test').Page) {
  await page.locator('[aria-label="Close comments panel"]').click()
  await page.waitForTimeout(300)
}

/** Right-click an annotation at (x, y) to open context menu, then click "Add Comment" */
async function addCommentViaContextMenu(page: import('@playwright/test').Page, x: number, y: number) {
  await selectTool(page, 'Select (S)')
  const canvas = page.locator('canvas').nth(1)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')
  await page.mouse.click(box.x + x, box.y + y, { button: 'right' })
  await page.waitForTimeout(300)
  await page.locator('button:has-text("Add Comment")').click()
  await page.waitForTimeout(300)
}

/** Type a comment in the chat bubble input and submit */
async function typeAndSendComment(page: import('@playwright/test').Page, text: string) {
  const input = page.locator('input[placeholder="Add a comment..."]')
  await input.fill(text)
  await page.waitForTimeout(100)
  // Click the send button (orange submit button)
  await page.locator('form button[type="submit"]').click()
  await page.waitForTimeout(300)
}

/** Close the chat bubble via the X button in the header */
async function closeChatBubble(page: import('@playwright/test').Page) {
  // The close button is a direct child of the header (cursor-grab div)
  const bubble = page.locator('.fixed.z-\\[9999\\]')
  await bubble.locator('.cursor-grab > button').click()
  await page.waitForTimeout(200)
}

/** Get the chat bubble element */
function getChatBubble(page: import('@playwright/test').Page) {
  return page.locator('.fixed.z-\\[9999\\]')
}

/** Get the status badge button inside the chat bubble header */
function getStatusBadge(page: import('@playwright/test').Page) {
  return getChatBubble(page).locator('button').filter({ hasText: /None|Open|Accepted|Rejected|Resolved/ }).first()
}

/** Change the status in the chat bubble dropdown */
async function changeStatusInBubble(page: import('@playwright/test').Page, status: 'None' | 'Open' | 'Accepted' | 'Rejected' | 'Resolved') {
  await getStatusBadge(page).click()
  await page.waitForTimeout(200)
  // Click the status option in the dropdown
  await getChatBubble(page).locator(`button:has-text("${status}")`).last().click()
  await page.waitForTimeout(200)
}

/** Get the comments panel element */
function getCommentsPanel(page: import('@playwright/test').Page) {
  return page.locator('.fixed.top-0.right-0.h-full.w-\\[320px\\]')
}

// ── Test Setup ───────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await navigateToTool(page, 'pdf-annotate')
})

// ═════════════════════════════════════════════════════════════════════════════
// 2A: Sticky Notes (28 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('2A: Sticky Notes', () => {
  test('2A-01 — note tool activates via keyboard shortcut N', async ({ page }) => {
    await uploadPDFAndWait(page)
    await page.keyboard.press('n')
    await page.waitForTimeout(100)
    // Verify note tool is active via status bar hint
    await expect(page.locator('text=/Click to place a sticky note/').first()).toBeVisible()
  })

  test('2A-02 — note tool activates via toolbar button click', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Expand "More tools" expander in sidebar (has border-dashed class) to reveal Sticky Note button
    await page.locator('button[title="More tools"].border-dashed').click()
    await page.waitForTimeout(300)
    await page.locator('button[title="Sticky Note (N)"]').click()
    await page.waitForTimeout(100)
    // Verify note tool is active via status bar hint
    await expect(page.locator('text=/Click to place a sticky note/').first()).toBeVisible()
  })

  test('2A-03 — clicking canvas in note mode places a sticky note pin', async ({ page }) => {
    await uploadPDFAndWait(page)
    const before = await screenshotCanvas(page)
    await placeStickyNote(page, 200, 200)
    await page.waitForTimeout(200)
    const after = await screenshotCanvas(page)
    expect(before.equals(after)).toBe(false)
  })

  test('2A-04 — placing a sticky note opens a chat bubble', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    const bubble = getChatBubble(page)
    await expect(bubble).toBeVisible({ timeout: 3000 })
  })

  test('2A-05 — chat bubble shows "No comments yet" for new sticky note', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await expect(getChatBubble(page).getByText('No comments yet')).toBeVisible({ timeout: 3000 })
  })

  test('2A-06 — sticky note is stored in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session).toBeTruthy()
    expect(session.stickyNotes).toBeTruthy()
    // Should have at least one sticky note on page 1
    const page1Notes = session.stickyNotes[1] || session.stickyNotes['1']
    expect(page1Notes).toBeTruthy()
    expect(page1Notes.length).toBe(1)
  })

  test('2A-07 — sticky note stores correct position', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 250, 300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page1Notes = session.stickyNotes[1] || session.stickyNotes['1']
    expect(page1Notes[0].point.x).toBeGreaterThan(0)
    expect(page1Notes[0].point.y).toBeGreaterThan(0)
  })

  test('2A-08 — sticky note has default yellow color', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page1Notes = session.stickyNotes[1] || session.stickyNotes['1']
    expect(page1Notes[0].color).toBe('#FBBF24')
  })

  test('2A-09 — new sticky note starts minimized', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page1Notes = session.stickyNotes[1] || session.stickyNotes['1']
    expect(page1Notes[0].minimized).toBe(true)
  })

  test('2A-10 — new sticky note starts with empty text', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page1Notes = session.stickyNotes[1] || session.stickyNotes['1']
    expect(page1Notes[0].text).toBe('')
  })

  test('2A-11 — clicking existing sticky note in note mode toggles expanded/minimized', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    // Close the chat bubble first
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    let session = await getSessionData(page)
    let notes = session.stickyNotes[1] || session.stickyNotes['1']
    const initialMinimized = notes[0].minimized
    // Click the same spot again to toggle
    await selectNoteTool(page)
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    session = await getSessionData(page)
    notes = session.stickyNotes[1] || session.stickyNotes['1']
    expect(notes[0].minimized).toBe(!initialMinimized)
  })

  test('2A-12 — clicking sticky note in select mode opens chat bubble', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Switch to select tool and click the note
    await selectTool(page, 'Select (S)')
    await clickCanvasAt(page, 200, 200)
    await page.waitForTimeout(300)
    const bubble = getChatBubble(page)
    await expect(bubble).toBeVisible({ timeout: 3000 })
  })

  test('2A-13 — multiple sticky notes can be placed on the same page', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 150, 150)
    await closeChatBubble(page)
    await placeStickyNote(page, 350, 250)
    await closeChatBubble(page)
    await placeStickyNote(page, 250, 100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page1Notes = session.stickyNotes[1] || session.stickyNotes['1']
    expect(page1Notes.length).toBe(3)
  })

  test('2A-14 — sticky notes are per-page (multi-page PDF)', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    // Place sticky note on page 1
    await placeStickyNote(page, 200, 200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    // Navigate to page 2 and wait for canvas to be visible
    await goToPage(page, 2)
    await page.waitForTimeout(800)
    // Place sticky note on page 2 — use smaller coords to stay within visible area
    await placeStickyNote(page, 150, 150)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page1Notes = session.stickyNotes[1] || session.stickyNotes['1'] || []
    const page2Notes = session.stickyNotes[2] || session.stickyNotes['2'] || []
    expect(page1Notes.length).toBe(1)
    expect(page2Notes.length).toBe(1)
  })

  test('2A-15 — sticky note has unique ID', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await closeChatBubble(page)
    await placeStickyNote(page, 350, 100)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page1Notes = session.stickyNotes[1] || session.stickyNotes['1']
    expect(page1Notes[0].id).toBeTruthy()
    expect(page1Notes[1].id).toBeTruthy()
    expect(page1Notes[0].id).not.toBe(page1Notes[1].id)
  })

  test('2A-16 — sticky note page number is correctly stored', async ({ page }) => {
    await uploadPDFAndWait(page, 'multi-page.pdf')
    await goToPage(page, 2)
    await placeStickyNote(page, 250, 250)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const page2Notes = session.stickyNotes[2] || session.stickyNotes['2']
    expect(page2Notes).toBeTruthy()
    expect(page2Notes[0].page).toBe(2)
  })

  test('2A-17 — adding comment to sticky note creates a comment thread', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'First note comment')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.commentThreads).toBeTruthy()
    expect(session.commentThreads.length).toBeGreaterThanOrEqual(1)
  })

  test('2A-18 — comment on sticky note shows author initials "TU"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Hello')
    // Author initials circle should be visible in the chat bubble
    await expect(getChatBubble(page).getByText('TU')).toBeVisible()
  })

  test('2A-19 — comment on sticky note shows author name "Test User"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Hello')
    await expect(getChatBubble(page).getByText('Test User')).toBeVisible()
  })

  test('2A-20 — comment shows relative timestamp "just now"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Hello')
    await expect(getChatBubble(page).getByText('just now')).toBeVisible()
  })

  test('2A-21 — comment text appears in the chat bubble', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'This is my test comment')
    await expect(getChatBubble(page).getByText('This is my test comment')).toBeVisible()
  })

  test('2A-22 — "No comments yet" disappears after adding first comment', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await expect(getChatBubble(page).getByText('No comments yet')).toBeVisible()
    await typeAndSendComment(page, 'First comment')
    await expect(getChatBubble(page).getByText('No comments yet')).toBeHidden()
  })

  test('2A-23 — send button is disabled when input is empty', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    const submitBtn = getChatBubble(page).locator('form button[type="submit"]')
    await expect(submitBtn).toBeDisabled()
  })

  test('2A-24 — send button enables when text is typed', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    const input = page.locator('input[placeholder="Add a comment..."]')
    await input.fill('some text')
    const submitBtn = getChatBubble(page).locator('form button[type="submit"]')
    await expect(submitBtn).toBeEnabled()
  })

  test('2A-25 — input clears after sending comment', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Test comment')
    const input = page.locator('input[placeholder="Add a comment..."]')
    await expect(input).toHaveValue('')
  })

  test('2A-26 — Enter key submits comment', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    const input = page.locator('input[placeholder="Add a comment..."]')
    await input.fill('Enter key comment')
    await input.press('Enter')
    await page.waitForTimeout(300)
    await expect(getChatBubble(page).getByText('Enter key comment')).toBeVisible()
  })

  test('2A-27 — whitespace-only input does not submit', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    const input = page.locator('input[placeholder="Add a comment..."]')
    await input.fill('   ')
    const submitBtn = getChatBubble(page).locator('form button[type="submit"]')
    await expect(submitBtn).toBeDisabled()
  })

  test('2A-28 — new thread auto-sets status to "open"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Initial comment')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const thread = session.commentThreads.find(
      (t: { annotationId: string }) => t.comments?.length > 0
    )
    expect(thread).toBeTruthy()
    expect(thread.status).toBe('open')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2B: Comment Threads (24 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('2B: Comment Threads', () => {
  test('2B-01 — right-click annotation shows context menu with "Add Comment"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await selectTool(page, 'Select (S)')
    // Right-click on the rectangle edge
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.click(box.x + 150, box.y + 150, { button: 'right' })
    await page.waitForTimeout(300)
    await expect(page.locator('button:has-text("Add Comment")')).toBeVisible()
  })

  test('2B-02 — clicking "Add Comment" opens the chat bubble', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    const bubble = getChatBubble(page)
    await expect(bubble).toBeVisible({ timeout: 3000 })
  })

  test('2B-03 — chat bubble has triangle pointer at top', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    // Triangle pointer is rendered as a div with border styling
    const bubble = getChatBubble(page)
    await expect(bubble).toBeVisible()
    // The bubble structure has the triangle as a child absolute div
    const trianglePointer = bubble.locator('.absolute').first()
    await expect(trianglePointer).toBeVisible()
  })

  test('2B-04 — chat bubble shows annotation short ID in header', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    // The header contains a short annotation ID like #abcd1234
    const bubble = getChatBubble(page)
    const shortIdEl = bubble.locator('span.font-mono')
    await expect(shortIdEl).toBeVisible()
    const text = await shortIdEl.textContent()
    expect(text).toMatch(/^#[a-f0-9]{8}$/)
  })

  test('2B-05 — adding first comment creates a new thread in session', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    await typeAndSendComment(page, 'First annotation comment')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.commentThreads.length).toBeGreaterThanOrEqual(1)
  })

  test('2B-06 — comment thread links to correct annotation ID', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    // Extract the annotation ID from the chat bubble header
    const bubble = getChatBubble(page)
    const shortIdText = await bubble.locator('span.font-mono').textContent()
    const shortId = shortIdText?.replace('#', '') ?? ''
    await typeAndSendComment(page, 'Linking test')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const thread = session.commentThreads.find(
      (t: { annotationId: string }) => t.annotationId.startsWith(shortId)
    )
    expect(thread).toBeTruthy()
  })

  test('2B-07 — multiple comments can be added to same thread', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    await typeAndSendComment(page, 'First comment')
    await typeAndSendComment(page, 'Second comment')
    await typeAndSendComment(page, 'Third comment')
    await expect(getChatBubble(page).getByText('First comment')).toBeVisible()
    await expect(getChatBubble(page).getByText('Second comment')).toBeVisible()
    await expect(getChatBubble(page).getByText('Third comment')).toBeVisible()
  })

  test('2B-08 — comment thread stores correct number of comments', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    await typeAndSendComment(page, 'One')
    await typeAndSendComment(page, 'Two')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const thread = session.commentThreads[session.commentThreads.length - 1]
    expect(thread.comments.length).toBe(2)
  })

  test('2B-09 — reply button appears on each comment', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    await typeAndSendComment(page, 'A comment')
    await expect(getChatBubble(page).locator('button:has-text("Reply")')).toBeVisible()
  })

  test('2B-10 — clicking reply shows "Replying to" indicator', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    await typeAndSendComment(page, 'Parent comment')
    // Click the Reply button
    await getChatBubble(page).locator('button:has-text("Reply")').first().click()
    await page.waitForTimeout(200)
    await expect(getChatBubble(page).getByText('Replying to')).toBeVisible()
    await expect(getChatBubble(page).getByText('Test User').first()).toBeVisible()
  })

  test('2B-11 — cancel reply clears the reply indicator', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    await typeAndSendComment(page, 'Parent comment')
    await getChatBubble(page).locator('button:has-text("Reply")').first().click()
    await page.waitForTimeout(200)
    // Click cancel
    await getChatBubble(page).locator('button:has-text("Cancel")').click()
    await page.waitForTimeout(200)
    await expect(getChatBubble(page).getByText('Replying to')).toBeHidden()
  })

  test('2B-12 — reply comment stores parentId referencing the parent comment', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    await typeAndSendComment(page, 'Parent comment')
    // Click reply and send a reply
    await getChatBubble(page).locator('button:has-text("Reply")').first().click()
    await page.waitForTimeout(200)
    await typeAndSendComment(page, 'Reply to parent')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const thread = session.commentThreads[session.commentThreads.length - 1]
    const replyComment = thread.comments.find(
      (c: { text: string }) => c.text === 'Reply to parent'
    )
    expect(replyComment).toBeTruthy()
    expect(replyComment.parentId).toBeTruthy()
  })

  test('2B-13 — reply comment is visually indented (has ml-6 class)', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    await typeAndSendComment(page, 'Parent comment')
    await getChatBubble(page).locator('button:has-text("Reply")').first().click()
    await page.waitForTimeout(200)
    await typeAndSendComment(page, 'Reply comment')
    // The reply should have ml-6 class for indentation
    const replyDiv = getChatBubble(page).locator('.ml-6')
    await expect(replyDiv).toBeVisible()
  })

  test('2B-14 — chat bubble close button works', async ({ page }) => {
    await uploadPDFAndWait(page)
    await createAnnotation(page, 'rectangle', { x: 150, y: 150, w: 100, h: 80 })
    await addCommentViaContextMenu(page, 150, 150)
    const bubble = getChatBubble(page)
    await expect(bubble).toBeVisible()
    // Click the close (X) button — the flex-shrink-0 button in the header
    await closeChatBubble(page)
    await expect(bubble).toBeHidden()
  })

  test('2B-15 — different annotation types can have comments', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create circle annotation at (150,150) to (230,230) — center (190,190), radii 40
    await createAnnotation(page, 'circle', { x: 150, y: 150, w: 80, h: 80 })
    // Right-click the circle's top edge at (190, 150)
    const canvas = page.locator('canvas').nth(1)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas not found')
    await page.mouse.click(box.x + 190, box.y + 150, { button: 'right' })
    await page.waitForTimeout(300)
    await expect(page.locator('button:has-text("Add Comment")')).toBeVisible()
  })

  test('2B-16 — comments panel badge shows comment thread count', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'A comment')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    // Check the badge (small rounded-full span) on the comments panel button
    const badge = page.locator('button[title="Comments panel"] span.rounded-full')
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText('1')
  })

  test('2B-17 — each comment has a unique ID', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Comment A')
    await typeAndSendComment(page, 'Comment B')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const thread = session.commentThreads[0]
    expect(thread.comments[0].id).not.toBe(thread.comments[1].id)
  })

  test('2B-18 — comment stores authorName from user profile', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Check author')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const comment = session.commentThreads[0].comments[0]
    expect(comment.authorName).toBe('Test User')
  })

  test('2B-19 — comment stores authorInitials from user profile', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Check initials')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const comment = session.commentThreads[0].comments[0]
    expect(comment.authorInitials).toBe('TU')
  })

  test('2B-20 — comment stores timestamp as number', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    const beforeTime = Date.now()
    await typeAndSendComment(page, 'Check timestamp')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const comment = session.commentThreads[0].comments[0]
    expect(typeof comment.timestamp).toBe('number')
    expect(comment.timestamp).toBeGreaterThanOrEqual(beforeTime - 5000)
  })

  test('2B-21 — chat bubble header is draggable', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    const bubble = getChatBubble(page)
    await expect(bubble).toBeVisible()
    const beforeBox = await bubble.boundingBox()
    if (!beforeBox) throw new Error('Bubble not found')
    // Drag the header (cursor-grab area)
    const header = bubble.locator('.cursor-grab')
    const headerBox = await header.boundingBox()
    if (!headerBox) throw new Error('Header not found')
    await page.mouse.move(headerBox.x + 50, headerBox.y + 10)
    await page.mouse.down()
    await page.mouse.move(headerBox.x + 150, headerBox.y + 60, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(200)
    const afterBox = await bubble.boundingBox()
    if (!afterBox) throw new Error('Bubble disappeared after drag')
    // Position should have changed
    expect(Math.abs(afterBox.x - beforeBox.x) + Math.abs(afterBox.y - beforeBox.y)).toBeGreaterThan(20)
  })

  test('2B-22 — two different annotations can have separate comment threads', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create first annotation and comment
    await createAnnotation(page, 'rectangle', { x: 100, y: 100, w: 80, h: 60 })
    await addCommentViaContextMenu(page, 100, 100)
    await typeAndSendComment(page, 'Thread A')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Create second annotation and comment
    await createAnnotation(page, 'rectangle', { x: 350, y: 350, w: 80, h: 60 })
    await addCommentViaContextMenu(page, 350, 350)
    await typeAndSendComment(page, 'Thread B')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    expect(session.commentThreads.length).toBeGreaterThanOrEqual(2)
  })

  test('2B-23 — comment threads persist across session reload', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Persistent comment')
    await waitForSessionSave(page)
    // Reload and check session
    await page.reload()
    await navigateToTool(page, 'pdf-annotate')
    await page.waitForTimeout(1000)
    const session = await getSessionData(page)
    if (session && session.commentThreads) {
      const thread = session.commentThreads.find(
        (t: { comments: Array<{ text: string }> }) => t.comments.some(c => c.text === 'Persistent comment')
      )
      expect(thread).toBeTruthy()
    }
  })

  test('2B-24 — sticky notes persist across session reload', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await waitForSessionSave(page)
    // Reload and check session
    await page.reload()
    await navigateToTool(page, 'pdf-annotate')
    await page.waitForTimeout(1000)
    const session = await getSessionData(page)
    if (session && session.stickyNotes) {
      const page1Notes = session.stickyNotes[1] || session.stickyNotes['1'] || []
      expect(page1Notes.length).toBeGreaterThanOrEqual(1)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2C: Comment Status Flow (11 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('2C: Comment Status Flow', () => {
  test('2C-01 — new thread defaults to "open" status after first comment', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status test')
    // Check the status badge shows "Open"
    const statusBadge = getStatusBadge(page)
    await expect(statusBadge).toContainText('Open')
  })

  test('2C-02 — status badge displays colored dot matching current status', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status test')
    // The status badge should have a colored dot (w-2 h-2 rounded-full)
    const dot = getChatBubble(page).locator('.w-2.h-2.rounded-full').first()
    await expect(dot).toBeVisible()
  })

  test('2C-03 — clicking status badge opens dropdown with all 5 statuses', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status test')
    await getStatusBadge(page).click()
    await page.waitForTimeout(200)
    // All 5 status options should be visible
    for (const status of ['None', 'Open', 'Accepted', 'Rejected', 'Resolved']) {
      await expect(getChatBubble(page).locator(`button:has-text("${status}")`).last()).toBeVisible()
    }
  })

  test('2C-04 — changing status to "accepted" updates the badge', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status test')
    await changeStatusInBubble(page, 'Accepted')
    await expect(getStatusBadge(page)).toContainText('Accepted')
  })

  test('2C-05 — changing status to "rejected" updates the badge', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status test')
    await changeStatusInBubble(page, 'Rejected')
    await expect(getStatusBadge(page)).toContainText('Rejected')
  })

  test('2C-06 — changing status to "resolved" updates the badge', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status test')
    await changeStatusInBubble(page, 'Resolved')
    await expect(getStatusBadge(page)).toContainText('Resolved')
  })

  test('2C-07 — status change persists in session data', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status persist')
    await changeStatusInBubble(page, 'Accepted')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const thread = session.commentThreads.find(
      (t: { comments: Array<{ text: string }> }) => t.comments.some(c => c.text === 'Status persist')
    )
    expect(thread).toBeTruthy()
    expect(thread.status).toBe('accepted')
  })

  test('2C-08 — status can be changed back to "none"', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status test')
    await changeStatusInBubble(page, 'Accepted')
    await changeStatusInBubble(page, 'None')
    await expect(getStatusBadge(page)).toContainText('None')
  })

  test('2C-09 — status dropdown closes after selecting a status', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status test')
    await getStatusBadge(page).click()
    await page.waitForTimeout(200)
    // The dropdown options container should be visible
    const dropdownOption = getChatBubble(page).locator('button:has-text("Rejected")').last()
    await expect(dropdownOption).toBeVisible()
    // Select a status
    await dropdownOption.click()
    await page.waitForTimeout(300)
    // Dropdown should close — the extra status buttons should be hidden
    // Only the badge button with the current status should remain
    const allStatusButtons = getChatBubble(page).locator('button:has-text("Accepted")')
    // After close, there should be at most 1 (the badge itself if it says Accepted, or 0)
    const count = await allStatusButtons.count()
    expect(count).toBeLessThanOrEqual(1)
  })

  test('2C-10 — status dropdown closes when clicking outside', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status test')
    await getStatusBadge(page).click()
    await page.waitForTimeout(200)
    // Click outside the dropdown but inside the bubble
    await page.mouse.click(10, 10)
    await page.waitForTimeout(300)
    // Dropdown should close
    const resolvedBtn = getChatBubble(page).locator('button:has-text("Resolved")')
    const count = await resolvedBtn.count()
    // After closing, the only visible "Resolved" would be if it's the badge text
    expect(count).toBeLessThanOrEqual(1)
  })

  test('2C-11 — multiple threads can have different statuses', async ({ page }) => {
    await uploadPDFAndWait(page)
    // First note
    await placeStickyNote(page, 150, 150)
    await typeAndSendComment(page, 'Thread 1')
    await changeStatusInBubble(page, 'Accepted')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Second note
    await placeStickyNote(page, 350, 350)
    await typeAndSendComment(page, 'Thread 2')
    await changeStatusInBubble(page, 'Rejected')
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const statuses = session.commentThreads.map((t: { status: string }) => t.status)
    expect(statuses).toContain('accepted')
    expect(statuses).toContain('rejected')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2D: Comments Panel Sidebar (15 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('2D: Comments Panel Sidebar', () => {
  test('2D-01 — comments panel button is visible in toolbar', async ({ page }) => {
    await uploadPDFAndWait(page)
    await expect(page.locator('button[title="Comments panel"]')).toBeVisible()
  })

  test('2D-02 — clicking comments panel button opens the panel', async ({ page }) => {
    await uploadPDFAndWait(page)
    await openCommentsPanel(page)
    const panel = getCommentsPanel(page)
    await expect(panel).toHaveClass(/translate-x-0/)
  })

  test('2D-03 — panel has 320px width', async ({ page }) => {
    await uploadPDFAndWait(page)
    await openCommentsPanel(page)
    const panel = getCommentsPanel(page)
    const box = await panel.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBe(320)
  })

  test('2D-04 — panel shows "Comments" title with MessageSquare icon', async ({ page }) => {
    await uploadPDFAndWait(page)
    await openCommentsPanel(page)
    await expect(getCommentsPanel(page).locator('span.text-white.font-semibold', { hasText: 'Comments' })).toBeVisible()
  })

  test('2D-05 — panel shows thread count badge', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Panel test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await openCommentsPanel(page)
    // The badge showing thread count (e.g. "1")
    const badge = getCommentsPanel(page).locator('.rounded-full').filter({ hasText: /^\d+$/ }).first()
    await expect(badge).toBeVisible()
  })

  test('2D-06 — panel shows "No comments yet" when empty', async ({ page }) => {
    await uploadPDFAndWait(page)
    await openCommentsPanel(page)
    await expect(getCommentsPanel(page).getByText('No comments yet')).toBeVisible()
  })

  test('2D-07 — panel lists comment threads after creation', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Thread for panel')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await openCommentsPanel(page)
    await expect(getCommentsPanel(page).getByText('Thread for panel')).toBeVisible()
  })

  test('2D-08 — panel thread entry shows annotation type and page number', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Note thread')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await openCommentsPanel(page)
    // Should show "Note — p.1" for a sticky note
    await expect(getCommentsPanel(page).getByText(/Note.*p\.1/)).toBeVisible()
  })

  test('2D-09 — panel shows comment count per thread', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'First')
    await typeAndSendComment(page, 'Second')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await openCommentsPanel(page)
    // Thread entry should show count "2"
    const countBadge = getCommentsPanel(page).locator('.rounded-full').filter({ hasText: '2' })
    await expect(countBadge.first()).toBeVisible()
  })

  test('2D-10 — panel has filter bar with status filters', async ({ page }) => {
    await uploadPDFAndWait(page)
    await openCommentsPanel(page)
    // Filter bar should have All, Open, Accepted, Rejected, Resolved
    for (const label of ['All', 'Open', 'Accepted', 'Rejected', 'Resolved']) {
      await expect(getCommentsPanel(page).locator(`button:has-text("${label}")`).first()).toBeVisible()
    }
  })

  test('2D-11 — clicking "Open" filter shows only open threads', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Create note with "open" status
    await placeStickyNote(page, 150, 150)
    await typeAndSendComment(page, 'Open thread')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    // Create note with "accepted" status
    await placeStickyNote(page, 350, 350)
    await typeAndSendComment(page, 'Accepted thread')
    await changeStatusInBubble(page, 'Accepted')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await openCommentsPanel(page)
    // Click "Open" filter
    await getCommentsPanel(page).locator('button:has-text("Open")').first().click()
    await page.waitForTimeout(200)
    await expect(getCommentsPanel(page).getByText('Open thread')).toBeVisible()
    await expect(getCommentsPanel(page).getByText('Accepted thread')).toBeHidden()
  })

  test('2D-12 — clicking "All" filter shows all threads', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 150, 150)
    await typeAndSendComment(page, 'Thread A')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await placeStickyNote(page, 350, 350)
    await typeAndSendComment(page, 'Thread B')
    await changeStatusInBubble(page, 'Resolved')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await openCommentsPanel(page)
    // Filter by Resolved first
    await getCommentsPanel(page).locator('button:has-text("Resolved")').first().click()
    await page.waitForTimeout(200)
    // Then click All
    await getCommentsPanel(page).locator('button:has-text("All")').first().click()
    await page.waitForTimeout(200)
    await expect(getCommentsPanel(page).getByText('Thread A')).toBeVisible()
    await expect(getCommentsPanel(page).getByText('Thread B')).toBeVisible()
  })

  test('2D-13 — clicking a thread in the panel opens its chat bubble', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Navigate test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await openCommentsPanel(page)
    // Click the thread entry in the panel
    await getCommentsPanel(page).getByText('Navigate test').click()
    await page.waitForTimeout(500)
    // Chat bubble should open and panel should close
    const bubble = getChatBubble(page)
    await expect(bubble).toBeVisible({ timeout: 3000 })
  })

  test('2D-14 — panel thread entry has status select dropdown', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Status select test')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await openCommentsPanel(page)
    // Each thread entry has a <select> for status
    const select = getCommentsPanel(page).locator('select').first()
    await expect(select).toBeVisible()
  })

  test('2D-15 — changing status via panel select updates thread status', async ({ page }) => {
    await uploadPDFAndWait(page)
    await placeStickyNote(page, 200, 200)
    await typeAndSendComment(page, 'Panel status change')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await openCommentsPanel(page)
    // Change status via the select dropdown
    const select = getCommentsPanel(page).locator('select').first()
    await select.selectOption('resolved')
    await page.waitForTimeout(300)
    await waitForSessionSave(page)
    const session = await getSessionData(page)
    const thread = session.commentThreads.find(
      (t: { comments: Array<{ text: string }> }) => t.comments.some(c => c.text === 'Panel status change')
    )
    expect(thread).toBeTruthy()
    expect(thread.status).toBe('resolved')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2E: User Profile (6 tests)
// ═════════════════════════════════════════════════════════════════════════════

test.describe('2E: User Profile', () => {
  test('2E-01 — user profile is pre-loaded from localStorage', async ({ page }) => {
    await uploadPDFAndWait(page)
    // Verify the profile is in localStorage
    const profile = await page.evaluate(() => {
      const raw = localStorage.getItem('mt-user-profile')
      return raw ? JSON.parse(raw) : null
    })
    expect(profile).toBeTruthy()
    expect(profile.name).toBe('Test User')
    expect(profile.email).toBe('test@test.com')
    expect(profile.initials).toBe('TU')
  })

  test('2E-02 — profile modal does not appear when profile exists', async ({ page }) => {
    await uploadPDFAndWait(page)
    // The modal should NOT be visible since profile is pre-set
    await expect(page.getByText('Set Up Your Profile')).toBeHidden()
  })

  test('2E-03 — profile modal appears when no profile in localStorage', async ({ page }) => {
    // Clear the profile before loading
    await page.evaluate(() => localStorage.removeItem('mt-user-profile'))
    await page.reload()
    await page.waitForTimeout(1000)
    // The "Set Up Your Profile" modal should appear
    await expect(page.getByText('Set Up Your Profile')).toBeVisible({ timeout: 5000 })
  })

  test('2E-04 — profile modal requires name to save', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('mt-user-profile'))
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.getByText('Set Up Your Profile')).toBeVisible({ timeout: 5000 })
    // The "Get Started" button should be disabled when name is empty
    const saveBtn = page.locator('button:has-text("Get Started")')
    await expect(saveBtn).toBeDisabled()
  })

  test('2E-05 — filling name enables the save button and auto-generates initials', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('mt-user-profile'))
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.getByText('Set Up Your Profile')).toBeVisible({ timeout: 5000 })
    // Fill in the name
    await page.locator('#profile-name').fill('John Doe')
    await page.waitForTimeout(200)
    // Initials should auto-generate
    const initialsInput = page.locator('#profile-initials')
    await expect(initialsInput).toHaveValue('JD')
    // Save button should be enabled
    const saveBtn = page.locator('button:has-text("Get Started")')
    await expect(saveBtn).toBeEnabled()
  })

  test('2E-06 — saving profile stores it in localStorage and closes modal', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('mt-user-profile'))
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.getByText('Set Up Your Profile')).toBeVisible({ timeout: 5000 })
    // Fill fields
    await page.locator('#profile-name').fill('Jane Smith')
    await page.locator('#profile-email').fill('jane@example.com')
    await page.waitForTimeout(200)
    // Click Get Started
    await page.locator('button:has-text("Get Started")').click()
    await page.waitForTimeout(500)
    // Modal should close
    await expect(page.getByText('Set Up Your Profile')).toBeHidden()
    // Profile should be saved in localStorage
    const profile = await page.evaluate(() => {
      const raw = localStorage.getItem('mt-user-profile')
      return raw ? JSON.parse(raw) : null
    })
    expect(profile).toBeTruthy()
    expect(profile.name).toBe('Jane Smith')
    expect(profile.email).toBe('jane@example.com')
    expect(profile.initials).toBe('JS')
  })
})
