import { isNewer } from './semver.ts'

const GITHUB_API_URL =
  'https://api.github.com/repos/noahfgarrett/Multitool/releases/latest'
const TIMEOUT_MS = 5000

export interface UpdateInfo {
  version: string
  releaseNotes: string
  downloadUrl: string
  assetApiUrl: string
  assetName: string
  downloadKind: 'html' | 'gzip-html'
  fallbackDownloadUrl?: string
  fallbackAssetApiUrl?: string
  fallbackAssetName?: string
}

export interface GitHubAsset {
  name: string
  url: string
  browser_download_url: string
}

interface GitHubRelease {
  tag_name: string
  body?: string
  html_url: string
  assets?: GitHubAsset[]
}

export type SelectedUpdateAsset = Pick<
  UpdateInfo,
  | 'downloadUrl'
  | 'assetApiUrl'
  | 'assetName'
  | 'downloadKind'
  | 'fallbackDownloadUrl'
  | 'fallbackAssetApiUrl'
  | 'fallbackAssetName'
>

export function selectUpdateAsset(assets: GitHubAsset[] | undefined): SelectedUpdateAsset | null {
  const htmlAsset = assets?.find((asset) =>
    asset.name.toLowerCase().endsWith('.html'),
  )

  // Keep the plain HTML asset mandatory so older builds still show updates.
  if (!htmlAsset) return null

  const gzipAsset = assets?.find((asset) =>
    asset.name.toLowerCase().endsWith('.html.gz'),
  )

  if (!gzipAsset) {
    return {
      downloadUrl: htmlAsset.browser_download_url,
      assetApiUrl: htmlAsset.url,
      assetName: htmlAsset.name,
      downloadKind: 'html',
    }
  }

  return {
    downloadUrl: gzipAsset.browser_download_url,
    assetApiUrl: gzipAsset.url,
    assetName: gzipAsset.name,
    downloadKind: 'gzip-html',
    fallbackDownloadUrl: htmlAsset.browser_download_url,
    fallbackAssetApiUrl: htmlAsset.url,
    fallbackAssetName: htmlAsset.name,
  }
}

/**
 * Check GitHub Releases for a newer version.
 * Returns update info if a newer version exists, null otherwise.
 * Silently returns null on any error — never blocks the app.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(GITHUB_API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
    clearTimeout(timer)

    if (!res.ok) return null

    const release: GitHubRelease = await res.json()
    const remoteVersion = release.tag_name.replace(/^v/, '')

    if (!isNewer(remoteVersion, __APP_VERSION__)) return null

    const selectedAsset = selectUpdateAsset(release.assets)

    // Only show update if the HTML file is attached to the release
    if (!selectedAsset) return null

    return {
      version: remoteVersion,
      releaseNotes: release.body ?? '',
      ...selectedAsset,
    }
  } catch {
    // Network error, timeout, offline — silently ignore
    return null
  }
}
