# QA Acceptance Test Report — Text Extract

**Date:** 2026-03-16
**Scope:** Text Extract (exhaustive)
**Duration:** ~12 minutes
**Workers:** 4 (GPU accelerated, port 5198)

## Executive Summary

| Metric | Value |
|--------|-------|
| Tests generated | 34 |
| Tests passed | 34 (100%) |
| Flaky check | 102/102 (3x each, 0 flakes) |
| Bugs found | 0 |
| App fixes applied | 0 |
| Test fixes applied | 6 |

## Coverage Before vs After

| Area | Before | After |
|------|--------|-------|
| Upload & UI | 11 tests | 11 existing |
| Extraction (Document) | 0 | 6 tests |
| Extraction (Table) | 0 | 2 tests |
| Export (TXT/CSV/PDF/XLSX/DOCX) | 0 | 6 tests |
| Copy to clipboard | 0 | 1 test |
| Controls (zoom, region, New) | 0 | 4 tests |
| Chaos (rapid switching, concurrent) | 0 | 6 tests |
| Edge cases (pagination, bounds) | 0 | 9 tests |
| **Total** | **11** | **34 new + 11 existing = 45** |

## Phase Results

### Phase 1 — Functional (22 tests)
- Document mode extraction produces content
- Known content extraction from sample.pdf
- Re-extract button works
- Multi-page navigation (page 1/2, next, prev disabled at bounds)
- Table mode extraction produces output
- Mode switching re-renders preview
- All 5 export formats available (4 download-verified, 1 dropdown-verified)
- Copy to clipboard with "Copied!" feedback
- Zoom in/out, Region tool toggle, New button reset

### Phase 3 — Chaos (6 tests)
- Mode switching before extraction
- Extract then immediately New (cancel)
- Upload new PDF during extraction
- Rapid page navigation
- Rapid zoom in/out
- Sequential export of 3 formats

### Phase 4 — Edge Cases (9 tests)
- Single-page PDF (no next button)
- Single-page extraction produces content
- Multi-page Extract All
- Zoom at maximum/minimum bounds
- Extract, switch page, re-extract
- Export/Copy not visible before extraction
- Language selector visibility

## Recommendations

1. **Word (.docx) export is slow** — takes 30+ seconds in headless Chromium. Consider showing a progress indicator during docx generation.
2. **Need diverse test PDFs** — current fixtures (sample.pdf, single-page.pdf) have simple content. For thorough table extraction testing, create fixtures with: multi-column tables, nested tables, tables with merged cells, PDFs with no text layer (scanned), and mixed text+table documents.
3. **OCR accuracy not validated** — Tesseract.js OCR runs but we can't assert specific text content without known-content scanned PDFs. Consider creating a fixture with `pdf-lib` that embeds text-as-image for deterministic OCR testing.

## Worktree

Cleaned up (no app changes needed).
