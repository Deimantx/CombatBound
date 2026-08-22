import type { GameState } from "../gameState";
import type { GameSaveV14, GameSaveV15, GameSaveV17, GameSaveV18, GameSaveV19, HistoricalEquipmentSlotIdV17, HistoricalEquipmentSlotIdV18, HistoricalEquipmentStateV17, HistoricalEquipmentStateV18, HistoricalInventoryStateV17, HistoricalInventoryStateV18, HistoricalItemInstanceV17, HistoricalItemInstanceV18, HistoricalMiningStateV18, HistoricalProfessionStateV18 } from "./saveTypes";
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
  migrateV16Save,
  LEGACY_V14_PROFICIENCY_IDS,
  normalizeProgressionPerkIds,
} from "./saveMigration";
import { isGameSaveV17, isGameSaveV18, isGameSaveV19 } from "./saveValidation";
import { normalizeCombatAutomation } from "../automation/automationLogic";
import { normalizeCombatAbilityLoadout } from "../combatAbilities/combatAbilityLogic";
import { normalizeCombatAutomationPresets } from "../automation/automationPresets";
import { normalizeInventoryState } from "../items/itemOwnership";
import { normalizeEquipmentState } from "../equipment/equipmentRules";
import { normalizeMagicArts } from "../magicArts/magicArtLogic";
import { getActiveAbilityActionDefinitions } from "../combat/playerActions";
import { enemyDefinitions } from "../data/enemies";
import { itemById } from "../data/items";
import { normalizeCollectionTargets } from "../collection/collectionLogic";
import { createInitialProfessionState, normalizeProfessionState } from "../professions/professionProgression";
import { createInitialMiningState } from "../professions/mining/miningData";
import { normalizeMiningState } from "../professions/mining/miningRuntime";
import { grantItem, getInstancesByDefinitionId } from "../items/itemOwnership";
import { isItemInstanceId, itemInstanceSequence } from "../items/itemTypes";
import { createInitialBlacksmithingState } from "../professions/blacksmithing/blacksmithingData";
import { normalizeBlacksmithingState } from "../professions/blacksmithing/blacksmithingRuntime";

export const CURRENT_SAVE_VERSION = 19;
export const GAME_SAVE_KEY = "combatbound-idle-save-v19";
export const LEGACY_V18_GAME_SAVE_KEY = "combatbound-idle-save-v18";
export const LEGACY_V17_GAME_SAVE_KEY = "combatbound-idle-save-v17";
export const LEGACY_V16_GAME_SAVE_KEY = "combatbound-idle-save-v16";
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

const HISTORICAL_V17_SLOTS: readonly HistoricalEquipmentSlotIdV17[] = ["weapon", "offhand", "head", "armor", "gloves", "boots", "belt", "cape", "necklace", "ring1", "ring2", "earring1", "earring2"];
const HISTORICAL_V18_SLOTS: readonly HistoricalEquipmentSlotIdV18[] = [...HISTORICAL_V17_SLOTS, "tool"];

function toHistoricalInventoryV17(inventory: GameState["inventory"]): HistoricalInventoryStateV17 {
  return {
    stackables: { ...inventory.stackables },
    instances: Object.fromEntries(Object.entries(inventory.instances).map(([id, instance]) => [id, { id: instance.id, definitionId: instance.definitionId, version: 3 as const, unlockedUpgradeNodeIds: [...instance.unlockedUpgradeNodeIds] }])),
    nextInstanceSequence: inventory.nextInstanceSequence,
  };
}

function toHistoricalEquipmentV17(equipment: GameState["equipment"]): HistoricalEquipmentStateV17 {
  const slots = Object.fromEntries(HISTORICAL_V17_SLOTS.flatMap((slot) => equipment.slots[slot] ? [[slot, equipment.slots[slot]]] : []));
  return { slots: slots as HistoricalEquipmentStateV17["slots"] };
}

function toHistoricalInventoryV18(inventory: GameState["inventory"]): HistoricalInventoryStateV18 {
  return {
    stackables: { ...inventory.stackables },
    instances: Object.fromEntries(Object.entries(inventory.instances).map(([id, instance]) => [id, { id: instance.id, definitionId: instance.definitionId, version: 3 as const, unlockedUpgradeNodeIds: [...instance.unlockedUpgradeNodeIds] }])) as Record<string, HistoricalItemInstanceV18>,
    nextInstanceSequence: inventory.nextInstanceSequence,
  };
}

function toHistoricalEquipmentV18(equipment: GameState["equipment"]): HistoricalEquipmentStateV18 {
  const slots = Object.fromEntries(HISTORICAL_V18_SLOTS.flatMap((slot) => equipment.slots[slot] ? [[slot, equipment.slots[slot]]] : []));
  return { slots: slots as HistoricalEquipmentStateV18["slots"] };
}

function toHistoricalProfessionV18(professions: GameState["professions"]): HistoricalProfessionStateV18 {
  const initial = createInitialProfessionState();
  const mining = professions.skills.mining ?? initial.skills.mining!;
  const mastery = professions.resourceMasteries["mastery.iron-vein"] ?? initial.resourceMasteries["mastery.iron-vein"];
  return {
    skills: { mining: { skillId: "mining", totalXp: mining.totalXp, bonusSkillPoints: mining.bonusSkillPoints, purchasedPerks: { ...mining.purchasedPerks } } },
    resourceMasteries: { "mastery.iron-vein": { masteryId: "mastery.iron-vein", totalXp: mastery.totalXp } },
  };
}

function toHistoricalMiningV18(mining: GameState["mining"]): HistoricalMiningStateV18 {
  return {
    selectedResourceId: "mining-resource.iron-vein",
    active: mining.active,
    mode: mining.mode,
    currentStageId: mining.currentStageId,
    stageDurabilityRemaining: mining.stageDurabilityRemaining,
    miningStamina: mining.miningStamina,
    swingTimerRemaining: mining.swingTimerRemaining,
    restTimerRemaining: mining.restTimerRemaining,
    yieldRemainders: { ...mining.yieldRemainders },
    completedDeposits: mining.completedDeposits,
    totalSwings: mining.totalSwings,
    exhaustionRestsThisDeposit: mining.exhaustionRestsThisDeposit,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** Reads the frozen V17 inventory shape without consulting current item trees. */
function normalizeHistoricalInventoryV17(value: unknown): HistoricalInventoryStateV17 | null {
  if (!isRecord(value) || !isRecord(value.stackables) || !isRecord(value.instances)) return null;
  const stackables: Record<string, number> = {};
  for (const [definitionId, quantity] of Object.entries(value.stackables)) {
    if (typeof quantity !== "number" || !Number.isInteger(quantity) || !Number.isFinite(quantity) || quantity < 0) return null;
    stackables[definitionId] = quantity;
  }
  const instances: Record<string, HistoricalItemInstanceV17> = {};
  let highestSequence = 0;
  for (const [key, raw] of Object.entries(value.instances)) {
    if (!isRecord(raw) || raw.id !== key || !isItemInstanceId(key) || raw.version !== 3 || typeof raw.definitionId !== "string" || !Array.isArray(raw.unlockedUpgradeNodeIds) || raw.unlockedUpgradeNodeIds.some((id) => typeof id !== "string") || Object.keys(raw).some((field) => !["id", "definitionId", "version", "unlockedUpgradeNodeIds"].includes(field))) return null;
    instances[key] = { id: key, definitionId: raw.definitionId, version: 3, unlockedUpgradeNodeIds: [...raw.unlockedUpgradeNodeIds] as string[] };
    highestSequence = Math.max(highestSequence, itemInstanceSequence(key));
  }
  if (typeof value.nextInstanceSequence !== "number" || !Number.isInteger(value.nextInstanceSequence) || value.nextInstanceSequence < 1 || value.nextInstanceSequence <= highestSequence) return null;
  return { stackables, instances, nextInstanceSequence: value.nextInstanceSequence };
}

/** Keeps historical equipment references intact while checking only V17 structure. */
function normalizeHistoricalEquipmentV17(value: unknown, inventory: HistoricalInventoryStateV17): HistoricalEquipmentStateV17 | null {
  if (!isRecord(value) || !isRecord(value.slots)) return null;
  const slots: Partial<Record<HistoricalEquipmentSlotIdV17, string>> = {};
  const used = new Set<string>();
  for (const [slot, instanceId] of Object.entries(value.slots)) {
    if (!HISTORICAL_V17_SLOTS.includes(slot as HistoricalEquipmentSlotIdV17) || typeof instanceId !== "string" || !isItemInstanceId(instanceId) || !inventory.instances[instanceId] || used.has(instanceId)) return null;
    slots[slot as HistoricalEquipmentSlotIdV17] = instanceId;
    used.add(instanceId);
  }
  return { slots };
}

function normalizeHistoricalInventoryV18(value: unknown): HistoricalInventoryStateV18 | null {
  const normalized = normalizeHistoricalInventoryV17(value);
  return normalized ? { ...normalized, instances: normalized.instances as Record<string, HistoricalItemInstanceV18> } : null;
}

function normalizeHistoricalEquipmentV18(value: unknown, inventory: HistoricalInventoryStateV18): HistoricalEquipmentStateV18 | null {
  if (!isRecord(value) || !isRecord(value.slots)) return null;
  const slots: Partial<Record<HistoricalEquipmentSlotIdV18, string>> = {};
  const used = new Set<string>();
  for (const [slot, instanceId] of Object.entries(value.slots)) {
    if (!HISTORICAL_V18_SLOTS.includes(slot as HistoricalEquipmentSlotIdV18) || typeof instanceId !== "string" || !isItemInstanceId(instanceId) || !inventory.instances[instanceId] || used.has(instanceId)) return null;
    slots[slot as HistoricalEquipmentSlotIdV18] = instanceId;
    used.add(instanceId);
  }
  return { slots };
}

export function gameStateToSaveV14(
  game: GameState,
  settings: { reducedMotion: boolean; showInspectorButton: boolean },
): GameSaveV14 {
  const progression = {
    ...game.progression,
    proficiencies: Object.fromEntries(Object.entries(game.progression.proficiencies).filter(([id]) => LEGACY_V14_PROFICIENCY_IDS.has(id as never))),
  } as GameSaveV14["progression"];
  const legacyActionIds = new Set(getLegacyActiveActionIds());
  const legacyInstances = Object.fromEntries(Object.entries(game.inventory.instances).map(([id, instance]) => [id, {
    id,
    definitionId: instance.definitionId,
    version: 2 as const,
    quality: 0,
    upgradeLevel: 0,
    affixes: [],
  }]));
  return {
    version: 14,
    progression,
    inventory: { stackables: game.inventory.stackables, instances: legacyInstances, nextInstanceSequence: game.inventory.nextInstanceSequence },
    equipment: { slots: game.equipment.slots },
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

export function gameStateToSaveV17(
  game: GameState,
  settings: { reducedMotion: boolean; showInspectorButton: boolean },
): GameSaveV17 {
  const magicArts = normalizeMagicArts(game.magicArts);
  return {
    version: 17,
    progression: game.progression,
    inventory: toHistoricalInventoryV17(game.inventory),
    equipment: toHistoricalEquipmentV17(game.equipment),
    collection: game.collection,
    gold: game.gold,
    settings,
    magicArts,
    combatAutomation: game.combatAutomation,
    combatAutomationPresets: game.combatAutomationPresets,
    combatAbilities: game.combatAbilities,
  };
}

export function gameStateToSaveV18(
  game: GameState,
  settings: { reducedMotion: boolean; showInspectorButton: boolean },
): GameSaveV18 {
  return {
    ...gameStateToSaveV17(game, settings),
    version: 18,
    inventory: toHistoricalInventoryV18(game.inventory),
    equipment: toHistoricalEquipmentV18(game.equipment),
    professions: toHistoricalProfessionV18(game.professions),
    mining: toHistoricalMiningV18(game.mining),
  };
}

export function gameStateToSaveV19(
  game: GameState,
  settings: { reducedMotion: boolean; showInspectorButton: boolean },
): GameSaveV19 {
  return {
    version: 19,
    progression: game.progression,
    inventory: game.inventory,
    equipment: game.equipment,
    collection: game.collection,
    gold: game.gold,
    settings,
    magicArts: normalizeMagicArts(game.magicArts),
    combatAutomation: game.combatAutomation,
    combatAutomationPresets: game.combatAutomationPresets,
    combatAbilities: game.combatAbilities,
    professions: game.professions,
    mining: game.mining,
    blacksmithing: game.blacksmithing,
  };
}

function migrateV17ToV18(save: GameSaveV17): GameSaveV18 {
  let inventory = normalizeInventoryState(save.inventory);
  let equipment = normalizeEquipmentState(save.equipment, inventory);
  const hasPickaxe = getInstancesByDefinitionId(inventory, "item.worn-pickaxe").length + getInstancesByDefinitionId(inventory, "item.iron-pickaxe").length > 0;
  if (!hasPickaxe) inventory = grantItem(inventory, "item.worn-pickaxe", 1).inventory;
  const worn = getInstancesByDefinitionId(inventory, "item.worn-pickaxe")[0];
  if (!equipment.slots.tool && worn) equipment = { slots: { ...equipment.slots, tool: worn.id } };
  return { ...save, version: 18, inventory: toHistoricalInventoryV18(inventory), equipment: toHistoricalEquipmentV18(equipment), professions: toHistoricalProfessionV18(createInitialProfessionState()), mining: toHistoricalMiningV18(createInitialMiningState()) };
}

function migrateV18ToV19(save: GameSaveV18): GameSaveV19 {
  const inventory = normalizeInventoryState(save.inventory);
  const equipment = normalizeEquipmentState(save.equipment, inventory);
  return { ...save, version: 19, inventory, equipment, professions: normalizeProfessionState(save.professions), mining: normalizeMiningState(save.mining), blacksmithing: createInitialBlacksmithingState() };
}

function normalizeSharedCurrentSaveFields(raw: Record<string, unknown>, inventory: GameState["inventory"], equipment: GameState["equipment"]) {
  const magicArts = normalizeMagicArts(raw.magicArts);
  const stripRetiredSpellRules = <T extends { actionId: string }>(rules: T[]) => rules.filter((rule) => !rule.actionId.startsWith("spell."));
  const automation = normalizeCombatAutomation(raw.combatAutomation);
  const presets = normalizeCombatAutomationPresets(raw.combatAutomationPresets);
  const progression = raw.progression && typeof raw.progression === "object" ? raw.progression as GameState["progression"] : {
    proficiencies: {},
    hunterRankPoints: 0,
    bonusPerkPoints: 0,
    purchasedPerks: {},
  } as GameState["progression"];
  const rawCollection = raw.collection && typeof raw.collection === "object" ? raw.collection as Partial<GameState["collection"]> : {};
  return {
    progression: normalizeProgressionPerkIds(progression),
    inventory,
    equipment,
    collection: normalizeCollectionTargets(
      {
        discoveredItems: Array.from(new Set([
          ...(Array.isArray(rawCollection.discoveredItems) ? rawCollection.discoveredItems.filter((id): id is string => typeof id === "string" && Boolean(itemById[id])) : []),
        ])),
        targets: rawCollection.targets ?? {},
      },
      enemyDefinitions.map((enemy) => enemy.id),
    ),
    gold: typeof raw.gold === "number" && Number.isFinite(raw.gold) ? raw.gold : 0,
    settings: {
      reducedMotion: (raw.settings as { reducedMotion?: unknown } | undefined)?.reducedMotion === true,
      showInspectorButton: (raw.settings as { showInspectorButton?: unknown } | undefined)?.showInspectorButton === true,
    },
    magicArts,
    combatAutomation: { ...automation, rules: stripRetiredSpellRules(automation.rules) },
    combatAutomationPresets: {
      slots: presets.slots.map((preset) => preset ? { ...preset, config: { ...preset.config, rules: stripRetiredSpellRules(preset.config.rules) } } : null),
    },
    combatAbilities: normalizeCombatAbilityLoadout(raw.combatAbilities, magicArts.knownArtIds),
  };
}

function normalizeCurrentSaveV17(value: unknown): GameSaveV17 | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as { version?: unknown }).version !== 17) return null;
  const raw = value as Record<string, unknown>;
  const historicalInventory = normalizeHistoricalInventoryV17(raw.inventory);
  const historicalEquipment = historicalInventory ? normalizeHistoricalEquipmentV17(raw.equipment, historicalInventory) : null;
  if (!historicalInventory || !historicalEquipment) return null;
  // Shared fields still use current runtime-shaped values, but the historical
  // inventory/equipment were structurally parsed above and are not passed
  // through current item-definition or upgrade-tree validation.
  const inventory = historicalInventory as unknown as GameState["inventory"];
  const equipment = historicalEquipment as unknown as GameState["equipment"];
  const shared = normalizeSharedCurrentSaveFields(raw, inventory, equipment);
  const normalized: GameSaveV17 = {
    version: 17,
    ...shared,
    inventory: historicalInventory,
    equipment: historicalEquipment,
  };
  return isGameSaveV17(normalized) ? normalized : null;
}

function normalizeCurrentSaveV18(value: unknown): GameSaveV18 | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as { version?: unknown }).version !== 18) return null;
  const raw = value as Record<string, unknown>;
  if ("blacksmithing" in raw) return null;
  const historicalInventory = normalizeHistoricalInventoryV18(raw.inventory);
  const historicalEquipment = historicalInventory ? normalizeHistoricalEquipmentV18(raw.equipment, historicalInventory) : null;
  if (!historicalInventory || !historicalEquipment) return null;
  const inventory = normalizeInventoryState(historicalInventory);
  const equipment = normalizeEquipmentState(historicalEquipment, inventory);
  const currentProfessions = normalizeProfessionState(raw.professions);
  const currentMining = normalizeMiningState(raw.mining);
  const normalized: GameSaveV18 = { version: 18, ...normalizeSharedCurrentSaveFields(raw, inventory, equipment), inventory: historicalInventory, equipment: historicalEquipment, professions: toHistoricalProfessionV18(currentProfessions), mining: toHistoricalMiningV18(currentMining) };
  return isGameSaveV18(normalized) ? normalized : null;
}

function normalizeCurrentSaveV19(value: unknown): GameSaveV19 | null {
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as { version?: unknown }).version !== 19) return null;
  const raw = value as Record<string, unknown>;
  const inventory = normalizeInventoryState(raw.inventory);
  const equipment = normalizeEquipmentState(raw.equipment, inventory);
  const normalized: GameSaveV19 = { version: 19, ...normalizeSharedCurrentSaveFields(raw, inventory, equipment), professions: normalizeProfessionState(raw.professions), mining: normalizeMiningState(raw.mining), blacksmithing: normalizeBlacksmithingState(raw.blacksmithing) };
  return isGameSaveV19(normalized) ? normalized : null;
}

function migrateToV15(value: unknown): GameSaveV15 | null {
  let current = value;
  for (let guard = 0; guard < 20; guard += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    const version = (current as { version?: unknown }).version;
    if (version === 15) return current as GameSaveV15;
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

function migrateToV17(value: unknown): GameSaveV17 | null {
  let current = value;
  for (let guard = 0; guard < 20; guard += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    const version = (current as { version?: unknown }).version;
    if (version === 17) return normalizeCurrentSaveV17(current);
    if (version === 16) return normalizeCurrentSaveV17(migrateV16Save(current));
    if (version === 15) {
      const migratedV16 = migrateV15Save(current);
      return normalizeCurrentSaveV17(migratedV16 ? migrateV16Save(migratedV16) : null);
    }
    const legacyV15 = migrateToV15(current);
    const migratedV16 = legacyV15 ? migrateV15Save(legacyV15) : null;
    return normalizeCurrentSaveV17(migratedV16 ? migrateV16Save(migratedV16) : null);
  }
  return null;
}

function migrateToV18(value: unknown): GameSaveV18 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const version = (value as { version?: unknown }).version;
  if (version === 18) return normalizeCurrentSaveV18(value);
  const v17 = migrateToV17(value);
  return v17 ? migrateV17ToV18(v17) : null;
}

function migrateToV19(value: unknown): GameSaveV19 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const version = (value as { version?: unknown }).version;
  if (version === 19) return normalizeCurrentSaveV19(value);
  const v18 = migrateToV18(value);
  return v18 ? migrateV18ToV19(v18) : null;
}

export function parseGameSaveJson(raw: string): GameSaveV19 | null {
  try {
    return migrateToV19(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/** Reads the pre-profile global save chain for the one-time Profile 1 migration only. */
export function loadLegacySingleGameSaveForProfileMigration(): GameSaveV19 | null {
  if (typeof localStorage === "undefined") return null;
  const keys = [GAME_SAVE_KEY, LEGACY_V18_GAME_SAVE_KEY, LEGACY_V17_GAME_SAVE_KEY, LEGACY_V16_GAME_SAVE_KEY, LEGACY_V15_GAME_SAVE_KEY, LEGACY_V14_GAME_SAVE_KEY, LEGACY_V13_GAME_SAVE_KEY, LEGACY_V12_GAME_SAVE_KEY, LEGACY_V11_GAME_SAVE_KEY, LEGACY_V10_GAME_SAVE_KEY, LEGACY_V9_GAME_SAVE_KEY, LEGACY_V8_GAME_SAVE_KEY, LEGACY_V7_GAME_SAVE_KEY, LEGACY_V6_GAME_SAVE_KEY, LEGACY_V5_GAME_SAVE_KEY, LEGACY_V4_GAME_SAVE_KEY, LEGACY_V3_GAME_SAVE_KEY, LEGACY_CURRENT_GAME_SAVE_KEY, LEGACY_GAME_SAVE_KEY];
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

export function saveLegacySingleGameSave(save: GameSaveV19) {
  if (typeof localStorage !== "undefined") localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(save));
}

export function clearLegacySingleGameSave() {
  if (typeof localStorage !== "undefined") {
    for (const key of [GAME_SAVE_KEY, LEGACY_V18_GAME_SAVE_KEY, LEGACY_V17_GAME_SAVE_KEY, LEGACY_V16_GAME_SAVE_KEY, LEGACY_V15_GAME_SAVE_KEY, LEGACY_V14_GAME_SAVE_KEY, LEGACY_V13_GAME_SAVE_KEY, LEGACY_V12_GAME_SAVE_KEY, LEGACY_V11_GAME_SAVE_KEY, LEGACY_V10_GAME_SAVE_KEY, LEGACY_V9_GAME_SAVE_KEY, LEGACY_V8_GAME_SAVE_KEY, LEGACY_V7_GAME_SAVE_KEY, LEGACY_V6_GAME_SAVE_KEY, LEGACY_V5_GAME_SAVE_KEY, LEGACY_V4_GAME_SAVE_KEY, LEGACY_V3_GAME_SAVE_KEY, LEGACY_CURRENT_GAME_SAVE_KEY, LEGACY_GAME_SAVE_KEY]) localStorage.removeItem(key);
  }
}
