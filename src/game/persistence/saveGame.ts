import type { GameSaveV3 } from './saveTypes'
import { migrateCurrentSave, migrateLegacySave } from './saveMigration'
import { isGameSave } from './saveValidation'

export const GAME_SAVE_KEY = 'combatbound-idle-save-v3'
export const LEGACY_CURRENT_GAME_SAVE_KEY = 'combatbound-idle-save-v2'
export const LEGACY_GAME_SAVE_KEY = 'combatbound-idle-save-v1'

export function loadGameSave(): GameSaveV3 | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const currentRaw = localStorage.getItem(GAME_SAVE_KEY)
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as unknown
      if (isGameSave(current)) return current
    }
    const currentLegacyRaw = localStorage.getItem(LEGACY_CURRENT_GAME_SAVE_KEY)
    const legacyRaw = localStorage.getItem(LEGACY_GAME_SAVE_KEY)
    const migrated = currentLegacyRaw ? migrateCurrentSave(JSON.parse(currentLegacyRaw) as unknown) : legacyRaw ? migrateLegacySave(JSON.parse(legacyRaw) as unknown) : null
    if (migrated) saveGame(migrated)
    return migrated
  } catch {
    return null
  }
}

export function saveGame(save: GameSaveV3) { if (typeof localStorage !== 'undefined') localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save)) }
export function clearGameSave() { if (typeof localStorage !== 'undefined') { localStorage.removeItem(GAME_SAVE_KEY); localStorage.removeItem(LEGACY_CURRENT_GAME_SAVE_KEY); localStorage.removeItem(LEGACY_GAME_SAVE_KEY) } }
