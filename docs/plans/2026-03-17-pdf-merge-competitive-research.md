# PDF Merge / Combine Tools: Competitive Research

**Date:** 2026-03-17
**Focus:** Construction-professional workflows for PDF merge, combine, and plan set management

---

## 1. Adobe Acrobat Pro (Industry Standard)

### Combine Files Feature
- **Access:** File > Create > Combine Multiple Files into a Single PDF, or from the right-hand menu
- **Input types:** PDF, Word, Excel, PowerPoint, JPG, PNG, and nearly any other file type
- **File size presets:** "Smaller File Size" (screen resolution, compressed images), "Default File Size" (business docs), "Larger File Size" (desktop printing)

### Reordering / Organization
- **Pre-merge:** Drag-and-drop thumbnails to reorder files; expand a multi-page file to see individual page thumbnails; move files up/down with buttons; select and remove unwanted pages before combining
- **Post-merge (Organize Pages tool):** Full page-thumbnail view; click-and-drag thumbnails to new positions (blue insertion bar shows drop target); Ctrl/Cmd-click for multi-select; cut/copy/paste pages between open documents
- **Insert from another file:** In Organize Pages view, Insert > From File; specify page ranges from the source PDF

### Page-Level Operations
| Operation | Details |
|-----------|---------|
| **Extract** | Extract as separate single-page PDFs or as one combined PDF; option to delete source pages after extracting; bookmarks/article threads are NOT preserved on extract |
| **Delete** | Select thumbnails > Delete icon; batch-delete by range |
| **Rotate** | 90-degree increments; rotate selection or all pages |
| **Replace** | Replace pages from another PDF file; specify source and target page ranges |
| **Split** | Split by max pages, max file size, or top-level bookmarks |
| **Renumber** | Custom page-numbering schemes (Roman, Arabic, etc.) with prefix support |

### Bookmarks & Table of Contents
- Bookmarks are auto-generated from source-document structure (Word headings, InDesign TOC entries) during initial PDF creation
- "New Bookmarks From Structure" command in the Bookmarks panel Options menu
- **No native auto-TOC generator** for combined PDFs -- this is a major gap
- Third-party plugins fill the void: **AutoBookmark** (Evermap) generates TOC pages from bookmarks; **TOCBuilder** auto-creates bookmark lists from document content
- When combining, you can choose to include bookmarks from source files; each source file becomes a top-level bookmark by default

### Construction Relevance
- General-purpose tool; no construction-specific features
- No sheet-number OCR, no discipline categorization, no revision tracking
- Widely used because it's "the standard" but not optimized for plan sets

---

## 2. Bluebeam Revu (Construction Plan Management Standard)

### Plan Set Organization -- The "Sets" Panel
- Loads multiple individual PDF files as if they were one document -- no physical merging required
- **Auto-categorization by discipline:** Detects sheet name/number prefixes (A = Architectural, S = Structural, M = Mechanical, E = Electrical, etc.)
- **Categorization modes:** By File Name prefix, or by Drawing Number tag
- **Sorting options:** Page Label Only; File Name + Page Label; File Name + Page Index
- **Stacking:** Multi-page documents auto-stack by index (ascending) -- ideal for spec books; revisions auto-stack by Sheet Number + Revision tags
- **Tags system:** Revision, Discipline, Sheet Type tags can be auto-extrapolated from sheet numbers

### Sheet Indexing & Auto Page Labels (AutoMark + OCR)
- **AutoMark:** Pulls alphanumeric data from any region on a page (typically title block) and sets it as page label or bookmark
- **OCR from title block:** Draw a box around the sheet number region and sheet title region; Bluebeam reads the text via OCR and renames all pages in batch
- **Composite labels:** Combine Project Code + Discipline + Sheet Number + Sheet Name + Revision + Date
- **Batch auto-rename:** Apply page labels across entire plan set in one operation

### Batch Operations
| Operation | Details |
|-----------|---------|
| **Combine (File > Combine)** | Add Open Files or browse for files; options to Include Bookmarks, Include File Attachments, Merge Document Properties, Merge Layers; PDFs combined in sort order |
| **Stapler** | Wizard-based tool for combining multiple file types (PDF, Word, Excel) into one PDF; can also batch-convert each to separate PDFs; configurable jobs for repeated workflows |
| **Batch Slip Sheet** | **Killer feature for construction:** Replaces outdated sheets with new revisions while preserving ALL markups, hyperlinks, bookmarks, and attachments; match by Page Label or Page Region (OCR); options to replace, insert before, or insert after current pages; eXtreme edition only |
| **Split** | Split large PDFs by page count, file size, or bookmarks; pair with Batch Slip Sheet for revision workflows |
| **Batch Overlay** | Overlays multiple drawings with color-coded transparency for comparison; auto-align, manual 3-point align, or page-align options |

### Overlay Pages (Drawing Comparison)
- Converts each document to a different color and stacks as transparent layers
- **Auto Align:** Revu finds matching points between drawings (different scales/positions)
- **Manual Align:** User picks 3 anchor points on each drawing
- **Select Region:** Overlay only a specific area of a drawing, not the entire page

### Construction Relevance
- Purpose-built for construction document management
- Revision tracking is first-class (slip sheet + Sets panel revision stacking)
- Sheet-number OCR from title blocks is unique to construction tools
- Discipline auto-categorization saves hours of manual organization
- Certified/digitally-signed PDF handling (signatures removed on combine)

---

## 3. PDF-XChange Editor (Power User Tool)

### Merge / Combine Features
- **Combine Files into a Single PDF:** Add files or entire folders; Shift+Click / Ctrl+Click for multi-select
- **Page Ranges button:** Define which pages from each source file to include (all pages by default)
- **Merge Pages feature:** Recent versions added presets and option to include gap between pages
- **Merge open files:** Can combine all currently open documents

### Page Manipulation
| Operation | Details |
|-----------|---------|
| **Thumbnails pane** | Ctrl+T to open; cut/copy/paste/delete thumbnails; zoom in/out on thumbnails |
| **Rotate** | 90-degree clockwise or counterclockwise on selected pages |
| **Extract** | Extract selected pages to new document |
| **Delete** | Delete pages from active document |
| **Split** | Organize tab > Split dropdown; split by page count, size, or bookmarks |
| **Crop** | Crop pages to specific dimensions |

### Performance with Large Files
- **Significantly faster than Adobe:** In benchmarks, PDF-XChange loaded 50 PDFs totaling 410 MB in ~6 seconds vs Adobe Reader DC at ~30 seconds (5x faster)
- Handles 10-20 open documents simultaneously without degradation
- Lightweight memory footprint compared to Adobe and Wondershare
- Occasional glitches with very large or complex PDFs

### Construction Relevance
- No construction-specific features (no sheet numbering, no discipline categorization, no slip sheeting)
- Strong choice for power users who need speed and multiple open documents
- Good for smaller firms that need a capable PDF editor without Bluebeam pricing

---

## 4. Smallpdf & iLovePDF (Online Tools)

### Smallpdf Merge UX
- **Two modes:** "Show pages" toggle OFF = merge full documents quickly; toggle ON = page-level control with individual thumbnails
- **Drag-and-drop:** Reorder files or individual pages by dragging thumbnails
- **Page-level operations:** Delete, rotate, reorder pages across multiple source files before merging
- **Organize PDF tool:** Add, replace, reorder, rearrange, sort, swap, shuffle pages with thumbnail icons
- **Rated 4.7/5** for ease of use

### iLovePDF Merge UX
- Upload files, see thumbnail previews, drag-and-drop to reorder
- Merge up to 25 PDFs at once (free tier)
- Rearrange page order within each document before merging
- SSL encryption, auto file deletion, ISO 27001 / GDPR compliant
- Available on web, desktop, and mobile

### What Users Praise
- **Zero friction:** No software install, works in browser, drag-and-drop immediately
- **Speed:** Simple tasks (merge 3-5 PDFs) completed in under 60 seconds
- **Clarity:** Thumbnail previews make it obvious what you're combining
- **Page mode vs file mode:** Smallpdf's toggle between file-level and page-level is praised as intuitive
- **Free tier:** Both tools offer useful free versions

### Construction Relevance
- Used by construction pros for quick one-off merges (combine a few addenda, merge spec sections)
- **Not suitable for plan set management:** No sheet numbering, no revision tracking, no discipline organization
- File size limits on free tiers are a problem for large construction plans (100+ MB)
- No batch processing or automation

---

## 5. Plan Tile Stitching Tools

### Bluebeam Revu -- Overlay Pages (Closest to Grid Stitch)
- **Not a true grid-stitch tool** -- Overlay Pages is designed for comparison, not assembly
- Can overlay multiple drawings at different scales with auto-alignment
- Layered PDF creation (File > Create > Layered PDF) combines documents as layers
- Community discussion confirms users want matchline assembly but Bluebeam doesn't natively support it
- **Gap:** No way to automatically assemble tiled pages along matchlines into one large continuous drawing

### VeryPDF PDF Stitcher
- Combines two or more PDF pages into one wide/tall PDF page
- Control rows/columns layout (e.g., 2x3 grid)
- Set gap space between stitched pages; option to draw dividing lines
- Rotate, resize, and set margins for individual pages in the stitched output
- Can also reverse the process (split wide page into tiles)
- **Commercial tool**, command-line and GUI versions

### PDFStitcher (Open Source)
- Originally built for sewing patterns, but applicable to any PDF tiling
- Stitch pages in any order with specified rows/columns
- Rotate pages, add margins, trim/overlap edges by specified amount
- Layers automatically preserved from source documents
- Python-based (pip install), GUI available via pdfstitcher-gui
- **Free and open source** (GitHub: cfcurtis/pdfstitcher)

### pdfstitch (GitHub: sur5r/pdfstitch)
- Crop and stitch pages from PDF into larger single-page PDF
- Designed for exactly the grid-assembly use case

### What Construction Users Need from Grid/Tile Stitching
- **Matchline-aware assembly:** Auto-detect matchline markers and align adjacent sheets accordingly
- **Overlap trimming:** Trim the overlap zone where matchlines exist so the combined drawing is seamless
- **Scale preservation:** Maintain exact scale (1/4" = 1'-0", etc.) across the stitched result
- **Large format output:** Generate output suitable for large-format plotters or on-screen pan/zoom
- **Annotation preservation:** Keep all markups from source pages positioned correctly in the stitched result
- **Selective stitching:** Choose which sheets to stitch (e.g., "stitch sheets A1.01 through A1.04 into one floor plan")

---

## Feature Matrix: Table Stakes / Common / Differentiators / Opportunities

### Table Stakes (All Have)
- Combine multiple PDFs into one
- Drag-and-drop file reordering
- Page thumbnails for visual preview
- Delete pages from combined result
- Rotate pages (90-degree increments)
- Choose output file location

### Common (Most Have)
- Page-range selection per source file
- Extract pages to new document
- Split PDF by page count or file size
- Insert pages from another file into specific position
- Bookmark preservation during merge
- File-size optimization options (compress images)
- Batch file selection (add folder)

### Differentiators (1-2 Have)

| Feature | Who Has It |
|---------|-----------|
| **Batch Slip Sheet** (replace old revision sheets while preserving markups) | Bluebeam only |
| **Sets Panel** (virtual plan set without physical merge) | Bluebeam only |
| **Auto sheet numbering via OCR from title blocks** | Bluebeam only |
| **Discipline auto-categorization** (A/S/M/E/P prefix detection) | Bluebeam only |
| **Revision stacking** (auto-group new revision with original sheet) | Bluebeam only |
| **Page mode / file mode toggle** for merge preview | Smallpdf only |
| **Grid/tile stitching** (combine adjacent pages into one large page) | VeryPDF, PDFStitcher only |
| **5x faster large-file performance** vs Adobe | PDF-XChange only |
| **Overlay comparison** with auto-alignment | Bluebeam only |
| **Stapler wizard** for repeatable combine jobs | Bluebeam only |

### Opportunities (None Do Well)

| Opportunity | Gap Description |
|-------------|----------------|
| **Smart matchline stitching** | No tool auto-detects matchline markers and seamlessly joins tiled plan sheets. Users must manually specify grid layout and trim zones. |
| **Auto-TOC generation for combined plan sets** | Even Acrobat requires third-party plugins. No tool auto-generates a cover sheet / table of contents with discipline sections, sheet numbers, and sheet titles after combining. |
| **Revision diff highlighting in merged sets** | Bluebeam can overlay for comparison, but no tool shows inline "what changed" annotations directly in the merged plan set (like track-changes for construction drawings). |
| **Drag-and-drop merge with construction-aware organization** | No web-based tool combines Smallpdf-level UX simplicity with Bluebeam-level construction intelligence (auto sheet numbering, discipline sorting). |
| **Cross-file annotation continuity** | When merging files, annotations that reference other sheets (hyperlinks, callouts) break. No tool auto-updates cross-references after merge. |
| **Merge + calibration preservation** | Scale calibrations set on individual files are often lost or require re-calibration after merge. No tool preserves and validates scale across merged sheets. |
| **Intelligent page ordering** | No tool auto-sorts sheets by discipline + sheet number from title block content during merge (without pre-tagging). Should "just work" by reading title blocks. |
| **Lightweight plan set viewer** | Bluebeam's Sets panel is powerful but desktop-only and expensive. No web tool offers virtual plan set organization with revision tracking. |
| **Merge progress for very large files** | Large construction plan sets (500+ pages, 1 GB+) provide no meaningful progress indication, estimated time, or ability to pause/resume. |
| **Template-based merge** | No tool lets you define a merge template ("always put cover sheet first, then civil, then architectural, then structural, then MEP, then details") and auto-sort incoming files into that structure. |

---

## Construction Professional Needs Summary

### What Estimators Need
- Merge addenda and revisions into a single working set quickly
- Know which sheets are new/revised vs. unchanged
- Preserve scale calibrations across merged documents
- Quick access to specific sheets by discipline and number

### What Project Managers Need
- Batch slip-sheet to update plan sets without losing markups
- Revision history -- which version of which sheet is current
- Auto-generated cover sheet / TOC for transmittals
- Export "current set" as a clean combined PDF for distribution

### What Architects / Engineers Need
- Overlay comparison between revision sets
- Matchline stitching for large floor plans split across sheets
- Layer preservation when combining documents
- Discipline-organized plan sets

### What Contractors / Field Need
- Simple, fast merge for daily document packages
- Mobile-friendly merge (combine photos + drawings on tablet)
- Offline capability (job sites have limited connectivity)
- Large-format output for printing

---

## Key Takeaways for LotusWorksToolkit

1. **Biggest gap in the market:** A web-based tool that combines Smallpdf's drag-and-drop simplicity with construction-aware intelligence (auto sheet numbering, discipline sorting, revision awareness).

2. **Slip sheeting is the #1 differentiator** Bluebeam has. Building even a basic version (replace page X with new file, keep annotations) would be valuable.

3. **Auto-TOC generation** after merge is universally missing. Reading title block text to auto-generate a cover sheet would be a standout feature.

4. **Grid/tile stitching** is underserved -- existing tools are either command-line utilities or commercial niche products. A visual, interactive stitcher with matchline awareness would be unique.

5. **Merge + annotation preservation** is a pain point. Users lose hyperlinks, cross-references, and scale calibrations when combining files.

Sources:
- [Adobe: Combine files into one PDF](https://helpx.adobe.com/acrobat/using/merging-files-single-pdf.html)
- [Adobe: Rearrange and resize combined PDFs](https://helpx.adobe.com/acrobat/desktop/edit-documents/combine-files/rearrange-combined-files.html)
- [Adobe: Rotate, move, delete, and renumber PDF pages](https://helpx.adobe.com/acrobat/using/manipulating-deleting-renumbering-pdf-pages.html)
- [Adobe: Organize Pages](https://helpx.adobe.com/acrobat/web/edit-pdfs/organize-documents/organize-pages.html)
- [Adobe: Move or copy pages](https://helpx.adobe.com/acrobat/desktop/edit-documents/organize-pages/move-pages.html)
- [AutoBookmark plugin for TOC generation](https://evermap.com/Tutorial_ABM_TOCFromBookmarks.asp)
- [Bluebeam: Sets Panel](https://support.bluebeam.com/online-help/revu20/Content/RevuHelp/Menus/Window/Panels/Sets/Sets-Tab--V.htm)
- [Bluebeam: Working with Sets](https://support.bluebeam.com/online-help/revu20/Content/RevuHelp/Menus/Window/Panels/Sets/Working-with-Sets--TV.htm)
- [Bluebeam: Sets - Organizing Your Project Files](https://zentekconsultants.net/bluebeam-sets-organizing-your-project-files-the-smart-way/)
- [Bluebeam: Batch Slip Sheet](https://support.bluebeam.com/online-help/revu21/Content/RevuHelp/Menus/Batch/Slip-Sheet/Batch-Slip-Sheet--T.htm)
- [Bluebeam: Slip Sheeting](https://zentekconsultants.net/slip-sheeting-in-bluebeam-revu/)
- [Bluebeam: Transfer markups with Batch Slip Sheet](https://support.bluebeam.com/revu/how-to/transfer-markups-with-batch-slip-sheet.html)
- [Bluebeam: Creating a PDF from multiple PDFs](https://support.bluebeam.com/online-help/revu21/Content/RevuHelp/Menus/File/Combine/Combine-PDFs--MT.htm)
- [Bluebeam: Stapler wizard](https://support.bluebeam.com/revu/features/bluebeam-stapler-wizard-overview.html)
- [Bluebeam: Overlay Pages](https://support.bluebeam.com/revu/features/align-pdfs-with-overlay-pages.html)
- [Bluebeam: Batch Overlay](https://support.bluebeam.com/online-help/revu20/Content/RevuHelp/Menus/Batch/Overlay/Batch-Overlay.htm)
- [Bluebeam: Edit page labels and page numbering](https://support.bluebeam.com/online-help/revu21/Content/RevuHelp/Menus/Window/Panels/Thumbnails/Page-Labels-Page-Numbering.htm)
- [Bluebeam: Auto page labels from title blocks](https://carolhagen.wordpress.com/2014/09/25/bluebeam-tips-plan-set-page-numbers-from-title-block-sheet-names/)
- [Bluebeam: Create Page Labels](https://ddscad.com/create-page-labels-with-bluebeam-revu)
- [Bluebeam: Batch Auto-Rename Using Page Labels](https://novedge.com/blogs/design-news/bluebeam-tip-batch-auto-rename-in-bluebeam-revu-using-page-labels)
- [Bluebeam: Combine PDFs guide](https://www.brightergraphics.com/guides/how-to-combine-files-in-bluebeam-revu)
- [Bluebeam: Community discussion on matchline stitching](https://community.bluebeam.com/discussion/4397/is-there-a-way-to-combine-pages-of-a-document-along-matchlines/p1)
- [PDF-XChange: How to Combine/Merge](https://www.pdf-xchange.com/knowledgebase/416-How-do-I-Combinemerge-Documents-or-Pages)
- [PDF-XChange: Page editing features](https://www.pdf-xchange.com/knowledgebase/415-Can-I-use-PDF-XChange-Editor-to-edit-pages)
- [PDF-XChange: Performance review](http://www.softerviews.org/PDF-XChange.html)
- [Smallpdf: Merge PDF](https://smallpdf.com/merge-pdf)
- [Smallpdf: Organize PDF](https://smallpdf.com/organize-pdf)
- [Smallpdf: Review 2025](https://thebusinessdive.com/smallpdf-review)
- [iLovePDF: Merge PDF](https://www.ilovepdf.com/merge_pdf)
- [iLovePDF: How to merge PDF files](https://www.ilovepdf.com/blog/how-to-merge-pdf-files)
- [VeryPDF: PDF Stitcher](https://www.verypdf.com/app/pdf-stitch/index.html)
- [VeryPDF: Combine tiled pages](https://www.verypdf.com/wordpress/201907/how-to-sew-pdf-pages-and-combine-tiled-pdf-pages-into-one-wide-pdf-page-for-printing-how-to-split-wide-pdf-page-into-tiled-pages-44695.html)
- [PDFStitcher (open source)](https://github.com/cfcurtis/pdfstitcher)
- [pdfstitch (open source)](https://github.com/sur5r/pdfstitch)
- [ComPDF: PDF technology in construction workflows](https://www.compdf.com/blog/pdf-technology-transform-construction-workflows)
