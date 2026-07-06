import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'path'
import { readFileSync } from 'fs'
import { resolveViteBuildMode } from './src/utils/viteBuildMode'

const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string }

export default defineConfig(({ mode }) => {
  const buildMode = resolveViteBuildMode(mode)

  return {
    base: buildMode.base,
    plugins: [
      react(),
      ...(buildMode.singleFile ? [viteSingleFile()] : []),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: [
        {
          find: '@/utils/ocr/runtime.ts',
          replacement: path.resolve(
            __dirname,
            buildMode.bundledOcr ? 'src/utils/ocr/runtime.ts' : 'src/utils/ocr/pwaRuntime.ts',
          ),
        },
        { find: '@', replacement: path.resolve(__dirname, 'src') },
        { find: 'onnxruntime-web', replacement: 'onnxruntime-web/wasm' },
      ],
    },
    build: {
      outDir: buildMode.outDir,
      target: 'esnext',
      cssCodeSplit: false,
      rollupOptions: buildMode.singleFile
        ? {
            output: {
              inlineDynamicImports: true,
              manualChunks: undefined,
            },
          }
        : undefined,
      chunkSizeWarningLimit: 10000,
    },
  }
})
