import type { GameSaveV1 } from './saveTypes'
import { isGameSave } from './saveValidation'
export const GAME_SAVE_KEY = 'combatbound-idle-save-v1'
export function loadGameSave(): GameSaveV1 | null { try { const raw = localStorage.getItem(GAME_SAVE_KEY); if (!raw) return null; const value: unknown = JSON.parse(raw); return isGameSave(value) ? value : null } catch { return null } }
export function saveGame(save: GameSaveV1) { if (typeof localStorage !== 'undefined') localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save)) }
export function clearGameSave() { if (typeof localStorage !== 'undefined') localStorage.removeItem(GAME_SAVE_KEY) }
