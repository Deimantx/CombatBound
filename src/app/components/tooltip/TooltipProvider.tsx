import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TooltipPortal } from './TooltipPortal'
import type { TooltipModel } from './tooltipTypes'

export const TOOLTIP_OPEN_DELAY_MS = 500

interface TooltipContextValue {
  showTooltip: (model: TooltipModel, anchor: HTMLElement, immediate?: boolean) => void
  hideTooltip: (anchor?: HTMLElement) => void
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<{ model: TooltipModel; anchor: HTMLElement; visible: boolean } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const clearTimer = useCallback(() => { if (timer.current !== undefined) window.clearTimeout(timer.current); timer.current = undefined }, [])
  const suppressed = () => Boolean(document.querySelector('.ui-inspector-overlay'))
  const hideTooltip = useCallback((anchor?: HTMLElement) => {
    clearTimer()
    setActive((current) => !anchor || current?.anchor === anchor ? null : current)
  }, [clearTimer])
  const showTooltip = useCallback((model: TooltipModel, anchor: HTMLElement, immediate = false) => {
    clearTimer()
    if (suppressed() || !anchor.isConnected) return
    setActive({ model, anchor, visible: immediate })
    if (!immediate) timer.current = window.setTimeout(() => { if (anchor.isConnected && !suppressed()) setActive((current) => current?.anchor === anchor && current.model.id === model.id ? { ...current, visible: true } : current) }, TOOLTIP_OPEN_DELAY_MS)
  }, [clearTimer])
  useEffect(() => () => clearTimer(), [clearTimer])
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') hideTooltip() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [hideTooltip])
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.ui-inspector-overlay') || (active && !active.anchor.isConnected)) hideTooltip()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [active, hideTooltip])
  const value = useMemo(() => ({ showTooltip, hideTooltip }), [showTooltip, hideTooltip])
  return <TooltipContext.Provider value={value}>{children}{active?.visible && <TooltipPortal model={active.model} anchor={active.anchor} />}</TooltipContext.Provider>
}

export function useTooltip() {
  const value = useContext(TooltipContext)
  if (!value) throw new Error('useTooltip must be used inside TooltipProvider')
  return value
}
