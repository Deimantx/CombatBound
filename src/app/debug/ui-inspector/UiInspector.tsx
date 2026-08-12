import { Copy, MousePointer2, X } from 'lucide-react'
import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { buildInspectorTarget, formatInspectorReference, resolveSemanticTarget, type InspectorTarget } from './uiInspectorModel'

interface UiInspectorProps { onExit: () => void }

export function UiInspector({ onExit }: UiInspectorProps) {
  const [hovered, setHovered] = useState<InspectorTarget | null>(null)
  const [selected, setSelected] = useState<InspectorTarget | null>(null)
  const [copied, setCopied] = useState(false)

  const findTargetAtPoint = (event: MouseEvent) => {
    const element = document.elementsFromPoint(event.clientX, event.clientY).find((candidate) => !candidate.closest('[data-ui-inspector-ignore]')) ?? null
    const target = resolveSemanticTarget(element)
    return target ? buildInspectorTarget(target) : null
  }

  const resolveAtPoint = useCallback((event: MouseEvent) => {
    setHovered(findTargetAtPoint(event))
  }, [])

  useEffect(() => {
    const element = hovered?.element
    if (!element) return
    element.setAttribute('data-ui-inspector-hovered', 'true')
    return () => element.removeAttribute('data-ui-inspector-hovered')
  }, [hovered?.element])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onExit() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onExit])

  const copyReference = async (target: InspectorTarget) => {
    const reference = formatInspectorReference(target)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reference)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = reference
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
    } catch {
      // Clipboard access can be unavailable in local previews.
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  const selectAtPoint = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = findTargetAtPoint(event)
    if (!target) return
    setHovered(target)
    setSelected(target)
    void copyReference(target)
  }

  const active = hovered ?? selected
  return <div className="ui-inspector-overlay" data-ui-inspector-ignore onMouseMove={resolveAtPoint} onClick={selectAtPoint}>
    <div className="inspector-card" data-ui-inspector-ignore onClick={(event) => event.stopPropagation()}>
      <div className="inspector-card-header">
        <div><span className="eyebrow">SELECTED INTERFACE TARGET</span><h2>{active?.label ?? 'Move over an interface element'}</h2></div>
        <div className="inspector-card-actions">
          {selected && <button className="button button-small button-primary" onClick={() => void copyReference(selected)}><Copy size={13} />{copied ? 'Copied' : 'Copy reference'}</button>}
          <button className="icon-button" onClick={onExit} aria-label="Exit UI Inspector" title="Exit UI Inspector"><X size={16} /></button>
        </div>
      </div>
      {active ? <div className="inspector-fields">{([['SCREEN', active.screen], ['UI REGION', active.region], ['PANEL / SECTION', active.panel], ['KIND', active.kind], ['ENTITY ID', active.entityId], ['LABEL', active.label], ['ELEMENT', active.tag], ['SOURCE FILE', active.sourceFile], ['SOURCE LINE', active.sourceLine], ['SIZE', active.size], ['ICON SIZE', active.iconSize], ['HTML ID', active.htmlId], ['ROLE', active.role], ['ARIA LABEL', active.ariaLabel], ['TITLE', active.title], ['CSS CLASSES', active.css], ['TEXT', active.text]] as const).map(([label, value]) => <div key={label} className="inspector-field"><span>{label}</span><strong>{value}</strong></div>)}{active.debugValues.length > 0 && <div className="inspector-debug-data"><span className="tiny-label">DEBUG ATTRIBUTES</span>{active.debugValues.map(([key, value]) => <code key={key}>{key}={value}</code>)}</div>}</div> : <div className="inspector-empty"><MousePointer2 size={22} /><p>Hover a panel, button, target, or control to reveal its semantic metadata.</p></div>}
    </div>
  </div>
}
