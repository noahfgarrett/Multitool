export interface MouseButtonEventLike {
  button: number
}

export interface MiddleMousePanStart {
  startX: number
  startY: number
  scrollLeft: number
  scrollTop: number
}

export interface PointerPosition {
  clientX: number
  clientY: number
}

export function shouldHandleMiddleMousePan(event: MouseButtonEventLike): boolean {
  return event.button === 1
}

export function getMiddleMousePanCursor(): 'grabbing' {
  return 'grabbing'
}

export function getPannedScrollPosition(
  pan: MiddleMousePanStart,
  pointer: PointerPosition,
): { scrollLeft: number; scrollTop: number } {
  return {
    scrollLeft: pan.scrollLeft - (pointer.clientX - pan.startX),
    scrollTop: pan.scrollTop - (pointer.clientY - pan.startY),
  }
}
