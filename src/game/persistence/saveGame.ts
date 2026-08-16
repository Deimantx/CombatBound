import type { GameSaveV12 } from "./saveTypes";
import {
  migrateCurrentSave,
  migrateLegacySave,
  migrateV3Save,
  migrateV4Save,
  migrateV5Save,
  migrateV6Save,
  migrateV7Save,
  migrateV8Save,
  migrateV9Save,
  migrateV10Save,
  migrateV11Save,
} from "./saveMigration";
import { isGameSave } from "./saveValidation";
import { normalizeSpellbook } from "../spellbook/spellbookLogic";
import { normalizeCombatAutomation } from "../automation/automationLogic";
import { normalizeCombatAbilityLoadout } from "../combatAbilities/combatAbilityLogic";
import { normalizeCombatAutomationPresets } from "../automation/automationPresets";
import { normalizeInventoryState } from "../items/itemOwnership";
import { normalizeEquipmentState } from "../equipment/equipmentRules";
import { itemById } from "../data/items";
import { validateItemInstance } from "../items/itemInstanceValidation";

export const CURRENT_SAVE_VERSION = 12;
export const GAME_SAVE_KEY = "combatbound-idle-save-v12";
export const LEGACY_V11_GAME_SAVE_KEY = "combatbound-idle-save-v11";
export const LEGACY_V10_GAME_SAVE_KEY = "combatbound-idle-save-v10";
export const LEGACY_V9_GAME_SAVE_KEY = "combatbound-idle-save-v9";
export const LEGACY_V8_GAME_SAVE_KEY = "combatbound-idle-save-v8";
export const LEGACY_V7_GAME_SAVE_KEY = "combatbound-idle-save-v7";
export const LEGACY_V6_GAME_SAVE_KEY = "combatbound-idle-save-v6";
export const LEGACY_V5_GAME_SAVE_KEY = "combatbound-idle-save-v5";
export const LEGACY_V4_GAME_SAVE_KEY = "combatbound-idle-save-v4";
export const LEGACY_V3_GAME_SAVE_KEY = "combatbound-idle-save-v3";
export const LEGACY_CURRENT_GAME_SAVE_KEY = "combatbound-idle-save-v2";
export const LEGACY_GAME_SAVE_KEY = "combatbound-idle-save-v1";

function migrateV8ToCurrent(value: unknown): GameSaveV12 | null {
  const v9 = migrateV8Save(value);
  const v10 = v9 ? migrateV9Save(v9) : null;
  const v11 = v10 ? migrateV10Save(v10) : null;
  return v11 ? migrateV11Save(v11) : null;
}

function migrateV9ToCurrent(value: unknown): GameSaveV12 | null {
  const v10 = migrateV9Save(value);
  const v11 = v10 ? migrateV10Save(v10) : null;
  return v11 ? migrateV11Save(v11) : null;
}

function migrateV10ToCurrent(value: unknown): GameSaveV12 | null {
  const v11 = migrateV10Save(value);
  return v11 ? migrateV11Save(v11) : null;
}

function normalizeCurrentSave(value: unknown): GameSaveV12 | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as { version?: unknown }).version !== 12) return null;
  const raw = value as GameSaveV12;
  if (!raw.inventory || !raw.equipment || !raw.inventory.instances || !raw.inventory.stackables) return null;
  for (const [definitionId, quantity] of Object.entries(raw.inventory.stackables)) {
    if (!itemById[definitionId] || itemById[definitionId].inventoryMode !== "stackable" || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0) return null;
  }
  for (const [key, instance] of Object.entries(raw.inventory.instances)) {
    if (!instance || typeof instance !== "object" || instance.id !== key || !validateItemInstance(instance).valid) return null;
  }
  const inventory = normalizeInventoryState(raw.inventory);
  const equipment = normalizeEquipmentState(raw.equipment, inventory);
  const normalized: GameSaveV12 = { ...raw, inventory, equipment, spellbook: normalizeSpellbook(raw.spellbook), combatAutomation: normalizeCombatAutomation(raw.combatAutomation), combatAutomationPresets: normalizeCombatAutomationPresets(raw.combatAutomationPresets), combatAbilities: normalizeCombatAbilityLoadout(raw.combatAbilities) };
  return isGameSave(normalized) ? normalized : null;
}

export function parseGameSaveJson(raw: string): GameSaveV12 | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === "object") {
      const version = (value as { version?: unknown }).version;
      if (version === 12) return normalizeCurrentSave(value);
      if (version === 11) return migrateV11Save(value);
      if (version === 10) return migrateV10ToCurrent(value);
      if (version === 9) return migrateV9ToCurrent(value);
      if (version === 8) return migrateV8ToCurrent(value);
    }
    return null;
  } catch {
    return null;
  }
}

/** Reads the pre-profile global save chain for the one-time Profile 1 migration only. */
export function loadLegacySingleGameSaveForProfileMigration(): GameSaveV12 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const currentRaw = localStorage.getItem(GAME_SAVE_KEY);
    if (currentRaw) {
      const currentSave = parseGameSaveJson(currentRaw);
      if (currentSave) {
        const migrated = { ...currentSave, spellbook: normalizeSpellbook(currentSave.spellbook), combatAutomation: normalizeCombatAutomation(currentSave.combatAutomation), combatAutomationPresets: normalizeCombatAutomationPresets(currentSave.combatAutomationPresets), combatAbilities: normalizeCombatAbilityLoadout(currentSave.combatAbilities) };
        if (JSON.stringify(migrated) !== JSON.stringify(currentSave)) saveLegacySingleGameSave(migrated);
        return migrated;
      }
    }
    const v11Raw = localStorage.getItem(LEGACY_V11_GAME_SAVE_KEY);
    const v10Raw = localStorage.getItem(LEGACY_V10_GAME_SAVE_KEY);
    const v9Raw = localStorage.getItem(LEGACY_V9_GAME_SAVE_KEY);
    const v8Raw = localStorage.getItem(LEGACY_V8_GAME_SAVE_KEY);
    const v7Raw = localStorage.getItem(LEGACY_V7_GAME_SAVE_KEY);
    const v6Raw = localStorage.getItem(LEGACY_V6_GAME_SAVE_KEY);
    const v5Raw = localStorage.getItem(LEGACY_V5_GAME_SAVE_KEY);
    const v4Raw = localStorage.getItem(LEGACY_V4_GAME_SAVE_KEY);
    const v3Raw = localStorage.getItem(LEGACY_V3_GAME_SAVE_KEY);
    const currentLegacyRaw = localStorage.getItem(LEGACY_CURRENT_GAME_SAVE_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_GAME_SAVE_KEY);
    const migratedV11 = v11Raw ? migrateV11Save(JSON.parse(v11Raw) as unknown) : null;
    const migratedV10 = !migratedV11 && v10Raw ? migrateV10ToCurrent(JSON.parse(v10Raw) as unknown) : null;
    const migratedV9 = !migratedV11 && !migratedV10 && v9Raw ? migrateV9ToCurrent(JSON.parse(v9Raw) as unknown) : null;
    const migratedV8 = !migratedV11 && !migratedV10 && !migratedV9 && v8Raw ? migrateV8ToCurrent(JSON.parse(v8Raw) as unknown) : null;
    const migratedV7 = !migratedV11 && !migratedV10 && !migratedV9 && !migratedV8 && v7Raw ? migrateV7Save(JSON.parse(v7Raw) as unknown) : null;
    const migratedV6 = !migratedV7 && v6Raw ? migrateV6Save(JSON.parse(v6Raw) as unknown) : null;
    const migratedV5 = !migratedV7 && !migratedV6 && v5Raw ? migrateV5Save(JSON.parse(v5Raw) as unknown) : null;
    const migratedV4 = !migratedV7 && !migratedV6 && !migratedV5 && v4Raw ? migrateV4Save(JSON.parse(v4Raw) as unknown) : null;
    const migratedV3 = !migratedV7 && !migratedV6 && !migratedV5 && !migratedV4 && v3Raw ? migrateV3Save(JSON.parse(v3Raw) as unknown) : null;
    const migratedV2 = !migratedV7 && !migratedV6 && !migratedV5 && !migratedV4 && !migratedV3 && currentLegacyRaw ? migrateCurrentSave(JSON.parse(currentLegacyRaw) as unknown) : null;
    const migratedV1 = !migratedV7 && !migratedV6 && !migratedV5 && !migratedV4 && !migratedV3 && !migratedV2 && legacyRaw ? migrateLegacySave(JSON.parse(legacyRaw) as unknown) : null;
    const migrated = migratedV11 ?? migratedV10 ?? migratedV9 ?? migratedV8 ?? (migratedV7 ? migrateV8ToCurrent(migratedV7) : null) ?? (migratedV6 ? migrateV8ToCurrent(migrateV7Save(migratedV6)) : null) ?? (migratedV5 ? migrateV8ToCurrent(migrateV7Save(migrateV6Save(migratedV5))) : null) ?? (migratedV4 ? migrateV8ToCurrent(migrateV7Save(migrateV6Save(migrateV5Save(migratedV4)))) : null) ?? (migratedV3 ? migrateV8ToCurrent(migrateV7Save(migrateV6Save(migrateV5Save(migrateV4Save(migratedV3))))) : null) ?? (migratedV2 ? migrateV8ToCurrent(migrateV7Save(migrateV6Save(migrateV5Save(migrateV4Save(migrateV3Save(migratedV2)))))) : null) ?? (migratedV1 ? migrateV8ToCurrent(migrateV7Save(migrateV6Save(migrateV5Save(migrateV4Save(migrateV3Save(migratedV1)))))) : null);
    if (migrated) saveLegacySingleGameSave(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export function saveLegacySingleGameSave(save: GameSaveV12) {
  if (typeof localStorage !== "undefined") localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save));
}

export function clearLegacySingleGameSave() {
  if (typeof localStorage !== "undefined") for (const key of [GAME_SAVE_KEY, LEGACY_V11_GAME_SAVE_KEY, LEGACY_V10_GAME_SAVE_KEY, LEGACY_V9_GAME_SAVE_KEY, LEGACY_V8_GAME_SAVE_KEY, LEGACY_V7_GAME_SAVE_KEY, LEGACY_V6_GAME_SAVE_KEY, LEGACY_V5_GAME_SAVE_KEY, LEGACY_V4_GAME_SAVE_KEY, LEGACY_V3_GAME_SAVE_KEY, LEGACY_CURRENT_GAME_SAVE_KEY, LEGACY_GAME_SAVE_KEY]) localStorage.removeItem(key);
}
