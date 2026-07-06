export interface ViteBuildMode {
  outDir: 'dist' | 'dist-tauri' | 'dist-pages'
  singleFile: boolean
  bundledOcr: boolean
  base: './'
}

export function resolveViteBuildMode(mode: string): ViteBuildMode {
  const isTauri = mode === 'tauri'
  const isPages = mode === 'pages'

  if (isPages) {
    return {
      outDir: 'dist-pages',
      singleFile: false,
      bundledOcr: false,
      base: './',
    }
  }

  return {
    outDir: isTauri ? 'dist-tauri' : 'dist',
    singleFile: !isTauri,
    bundledOcr: true,
    base: './',
  }
}
