export interface InspectorTarget {
  element: HTMLElement
  screen: string
  region: string
  panel: string
  kind: string
  entityId: string
  label: string
  tag: string
  htmlId: string
  role: string
  ariaLabel: string
  title: string
  css: string
  text: string
  size: string
  iconSize: string
  debugValues: Array<[string, string]>
}

const semanticSelectors = '[data-debug-kind], [data-ui-panel], [data-debug-label], button, a, input, select, textarea, [role="button"]'

export function resolveSemanticTarget(start: Element | null): HTMLElement | null {
  if (!start) return null
  const candidates = [start, ...Array.from(start.parentElement ? start.parentElement.querySelectorAll(semanticSelectors) : [])]
  let current: Element | null = start
  while (current) {
    if (current instanceof HTMLElement && !current.closest('[data-ui-inspector-ignore]')) {
      const hasMetadata: boolean = current.matches('[data-debug-kind], [data-ui-panel], [data-debug-label]')
      if (hasMetadata || current.matches('button, a, input, select, textarea, [role="button"]')) return current
    }
    current = current.parentElement
  }
  return candidates.find((element) => element instanceof HTMLElement && !element.closest('[data-ui-inspector-ignore]')) as HTMLElement | undefined ?? null
}

export function buildInspectorTarget(element: HTMLElement): InspectorTarget {
  const attrs = Array.from(element.attributes).filter((attribute) => attribute.name.startsWith('data-debug-')).map((attribute) => [attribute.name.replace('data-debug-', ''), attribute.value] as [string, string])
  const debugLabel = element.dataset.debugLabel || element.getAttribute('aria-label') || element.textContent?.trim().split('\n')[0]?.slice(0, 80) || 'Unnamed element'
  const rect = element.getBoundingClientRect()
  const icon = element instanceof SVGElement ? element : element.querySelector('svg')
  const iconRect = icon?.getBoundingClientRect()
  return {
    element,
    screen: titleCase(element.dataset.debugScreen || element.closest('[data-debug-screen]')?.getAttribute('data-debug-screen') || 'shell'),
    region: titleCase(element.dataset.uiRegion || element.closest('[data-ui-region]')?.getAttribute('data-ui-region') || 'content'),
    panel: element.dataset.uiPanel || element.closest('[data-ui-panel]')?.getAttribute('data-ui-panel') || '—',
    kind: element.dataset.debugKind || 'interface-element',
    entityId: element.dataset.debugTargetId || '—',
    label: debugLabel,
    tag: element.tagName.toLowerCase(),
    htmlId: element.id || '—',
    role: element.getAttribute('role') || '—',
    ariaLabel: element.getAttribute('aria-label') || '—',
    title: element.getAttribute('title') || '—',
    css: element.className.toString() || '—',
    text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) || '—',
    size: formatSize(rect.width, rect.height),
    iconSize: iconRect ? formatSize(iconRect.width, iconRect.height) : '—',
    debugValues: attrs,
  }
}

export function formatInspectorReference(target: InspectorTarget): string {
  return ['CombatBound UI reference', '', `Screen: ${target.screen}`, `UI Region: ${target.region}`, `Panel: ${target.panel}`, `Kind: ${target.kind}`, `Entity ID: ${target.entityId}`, `Label: ${target.label}`, `Element: ${target.tag}`, `CSS: ${target.css}`, `Text: ${target.text}`].join('\n')
}

function titleCase(value: string) { return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }

function formatSize(width: number, height: number) {
  return `${Math.round(width)} × ${Math.round(height)} px`
}
