import type { AtlasAccent, AtlasAtmosphere, AtlasPoint } from './combatAtlasTypes'

export interface AtlasFallbackLayoutOptions {
  minX?: number
  maxX?: number
  minY?: number
  maxY?: number
}

const atlasAccentRgb: Record<AtlasAccent, string> = {
  forest: '91,157,119',
  frost: '123,163,181',
  ember: '174,105,78',
  storm: '83,157,170',
  moor: '132,111,153',
  marsh: '70,147,144',
  highland: '130,143,153',
  coast: '79,151,169',
  road: '188,151,83',
  gold: '188,151,83',
}

export const atlasAtmosphereAccent: Record<AtlasAtmosphere, AtlasAccent> = {
  world: 'highland',
  forest: 'forest',
  marsh: 'marsh',
  highland: 'highland',
  coast: 'coast',
  moor: 'moor',
  road: 'road',
}

export const atlasNeutralRgb = '122,130,136'

export { atlasAccentRgb }

export function generateAtlasFallbackPositions(count: number, options: AtlasFallbackLayoutOptions = {}): AtlasPoint[] {
  const safeCount = Math.max(0, Math.floor(count))
  if (safeCount === 0) return []

  const minX = options.minX ?? 10
  const maxX = options.maxX ?? 90
  const minY = options.minY ?? 14
  const maxY = options.maxY ?? 86
  const columns = safeCount === 1 ? 1 : safeCount === 2 ? 2 : safeCount <= 8 ? 3 : safeCount <= 15 ? 4 : 5
  const rows = Math.ceil(safeCount / columns)

  return Array.from({ length: safeCount }, (_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    const x = columns === 1 ? 50 : minX + ((maxX - minX) * column) / (columns - 1)
    const y = rows === 1 ? 50 : minY + ((maxY - minY) * row) / (rows - 1)
    return { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) }
  })
}

export function constellationCanvasScale(nodeCount: number) {
  if (nodeCount <= 8) return { x: 1, y: 1 }
  if (nodeCount <= 14) return { x: 1.25, y: 1.1 }
  if (nodeCount <= 20) return { x: 1.5, y: 1.25 }
  const extra = Math.min(0.55, Math.ceil((nodeCount - 20) / 6) * 0.08)
  return { x: 1.5 + extra, y: 1.25 + extra * 0.7 }
}
