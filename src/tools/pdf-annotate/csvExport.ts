import type {
  Measurement,
  PolyMeasurement,
  CountGroup,
  CalibrationState,
  MeasurementExportRow,
} from './types.ts'
import {
  computeSegmentLength,
  computePolylineLength,
  computePolygonArea,
  computeAngleDegrees,
} from './measurementDrawing.ts'

// ── CSV escaping (RFC 4180) ───────────────────────────

/** Escape a single field value for CSV output per RFC 4180. */
function escapeField(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Convert an array of rows to a RFC 4180 CSV string. */
function rowsToCSV(rows: MeasurementExportRow[]): string {
  const header = 'Page,Type,Label,Value,Unit'
  const lines = rows.map((row) =>
    [
      escapeField(String(row.page)),
      escapeField(row.type),
      escapeField(row.label),
      escapeField(row.value.toFixed(4)),
      escapeField(row.unit),
    ].join(','),
  )
  return [header, ...lines].join('\r\n')
}

// ── Export to CSV file ────────────────────────────────

/**
 * Convert measurement rows to CSV and trigger a browser download.
 */
export function exportMeasurementsToCSV(rows: MeasurementExportRow[], fileName: string): void {
  const csv = rowsToCSV(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)

  try {
    anchor.click()
  } finally {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }
}

// ── Gather measurement data ──────────────────────────

/** Convert a pixel-space value to calibrated units (or leave in px). */
function convertValue(
  pxValue: number,
  calibration: CalibrationState,
  isArea: boolean,
): { value: number; unit: string } {
  if (calibration.pixelsPerUnit !== null) {
    const divisor = isArea
      ? calibration.pixelsPerUnit * calibration.pixelsPerUnit
      : calibration.pixelsPerUnit
    return {
      value: pxValue / divisor,
      unit: isArea ? `${calibration.unit}²` : calibration.unit,
    }
  }
  return {
    value: pxValue,
    unit: isArea ? 'px²' : 'px',
  }
}

/**
 * Gather all measurement data from legacy measurements, poly measurements,
 * and count groups into a flat array of export rows.
 */
export function gatherMeasurementData(
  measurements: Record<number, Measurement[]>,
  polyMeasurements: Record<number, PolyMeasurement[]>,
  countGroups: Record<number, CountGroup[]>,
  calibration: CalibrationState,
): MeasurementExportRow[] {
  const rows: MeasurementExportRow[] = []

  // Legacy 2-point distance measurements
  for (const [pageStr, pageMeasurements] of Object.entries(measurements)) {
    const page = parseInt(pageStr, 10)
    for (const m of pageMeasurements) {
      const pxDist = computeSegmentLength(m.startPt, m.endPt)
      const { value, unit } = convertValue(pxDist, calibration, false)
      rows.push({
        page,
        type: 'distance',
        label: `Distance ${m.id.slice(0, 8)}`,
        value,
        unit,
      })
    }
  }

  // Poly measurements (distance, polylength, area)
  for (const [pageStr, pagePoly] of Object.entries(polyMeasurements)) {
    const page = parseInt(pageStr, 10)
    for (const pm of pagePoly) {
      if (pm.mode === 'distance' && pm.points.length >= 2) {
        const pxDist = computeSegmentLength(pm.points[0], pm.points[1])
        const { value, unit } = convertValue(pxDist, calibration, false)
        rows.push({
          page,
          type: 'distance',
          label: pm.label || `Distance ${pm.id.slice(0, 8)}`,
          value,
          unit,
        })
      } else if (pm.mode === 'polylength' && pm.points.length >= 2) {
        const pxLen = computePolylineLength(pm.points)
        const { value, unit } = convertValue(pxLen, calibration, false)
        rows.push({
          page,
          type: 'polylength',
          label: pm.label || `Polylength ${pm.id.slice(0, 8)}`,
          value,
          unit,
        })
      } else if (pm.mode === 'area' && pm.points.length >= 3) {
        // Area
        const pxArea = computePolygonArea(pm.points)
        const { value: areaVal, unit: areaUnit } = convertValue(pxArea, calibration, true)
        rows.push({
          page,
          type: 'area',
          label: pm.label || `Area ${pm.id.slice(0, 8)}`,
          value: areaVal,
          unit: areaUnit,
        })

        // Perimeter
        let perimeter = computePolylineLength(pm.points)
        perimeter += computeSegmentLength(pm.points[pm.points.length - 1], pm.points[0])
        const { value: perimVal, unit: perimUnit } = convertValue(perimeter, calibration, false)
        rows.push({
          page,
          type: 'perimeter',
          label: pm.label ? `${pm.label} (perimeter)` : `Perimeter ${pm.id.slice(0, 8)}`,
          value: perimVal,
          unit: perimUnit,
        })

        // Volume (area × depth) when depth is set
        if (pm.depth && pm.depth > 0) {
          let volume: number
          let volumeUnit: string
          if (calibration.pixelsPerUnit !== null) {
            const ppu = calibration.pixelsPerUnit
            const calibratedArea = pxArea / (ppu * ppu)
            volume = calibratedArea * pm.depth
            volumeUnit = `${calibration.unit}³`
          } else {
            volume = pxArea * pm.depth
            volumeUnit = 'px³'
          }
          rows.push({
            page,
            type: 'volume',
            label: pm.label ? `${pm.label} (volume)` : `Volume ${pm.id.slice(0, 8)}`,
            value: volume,
            unit: volumeUnit,
          })
        }
      } else if (pm.mode === 'angle' && pm.points.length >= 3) {
        const degrees = computeAngleDegrees(pm.points[0], pm.points[1], pm.points[2])
        rows.push({
          page,
          type: 'angle',
          label: pm.label || `Angle ${pm.id.slice(0, 8)}`,
          value: degrees,
          unit: '°',
        })
      }
    }
  }

  // Count groups
  for (const [pageStr, pageGroups] of Object.entries(countGroups)) {
    const page = parseInt(pageStr, 10)
    for (const group of pageGroups) {
      rows.push({
        page,
        type: 'count',
        label: group.label,
        value: group.points.length,
        unit: 'items',
      })
    }
  }

  // Sort by page number, then by type
  rows.sort((a, b) => a.page - b.page || a.type.localeCompare(b.type))

  return rows
}
