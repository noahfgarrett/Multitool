import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'

const gzipAsync = promisify(gzip)
const input = 'dist/Multitool.html'
const output = 'dist/Multitool.html.gz'

const html = await readFile(input)
const compressed = await gzipAsync(html, { level: 9 })
await writeFile(output, compressed)

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
console.log(`gzipped ${input}: ${mb(html.byteLength)} -> ${mb(compressed.byteLength)}`)
