# Multitool

I built Multitool after my workplace lost access to Foxit PDF software following budget cuts. It started as a replacement for the PDF viewing and annotation tools we needed, then grew into an all-in-one toolkit for everyday office work.

Built with React, TypeScript, and Vite.

## What It Does

- View, annotate, merge, split, and watermark PDFs; extract embedded text and recognize scanned text with OCR.
- Resize images, remove backgrounds by color, compress files, and convert formats.
- Create forms, organization charts, and flowcharts; build dashboards from CSV or Excel data.
- Generate QR codes and explore JSON or CSV files.

## Design Choices

- **Single-file distribution:** the full browser build packages the application into one HTML file that can be shared and opened without a server.
- **Large-document rendering:** the PDF viewer uses progressive tiles, prioritizes visible content, and caches recently viewed pages to balance responsiveness and memory use.

Document and image processing runs in the browser. Update checks and downloads use GitHub, and Tesseract OCR can download worker and language resources, so not every feature is fully offline. The full HTML build includes PaddleOCR; the lightweight hosted build omits OCR.

## Run Locally

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## Build

```sh
npm run build
```

Produces `dist/Multitool.html` and its compressed update download, `dist/Multitool.html.gz`.

`npm run build:pwa` creates the lightweight hosted build in `dist-pages/`.
