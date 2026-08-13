import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { positionTooltip, type TooltipSide } from './tooltipPosition'
import { TooltipCard } from './TooltipCard'
import type { TooltipModel } from './tooltipTypes'

export function TooltipPortal({ model, anchor }: { model: TooltipModel; anchor: HTMLElement }) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0, side: 'bottom' as TooltipSide })

  const reposition = () => {
    const element = tooltipRef.current
    if (!element || !anchor.isConnected) return
    const next = positionTooltip({ anchor: anchor.getBoundingClientRect(), tooltip: element.getBoundingClientRect(), viewport: { width: window.innerWidth, height: window.innerHeight } })
    setPosition(next)
  }

  useLayoutEffect(() => { reposition() }, [anchor, model.id])
  useEffect(() => {
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => { window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true) }
  }, [anchor, model.id])

  return createPortal(<div ref={tooltipRef} className={`game-tooltip-layer is-${position.side}`} style={{ top: position.top, left: position.left }} data-debug-kind="game-tooltip" data-debug-tooltip-content={model.id}><TooltipCard model={model} /></div>, document.body)
}
