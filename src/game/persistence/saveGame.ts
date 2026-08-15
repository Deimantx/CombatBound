import type { GameSaveV9 } from "./saveTypes";
import {
  migrateCurrentSave,
  migrateEquipment,
  migrateLegacySave,
  migrateV3Save,
  migrateV4Save,
  migrateV5Save,
  migrateV6Save,
  migrateV7Save,
  migrateV8Save,
} from "./saveMigration";
import { isGameSave } from "./saveValidation";
import { normalizeSpellbook } from "../spellbook/spellbookLogic";
import { normalizeCombatAutomation } from "../automation/automationLogic";
import { normalizeCombatAbilityLoadout } from "../combatAbilities/combatAbilityLogic";
import { normalizeCombatAutomationPresets } from "../automation/automationPresets";

export const CURRENT_SAVE_VERSION = 9;
export const GAME_SAVE_KEY = "combatbound-idle-save-v9";
export const LEGACY_V8_GAME_SAVE_KEY = "combatbound-idle-save-v8";
export const LEGACY_V7_GAME_SAVE_KEY = "combatbound-idle-save-v7";
export const LEGACY_V6_GAME_SAVE_KEY = "combatbound-idle-save-v6";
export const LEGACY_V5_GAME_SAVE_KEY = "combatbound-idle-save-v5";
export const LEGACY_V4_GAME_SAVE_KEY = "combatbound-idle-save-v4";
export const LEGACY_V3_GAME_SAVE_KEY = "combatbound-idle-save-v3";
export const LEGACY_CURRENT_GAME_SAVE_KEY = "combatbound-idle-save-v2";
export const LEGACY_GAME_SAVE_KEY = "combatbound-idle-save-v1";

export function parseGameSaveJson(raw: string): GameSaveV9 | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (isGameSave(value)) return value;
    if (value && typeof value === "object" && (value as { version?: unknown }).version === 8) return migrateV8Save(value);
    return null;
  } catch {
    return null;
  }
}

/** Reads the pre-profile global save chain for the one-time Profile 1 migration only. */
export function loadLegacySingleGameSaveForProfileMigration(): GameSaveV9 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const currentRaw = localStorage.getItem(GAME_SAVE_KEY);
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as unknown;
      if (isGameSave(current)) {
        const equipment = migrateEquipment(current.equipment, current.inventory.quantities);
        const migrated = {
          ...current,
          equipment,
          spellbook: normalizeSpellbook(current.spellbook),
          combatAutomation: normalizeCombatAutomation(current.combatAutomation),
          combatAutomationPresets: normalizeCombatAutomationPresets(current.combatAutomationPresets),
          combatAbilities: normalizeCombatAbilityLoadout(current.combatAbilities),
        };
        if (
          JSON.stringify(equipment) !== JSON.stringify(current.equipment) ||
          JSON.stringify(migrated.spellbook) !== JSON.stringify(current.spellbook) ||
          JSON.stringify(migrated.combatAutomation) !== JSON.stringify(current.combatAutomation) ||
          JSON.stringify(migrated.combatAutomationPresets) !== JSON.stringify(current.combatAutomationPresets) ||
          JSON.stringify(migrated.combatAbilities) !== JSON.stringify(current.combatAbilities)
        ) {
          saveLegacySingleGameSave(migrated);
          return migrated;
        }
        return current;
      }
    }
    const v8Raw = localStorage.getItem(LEGACY_V8_GAME_SAVE_KEY);
    const v7Raw = localStorage.getItem(LEGACY_V7_GAME_SAVE_KEY);
    const v6Raw = localStorage.getItem(LEGACY_V6_GAME_SAVE_KEY);
    const v5Raw = localStorage.getItem(LEGACY_V5_GAME_SAVE_KEY);
    const v4Raw = localStorage.getItem(LEGACY_V4_GAME_SAVE_KEY);
    const v3Raw = localStorage.getItem(LEGACY_V3_GAME_SAVE_KEY);
    const currentLegacyRaw = localStorage.getItem(LEGACY_CURRENT_GAME_SAVE_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_GAME_SAVE_KEY);
    const migratedV8 = v8Raw
      ? migrateV8Save(JSON.parse(v8Raw) as unknown)
      : null;
    const migratedV7 = !migratedV8 && v7Raw
      ? migrateV7Save(JSON.parse(v7Raw) as unknown)
      : null;
    const migratedV6 = !migratedV7 && v6Raw
      ? migrateV6Save(JSON.parse(v6Raw) as unknown)
      : null;
    const migratedV5 = !migratedV7 && !migratedV6 && v5Raw
      ? migrateV5Save(JSON.parse(v5Raw) as unknown)
      : null;
    const migratedV4 = !migratedV7 && !migratedV6 && !migratedV5 && v4Raw
      ? migrateV4Save(JSON.parse(v4Raw) as unknown)
      : null;
    const migratedV3 = !migratedV7 && !migratedV6 && !migratedV5 && !migratedV4 && v3Raw
      ? migrateV3Save(JSON.parse(v3Raw) as unknown)
      : null;
    const migratedV2 =
      !migratedV7 && !migratedV6 && !migratedV5 && !migratedV4 && !migratedV3 && currentLegacyRaw
        ? migrateCurrentSave(JSON.parse(currentLegacyRaw) as unknown)
        : null;
    const migratedV1 =
      !migratedV7 && !migratedV6 && !migratedV5 && !migratedV4 && !migratedV3 && !migratedV2 && legacyRaw
        ? migrateLegacySave(JSON.parse(legacyRaw) as unknown)
        : null;
    const migrated = migratedV8
      ?? (migratedV7 ? migrateV8Save(migratedV7) : null)
      ?? (migratedV6 ? migrateV8Save(migrateV7Save(migratedV6)) : null)
      ?? (migratedV5 ? migrateV8Save(migrateV7Save(migrateV6Save(migratedV5))) : null)
      ?? (migratedV4 ? migrateV8Save(migrateV7Save(migrateV6Save(migrateV5Save(migratedV4)))) : null)
      ?? (migratedV3 ? migrateV8Save(migrateV7Save(migrateV6Save(migrateV5Save(migrateV4Save(migratedV3))))) : null)
      ?? (migratedV2 ? migrateV8Save(migrateV7Save(migrateV6Save(migrateV5Save(migrateV4Save(migrateV3Save(migratedV2)))))) : null)
      ?? (migratedV1 ? migrateV8Save(migrateV7Save(migrateV6Save(migrateV5Save(migrateV4Save(migrateV3Save(migratedV1)))))) : null);
    if (migrated) saveLegacySingleGameSave(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export function saveLegacySingleGameSave(save: GameSaveV9) {
  if (typeof localStorage !== "undefined")
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save));
}
export function clearLegacySingleGameSave() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_V8_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_V7_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_V6_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_V5_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_V4_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_V3_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_CURRENT_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_GAME_SAVE_KEY);
  }
}
