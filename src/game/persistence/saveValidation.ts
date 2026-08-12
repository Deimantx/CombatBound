import type { GameSaveV1 } from './saveTypes'
import type { CombatSkillId } from '../progression/progressionTypes'

const skillIds: CombatSkillId[] = ['swordsmanship', 'defense', 'stances', 'magic']

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }

export function isGameSave(value: unknown): value is GameSaveV1 {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<GameSaveV1>
  if (candidate.version !== 1 || typeof candidate.gold !== 'number' || !isRecord(candidate.progression) || !isRecord(candidate.inventory) || !isRecord(candidate.equipment) || !isRecord(candidate.collection) || !isRecord(candidate.settings)) return false
  const progression = candidate.progression
  const skills = progression.skills
  if (!isRecord(skills) || !skillIds.every((id) => isRecord(skills[id]) && typeof skills[id]?.level === 'number' && typeof skills[id]?.totalXp === 'number') || !skillIds.includes(progression.trainingFocus as CombatSkillId) || typeof progression.hunterRank !== 'number') return false
  const inventory = candidate.inventory
  const equipment = candidate.equipment
  const collection = candidate.collection
  const settings = candidate.settings
  if (!isRecord(inventory.quantities) || !isRecord(equipment.slots) || !Array.isArray(collection.discoveredItems) || !isRecord(collection.targets)) return false
  return typeof settings.reducedMotion === 'boolean' && typeof settings.showInspectorButton === 'boolean'
}
