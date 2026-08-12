import type { Plugin } from 'vite'

export function uiInspectorSourcePlugin(): Plugin {
  return {
    name: 'combatbound-ui-inspector-source',
    enforce: 'pre',
    transform(code, id) {
      const sourceId = id.split('?')[0]
      if (!/\.(tsx|jsx)$/.test(sourceId) || sourceId.includes('node_modules') || !sourceId.replace(/\\/g, '/').includes('/src/app/')) return null

      const sourcePath = relativeSourcePath(sourceId)
      const edits: Array<{ position: number; text: string }> = []
      let cursor = 0
      while (cursor < code.length) {
        const start = code.indexOf('<', cursor)
        if (start < 0) break
        const first = code[start + 1]
        if (!first || !/[A-Za-z]/.test(first)) {
          cursor = start + 1
          continue
        }

        let quote = ''
        let braces = 0
        let end = -1
        for (let position = start + 1; position < code.length; position += 1) {
          const character = code[position]
          if (quote) {
            if (character === quote && code[position - 1] !== '\\') quote = ''
            continue
          }
          if (character === '"' || character === "'") {
            quote = character
            continue
          }
          if (character === '{') braces += 1
          else if (character === '}') braces = Math.max(0, braces - 1)
          else if (character === '>' && braces === 0) {
            end = position
            break
          }
        }
        if (end < 0) break

        const tagText = code.slice(start, end + 1)
        const hasDebugAttribute = /\bdata-debug-[A-Za-z0-9_-]+\s*=/.test(tagText)
        const hasSourceAttribute = /\bdata-debug-(?:file|line)\s*=/.test(tagText)
        if (hasDebugAttribute && !hasSourceAttribute) {
          const line = code.slice(0, start).split('\n').length
          const closingLength = code[end - 1] === '/' ? 2 : 1
          edits.push({ position: end - closingLength + 1, text: ` data-debug-file="${sourcePath}" data-debug-line="${line}"` })
        }
        cursor = end + 1
      }
      if (edits.length === 0) return null

      let transformed = code
      for (const edit of edits.sort((left, right) => right.position - left.position)) transformed = transformed.slice(0, edit.position) + edit.text + transformed.slice(edit.position)
      return { code: transformed, map: null }
    },
  }
}

function relativeSourcePath(sourceId: string) {
  const normalized = sourceId.replace(/\\/g, '/')
  const srcIndex = normalized.lastIndexOf('/src/')
  if (srcIndex >= 0) return normalized.slice(srcIndex + 1)
  return normalized.split('/').pop() || normalized
}
