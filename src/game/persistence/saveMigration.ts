import type { CollectionState } from '../collection/collectionTypes'
import type { EquipmentState } from '../equipment/equipmentTypes'
import type { InventoryState } from '../inventory/inventoryTypes'
import type { GameSaveV2 } from './saveTypes'

interface LegacySkillProgress { totalXp?: number }
interface LegacySaveV1 {
  version: 1
  progression: { skills: Record<string, LegacySkillProgress>; trainingFocus?: string; hunterRank?: number }
  inventory: InventoryState
  equipment: EquipmentState
  collection: CollectionState
  gold: number
  settings: { reducedMotion: boolean; showInspectorButton: boolean }
}

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }

export function migrateLegacySave(value: unknown): GameSaveV2 | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.progression) || !isRecord(value.progression.skills) || typeof value.gold !== 'number' || !isRecord(value.inventory) || !isRecord(value.equipment) || !isRecord(value.collection) || !isRecord(value.settings)) return null
  const old = value as unknown as LegacySaveV1
  const skillXp = Object.values(old.progression.skills).reduce((total, skill) => total + (typeof skill.totalXp === 'number' && Number.isFinite(skill.totalXp) ? Math.max(0, skill.totalXp) : 0), 0)
  const swordXp = typeof old.progression.skills.swordsmanship?.totalXp === 'number' ? Math.max(0, old.progression.skills.swordsmanship.totalXp) : 0
  return {
    version: 2,
    progression: { proficiencies: { 'one-handed-sword': { proficiencyId: 'one-handed-sword', totalXp: swordXp } }, masteryXp: skillXp, purchasedPerks: {} },
    inventory: old.inventory,
    equipment: old.equipment,
    collection: old.collection,
    gold: old.gold,
    settings: old.settings,
  }
}
