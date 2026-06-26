export interface ViteBuildMode {
  outDir: 'dist' | 'dist-tauri'
  singleFile: boolean
}

export function resolveViteBuildMode(mode: string): ViteBuildMode {
  const isTauri = mode === 'tauri'
  return {
    outDir: isTauri ? 'dist-tauri' : 'dist',
    singleFile: !isTauri,
  }
}
