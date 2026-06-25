export interface OcrWord {
  text: string
  x: number
  y: number
  width: number
  height: number
  page: number
  confidence?: number
}

export interface OcrTextResult {
  text: string
  words: OcrWord[]
}

export interface OcrProgress {
  status: string
  progress: number
}
