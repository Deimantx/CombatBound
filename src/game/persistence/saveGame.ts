import type { GameSaveV2 } from './saveTypes'
import { migrateLegacySave } from './saveMigration'
import { isGameSave } from './saveValidation'

export const GAME_SAVE_KEY = 'combatbound-idle-save-v2'
export const LEGACY_GAME_SAVE_KEY = 'combatbound-idle-save-v1'

export function loadGameSave(): GameSaveV2 | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const currentRaw = localStorage.getItem(GAME_SAVE_KEY)
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as unknown
      if (isGameSave(current)) return current
    }
    const legacyRaw = localStorage.getItem(LEGACY_GAME_SAVE_KEY)
    if (!legacyRaw) return null
    const migrated = migrateLegacySave(JSON.parse(legacyRaw) as unknown)
    if (migrated) saveGame(migrated)
    return migrated
  } catch {
    return null
  }
}

export function saveGame(save: GameSaveV2) { if (typeof localStorage !== 'undefined') localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save)) }
export function clearGameSave() { if (typeof localStorage !== 'undefined') { localStorage.removeItem(GAME_SAVE_KEY); localStorage.removeItem(LEGACY_GAME_SAVE_KEY) } }
