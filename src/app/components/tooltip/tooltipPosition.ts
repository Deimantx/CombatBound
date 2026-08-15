export type TooltipSide = 'top' | 'bottom' | 'right' | 'left'

export interface TooltipPositionInput {
  anchor: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right' | 'width' | 'height'>
  tooltip: Pick<DOMRect, 'width' | 'height'>
  viewport: { width: number; height: number }
  gap?: number
  padding?: number
}

export interface TooltipPosition { top: number; left: number; side: TooltipSide }

export interface PointerPosition {
  x: number
  y: number
}

export function positionTooltip({ anchor, tooltip, viewport, gap = 10, padding = 10 }: TooltipPositionInput): TooltipPosition {
  const candidates: Array<{ side: TooltipSide; top: number; left: number; room: number }> = [
    { side: 'top', top: anchor.top - tooltip.height - gap, left: anchor.left + (anchor.width - tooltip.width) / 2, room: anchor.top - padding },
    { side: 'bottom', top: anchor.bottom + gap, left: anchor.left + (anchor.width - tooltip.width) / 2, room: viewport.height - anchor.bottom - padding },
    { side: 'right', top: anchor.top + (anchor.height - tooltip.height) / 2, left: anchor.right + gap, room: viewport.width - anchor.right - padding },
    { side: 'left', top: anchor.top + (anchor.height - tooltip.height) / 2, left: anchor.left - tooltip.width - gap, room: anchor.left - padding },
  ]
  const preferred = candidates.find((candidate) => candidate.room >= (candidate.side === 'top' || candidate.side === 'bottom' ? tooltip.height : tooltip.width)) ?? candidates[0]
  return { top: clamp(preferred.top, padding, Math.max(padding, viewport.height - tooltip.height - padding)), left: clamp(preferred.left, padding, Math.max(padding, viewport.width - tooltip.width - padding)), side: preferred.side }
}

export interface PointerTooltipPositionInput {
  pointer: PointerPosition
  tooltip: Pick<DOMRect, 'width' | 'height'>
  viewport: { width: number; height: number }
  gap?: number
  padding?: number
}

export function positionTooltipAtPointer({ pointer, tooltip, viewport, gap = 14, padding = 10 }: PointerTooltipPositionInput): TooltipPosition {
  const rightFits = pointer.x + gap + tooltip.width <= viewport.width - padding
  const side: TooltipSide = rightFits ? 'right' : 'left'
  const left = rightFits
    ? pointer.x + gap
    : pointer.x - tooltip.width - gap
  const top = pointer.y + 10
  return {
    top: clamp(top, padding, Math.max(padding, viewport.height - tooltip.height - padding)),
    left: clamp(left, padding, Math.max(padding, viewport.width - tooltip.width - padding)),
    side,
  }
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)) }
