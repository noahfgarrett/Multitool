import { DEFAULT_CHART_BACKGROUND, isHexColor } from './types.ts'

export type ExportBackgroundMode = 'current' | 'transparent' | 'white' | 'dark' | 'custom'

export interface ExportBackgroundChoice {
  mode: ExportBackgroundMode
  chartColor: string
  customColor?: string
}

export interface ImageExportOptions {
  backgroundColor?: string | null
}

export function resolveExportBackgroundColor(choice: ExportBackgroundChoice): string | null {
  switch (choice.mode) {
    case 'current':
      return isHexColor(choice.chartColor) ? choice.chartColor.toLowerCase() : DEFAULT_CHART_BACKGROUND
    case 'transparent':
      return null
    case 'white':
      return '#ffffff'
    case 'dark':
      return DEFAULT_CHART_BACKGROUND
    case 'custom':
      if (isHexColor(choice.customColor)) return choice.customColor.toLowerCase()
      return isHexColor(choice.chartColor) ? choice.chartColor.toLowerCase() : DEFAULT_CHART_BACKGROUND
  }
}
