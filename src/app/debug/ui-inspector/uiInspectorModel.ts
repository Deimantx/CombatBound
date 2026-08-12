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
  sourceFile: string
  sourceLine: string
  debugValues: Array<[string, string]>
}

interface ReactDebugSource {
  fileName: string
  lineNumber: number
}

interface ReactFiber {
  _debugSource?: unknown
  return?: ReactFiber | null
  _debugOwner?: ReactFiber | null
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
  const source = readSourceLocation(element)
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
    sourceFile: source?.fileName || '—',
    sourceLine: source ? String(source.lineNumber) : '—',
    debugValues: attrs,
  }
}

export function formatInspectorReference(target: InspectorTarget): string {
  return ['CombatBound UI reference', '', `Screen: ${target.screen}`, `UI Region: ${target.region}`, `Panel: ${target.panel}`, `Kind: ${target.kind}`, `Entity ID: ${target.entityId}`, `Label: ${target.label}`, `Element: ${target.tag}`, `Source: ${target.sourceFile === '—' ? '—' : `${target.sourceFile}:${target.sourceLine}`}`, `CSS: ${target.css}`, `Text: ${target.text}`].join('\n')
}

function titleCase(value: string) { return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }

function formatSize(width: number, height: number) {
  return `${Math.round(width)} × ${Math.round(height)} px`
}

function readSourceLocation(element: HTMLElement): { fileName: string; lineNumber: number } | null {
  const explicitFile = element.dataset.debugFile
  const explicitLine = Number(element.dataset.debugLine)
  if (explicitFile && Number.isFinite(explicitLine) && explicitLine > 0) return { fileName: formatSourceFile(explicitFile), lineNumber: explicitLine }

  const fiberKey = Object.keys(element).find((key) => key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$'))
  if (!fiberKey) return null
  const fiber = (element as unknown as Record<string, unknown>)[fiberKey] as ReactFiber | undefined
  if (!fiber) return null

  const visited = new Set<ReactFiber>()
  const pending: ReactFiber[] = [fiber]
  while (pending.length > 0) {
    const current = pending.shift()
    if (!current || visited.has(current)) continue
    visited.add(current)
    if (isReactDebugSource(current._debugSource)) return { fileName: formatSourceFile(current._debugSource.fileName), lineNumber: current._debugSource.lineNumber }
    if (current.return) pending.push(current.return)
    if (current._debugOwner) pending.push(current._debugOwner)
  }
  return null
}

function isReactDebugSource(value: unknown): value is ReactDebugSource {
  if (!value || typeof value !== 'object') return false
  const source = value as Partial<ReactDebugSource>
  return typeof source.fileName === 'string' && typeof source.lineNumber === 'number' && source.lineNumber > 0
}

function formatSourceFile(fileName: string) {
  const normalized = fileName.replace(/^file:\/\//, '').replace(/\\/g, '/')
  if (normalized.startsWith('src/')) return normalized
  const srcIndex = normalized.lastIndexOf('/src/')
  if (srcIndex >= 0) return normalized.slice(srcIndex + 1)
  const appIndex = normalized.lastIndexOf('/App.tsx')
  if (appIndex >= 0) return normalized.slice(appIndex + 1)
  return normalized.split('/').pop() || normalized
}
