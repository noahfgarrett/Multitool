import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PDFDocument, PDFName, PDFString } from 'pdf-lib'
import { embedAnnotationData, extractAnnotationData, hasEmbeddedAnnotations } from './metadataEmbed.ts'
import type { EmbeddedAnnotationData } from './types.ts'

const data: EmbeddedAnnotationData = {
  version: 1,
  annotations: {},
  measurements: {},
  polyMeasurements: {},
  countGroups: {},
  commentThreads: [],
  stickyNotes: {},
  calibration: { pixelsPerUnit: null, unit: 'ft' },
  pageRotations: { 1: 90 },
}

async function blankPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage()
  doc.setTitle('fixture')
  return doc.save()
}

test('embedded annotation data round-trips through the PDF Info dictionary', async () => {
  const pdf = await embedAnnotationData(await blankPdf(), data)
  assert.equal(await hasEmbeddedAnnotations(pdf), true)
  assert.deepEqual(await extractAnnotationData(pdf), data)
})

for (const legacyKey of ['ApexAnnotations', 'LotusWorksAnnotations']) {
  test(`annotation data stored under the legacy ${legacyKey} key is still read`, async () => {
    const doc = await PDFDocument.load(await blankPdf())
    const info = doc.context.lookup(doc.context.trailerInfo.Info)
    const encoded = Buffer.from(JSON.stringify(data), 'utf8').toString('base64')
    ;(info as import('pdf-lib').PDFDict).set(PDFName.of(legacyKey), PDFString.of(encoded))
    const pdf = await doc.save()

    assert.equal(await hasEmbeddedAnnotations(pdf), true)
    assert.deepEqual(await extractAnnotationData(pdf), data)
  })
}

test('a PDF without annotation metadata reports none', async () => {
  const pdf = await blankPdf()
  assert.equal(await hasEmbeddedAnnotations(pdf), false)
  assert.equal(await extractAnnotationData(pdf), null)
})
