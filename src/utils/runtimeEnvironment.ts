interface RuntimeGlobal {
  __TAURI_INTERNALS__?: unknown
  __TAURI__?: unknown
}

export function isTauriRuntime(runtime: RuntimeGlobal = globalThis as RuntimeGlobal): boolean {
  return typeof runtime.__TAURI_INTERNALS__ !== 'undefined'
    || typeof runtime.__TAURI__ !== 'undefined'
}

export function shouldCheckHtmlUpdates(options: { isPwa: boolean; isTauri: boolean }): boolean {
  return !options.isPwa && !options.isTauri
}
