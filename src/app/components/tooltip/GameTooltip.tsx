import { cloneElement, useEffect, useRef, type FocusEvent, type MouseEvent, type ReactElement } from 'react'
import { useTooltip } from './TooltipProvider'
import type { TooltipModel } from './tooltipTypes'

interface TooltipTriggerProps {
  children: ReactElement<{ [key: string]: unknown }>
  content: TooltipModel
  targetId?: string
  label?: string
}

export function GameTooltip({ children, content, targetId, label }: TooltipTriggerProps) {
  const { showTooltip, updateTooltipPointer, hideTooltip } = useTooltip()
  const anchor = useRef<HTMLElement | null>(null)
  const setAnchor = (element: HTMLElement | null) => { anchor.current = element }
  useEffect(() => () => hideTooltip(anchor.current ?? undefined), [hideTooltip])
  const show = (immediate: boolean, element: HTMLElement, pointer?: { x: number; y: number }) => {
    anchor.current = element
    showTooltip(content, element, { immediate, interaction: immediate ? 'focus' : 'pointer', pointer })
  }
  const original = children.props as { onMouseEnter?: (event: MouseEvent<HTMLElement>) => void; onMouseMove?: (event: MouseEvent<HTMLElement>) => void; onMouseLeave?: (event: MouseEvent<HTMLElement>) => void; onFocus?: (event: FocusEvent<HTMLElement>) => void; onBlur?: (event: FocusEvent<HTMLElement>) => void; onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void }
  return cloneElement(children, {
    ref: setAnchor,
    onMouseEnter: (event: MouseEvent<HTMLElement>) => { original.onMouseEnter?.(event); show(false, event.currentTarget, { x: event.clientX, y: event.clientY }) },
    onMouseMove: (event: MouseEvent<HTMLElement>) => { original.onMouseMove?.(event); updateTooltipPointer(event.currentTarget, { x: event.clientX, y: event.clientY }) },
    onMouseLeave: (event: MouseEvent<HTMLElement>) => { original.onMouseLeave?.(event); hideTooltip(event.currentTarget) },
    onFocus: (event: FocusEvent<HTMLElement>) => { original.onFocus?.(event); show(true, event.currentTarget) },
    onBlur: (event: FocusEvent<HTMLElement>) => { original.onBlur?.(event); hideTooltip(event.currentTarget) },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => { original.onKeyDown?.(event); if (event.key === 'Escape') hideTooltip(event.currentTarget) },
    'data-debug-kind': children.props['data-debug-kind'] ?? 'tooltip-trigger',
    'data-debug-tooltip-id': content.id,
    'data-debug-tooltip-content': content.id,
    'data-debug-target-id': targetId ?? children.props['data-debug-target-id'],
    'data-debug-label': label ?? children.props['data-debug-label'] ?? content.title,
  })
}
