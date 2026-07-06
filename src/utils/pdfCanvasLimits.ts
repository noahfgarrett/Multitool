const TOUCH_MAX_CANVAS_PIXELS = 5_242_880
const DESKTOP_MAX_CANVAS_PIXELS = 16_777_216

export interface CanvasLimitNavigator {
  userAgent?: string
  platform?: string
  maxTouchPoints?: number
}

export function isTouchCappedCanvasEnvironment(nav: CanvasLimitNavigator): boolean {
  const ua = nav.userAgent || ''
  const platform = nav.platform || ''
  const maxTouch = nav.maxTouchPoints || 1
  const isIOS = /\b(iPad|iPhone|iPod)(?=;)/.test(ua)
    || (platform === 'MacIntel' && maxTouch > 1)
  const isAndroid = /Android/.test(ua)
  return isIOS || isAndroid
}

export function resolveMaxCanvasPixels(nav?: CanvasLimitNavigator): number {
  return nav && isTouchCappedCanvasEnvironment(nav)
    ? TOUCH_MAX_CANVAS_PIXELS
    : DESKTOP_MAX_CANVAS_PIXELS
}
