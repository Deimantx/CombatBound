import type { GameSaveV6 } from "./saveTypes";
import {
  migrateCurrentSave,
  migrateEquipment,
  migrateLegacySave,
  migrateV3Save,
  migrateV4Save,
  migrateV5Save,
} from "./saveMigration";
import { isGameSave } from "./saveValidation";
import { normalizeSpellbook } from "../spellbook/spellbookLogic";
import { normalizeCombatAutomation } from "../automation/automationLogic";
import { normalizeCombatAbilityLoadout } from "../combatAbilities/combatAbilityLogic";

export const GAME_SAVE_KEY = "combatbound-idle-save-v6";
export const LEGACY_V5_GAME_SAVE_KEY = "combatbound-idle-save-v5";
export const LEGACY_V4_GAME_SAVE_KEY = "combatbound-idle-save-v4";
export const LEGACY_V3_GAME_SAVE_KEY = "combatbound-idle-save-v3";
export const LEGACY_CURRENT_GAME_SAVE_KEY = "combatbound-idle-save-v2";
export const LEGACY_GAME_SAVE_KEY = "combatbound-idle-save-v1";

export function loadGameSave(): GameSaveV6 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const currentRaw = localStorage.getItem(GAME_SAVE_KEY);
    if (currentRaw) {
      const current = JSON.parse(currentRaw) as unknown;
      if (isGameSave(current)) {
        const hadLegacyArmor = Boolean(current.equipment.slots.armor);
        const equipment = migrateEquipment(current.equipment);
        const migrated = {
          ...current,
          equipment,
          spellbook: normalizeSpellbook(current.spellbook),
          combatAutomation: normalizeCombatAutomation(current.combatAutomation),
          combatAbilities: normalizeCombatAbilityLoadout(current.combatAbilities),
        };
        if (
          hadLegacyArmor ||
          JSON.stringify(migrated.spellbook) !== JSON.stringify(current.spellbook) ||
          JSON.stringify(migrated.combatAutomation) !== JSON.stringify(current.combatAutomation) ||
          JSON.stringify(migrated.combatAbilities) !== JSON.stringify(current.combatAbilities)
        ) {
          saveGame(migrated);
          return migrated;
        }
        return current;
      }
    }
    const v5Raw = localStorage.getItem(LEGACY_V5_GAME_SAVE_KEY);
    const v4Raw = localStorage.getItem(LEGACY_V4_GAME_SAVE_KEY);
    const v3Raw = localStorage.getItem(LEGACY_V3_GAME_SAVE_KEY);
    const currentLegacyRaw = localStorage.getItem(LEGACY_CURRENT_GAME_SAVE_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_GAME_SAVE_KEY);
    const migratedV5 = v5Raw
      ? migrateV5Save(JSON.parse(v5Raw) as unknown)
      : null;
    const migratedV4 = !migratedV5 && v4Raw
      ? migrateV4Save(JSON.parse(v4Raw) as unknown)
      : null;
    const migratedV3 = !migratedV4 && v3Raw
      ? migrateV3Save(JSON.parse(v3Raw) as unknown)
      : null;
    const migratedV2 =
      !migratedV4 && !migratedV3 && currentLegacyRaw
        ? migrateCurrentSave(JSON.parse(currentLegacyRaw) as unknown)
        : null;
    const migratedV1 =
      !migratedV4 && !migratedV3 && !migratedV2 && legacyRaw
        ? migrateLegacySave(JSON.parse(legacyRaw) as unknown)
        : null;
    const migrated = migratedV5
      ?? (migratedV4 ? migrateV5Save(migratedV4) : null)
      ?? (migratedV3 ? migrateV5Save(migrateV4Save(migratedV3)) : null)
      ?? (migratedV2 ? migrateV5Save(migrateV4Save(migrateV3Save(migratedV2))) : null)
      ?? (migratedV1 ? migrateV5Save(migrateV4Save(migrateV3Save(migratedV1))) : null);
    if (migrated) saveGame(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export function saveGame(save: GameSaveV6) {
  if (typeof localStorage !== "undefined")
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save));
}
export function clearGameSave() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_V5_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_V4_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_V3_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_CURRENT_GAME_SAVE_KEY);
    localStorage.removeItem(LEGACY_GAME_SAVE_KEY);
  }
}
