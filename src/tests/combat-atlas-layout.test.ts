import { describe, expect, it } from 'vitest'
import { generateAtlasFallbackPositions } from '../app/screens/combat/atlas/combatAtlasLayout'

describe('combat atlas fallback layout', () => {
  it('keeps twenty generated points distinct and inside safe margins', () => {
    const points = generateAtlasFallbackPositions(20)
    expect(new Set(points.map((point) => `${point.x}:${point.y}`)).size).toBe(20)
    expect(points.every((point) => point.x >= 10 && point.x <= 90 && point.y >= 14 && point.y <= 86)).toBe(true)
  })
})
