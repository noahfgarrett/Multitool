# LotusWorksToolkit

Professional-grade local toolbox delivered as a single HTML file. All tools run 100% in-browser with zero server calls — safe for intellectual property, sensitive documents, and regulated industries. Distributed via email, OneDrive, SharePoint, or any file share.

## Why This Matters
This is a flagship internal product. Quality, polish, and reliability directly impact career trajectory. Every tool must feel enterprise-grade — no rough edges, no "demo-quality" UI.

## Commands
```bash
npm run dev              # Vite dev server (localhost:5173)
npm run build            # Production build → dist/index.html
```
- **Development**: All work and testing happens on `localhost:5173` via Vite dev server.
- **Production**: Changes are eventually ported into `dist/index.html` for single-file distribution. Do not edit `dist/index.html` directly.

## Architecture
- `dist/index.html` — Single-file distribution build (the final deliverable)
- `presentation.html` — Executive presentation (not part of the app)
- `App.tsx` — Home menu with sidebar navigation and tool grid, organized by category (Documents, Images, Files, Creators, Utilities)
- `/src/tools/` — Each subfolder is a standalone tool module:
  - `dashboard` — Dashboard builder tool (under Creators category)
  - `file-compressor` — File compression
  - `file-converter` — Format conversion
  - `flowchart` — Flowchart builder
  - `form-creator` — Form builder
  - `image-bg-remove` — Background removal
  - `image-resizer` — Image resizing
  - `json-csv-viewer` — JSON/CSV data viewer
  - `org-chart` — Organizational chart builder
  - `pdf-annotate` — PDF annotation
  - `pdf-merge` — PDF merging
  - `pdf-split` — PDF splitting
  - `pdf-watermark` — PDF watermarking
  - `qr-code` — QR code generator
  - `text-extract` — Text extraction (OCR)
- `/src/components/` — Shared UI components (reuse across tools)
- `/src/stores/` — State management
- `/src/types/` — Shared TypeScript types
- `/src/utils/` — Shared utilities
- `registry.ts` — Tool registry (maps tools to routes/metadata)

## Critical Constraints
- **100% local execution.** NEVER add any external API calls, analytics, telemetry, or CDN-loaded resources. Every byte must ship in the bundle.
- **Single HTML distribution.** The final output must work as a standalone file. No assumptions about folder structure or adjacent assets at runtime.
- **Professional UI.** Every tool must have consistent styling, clear labels, proper loading states, error handling, and empty states. This is not a prototype — it's a product.
- **Browser compatibility.** Must work in Chrome and Edge (enterprise standard). No bleeding-edge APIs without fallbacks.

## Adding a New Tool
1. Create a new folder under `/src/tools/<tool-name>/`
2. Follow the same component structure as existing tools
3. Register it in `registry.ts`
4. Ensure it works in isolation — no cross-tool dependencies
5. Verify it renders correctly inside the single HTML output

## Polish Pass (new tools and major features)
After a tool works functionally, do a second pass before marking done:
1. Think like a product designer, not just an engineer. Ask: "If a non-technical professional used this tool daily, what would frustrate them or what would they expect to be there?"
2. List 5+ UX enhancements (examples: drag-and-drop, inline editing, undo/redo, + buttons for adding items, profile photos, export to PNG/PDF, keyboard shortcuts, color coding, expand/collapse, right-click context menus).
3. Present the list to the user for approval — don't implement without asking.
4. Implement the approved enhancements.
5. Verify each enhancement works with edge cases.

## Code Patterns
- Tools are self-contained modules. Shared logic goes in `/src/utils/` or `/src/components/`, never duplicated across tools.
- Use existing shared components before creating new ones — check `/src/components/` first.
- All file processing (PDF, image, etc.) must use client-side libraries only. See existing tools for patterns.

## Release Notes Style
- Keep patch notes short and simple. Write for non-technical users.
- No "technical details" sections — save that for commit messages.
- **Never mention QA, testing, test coverage, or automated tests in patch notes.** Users don't care about internal testing — only mention what changed for them.
- Focus on user-facing improvements: bug fixes, new features, performance gains, UI polish.
- Keep it high-level and overarching. Group related fixes into a single bullet when possible (e.g. "Improved multi-page annotation reliability" instead of listing 5 separate fixes).
- **Bullet format**: `**Tool Name — short title** — One-sentence description of what changed for the user`. Example:
  ```
  - **PDF Annotate — drag & resize fix** — Fixed an issue where moving or resizing an annotation could accidentally affect a different annotation
  - **PDF Annotate — text box interaction improved** — Single-clicking a selected text box now moves it; double-click to edit
  ```

## Releasing to GitHub

When the user says "push a new release", "push to GitHub", or "release vX.Y.Z", follow this **exact** procedure. Every step is required for the in-app update modal to trigger for all users.

### Release Checklist

1. **Bump version** in `package.json`
2. **Build**: `npm run build` → produces `dist/LotusWorksToolkit.html`
3. **Update changelog** — Add a new entry to the TOP of `src/data/changelog.ts` with a **placeholder date**:
   ```typescript
   {
     version: 'X.Y.Z',
     date: 'PLACEHOLDER',  // will be patched with real timestamp in step 9
     type: 'major' | 'feature' | 'fix',  // major=x.0.0, feature=x.y.0, fix=x.y.z
     stats: { features: N, fixes: N, tools: N },  // optional, count from release notes
     notes: `...release notes markdown...`,
   },
   ```
   - Add to the TOP of the `CHANGELOG` array (newest first)
   - Follow release notes style (short, user-facing, no QA mentions)
   - Rebuild after adding so the changelog is baked into the HTML
4. **Verify version is baked in**: `grep -o '"X\.Y\.Z"' dist/LotusWorksToolkit.html | head -1` must show the new version
5. **Commit and push** the version bump
6. **Create the release with `target_commitish`** pointing to the actual commit SHA — this ensures `created_at` gets a fresh timestamp:
   ```bash
   COMMIT=$(git rev-parse HEAD)
   gh api repos/noahfgarrett/LotusWorksToolkit/releases -X POST \
     -f tag_name=vX.Y.Z \
     -f target_commitish="$COMMIT" \
     -f name="vX.Y.Z — Title" \
     -f body="Release notes here" \
     -F draft=false \
     -F prerelease=false
   ```
7. **Upload the HTML asset**:
   ```bash
   gh release upload vX.Y.Z dist/LotusWorksToolkit.html
   ```
8. **Verify `/releases/latest` returns the new version**:
   ```bash
   gh api repos/noahfgarrett/LotusWorksToolkit/releases/latest --jq '{tag_name, created_at, assets: [.assets[].name]}'
   ```
   Must show: correct tag, fresh `created_at` date, and `LotusWorksToolkit.html` in assets.
9. **Patch changelog with real timestamp** — Pull the actual `published_at` from GitHub, update the changelog entry, rebuild, and re-upload:
   ```bash
   REAL_DATE=$(gh api repos/noahfgarrett/LotusWorksToolkit/releases/tags/vX.Y.Z --jq '.published_at')
   # Replace 'PLACEHOLDER' with $REAL_DATE in src/data/changelog.ts
   npm run build
   # Delete old asset and re-upload
   ASSET_ID=$(gh api repos/noahfgarrett/LotusWorksToolkit/releases/tags/vX.Y.Z --jq '.assets[0].id')
   gh api repos/noahfgarrett/LotusWorksToolkit/releases/assets/$ASSET_ID -X DELETE
   gh release upload vX.Y.Z dist/LotusWorksToolkit.html
   git add src/data/changelog.ts && git add -f dist/LotusWorksToolkit.html
   git commit -m "fix: patch changelog timestamp for vX.Y.Z" && git push
   ```
   This ensures the changelog displays the exact date and time the release was published.

### Why `target_commitish` Matters
GitHub's `/releases/latest` endpoint sorts by `created_at`, which is the **tag's target commit date** — NOT when the release was published. If you create a release against an old commit, it gets a stale `created_at` and may not be returned as "latest". Always pass `target_commitish` with the current HEAD SHA to guarantee a fresh timestamp.

### Why the HTML Asset Matters
The update checker (`updateChecker.ts`) fetches `/releases/latest`, checks if the remote version is newer than `__APP_VERSION__` (baked in at build time via `vite.config.ts`), and **only shows the update modal if the release has an `.html` asset attached**. No HTML asset = no update prompt.

### Cleanup
If `gh release create` fails with HTTP 500, it may leave orphaned **draft releases**. Check for and delete them:
```bash
gh api repos/noahfgarrett/LotusWorksToolkit/releases --jq '.[] | select(.draft) | {id, tag_name}'
# Delete any orphaned drafts:
gh api repos/noahfgarrett/LotusWorksToolkit/releases/<id> -X DELETE
```

## Gotchas
- **pdf.js worker setup is duplicated.** `pdfjsLib.GlobalWorkerOptions.workerSrc` is configured in `pdf.ts`, `compression.ts`, and `conversion.ts`. Each wraps it in a try/catch since the worker may already be set by whichever module loads first. If you add a new file that uses pdfjs-dist, copy the same pattern.
- **pdf-lib standard fonts only support WinAnsi encoding.** Characters outside Latin-1 (e.g. CJK, emoji, Arabic) get replaced with `?` when rendering text to PDF via `StandardFonts.Courier`/`Helvetica`. Embedding custom fonts requires fetching font files, which conflicts with the single-file constraint.
- **Update downloads must NEVER navigate the browser to GitHub.** Users are non-technical coworkers who do not have GitHub accounts. If `window.open()` is used with a GitHub URL and the user's browser has stale GitHub cookies, GitHub will prompt for 2FA — a dead end for anyone without an account. The update modal (`UpdateModal.tsx`) fetches the file via the GitHub API (`api.github.com` asset URL with `Accept: application/octet-stream`) and triggers a blob download. The browser never leaves the app. Do not change this to `window.open()` or an `<a href>` pointing at GitHub. The `window.open` fallback in the `catch` block exists only for network failures and should remain a last resort.
