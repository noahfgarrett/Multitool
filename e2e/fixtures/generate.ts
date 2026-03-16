import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname)

export default async function globalSetup() {
  if (!existsSync(FIXTURES_DIR)) mkdirSync(FIXTURES_DIR, { recursive: true })

  // Generate sample PDF (2 pages with text)
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const page1 = pdfDoc.addPage([612, 792])
  page1.drawText('Test PDF - Page 1', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) })
  page1.drawText('This is a test document for E2E testing.', { x: 50, y: 660, size: 12, font, color: rgb(0.3, 0.3, 0.3) })
  page1.drawRectangle({ x: 50, y: 400, width: 200, height: 100, borderColor: rgb(0, 0, 0), borderWidth: 1 })

  const page2 = pdfDoc.addPage([612, 792])
  page2.drawText('Test PDF - Page 2', { x: 50, y: 700, size: 24, font, color: rgb(0, 0, 0) })
  page2.drawText('Second page of the test document.', { x: 50, y: 660, size: 12, font, color: rgb(0.3, 0.3, 0.3) })

  const pdfBytes = await pdfDoc.save()
  writeFileSync(join(FIXTURES_DIR, 'sample.pdf'), Buffer.from(pdfBytes))

  // Generate single-page PDF
  const singleDoc = await PDFDocument.create()
  const singleFont = await singleDoc.embedFont(StandardFonts.Helvetica)
  const singlePage = singleDoc.addPage([612, 792])
  singlePage.drawText('Single Page PDF', { x: 50, y: 700, size: 24, font: singleFont, color: rgb(0, 0, 0) })
  const singleBytes = await singleDoc.save()
  writeFileSync(join(FIXTURES_DIR, 'single-page.pdf'), Buffer.from(singleBytes))

  // Generate sample CSV
  const csv = `Name,Age,Department,Salary
John Doe,32,Engineering,95000
Jane Smith,28,Marketing,72000
Bob Wilson,45,Sales,88000
Alice Brown,35,Engineering,102000
Charlie Davis,41,Marketing,78000`
  writeFileSync(join(FIXTURES_DIR, 'sample.csv'), csv)

  // Generate sample JSON
  const json = JSON.stringify({
    employees: [
      { name: 'John Doe', age: 32, department: 'Engineering' },
      { name: 'Jane Smith', age: 28, department: 'Marketing' },
      { name: 'Bob Wilson', age: 45, department: 'Sales' },
    ],
    metadata: { total: 3, generated: new Date().toISOString() },
  }, null, 2)
  writeFileSync(join(FIXTURES_DIR, 'sample.json'), json)

  // Generate a minimal PNG (1x1 orange pixel)
  // PNG file format: signature + IHDR + IDAT + IEND
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  // Create a simple 100x100 orange PNG using minimal encoding
  const width = 100, height = 100
  const ihdr = createIHDRChunk(width, height)
  const idat = createIDATChunk(width, height, [0xF4, 0x7B, 0x20]) // orange
  const iend = createIENDChunk()
  const png = Buffer.concat([pngSignature, ihdr, idat, iend])
  writeFileSync(join(FIXTURES_DIR, 'sample-image.png'), png)

  // Generate zero-byte file for chaos testing
  writeFileSync(join(FIXTURES_DIR, 'zero-byte.pdf'), Buffer.alloc(0))

  // Generate a text file (wrong type for PDF upload)
  writeFileSync(join(FIXTURES_DIR, 'not-a-pdf.txt'), 'This is not a PDF file')
}

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBuffer = Buffer.from(type)
  const crcData = Buffer.concat([typeBuffer, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcData))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function createIHDRChunk(width: number, height: number): Buffer {
  const data = Buffer.alloc(13)
  data.writeUInt32BE(width, 0)
  data.writeUInt32BE(height, 4)
  data[8] = 8  // bit depth
  data[9] = 2  // color type (RGB)
  data[10] = 0 // compression
  data[11] = 0 // filter
  data[12] = 0 // interlace
  return createChunk('IHDR', data)
}

function createIDATChunk(width: number, height: number, rgb: number[]): Buffer {
  // Raw image data: each row starts with filter byte 0 (none) + RGB pixels
  const rowSize = 1 + width * 3
  const rawData = Buffer.alloc(rowSize * height)
  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0 // filter byte
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3
      rawData[offset] = rgb[0]
      rawData[offset + 1] = rgb[1]
      rawData[offset + 2] = rgb[2]
    }
  }
  // Use zlib to compress
  const compressed = deflateSync(rawData)
  return createChunk('IDAT', compressed)
}

function createIENDChunk(): Buffer {
  return createChunk('IEND', Buffer.alloc(0))
}

// ── Text Extract test fixtures ──────────────────────────

async function generateTextExtractFixtures() {
  const boldFont = StandardFonts.HelveticaBold
  const regularFont = StandardFonts.Helvetica

  // ── 1. Simple table PDF (5 rows, 4 columns, with drawn grid lines) ──
  {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(regularFont)
    const bFont = await doc.embedFont(boldFont)
    const page = doc.addPage([612, 792])

    page.drawText('Employee Directory', { x: 50, y: 740, size: 20, font: bFont })

    const tableX = 50, tableY = 700, colW = 130, rowH = 24
    const headers = ['Name', 'Department', 'Title', 'Salary']
    const rows = [
      ['Alice Johnson', 'Engineering', 'Senior Dev', '$125,000'],
      ['Bob Martinez', 'Marketing', 'Director', '$98,500'],
      ['Carol Chen', 'Finance', 'Analyst', '$87,200'],
      ['David Kim', 'Engineering', 'Staff Dev', '$142,000'],
      ['Eve Wilson', 'Sales', 'Manager', '$105,750'],
    ]

    // Draw grid lines
    const totalW = colW * headers.length
    const totalH = rowH * (rows.length + 1)
    for (let r = 0; r <= rows.length + 1; r++) {
      const y = tableY - r * rowH
      page.drawLine({ start: { x: tableX, y }, end: { x: tableX + totalW, y }, thickness: 1, color: rgb(0, 0, 0) })
    }
    for (let c = 0; c <= headers.length; c++) {
      const x = tableX + c * colW
      page.drawLine({ start: { x, y: tableY }, end: { x, y: tableY - totalH }, thickness: 1, color: rgb(0, 0, 0) })
    }

    // Draw headers
    for (let c = 0; c < headers.length; c++) {
      page.drawText(headers[c], { x: tableX + c * colW + 5, y: tableY - 16, size: 10, font: bFont })
    }
    // Draw data rows
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        page.drawText(rows[r][c], { x: tableX + c * colW + 5, y: tableY - (r + 1) * rowH - 16, size: 9, font })
      }
    }

    writeFileSync(join(FIXTURES_DIR, 'table-simple.pdf'), Buffer.from(await doc.save()))
  }

  // ── 2. Multi-column table (6 columns, numeric data) ──
  {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(regularFont)
    const bFont = await doc.embedFont(boldFont)
    const page = doc.addPage([792, 612]) // Landscape

    page.drawText('Quarterly Sales Report', { x: 50, y: 570, size: 18, font: bFont })

    const tableX = 50, tableY = 540, rowH = 22
    const colWidths = [100, 80, 80, 80, 80, 100]
    const headers = ['Region', 'Q1', 'Q2', 'Q3', 'Q4', 'Total']
    const rows = [
      ['Northeast', '45,200', '52,100', '48,900', '61,300', '207,500'],
      ['Southeast', '38,700', '41,200', '39,800', '44,100', '163,800'],
      ['Midwest', '29,100', '33,500', '31,200', '37,800', '131,600'],
      ['Southwest', '22,400', '25,100', '24,800', '28,900', '101,200'],
      ['West Coast', '56,800', '62,400', '59,100', '71,200', '249,500'],
      ['Northwest', '18,300', '21,700', '19,900', '24,100', '84,000'],
    ]

    // Draw grid
    const totalW = colWidths.reduce((a, b) => a + b, 0)
    const totalH = rowH * (rows.length + 1)
    for (let r = 0; r <= rows.length + 1; r++) {
      page.drawLine({ start: { x: tableX, y: tableY - r * rowH }, end: { x: tableX + totalW, y: tableY - r * rowH }, thickness: 1, color: rgb(0, 0, 0) })
    }
    let cx = tableX
    for (let c = 0; c <= headers.length; c++) {
      page.drawLine({ start: { x: cx, y: tableY }, end: { x: cx, y: tableY - totalH }, thickness: 1, color: rgb(0, 0, 0) })
      if (c < headers.length) cx += colWidths[c]
    }

    // Headers
    cx = tableX
    for (let c = 0; c < headers.length; c++) {
      page.drawText(headers[c], { x: cx + 5, y: tableY - 15, size: 9, font: bFont })
      cx += colWidths[c]
    }
    // Rows
    for (let r = 0; r < rows.length; r++) {
      cx = tableX
      for (let c = 0; c < rows[r].length; c++) {
        page.drawText(rows[r][c], { x: cx + 5, y: tableY - (r + 1) * rowH - 15, size: 9, font })
        cx += colWidths[c]
      }
    }

    writeFileSync(join(FIXTURES_DIR, 'table-multicolumn.pdf'), Buffer.from(await doc.save()))
  }

  // ── 3. Large table PDF (50+ rows, 3 pages) ──
  {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(regularFont)
    const bFont = await doc.embedFont(boldFont)

    const headers = ['ID', 'Product', 'Category', 'Price']
    const colWidths = [50, 200, 120, 80]
    const allRows: string[][] = []
    const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports']
    for (let i = 1; i <= 60; i++) {
      allRows.push([
        String(i),
        `Product Item ${i}`,
        categories[(i - 1) % categories.length],
        `$${(Math.floor(Math.random() * 9000) + 1000) / 100}`,
      ])
    }

    const rowsPerPage = 25
    for (let p = 0; p < Math.ceil(allRows.length / rowsPerPage); p++) {
      const page = doc.addPage([612, 792])
      const pageRows = allRows.slice(p * rowsPerPage, (p + 1) * rowsPerPage)
      const tableX = 50, tableY = 720, rowH = 22
      const totalW = colWidths.reduce((a, b) => a + b, 0)

      page.drawText(`Product Inventory — Page ${p + 1}`, { x: 50, y: 750, size: 16, font: bFont })

      // Grid
      for (let r = 0; r <= pageRows.length + 1; r++) {
        page.drawLine({ start: { x: tableX, y: tableY - r * rowH }, end: { x: tableX + totalW, y: tableY - r * rowH }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) })
      }
      let cx = tableX
      for (let c = 0; c <= headers.length; c++) {
        page.drawLine({ start: { x: cx, y: tableY }, end: { x: cx, y: tableY - (pageRows.length + 1) * rowH }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) })
        if (c < headers.length) cx += colWidths[c]
      }

      // Headers
      cx = tableX
      for (let c = 0; c < headers.length; c++) {
        page.drawText(headers[c], { x: cx + 4, y: tableY - 15, size: 9, font: bFont })
        cx += colWidths[c]
      }
      // Rows
      for (let r = 0; r < pageRows.length; r++) {
        cx = tableX
        for (let c = 0; c < pageRows[r].length; c++) {
          page.drawText(pageRows[r][c], { x: cx + 4, y: tableY - (r + 1) * rowH - 15, size: 8, font })
          cx += colWidths[c]
        }
      }
    }

    writeFileSync(join(FIXTURES_DIR, 'table-large.pdf'), Buffer.from(await doc.save()))
  }

  // ── 4. Mixed content PDF (paragraphs + table on same page) ──
  {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(regularFont)
    const bFont = await doc.embedFont(boldFont)
    const page = doc.addPage([612, 792])

    page.drawText('Project Status Report', { x: 50, y: 740, size: 22, font: bFont })
    page.drawText('Prepared by: Engineering Team', { x: 50, y: 715, size: 11, font })
    page.drawText('Date: March 2026', { x: 50, y: 700, size: 11, font })

    const paraY = 670
    const lines = [
      'This report summarizes the current status of all active projects.',
      'Each project is tracked by milestone completion percentage and',
      'estimated delivery date. Projects marked as "At Risk" require',
      'immediate attention from the leadership team.',
    ]
    for (let i = 0; i < lines.length; i++) {
      page.drawText(lines[i], { x: 50, y: paraY - i * 16, size: 11, font })
    }

    // Table below paragraphs
    const tableX = 50, tableY = 580, colW = 130, rowH = 22
    const headers = ['Project', 'Lead', 'Progress', 'Status']
    const rows = [
      ['Alpha Release', 'J. Smith', '85%', 'On Track'],
      ['Beta Platform', 'M. Jones', '42%', 'At Risk'],
      ['Cloud Migration', 'K. Lee', '91%', 'On Track'],
      ['Data Pipeline', 'R. Patel', '67%', 'Delayed'],
    ]

    const totalW = colW * headers.length
    const totalH = rowH * (rows.length + 1)
    for (let r = 0; r <= rows.length + 1; r++) {
      page.drawLine({ start: { x: tableX, y: tableY - r * rowH }, end: { x: tableX + totalW, y: tableY - r * rowH }, thickness: 1, color: rgb(0, 0, 0) })
    }
    for (let c = 0; c <= headers.length; c++) {
      page.drawLine({ start: { x: tableX + c * colW, y: tableY }, end: { x: tableX + c * colW, y: tableY - totalH }, thickness: 1, color: rgb(0, 0, 0) })
    }
    for (let c = 0; c < headers.length; c++) {
      page.drawText(headers[c], { x: tableX + c * colW + 5, y: tableY - 15, size: 10, font: bFont })
    }
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        page.drawText(rows[r][c], { x: tableX + c * colW + 5, y: tableY - (r + 1) * rowH - 15, size: 9, font })
      }
    }

    // More text after table
    page.drawText('Next Steps:', { x: 50, y: 440, size: 14, font: bFont })
    page.drawText('1. Review at-risk projects in weekly standup', { x: 50, y: 420, size: 11, font })
    page.drawText('2. Reallocate resources to delayed projects', { x: 50, y: 404, size: 11, font })
    page.drawText('3. Update stakeholders on revised timelines', { x: 50, y: 388, size: 11, font })

    writeFileSync(join(FIXTURES_DIR, 'mixed-content.pdf'), Buffer.from(await doc.save()))
  }

  // ── 5. Complex table (varied column widths, many columns) ──
  {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(regularFont)
    const bFont = await doc.embedFont(boldFont)
    const page = doc.addPage([792, 612]) // Landscape

    page.drawText('Budget Allocation Summary', { x: 50, y: 570, size: 18, font: bFont })

    const tableX = 40, tableY = 540, rowH = 20
    const colWidths = [120, 70, 70, 70, 70, 70, 70, 90]
    const headers = ['Department', 'Staff', 'Travel', 'Equipment', 'Software', 'Training', 'Other', 'Total Budget']
    const rows = [
      ['Engineering', '450K', '25K', '80K', '120K', '35K', '15K', '$725,000'],
      ['Marketing', '280K', '45K', '20K', '60K', '25K', '30K', '$460,000'],
      ['Sales', '380K', '75K', '15K', '40K', '30K', '20K', '$560,000'],
      ['Finance', '220K', '10K', '25K', '45K', '20K', '10K', '$330,000'],
      ['HR', '180K', '15K', '10K', '30K', '40K', '25K', '$300,000'],
    ]

    const totalW = colWidths.reduce((a, b) => a + b, 0)
    const totalH = rowH * (rows.length + 1)
    for (let r = 0; r <= rows.length + 1; r++) {
      page.drawLine({ start: { x: tableX, y: tableY - r * rowH }, end: { x: tableX + totalW, y: tableY - r * rowH }, thickness: 0.5, color: rgb(0, 0, 0) })
    }
    let cx = tableX
    for (let c = 0; c <= headers.length; c++) {
      page.drawLine({ start: { x: cx, y: tableY }, end: { x: cx, y: tableY - totalH }, thickness: 0.5, color: rgb(0, 0, 0) })
      if (c < headers.length) cx += colWidths[c]
    }
    cx = tableX
    for (let c = 0; c < headers.length; c++) {
      page.drawText(headers[c], { x: cx + 3, y: tableY - 14, size: 8, font: bFont })
      cx += colWidths[c]
    }
    for (let r = 0; r < rows.length; r++) {
      cx = tableX
      for (let c = 0; c < rows[r].length; c++) {
        page.drawText(rows[r][c], { x: cx + 3, y: tableY - (r + 1) * rowH - 14, size: 8, font })
        cx += colWidths[c]
      }
    }

    writeFileSync(join(FIXTURES_DIR, 'table-complex.pdf'), Buffer.from(await doc.save()))
  }

  // ── 6. Multi-page document (text-heavy, for document mode testing) ──
  {
    const doc = await PDFDocument.create()
    const font = await doc.embedFont(regularFont)
    const bFont = await doc.embedFont(boldFont)

    const paragraphs = [
      { title: 'Introduction', text: 'This document contains multiple sections of text designed to test the document extraction mode. Each section has a heading followed by body text that should be properly extracted and formatted.' },
      { title: 'Technical Overview', text: 'The system architecture consists of three main components: the frontend user interface built with React, the data processing layer using WebAssembly, and the local storage system using IndexedDB. All processing occurs client-side with zero server communication.' },
      { title: 'Implementation Details', text: 'The text extraction pipeline first attempts to read embedded text from the PDF using pdf.js. If the document contains fewer than 50 characters of embedded text, the system falls back to OCR using Tesseract.js with a rendering scale of 2.0x for optimal accuracy.' },
      { title: 'Performance Metrics', text: 'Average extraction time for a single page is 1.2 seconds for embedded text and 8.5 seconds for OCR. Table detection adds approximately 200ms per page. Export to PDF takes 500ms for documents under 10 pages.' },
      { title: 'Conclusion', text: 'The text extraction tool provides reliable, offline document processing suitable for sensitive environments. Future improvements will include multi-language OCR support and advanced table structure recognition.' },
    ]

    for (let p = 0; p < 3; p++) {
      const page = doc.addPage([612, 792])
      let y = 730
      page.drawText(`Document — Page ${p + 1}`, { x: 50, y: 750, size: 10, font, color: rgb(0.5, 0.5, 0.5) })

      const startIdx = p === 0 ? 0 : p === 1 ? 2 : 4
      const endIdx = p === 0 ? 2 : p === 1 ? 4 : 5
      for (let i = startIdx; i < endIdx && i < paragraphs.length; i++) {
        page.drawText(paragraphs[i].title, { x: 50, y, size: 16, font: bFont })
        y -= 24
        // Word-wrap the paragraph text
        const words = paragraphs[i].text.split(' ')
        let line = ''
        for (const word of words) {
          const testLine = line ? `${line} ${word}` : word
          if (font.widthOfTextAtSize(testLine, 11) > 500) {
            page.drawText(line, { x: 50, y, size: 11, font })
            y -= 16
            line = word
          } else {
            line = testLine
          }
        }
        if (line) {
          page.drawText(line, { x: 50, y, size: 11, font })
          y -= 30
        }
      }
    }

    writeFileSync(join(FIXTURES_DIR, 'document-multipage.pdf'), Buffer.from(await doc.save()))
  }

  console.log('Text extract fixtures generated: table-simple.pdf, table-multicolumn.pdf, table-large.pdf, mixed-content.pdf, table-complex.pdf, document-multipage.pdf')
}

// Allow running directly
globalSetup()
  .then(() => generateTextExtractFixtures())
  .then(() => console.log('All fixtures generated'))
