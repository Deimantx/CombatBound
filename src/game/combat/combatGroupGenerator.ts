import type { CombatLocationDefinition } from '../world/worldTypes'

export interface RandomSource { next(): number }

export function generateCombatGroup(location: CombatLocationDefinition, rng: RandomSource, masteryLevel = 1): string[] {
  const eligible = location.enemyPool.filter((entry) => (entry.minMasteryLevel ?? 1) <= masteryLevel)
  const pool = eligible.length > 0 ? eligible : location.enemyPool
  const generation = location.groupGeneration
  const size = generation.minGroupSize + Math.floor(rng.next() * (generation.maxGroupSize - generation.minGroupSize + 1))
  const result: string[] = []
  const copies = new Map<string, number>()
  const guaranteed = (generation.guaranteedEnemyIds ?? []).filter((enemyId) => pool.some((entry) => entry.enemyId === enemyId))
  for (const enemyId of guaranteed.slice(0, size)) { result.push(enemyId); copies.set(enemyId, (copies.get(enemyId) ?? 0) + 1) }
  for (const entry of pool) {
    const minimum = Math.min(size - result.length, entry.minCopiesPerGroup ?? 0)
    for (let index = 0; index < minimum; index += 1) { result.push(entry.enemyId); copies.set(entry.enemyId, (copies.get(entry.enemyId) ?? 0) + 1) }
  }
  const distinctTarget = Math.min(size, Math.max(generation.minimumDistinctTypes ?? 1, guaranteed.length))
  while (result.length < size) {
    const needsDistinct = result.length < distinctTarget
    const candidates = pool.filter((entry) => {
      const count = copies.get(entry.enemyId) ?? 0
      const maxCopies = entry.maxCopiesPerGroup ?? (generation.allowDuplicateEnemyTypes ? size : 1)
      return count < maxCopies && (!needsDistinct || !copies.has(entry.enemyId))
    })
    const fallback = pool.filter((entry) => {
      const count = copies.get(entry.enemyId) ?? 0
      const maxCopies = entry.maxCopiesPerGroup ?? (generation.allowDuplicateEnemyTypes ? size : 1)
      return count < maxCopies
    })
    const selected = weightedPick(candidates.length > 0 ? candidates : fallback, rng)
    if (!selected) break
    result.push(selected.enemyId)
    copies.set(selected.enemyId, (copies.get(selected.enemyId) ?? 0) + 1)
  }
  return result
}

function weightedPick<T extends { weight: number }>(entries: T[], rng: RandomSource) {
  if (entries.length === 0) return undefined
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let cursor = rng.next() * total
  for (const entry of entries) { cursor -= entry.weight; if (cursor < 0) return entry }
  return entries[entries.length - 1]
}
