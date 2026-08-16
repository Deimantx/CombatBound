import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { TooltipPortal } from './TooltipPortal'
import type { PointerPosition } from './tooltipPosition'
import type { TooltipInteraction, TooltipModel } from './tooltipTypes'

export const TOOLTIP_OPEN_DELAY_MS = 250
export const TOOLTIP_HIDE_DELAY_MS = 100

interface TooltipContextValue {
  showTooltip: (model: TooltipModel, anchor: HTMLElement, options?: { immediate?: boolean; interaction?: TooltipInteraction; pointer?: PointerPosition }) => void
  updateTooltipPointer: (anchor: HTMLElement, pointer: PointerPosition) => void
  hideTooltip: (anchor?: HTMLElement) => void
  cancelTooltipHide: () => void
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<{ model: TooltipModel; anchor: HTMLElement; visible: boolean; interaction: TooltipInteraction; pointer?: PointerPosition } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const pointerRef = useRef<{ anchor: HTMLElement; pointer: PointerPosition } | null>(null)
  const clearTimer = useCallback(() => { if (timer.current !== undefined) window.clearTimeout(timer.current); timer.current = undefined }, [])
  const suppressed = () => Boolean(document.querySelector('.ui-inspector-overlay'))
  const hideTooltip = useCallback((anchor?: HTMLElement) => {
    clearTimer()
    if (!anchor) {
      pointerRef.current = null
      setActive(null)
      return
    }
    timer.current = window.setTimeout(() => {
      if (pointerRef.current?.anchor === anchor) pointerRef.current = null
      setActive((current) => current?.anchor === anchor ? null : current)
      timer.current = undefined
    }, TOOLTIP_HIDE_DELAY_MS)
  }, [clearTimer])
  const cancelTooltipHide = useCallback(() => clearTimer(), [clearTimer])
  const updateTooltipPointer = useCallback((anchor: HTMLElement, pointer: PointerPosition) => {
    pointerRef.current = { anchor, pointer }
  }, [])
  const showTooltip = useCallback((model: TooltipModel, anchor: HTMLElement, options: { immediate?: boolean; interaction?: TooltipInteraction; pointer?: PointerPosition } = {}) => {
    clearTimer()
    if (suppressed() || !anchor.isConnected) return
    const immediate = options.immediate ?? false
    const interaction = options.interaction ?? 'focus'
    if (interaction === 'pointer' && options.pointer) pointerRef.current = { anchor, pointer: options.pointer }
    setActive({ model, anchor, visible: immediate, interaction, pointer: interaction === 'pointer' ? options.pointer : undefined })
    if (!immediate) timer.current = window.setTimeout(() => {
      if (anchor.isConnected && !suppressed()) {
        setActive((current) => {
          if (current?.anchor !== anchor || current.model.id !== model.id) return current
          const latestPointer = interaction === 'pointer' && pointerRef.current?.anchor === anchor ? pointerRef.current.pointer : current.pointer
          return { ...current, visible: true, pointer: latestPointer }
        })
      }
    }, TOOLTIP_OPEN_DELAY_MS)
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
  const value = useMemo(() => ({ showTooltip, updateTooltipPointer, hideTooltip, cancelTooltipHide }), [showTooltip, updateTooltipPointer, hideTooltip, cancelTooltipHide])
  return <TooltipContext.Provider value={value}>{children}{active?.visible && <TooltipPortal model={active.model} anchor={active.anchor} interaction={active.interaction} pointer={active.pointer} />}</TooltipContext.Provider>
}

export function useTooltip() {
  const value = useContext(TooltipContext)
  if (!value) throw new Error('useTooltip must be used inside TooltipProvider')
  return value
}
