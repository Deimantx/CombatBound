import type { GameState } from "../gameState";
import type { GameSaveV14, GameSaveV15, GameSaveV16 } from "./saveTypes";
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
  migrateV12Save,
  migrateV13Save,
  migrateV14Save,
  migrateV15Save,
  LEGACY_V14_PROFICIENCY_IDS,
  normalizeProgressionPerkIds,
} from "./saveMigration";
import { isGameSaveV15, isGameSaveV16 } from "./saveValidation";
import { normalizeCombatAutomation } from "../automation/automationLogic";
import { normalizeCombatAbilityLoadout } from "../combatAbilities/combatAbilityLogic";
import { normalizeCombatAutomationPresets } from "../automation/automationPresets";
import { grantItem, normalizeInventoryState } from "../items/itemOwnership";
import { normalizeEquipmentState } from "../equipment/equipmentRules";
import { normalizeMagicArts } from "../magicArts/magicArtLogic";
import { getActiveAbilityActionDefinitions } from "../combat/playerActions";
import { enemyDefinitions } from "../data/enemies";
import { itemById } from "../data/items";
import { normalizeCollectionTargets } from "../collection/collectionLogic";

export const CURRENT_SAVE_VERSION = 16;
export const GAME_SAVE_KEY = "combatbound-idle-save-v16";
export const LEGACY_V15_GAME_SAVE_KEY = "combatbound-idle-save-v15";
export const LEGACY_V14_GAME_SAVE_KEY = "combatbound-idle-save-v14";
export const LEGACY_V13_GAME_SAVE_KEY = "combatbound-idle-save-v13";
export const LEGACY_V12_GAME_SAVE_KEY = "combatbound-idle-save-v12";
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

export function gameStateToSaveV14(
  game: GameState,
  settings: { reducedMotion: boolean; showInspectorButton: boolean },
): GameSaveV14 {
  const progression = {
    ...game.progression,
    proficiencies: Object.fromEntries(Object.entries(game.progression.proficiencies).filter(([id]) => LEGACY_V14_PROFICIENCY_IDS.has(id as never))),
  } as GameSaveV14["progression"];
  const legacyActionIds = new Set(getLegacyActiveActionIds());
  return {
    version: 14,
    progression,
    inventory: game.inventory,
    equipment: game.equipment,
    collection: game.collection,
    gold: game.gold,
    settings,
    spellbook: game.spellbook,
    combatAutomation: game.combatAutomation,
    combatAutomationPresets: game.combatAutomationPresets,
    combatAbilities: { slots: game.combatAbilities.slots.map((id) => id && legacyActionIds.has(id) ? id : null) },
  };
}

function getLegacyActiveActionIds() {
  return [...getActiveAbilityActionDefinitions().map((action) => action.id), "spell.flame-blast", "spell.lightning-pulse", "spell.ice-shard", "spell.stone-spike", "spell.shadow-bolt"];
}

export function gameStateToSaveV15(
  game: GameState,
  settings: { reducedMotion: boolean; showInspectorButton: boolean },
): GameSaveV15 {
  const magicArts = normalizeMagicArts(game.magicArts);
  return {
    version: 15,
    progression: game.progression,
    inventory: game.inventory,
    equipment: game.equipment,
    collection: game.collection,
    gold: game.gold,
    settings,
    magicArts,
    combatAutomation: game.combatAutomation,
    combatAutomationPresets: game.combatAutomationPresets,
    combatAbilities: game.combatAbilities,
  };
}

export function gameStateToSaveV16(
  game: GameState,
  settings: { reducedMotion: boolean; showInspectorButton: boolean },
): GameSaveV16 {
  const magicArts = normalizeMagicArts(game.magicArts);
  return {
    version: 16,
    progression: game.progression,
    inventory: game.inventory,
    equipment: game.equipment,
    collection: game.collection,
    gold: game.gold,
    settings,
    magicArts,
    combatAutomation: game.combatAutomation,
    combatAutomationPresets: game.combatAutomationPresets,
    combatAbilities: game.combatAbilities,
  };
}

function normalizeCurrentSaveV15(value: unknown): GameSaveV15 | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as { version?: unknown }).version !== 15) return null;
  const { spellbook: _retiredSpellbook, ...raw } = value as GameSaveV15 & { spellbook?: unknown };
  const magicArts = normalizeMagicArts(raw.magicArts);
  const stripRetiredSpellRules = <T extends { actionId: string }>(rules: T[]) => rules.filter((rule) => !rule.actionId.startsWith("spell."));
  const automation = normalizeCombatAutomation(raw.combatAutomation);
  const presets = normalizeCombatAutomationPresets(raw.combatAutomationPresets);
  const normalized: GameSaveV15 = {
    ...raw,
    progression: normalizeProgressionPerkIds(raw.progression),
    inventory: normalizeInventoryState(raw.inventory),
    equipment: normalizeEquipmentState(raw.equipment, raw.inventory),
    collection: normalizeCollectionTargets(raw.collection, enemyDefinitions.map((enemy) => enemy.id)),
    magicArts,
    combatAutomation: { ...automation, rules: stripRetiredSpellRules(automation.rules) },
    combatAutomationPresets: { slots: presets.slots.map((preset) => preset ? { ...preset, config: { ...preset.config, rules: stripRetiredSpellRules(preset.config.rules) } } : null) },
    combatAbilities: normalizeCombatAbilityLoadout(raw.combatAbilities, magicArts.knownArtIds),
  };
  return isGameSaveV15(normalized) ? normalized : null;
}

function normalizeCurrentSaveV16(value: unknown): GameSaveV16 | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as { version?: unknown }).version !== 16) return null;
  const raw = value as Partial<GameSaveV16>;
  let inventory = normalizeInventoryState(raw.inventory);
  if (!Object.values(inventory.instances).some((instance) => instance.definitionId === "item.iron-sword"))
    inventory = grantItem(inventory, "item.iron-sword", 1).inventory;
  const normalizedEquipment = normalizeEquipmentState(raw.equipment, inventory);
  const sword = Object.values(inventory.instances).find((instance) => instance.definitionId === "item.iron-sword");
  const equipment = normalizedEquipment.slots.weapon || !sword
    ? normalizedEquipment
    : { slots: { ...normalizedEquipment.slots, weapon: sword.id } };
  const magicArts = normalizeMagicArts(raw.magicArts);
  const stripRetiredSpellRules = <T extends { actionId: string }>(rules: T[]) => rules.filter((rule) => !rule.actionId.startsWith("spell."));
  const automation = normalizeCombatAutomation(raw.combatAutomation);
  const presets = normalizeCombatAutomationPresets(raw.combatAutomationPresets);
  const progression = raw.progression ?? {
    proficiencies: {},
    hunterRankPoints: 0,
    bonusPerkPoints: 0,
    purchasedPerks: {},
  };
  const normalized: GameSaveV16 = {
    version: 16,
    progression: normalizeProgressionPerkIds(progression),
    inventory,
    equipment,
    collection: normalizeCollectionTargets(
      {
        discoveredItems: Array.from(new Set([
          ...(Array.isArray(raw.collection?.discoveredItems) ? raw.collection.discoveredItems.filter((id): id is string => typeof id === "string" && Boolean(itemById[id])) : []),
          "item.iron-sword",
        ])),
        targets: raw.collection?.targets ?? {},
      },
      enemyDefinitions.map((enemy) => enemy.id),
    ),
    gold: typeof raw.gold === "number" && Number.isFinite(raw.gold) ? raw.gold : 0,
    settings: {
      reducedMotion: raw.settings?.reducedMotion === true,
      showInspectorButton: raw.settings?.showInspectorButton === true,
    },
    magicArts,
    combatAutomation: { ...automation, rules: stripRetiredSpellRules(automation.rules) },
    combatAutomationPresets: {
      slots: presets.slots.map((preset) => preset ? { ...preset, config: { ...preset.config, rules: stripRetiredSpellRules(preset.config.rules) } } : null),
    },
    combatAbilities: normalizeCombatAbilityLoadout(raw.combatAbilities, magicArts.knownArtIds),
  };
  return isGameSaveV16(normalized) ? normalized : null;
}

function migrateToV15(value: unknown): GameSaveV15 | null {
  let current = value;
  for (let guard = 0; guard < 20; guard += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    const version = (current as { version?: unknown }).version;
    if (version === 15) return normalizeCurrentSaveV15(current) ?? current as GameSaveV15;
    if (version === 14) current = migrateV14Save(current);
    else current = version === 13 ? migrateV13Save(current)
      : version === 12 ? migrateV12Save(current)
        : version === 11 ? migrateV11Save(current)
          : version === 10 ? migrateV10Save(current)
            : version === 9 ? migrateV9Save(current)
              : version === 8 ? migrateV8Save(current)
                : version === 7 ? migrateV7Save(current)
                  : version === 6 ? migrateV6Save(current)
                    : version === 5 ? migrateV5Save(current)
                      : version === 4 ? migrateV4Save(current)
                        : version === 3 ? migrateV3Save(current)
                          : version === 2 ? migrateCurrentSave(current)
                            : version === 1 ? migrateLegacySave(current)
                              : null;
    if (!current) return null;
  }
  return null;
}

function migrateToV16(value: unknown): GameSaveV16 | null {
  let current = value;
  for (let guard = 0; guard < 20; guard += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    const version = (current as { version?: unknown }).version;
    if (version === 16) return normalizeCurrentSaveV16(current);
    if (version === 15) return normalizeCurrentSaveV16(migrateV15Save(current));
    const legacyV15 = migrateToV15(current);
    return normalizeCurrentSaveV16(migrateV15Save(legacyV15));
  }
  return null;
}

export function parseGameSaveJson(raw: string): GameSaveV16 | null {
  try {
    return migrateToV16(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/** Reads the pre-profile global save chain for the one-time Profile 1 migration only. */
export function loadLegacySingleGameSaveForProfileMigration(): GameSaveV16 | null {
  if (typeof localStorage === "undefined") return null;
  const keys = [GAME_SAVE_KEY, LEGACY_V15_GAME_SAVE_KEY, LEGACY_V14_GAME_SAVE_KEY, LEGACY_V13_GAME_SAVE_KEY, LEGACY_V12_GAME_SAVE_KEY, LEGACY_V11_GAME_SAVE_KEY, LEGACY_V10_GAME_SAVE_KEY, LEGACY_V9_GAME_SAVE_KEY, LEGACY_V8_GAME_SAVE_KEY, LEGACY_V7_GAME_SAVE_KEY, LEGACY_V6_GAME_SAVE_KEY, LEGACY_V5_GAME_SAVE_KEY, LEGACY_V4_GAME_SAVE_KEY, LEGACY_V3_GAME_SAVE_KEY, LEGACY_CURRENT_GAME_SAVE_KEY, LEGACY_GAME_SAVE_KEY];
  try {
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const save = parseGameSaveJson(raw);
      if (save) {
        saveLegacySingleGameSave(save);
        return save;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function saveLegacySingleGameSave(save: GameSaveV16) {
  if (typeof localStorage !== "undefined") localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save));
}

export function clearLegacySingleGameSave() {
  if (typeof localStorage !== "undefined") {
    for (const key of [GAME_SAVE_KEY, LEGACY_V15_GAME_SAVE_KEY, LEGACY_V14_GAME_SAVE_KEY, LEGACY_V13_GAME_SAVE_KEY, LEGACY_V12_GAME_SAVE_KEY, LEGACY_V11_GAME_SAVE_KEY, LEGACY_V10_GAME_SAVE_KEY, LEGACY_V9_GAME_SAVE_KEY, LEGACY_V8_GAME_SAVE_KEY, LEGACY_V7_GAME_SAVE_KEY, LEGACY_V6_GAME_SAVE_KEY, LEGACY_V5_GAME_SAVE_KEY, LEGACY_V4_GAME_SAVE_KEY, LEGACY_V3_GAME_SAVE_KEY, LEGACY_CURRENT_GAME_SAVE_KEY, LEGACY_GAME_SAVE_KEY]) localStorage.removeItem(key);
  }
}
