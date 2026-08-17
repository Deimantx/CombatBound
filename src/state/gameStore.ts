import { create } from "zustand";
import {
  advanceCombat,
  castSpell as engineCastSpell,
  createCombatContext,
  executePlayerAction as engineExecutePlayerAction,
  forceDefeatPlayerForDebug,
  selectEnemy as engineSelectEnemy,
  startHunt as engineStartHunt,
  startDebugEncounter as engineStartDebugEncounter,
  stopHunt as engineStopHunt,
  syncCombatStats,
  toggleTechnique as engineToggleTechnique,
  useHealingPotion,
} from "../game/combat/combatEngine";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { equipItemInstance as equipOwnedItemInstance, unequipEquipmentSlot as unequipOwnedEquipmentSlot } from "../game/equipment/equipmentRules";
import { getItemDefinitionForInstance } from "../game/items/itemResolver";
import { normalizeInventoryState } from "../game/items/itemOwnership";
import { normalizeEquipmentState } from "../game/equipment/equipmentRules";
import { combatLocationById } from "../game/data/world/combatLocations";
import { continentById } from "../game/data/world/continents";
import { createInitialGameState, type GameState } from "../game/gameState";
import { masteryLevelForXp } from "../game/progression/masteryProgression";
import { discoverProficiency } from "../game/progression/proficiencyProgression";
import { purchasePerk } from "../game/progression/perkProgression";
import { perkById } from "../game/data/proficiencyPerks";
import {
  cascadeSelection,
  getDefaultWorldSelection,
  isCombatLocationAvailable,
  selectionForLocation,
} from "../game/world/worldSelectors";
import {
  saveProfileGameSave,
  loadProfileGameSave,
} from "../game/profiles/profileStorage";
import { getProfileSessionOwnerId, isProfileSessionOwner } from "../game/profiles/profileSessionLease";
import { CURRENT_SAVE_VERSION, parseGameSaveJson } from "../game/persistence/saveGame";
import type { ProfileId } from "../game/profiles/profileTypes";
import type { InventoryEntryRef } from "../game/items/itemTypes";
import type { TechniqueId } from "../game/combat/combatTypes";
import {
  equipSpellToSlot as equipSpellToSlotState,
  moveEquippedSpell as moveEquippedSpellState,
  normalizeSpellbook,
  unequipSpellSlot as unequipSpellSlotState,
} from "../game/spellbook/spellbookLogic";
import {
  createInitialCombatAbilityLoadout,
  equipCombatAbility as equipCombatAbilityState,
  equipTechnique as equipTechniqueState,
  moveCombatAbility as moveCombatAbilityState,
  moveTechnique as moveTechniqueState,
  normalizeCombatAbilityLoadout,
  unequipCombatAbility as unequipCombatAbilityState,
  unequipTechnique as unequipTechniqueState,
} from "../game/combatAbilities/combatAbilityLogic";
import { createInitialCombatAutomation } from "../game/automation/automationTypes";
import {
  clearAutomationPreset,
  loadAutomationPreset as loadAutomationPresetConfig,
  normalizeCombatAutomationPresets,
  renameAutomationPreset,
  saveCurrentAutomationToPreset,
} from "../game/automation/automationPresets";
import {
  addAutomationCondition,
  addAutomationRule,
  deleteAutomationRule,
  moveAutomationRule,
  moveTargetPriority,
  normalizeCombatAutomation,
  removeAutomationCondition,
  setAutomationEnabled,
  setAutomationOverrideManualTarget,
  setAutomationRuleEnabled,
  setTargetPriorityEnabled,
  updateAutomationCondition,
  updateAutomationRule,
} from "../game/automation/automationLogic";
import { isEquipmentSlotId, type EquipmentSlotId } from "../game/equipment/equipmentTypes";
import type { HeroWindowRequest, ScreenId } from "../shared/types";
import type { AutomationCondition, AutomationRule } from "../game/automation/automationTypes";
import {
  debugAddGold,
  debugAddMasteryXp,
  debugApplyEffect,
  debugCancelEnemyActions,
  debugClearAllEnemyEffects,
  debugClearPlayerEffects,
  debugClearSelectedEnemyEffects,
  debugDamagePlayer,
  debugApplyPlayerMaxHpBarrier,
  debugDiscoverAllItems,
  debugDiscoverAllProficiencies,
  debugDiscoverAllTargets,
  debugEquipBothTechniques,
  debugEquipSwordSkills,
  debugFillAllResources,
  debugFillHealth,
  debugFillMana,
  debugFillSpellLoadout,
  debugFillStamina,
  debugGrantAllEquipment,
  debugGrantEquipmentTier,
  debugGrantItem,
  debugDeleteItemInstance,
  debugGrantPerkPoints,
  debugResetBonusPerkPoints,
  debugHealPlayer,
  debugKillCurrentGroup,
  debugKillSelectedEnemy,
  debugHealSelectedEnemyToFull,
  debugLearnAllSpells,
  debugResetCollection,
  debugResetEnemyCooldowns,
  debugResetPlayerCooldowns,
  debugResetSessionMetrics,
  debugResetSpellbook,
  debugRevivePlayer,
  debugSetAllProficiencyLevels,
  debugSetAllTargetDefeatsToOne,
  debugSetGold,
  debugSetOwnedItemCount,
  debugSetItemQuality,
  debugSetItemUpgradeLevel,
  debugAddItemAffix,
  debugRemoveItemAffix,
  debugRerollItemAffix,
  debugSetMasteryLevel,
  debugSetBonusPerkPoints,
  debugSetPlayerResource,
  debugSetProficiencyLevel,
  debugSetResourcePercent,
} from "../game/debug/debugActions";
import type { DebugEffectTarget, DebugResource } from "../game/debug/debugTypes";
import type { CombatProficiencyId } from "../game/progression/progressionTypes";
import { useDevToolsRuntimeStore } from "../app/debug/devtools/devToolsRuntimeStore";
import { useDebugTelemetryStore } from "../app/debug/telemetry/debugTelemetryStore";
import type { DebugScenarioSnapshot } from "../app/debug/scenarios/debugScenarioTypes";
import { validateDebugScenario } from "../app/debug/scenarios/debugScenarioValidation";

interface GameStoreState {
  activeProfileId: ProfileId | null;
  game: GameState;
  screen: ScreenId;
  heroWindowRequest: HeroWindowRequest | null;
  selectedContinentId: string;
  selectedRegionId: string;
  selectedAreaId: string;
  selectedCombatLocationId: string;
  activeCombatLocationId: string | null;
  combatActive: boolean;
  activity: "idle" | "combat";
  selectedTargetId: string;
  playerHp: number;
  enemyHp: number;
  playerAttackProgress: number;
  enemyAttackProgress: number;
  round: number;
  kills: number;
  combatLog: GameState["combat"]["log"];
  inventoryFilter: string;
  selectedInventoryEntry: InventoryEntryRef | null;
  selectedEquipmentSlot: EquipmentSlotId;
  selectedCollectionEntryId: string;
  collectionTab: "Items" | "Targets";
  combatOverviewTab: "Session Summary" | "Loot" | "Progression";
  reducedMotion: boolean;
  showInspectorButton: boolean;
  debug: DebugStoreApi;
  setScreen: (screen: ScreenId) => void;
  openHeroWindow: (window: HeroWindowRequest["window"], options?: Omit<HeroWindowRequest, "window">) => void;
  clearHeroWindowRequest: () => void;
  selectContinent: (id: string) => void;
  selectRegion: (id: string) => void;
  selectArea: (id: string) => void;
  selectCombatLocation: (id: string) => void;
  startHunt: () => void;
  switchHunt: () => void;
  stopHunt: () => void;
  startCombat: () => void;
  stopCombat: () => void;
  tickCombat: (delta: number) => void;
  selectTarget: (instanceId: string) => void;
  toggleTechnique: (technique: TechniqueId) => void;
  castSpell: (spellId: string) => void;
  executeAction: (actionId: string) => void;
  setSpellSlot: (slot: number, spellId: string | null) => void;
  equipSpellToSlot: (spellId: string, slot: number) => void;
  moveEquippedSpell: (sourceSlot: number, targetSlot: number) => void;
  unequipSpellSlot: (slot: number) => void;
  setCombatAbilitySlot: (slot: number, actionId: string | null) => void;
  equipCombatAbility: (actionId: string, slot: number) => void;
  moveCombatAbility: (sourceSlot: number, targetSlot: number) => void;
  unequipCombatAbility: (slot: number) => void;
  setTechniqueSlot: (slot: number, techniqueId: TechniqueId | null) => void;
  moveTechnique: (sourceSlot: number, targetSlot: number) => void;
  unequipTechnique: (slot: number) => void;
  toggleAutomation: () => void;
  toggleAutomationRule: (ruleId: string) => void;
  setAutomationEnabled: (enabled: boolean) => void;
  setAutomationOverrideManualTarget: (enabled: boolean) => void;
  addAutomationRule: (rule: Partial<AutomationRule> & Pick<AutomationRule, "actionId">) => void;
  updateAutomationRule: (ruleId: string, patch: Partial<Omit<AutomationRule, "id">>) => void;
  deleteAutomationRule: (ruleId: string) => void;
  setAutomationRuleEnabled: (ruleId: string, enabled: boolean) => void;
  moveAutomationRule: (ruleId: string, direction: "up" | "down") => void;
  addAutomationCondition: (ruleId: string, condition: AutomationCondition) => void;
  updateAutomationCondition: (ruleId: string, index: number, condition: AutomationCondition) => void;
  removeAutomationCondition: (ruleId: string, index: number) => void;
  setTargetPriorityEnabled: (priorityId: string, enabled: boolean) => void;
  moveTargetPriority: (priorityId: string, direction: "up" | "down") => void;
  saveAutomationPreset: (slot: number, name?: string) => void;
  loadAutomationPreset: (slot: number) => void;
  renameAutomationPreset: (slot: number, name: string) => void;
  clearAutomationPreset: (slot: number) => void;
  swapSpellSlots: (first: number, second: number) => void;
  unequipSpell: (slot: number) => void;
  usePotion: () => void;
  purchaseProficiencyPerk: (perkId: string) => void;
  equipItemInstance: (instanceId: string, slot: EquipmentSlotId) => void;
  unequipEquipmentSlot: (slot: EquipmentSlotId) => void;
  setInventoryFilter: (filter: string) => void;
  selectInventoryEntry: (entry: InventoryEntryRef | null) => void;
  selectEquipmentSlot: (slotId: EquipmentSlotId) => void;
  selectCollectionEntry: (entryId: string) => void;
  setCollectionTab: (tab: "Items" | "Targets") => void;
  setCombatOverviewTab: (
    tab: "Session Summary" | "Loot" | "Progression",
  ) => void;
  setReducedMotion: (value: boolean) => void;
  setShowInspectorButton: (value: boolean) => void;
  hydrateProfile: (profileId: ProfileId, save: NonNullable<ReturnType<typeof loadProfileGameSave>>) => void;
  startFreshProfile: (profileId: ProfileId) => void;
  saveActiveProfileNow: () => boolean;
  unloadProfile: () => void;
  resetGameplay: () => void;
  resetPrototype: () => void;
}

export interface DebugStoreApi {
  grantItem: (itemId: string, quantity: number) => void;
  deleteItemInstance: (instanceId: string) => void;
  setOwnedItemCount: (itemId: string, quantity: number) => void;
  setItemQuality: (instanceId: string, quality: number) => void;
  setItemUpgradeLevel: (instanceId: string, upgradeLevel: number) => void;
  addItemAffix: (instanceId: string, affixId: string, tierId: string) => void;
  removeItemAffix: (instanceId: string, affixId: string) => void;
  rerollItemAffix: (instanceId: string, affixId: string) => void;
  grantAllEquipment: (quantity?: number) => void;
  grantEquipmentTier: (masteryLevel: number) => void;
  setMasteryLevel: (level: number) => void;
  addMasteryXp: (amount: number) => void;
  grantPerkPoints: (points: number) => void;
  setBonusPerkPoints: (points: number) => void;
  resetBonusPerkPoints: () => void;
  setProficiencyLevel: (proficiencyId: CombatProficiencyId, level: number) => void;
  setAllProficiencyLevels: (level: number) => void;
  discoverAllProficiencies: () => void;
  discoverAllItems: () => void;
  discoverAllTargets: () => void;
  setAllTargetDefeatsToOne: () => void;
  resetCollection: () => void;
  fillHealth: () => void;
  fillStamina: () => void;
  fillMana: () => void;
  fillAllResources: () => void;
  setResourcePercent: (resource: DebugResource, percent: number) => void;
  setPlayerResource: (resource: DebugResource, value: number) => void;
  resetPlayerCooldowns: () => void;
  resetEnemyCooldowns: () => void;
  cancelEnemyActions: () => void;
  clearPlayerEffects: () => void;
  clearSelectedEnemyEffects: () => void;
  clearAllEnemyEffects: () => void;
  applyEffect: (effectId: string, target: DebugEffectTarget) => void;
  applyPlayerMaxHpBarrier: () => void;
  killSelectedEnemy: () => void;
  healSelectedEnemyToFull: () => void;
  killCurrentGroup: () => void;
  suicide: () => void;
  revive: () => void;
  damagePlayer: (amount: number) => void;
  healPlayer: (amount: number) => void;
  resetSessionMetrics: () => void;
  learnAllSpells: () => void;
  resetSpellbook: () => void;
  fillSpellLoadout: () => void;
  equipSwordSkills: () => void;
  equipBothTechniques: () => void;
  setGold: (amount: number) => void;
  addGold: (amount: number) => void;
  loadScenario: (snapshot: DebugScenarioSnapshot) => void;
  startEncounter: (locationId: string, enemyIds: string[]) => void;
  importSave: (raw: string) => { ok: boolean; error?: string };
}

const context = createCombatContext({ next: () => Math.random(), nextFor: () => Math.random() });
if (import.meta.env.DEV) context.debugHooks = {
  isPlayerImmortal: () => useDevToolsRuntimeStore.getState().playerImmortal,
  isEnemyImmortal: (instanceId) => useDevToolsRuntimeStore.getState().isEnemyImmortal(instanceId),
  onAutomationTrace: (trace) => {
    const runtime = useDevToolsRuntimeStore.getState();
    if (!runtime.automationTraceEnabled) return;
    useDebugTelemetryStore.getState().recordAutomationTrace(trace);
  },
};
const initial = createInitialGameState();
const defaultSelection = getDefaultWorldSelection();
function gameFromSave(saved: NonNullable<ReturnType<typeof loadProfileGameSave>>): GameState {
  const inventory = normalizeInventoryState(saved.inventory);
  return syncCombatStats({
      combat: {
        ...initial.combat,
        phase: "inactive",
        playerHp: initial.combat.maxPlayerHp,
      },
      progression: saved.progression,
      inventory,
      equipment: normalizeEquipmentState(saved.equipment, inventory),
      collection: saved.collection,
      gold: saved.gold,
      spellbook: normalizeSpellbook(saved.spellbook),
      combatAutomation: normalizeCombatAutomation(
        saved.combatAutomation ?? createInitialCombatAutomation(),
      ),
      combatAutomationPresets: normalizeCombatAutomationPresets(
        saved.combatAutomationPresets,
      ),
      combatAbilities: normalizeCombatAbilityLoadout(
        saved.combatAbilities ?? createInitialCombatAbilityLoadout(),
      ),
    });
}

type UiState = Pick<
  GameStoreState,
  | "screen"
  | "heroWindowRequest"
  | "selectedContinentId"
  | "selectedRegionId"
  | "selectedAreaId"
  | "selectedCombatLocationId"
  | "inventoryFilter"
  | "selectedInventoryEntry"
  | "selectedEquipmentSlot"
  | "selectedCollectionEntryId"
  | "collectionTab"
  | "combatOverviewTab"
  | "reducedMotion"
  | "showInspectorButton"
>;

function flatState(
  game: GameState,
  ui: UiState,
): Pick<
  GameStoreState,
  | "game"
  | "screen"
  | "heroWindowRequest"
  | "selectedContinentId"
  | "selectedRegionId"
  | "selectedAreaId"
  | "selectedCombatLocationId"
  | "activeCombatLocationId"
  | "combatActive"
  | "activity"
  | "selectedTargetId"
  | "playerHp"
  | "enemyHp"
  | "playerAttackProgress"
  | "enemyAttackProgress"
  | "round"
  | "kills"
  | "combatLog"
  | "inventoryFilter"
  | "selectedInventoryEntry"
  | "selectedEquipmentSlot"
  | "selectedCollectionEntryId"
  | "collectionTab"
  | "combatOverviewTab"
  | "reducedMotion"
  | "showInspectorButton"
> {
  const combat = game.combat;
  const target =
    combat.enemies.find(
      (enemy) => enemy.instanceId === combat.selectedEnemyInstanceId,
    ) ?? combat.enemies[0];
  const active = combat.phase === "active" || combat.phase === "recovery";
  return {
    ...ui,
    game,
    activeCombatLocationId: combat.combatLocationId,
    combatActive: active,
    activity: active ? "combat" : "idle",
    selectedTargetId:
      combat.selectedEnemyInstanceId ?? ui.selectedCombatLocationId,
    playerHp: Math.round(combat.playerHp),
    enemyHp: Math.round(target?.currentHealth ?? 0),
    playerAttackProgress:
      combat.playerAttackInterval > 0
        ? 1 - combat.playerAttackTimer / combat.playerAttackInterval
        : 0,
    enemyAttackProgress: target
      ? 1 - target.attackTimer / target.attackInterval
      : 0,
    round: combat.groupNumber,
    kills: Object.values(game.collection.targets).reduce(
      (sum, entry) => sum + entry.defeats,
      0,
    ),
    combatLog: combat.log,
  };
}

let activeProfileIdForPersistence: () => ProfileId | null = () => null;

function savePermanent(
  game: GameState,
  settings: { reducedMotion: boolean; showInspectorButton: boolean },
): boolean {
  const profileId = activeProfileIdForPersistence();
  // A lease check here protects every gameplay save path, including debug and combat mutations.
  if (!profileId || !isProfileSessionOwner(profileId, getProfileSessionOwnerId())) return false;
  saveProfileGameSave(profileId, {
    version: CURRENT_SAVE_VERSION as 12,
    progression: game.progression,
    inventory: game.inventory,
    equipment: game.equipment,
    collection: game.collection,
    gold: game.gold,
    settings,
    spellbook: game.spellbook,
    combatAutomation: game.combatAutomation,
    combatAutomationPresets: game.combatAutomationPresets,
    combatAbilities: game.combatAbilities,
  });
  return true;
}

function captureDebugCombatEvents(previous: GameState, next: GameState) {
  if (!import.meta.env.DEV || !useDevToolsRuntimeStore.getState().eventsEnabled) return;
  const previousEventIds = new Set(previous.combat.events.map((event) => event.id));
  for (const event of next.combat.events)
    if (!previousEventIds.has(event.id)) useDebugTelemetryStore.getState().recordEvent({ text: event.type, eventType: event.type, type: "system", source: event.source, target: event.target, data: event.data, sequence: event.id });
}
function selectionUi(
  selection: ReturnType<typeof cascadeSelection>,
  state: GameStoreState,
): UiState {
  return {
    screen: state.screen,
    selectedContinentId: selection.continentId,
    selectedRegionId: selection.regionId,
    selectedAreaId: selection.areaId,
    selectedCombatLocationId: selection.combatLocationId,
    inventoryFilter: state.inventoryFilter,
    selectedInventoryEntry: state.selectedInventoryEntry,
    selectedEquipmentSlot: state.selectedEquipmentSlot,
    selectedCollectionEntryId: state.selectedCollectionEntryId,
    collectionTab: state.collectionTab,
    combatOverviewTab: state.combatOverviewTab,
    reducedMotion: state.reducedMotion,
    showInspectorButton: state.showInspectorButton,
    heroWindowRequest: state.heroWindowRequest,
  };
}

function freshUi(state: GameStoreState): UiState {
  return {
    screen: "home",
    heroWindowRequest: null,
    selectedContinentId: defaultSelection.continentId,
    selectedRegionId: defaultSelection.regionId,
    selectedAreaId: defaultSelection.areaId,
    selectedCombatLocationId: defaultSelection.combatLocationId,
    inventoryFilter: "All",
    selectedInventoryEntry: { kind: "instance", instanceId: Object.values(initial.inventory.instances)[0]?.id ?? "" },
    selectedEquipmentSlot: "weapon",
    selectedCollectionEntryId: "enemy.grey-wolf",
    collectionTab: "Items",
    combatOverviewTab: "Session Summary",
    reducedMotion: state.reducedMotion,
    showInspectorButton: state.showInspectorButton,
  };
}

export const useGameStore = create<GameStoreState>((set, get) => {
  const ui: UiState = {
    screen: "home",
    heroWindowRequest: null,
    selectedContinentId: defaultSelection.continentId,
    selectedRegionId: defaultSelection.regionId,
    selectedAreaId: defaultSelection.areaId,
    selectedCombatLocationId: defaultSelection.combatLocationId,
    inventoryFilter: "All",
    selectedInventoryEntry: { kind: "instance", instanceId: Object.values(initial.inventory.instances)[0]?.id ?? "" },
    selectedEquipmentSlot: "weapon",
    selectedCollectionEntryId: "enemy.grey-wolf",
    collectionTab: "Items",
    combatOverviewTab: "Session Summary",
    reducedMotion: false,
    showInspectorButton: true,
  };
  const selectWorldNode = (
    selection: Partial<ReturnType<typeof cascadeSelection>>,
  ) =>
    set((state) =>
      flatState(state.game, selectionUi(cascadeSelection(selection), state)),
    );
  const commitAutomation = (
    state: GameStoreState,
    combatAutomation: GameState["combatAutomation"],
  ) => {
    const game = { ...state.game, combatAutomation: normalizeCombatAutomation(combatAutomation) };
    savePermanent(game, {
      reducedMotion: state.reducedMotion,
      showInspectorButton: state.showInspectorButton,
    });
    return flatState(game, state);
  };
  const runHunt = () => {
    useDevToolsRuntimeStore.getState().clearEnemyImmortality();
    useDevToolsRuntimeStore.getState().resetSimulationAccumulator();
    return set((state) => {
      const masteryLevel = masteryLevelForXp(state.game.progression.masteryXp);
      if (
        !isCombatLocationAvailable(state.selectedCombatLocationId, masteryLevel)
      )
        return state;
      const stats = calculateHunterCombatStats(
        state.game.equipment,
        state.game.inventory,
        state.game.progression,
        state.game.combat.techniques,
      );
      const prepared = {
        ...state.game,
        combat: { ...state.game.combat, stopReason: null },
      };
      const game = engineStartHunt(
        prepared,
        state.selectedCombatLocationId,
        stats,
        context,
      );
      captureDebugCombatEvents(state.game, game);
      return flatState(game, state);
    });
  };
  const commitDebug = (
    mutation: (game: GameState) => GameState,
    persistent = false,
  ) =>
    set((state) => {
      if (!import.meta.env.DEV) return state;
      const game = mutation(state.game);
      if (game === state.game) return state;
      captureDebugCombatEvents(state.game, game);
      if (persistent)
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
      return flatState(game, state);
    });
  const debug: DebugStoreApi = {
    grantItem: (itemId, quantity) => commitDebug((game) => debugGrantItem(game, itemId, quantity), true),
    deleteItemInstance: (instanceId) => commitDebug((game) => debugDeleteItemInstance(game, instanceId), true),
    setOwnedItemCount: (itemId, quantity) => commitDebug((game) => debugSetOwnedItemCount(game, itemId, quantity), true),
    setItemQuality: (instanceId, quality) => commitDebug((game) => debugSetItemQuality(game, instanceId, quality), true),
    setItemUpgradeLevel: (instanceId, upgradeLevel) => commitDebug((game) => debugSetItemUpgradeLevel(game, instanceId, upgradeLevel), true),
    addItemAffix: (instanceId, affixId, tierId) => commitDebug((game) => debugAddItemAffix(game, instanceId, affixId, tierId), true),
    removeItemAffix: (instanceId, affixId) => commitDebug((game) => debugRemoveItemAffix(game, instanceId, affixId), true),
    rerollItemAffix: (instanceId, affixId) => commitDebug((game) => debugRerollItemAffix(game, instanceId, affixId), true),
    grantAllEquipment: (quantity = 1) => commitDebug((game) => debugGrantAllEquipment(game, quantity), true),
    grantEquipmentTier: (level) => commitDebug((game) => debugGrantEquipmentTier(game, level), true),
    setMasteryLevel: (level) => commitDebug((game) => debugSetMasteryLevel(game, level), true),
    addMasteryXp: (amount) => commitDebug((game) => debugAddMasteryXp(game, amount), true),
    grantPerkPoints: (points) => commitDebug((game) => debugGrantPerkPoints(game, points), true),
    setBonusPerkPoints: (points) => commitDebug((game) => debugSetBonusPerkPoints(game, points), true),
    resetBonusPerkPoints: () => commitDebug(debugResetBonusPerkPoints, true),
    setProficiencyLevel: (id, level) => commitDebug((game) => debugSetProficiencyLevel(game, id, level), true),
    setAllProficiencyLevels: (level) => commitDebug((game) => debugSetAllProficiencyLevels(game, level), true),
    discoverAllProficiencies: () => commitDebug(debugDiscoverAllProficiencies, true),
    discoverAllItems: () => commitDebug(debugDiscoverAllItems, true),
    discoverAllTargets: () => commitDebug(debugDiscoverAllTargets, true),
    setAllTargetDefeatsToOne: () => commitDebug(debugSetAllTargetDefeatsToOne, true),
    resetCollection: () => commitDebug(debugResetCollection, true),
    fillHealth: () => commitDebug(debugFillHealth),
    fillStamina: () => commitDebug(debugFillStamina),
    fillMana: () => commitDebug(debugFillMana),
    fillAllResources: () => commitDebug(debugFillAllResources),
    setResourcePercent: (resource, percent) => commitDebug((game) => debugSetResourcePercent(game, resource, percent)),
    setPlayerResource: (resource, value) => commitDebug((game) => debugSetPlayerResource(game, resource, value)),
    resetPlayerCooldowns: () => commitDebug(debugResetPlayerCooldowns),
    resetEnemyCooldowns: () => commitDebug(debugResetEnemyCooldowns),
    cancelEnemyActions: () => commitDebug(debugCancelEnemyActions),
    clearPlayerEffects: () => commitDebug(debugClearPlayerEffects),
    clearSelectedEnemyEffects: () => commitDebug(debugClearSelectedEnemyEffects),
    clearAllEnemyEffects: () => commitDebug(debugClearAllEnemyEffects),
    applyEffect: (effectId, target) => commitDebug((game) => debugApplyEffect(game, effectId, target)),
    applyPlayerMaxHpBarrier: () => commitDebug(debugApplyPlayerMaxHpBarrier),
    killSelectedEnemy: () => commitDebug(debugKillSelectedEnemy),
    healSelectedEnemyToFull: () => commitDebug(debugHealSelectedEnemyToFull),
    killCurrentGroup: () => commitDebug(debugKillCurrentGroup),
    suicide: () => commitDebug((game) => forceDefeatPlayerForDebug(game)),
    revive: () => commitDebug(debugRevivePlayer),
    damagePlayer: (amount) => commitDebug((game) => debugDamagePlayer(game, amount)),
    healPlayer: (amount) => commitDebug((game) => debugHealPlayer(game, amount)),
    resetSessionMetrics: () => commitDebug(debugResetSessionMetrics),
    learnAllSpells: () => commitDebug(debugLearnAllSpells, true),
    resetSpellbook: () => commitDebug(debugResetSpellbook, true),
    fillSpellLoadout: () => commitDebug(debugFillSpellLoadout, true),
    equipSwordSkills: () => commitDebug(debugEquipSwordSkills, true),
    equipBothTechniques: () => commitDebug(debugEquipBothTechniques, true),
    setGold: (amount) => commitDebug((game) => debugSetGold(game, amount), true),
    addGold: (amount) => commitDebug((game) => debugAddGold(game, amount), true),
    loadScenario: (snapshot) => {
      if (!validateDebugScenario(snapshot).valid) return;
      useDevToolsRuntimeStore.getState().clearEnemyImmortality();
      useDevToolsRuntimeStore.getState().resetSimulationAccumulator();
      set((state) => {
        const game = syncCombatStats({ ...state.game, ...snapshot.game, combat: { ...snapshot.game.combat, phase: snapshot.game.combat.phase === "inactive" ? "inactive" : snapshot.game.combat.phase } });
        const selection = cascadeSelection(snapshot.world);
        return flatState(game, { ...selectionUi(selection, state), screen: "combat" });
      });
    },
    startEncounter: (locationId, enemyIds) => commitDebug((game) => {
      useDevToolsRuntimeStore.getState().clearEnemyImmortality();
      useDevToolsRuntimeStore.getState().resetSimulationAccumulator();
      const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression, game.combat.techniques);
      return engineStartDebugEncounter(game, locationId, enemyIds, stats, context);
    }),
    importSave: (raw) => {
      const imported = parseGameSaveJson(raw);
      if (!imported) return { ok: false, error: "Invalid or unsupported save JSON." };
      set((state) => {
        const game = gameFromSave(imported);
        savePermanent(game, { reducedMotion: imported.settings.reducedMotion, showInspectorButton: imported.settings.showInspectorButton });
        return flatState(game, { ...state, screen: "combat", reducedMotion: imported.settings.reducedMotion, showInspectorButton: imported.settings.showInspectorButton });
      });
      return { ok: true };
    },
  };
  return {
    activeProfileId: null,
    ...flatState(initial, ui),
    debug,
    hydrateProfile: (profileId, save) =>
      set((state) => ({
        activeProfileId: profileId,
        ...flatState(gameFromSave(save), freshUi(state)),
      })),
    startFreshProfile: (profileId) =>
      set((state) => ({
        activeProfileId: profileId,
        ...flatState(createInitialGameState(), freshUi(state)),
      })),
    saveActiveProfileNow: () => {
      const state = get();
      return savePermanent(state.game, {
        reducedMotion: state.reducedMotion,
        showInspectorButton: state.showInspectorButton,
      });
    },
    unloadProfile: () =>
      set((state) => ({
        activeProfileId: null,
        ...flatState(initial, freshUi(state)),
      })),
    setScreen: (screen) => set({ screen, heroWindowRequest: null }),
    openHeroWindow: (window, options) => set({ screen: "hero", heroWindowRequest: { window, ...options } }),
    clearHeroWindowRequest: () => set({ heroWindowRequest: null }),
    selectContinent: (id) => {
      if (continentById[id]) selectWorldNode({ continentId: id });
    },
    selectRegion: (id) => selectWorldNode({ regionId: id }),
    selectArea: (id) => selectWorldNode({ areaId: id }),
    selectCombatLocation: (id) => {
      if (combatLocationById[id]) selectWorldNode(selectionForLocation(id));
    },
    startHunt: runHunt,
    switchHunt: runHunt,
    stopHunt: () => {
      useDevToolsRuntimeStore.getState().clearEnemyImmortality();
      set((state) =>
        flatState(
          {
            ...state.game,
            combat: engineStopHunt(state.game.combat, context.effects),
          },
          state,
        ),
      );
    },
    startCombat: runHunt,
    stopCombat: () => get().stopHunt(),
    tickCombat: (delta) =>
      set((state) => {
        const stats = calculateHunterCombatStats(
          state.game.equipment,
          state.game.inventory,
          state.game.progression,
          state.game.combat.techniques,
        );
        const game = advanceCombat(state.game, delta, context, stats);
        captureDebugCombatEvents(state.game, game);
        if (
          game.progression.masteryXp !== state.game.progression.masteryXp ||
          Object.keys(game.progression.proficiencies).length !==
            Object.keys(state.game.progression.proficiencies).length ||
          game.combat.session.enemiesDefeated !==
            state.game.combat.session.enemiesDefeated
        )
          savePermanent(game, {
            reducedMotion: state.reducedMotion,
            showInspectorButton: state.showInspectorButton,
          });
        return flatState(game, state);
      }),
    selectTarget: (instanceId) =>
      set((state) =>
        flatState(
          {
            ...state.game,
            combat: engineSelectEnemy(state.game.combat, instanceId),
          },
          state,
        ),
      ),
    toggleTechnique: (technique) =>
      set((state) =>
        flatState(
          syncCombatStats(engineToggleTechnique(state.game, technique)),
          state,
        ),
      ),
    castSpell: (spellId) =>
      set((state) => {
        const stats = calculateHunterCombatStats(
          state.game.equipment,
          state.game.inventory,
          state.game.progression,
          state.game.combat.techniques,
        );
        const game = engineCastSpell(state.game, spellId, stats, context);
        captureDebugCombatEvents(state.game, game);
        if (
          game.progression.masteryXp !== state.game.progression.masteryXp ||
          Object.keys(game.progression.proficiencies).length !==
            Object.keys(state.game.progression.proficiencies).length
        )
          savePermanent(game, {
            reducedMotion: state.reducedMotion,
            showInspectorButton: state.showInspectorButton,
          });
        return flatState(game, state);
      }),
    executeAction: (actionId) =>
      set((state) => {
        const stats = calculateHunterCombatStats(
          state.game.equipment,
          state.game.inventory,
          state.game.progression,
          state.game.combat.techniques,
        );
        const game = engineExecutePlayerAction(state.game, actionId, stats, context);
        captureDebugCombatEvents(state.game, game);
        return flatState(game, state);
      }),
    setSpellSlot: (slot, spellId) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const spellbook = spellId === null
          ? unequipSpellSlotState(state.game.spellbook, slot)
          : equipSpellToSlotState(state.game.spellbook, spellId, slot);
        if (spellbook === state.game.spellbook) return state;
        const game = { ...state.game, spellbook };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    equipSpellToSlot: (spellId, slot) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const spellbook = equipSpellToSlotState(state.game.spellbook, spellId, slot);
        if (spellbook === state.game.spellbook) return state;
        const game = { ...state.game, spellbook };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    moveEquippedSpell: (sourceSlot, targetSlot) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const spellbook = moveEquippedSpellState(state.game.spellbook, sourceSlot, targetSlot);
        if (spellbook === state.game.spellbook) return state;
        const game = { ...state.game, spellbook };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    swapSpellSlots: (first, second) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const spellbook = moveEquippedSpellState(state.game.spellbook, first, second);
        if (spellbook === state.game.spellbook) return state;
        const game = { ...state.game, spellbook };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    unequipSpellSlot: (slot) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const spellbook = unequipSpellSlotState(state.game.spellbook, slot);
        if (spellbook === state.game.spellbook) return state;
        const game = { ...state.game, spellbook };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    unequipSpell: (slot) =>
      get().unequipSpellSlot(slot),
    setCombatAbilitySlot: (slot, actionId) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const combatAbilities = actionId === null
          ? unequipCombatAbilityState(state.game.combatAbilities, slot)
          : equipCombatAbilityState(state.game.combatAbilities, actionId, slot);
        if (combatAbilities === state.game.combatAbilities) return state;
        const game = { ...state.game, combatAbilities };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    equipCombatAbility: (actionId, slot) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const combatAbilities = equipCombatAbilityState(state.game.combatAbilities, actionId, slot);
        if (combatAbilities === state.game.combatAbilities) return state;
        const game = { ...state.game, combatAbilities };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    moveCombatAbility: (sourceSlot, targetSlot) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const combatAbilities = moveCombatAbilityState(state.game.combatAbilities, sourceSlot, targetSlot);
        if (combatAbilities === state.game.combatAbilities) return state;
        const game = { ...state.game, combatAbilities };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    unequipCombatAbility: (slot) =>
      get().setCombatAbilitySlot(slot, null),
    setTechniqueSlot: (slot, techniqueId) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const combatAbilities = techniqueId === null
          ? unequipTechniqueState(state.game.combatAbilities, slot)
          : equipTechniqueState(state.game.combatAbilities, techniqueId, slot);
        if (combatAbilities === state.game.combatAbilities) return state;
        const techniques = { ...state.game.combat.techniques };
        for (const id of Object.keys(techniques) as TechniqueId[])
          if (!combatAbilities.techniqueSlots.includes(id)) techniques[id] = false;
        const game = {
          ...state.game,
          combatAbilities,
          combat: { ...state.game.combat, techniques },
        };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    moveTechnique: (sourceSlot, targetSlot) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const combatAbilities = moveTechniqueState(state.game.combatAbilities, sourceSlot, targetSlot);
        if (combatAbilities === state.game.combatAbilities) return state;
        const game = { ...state.game, combatAbilities };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    unequipTechnique: (slot) =>
      set((state) => {
        if (state.game.combat.phase === "active" || state.game.combat.phase === "recovery") return state;
        const combatAbilities = unequipTechniqueState(state.game.combatAbilities, slot);
        if (combatAbilities === state.game.combatAbilities) return state;
        const techniques = { ...state.game.combat.techniques };
        const removed = state.game.combatAbilities.techniqueSlots[slot];
        if (removed) techniques[removed] = false;
        const game = {
          ...state.game,
          combatAbilities,
          combat: { ...state.game.combat, techniques },
        };
        savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton });
        return flatState(game, state);
      }),
    toggleAutomation: () =>
      set((state) => {
        return commitAutomation(
          state,
          setAutomationEnabled(
            state.game.combatAutomation,
            !state.game.combatAutomation.enabled,
          ),
        );
      }),
    toggleAutomationRule: (ruleId) =>
      set((state) => {
        const rule = state.game.combatAutomation.rules.find(
          (candidate) => candidate.id === ruleId,
        );
        return rule
          ? commitAutomation(
              state,
              setAutomationRuleEnabled(
                state.game.combatAutomation,
                ruleId,
                !rule.enabled,
              ),
            )
          : state;
      }),
    setAutomationEnabled: (enabled) =>
      set((state) =>
        commitAutomation(
          state,
          setAutomationEnabled(state.game.combatAutomation, enabled),
        ),
      ),
    setAutomationOverrideManualTarget: (enabled) =>
      set((state) =>
        commitAutomation(
          state,
          setAutomationOverrideManualTarget(
            state.game.combatAutomation,
            enabled,
          ),
        ),
      ),
    addAutomationRule: (rule) =>
      set((state) =>
        commitAutomation(
          state,
          addAutomationRule(state.game.combatAutomation, rule),
        ),
      ),
    updateAutomationRule: (ruleId, patch) =>
      set((state) =>
        commitAutomation(
          state,
          updateAutomationRule(state.game.combatAutomation, ruleId, patch),
        ),
      ),
    deleteAutomationRule: (ruleId) =>
      set((state) =>
        commitAutomation(
          state,
          deleteAutomationRule(state.game.combatAutomation, ruleId),
        ),
      ),
    setAutomationRuleEnabled: (ruleId, enabled) =>
      set((state) =>
        commitAutomation(
          state,
          setAutomationRuleEnabled(state.game.combatAutomation, ruleId, enabled),
        ),
      ),
    moveAutomationRule: (ruleId, direction) =>
      set((state) =>
        commitAutomation(
          state,
          moveAutomationRule(state.game.combatAutomation, ruleId, direction),
        ),
      ),
    addAutomationCondition: (ruleId, condition) =>
      set((state) =>
        commitAutomation(
          state,
          addAutomationCondition(state.game.combatAutomation, ruleId, condition),
        ),
      ),
    updateAutomationCondition: (ruleId, index, condition) =>
      set((state) =>
        commitAutomation(
          state,
          updateAutomationCondition(
            state.game.combatAutomation,
            ruleId,
            index,
            condition,
          ),
        ),
      ),
    removeAutomationCondition: (ruleId, index) =>
      set((state) =>
        commitAutomation(
          state,
          removeAutomationCondition(state.game.combatAutomation, ruleId, index),
        ),
      ),
    setTargetPriorityEnabled: (priorityId, enabled) =>
      set((state) =>
        commitAutomation(
          state,
          setTargetPriorityEnabled(
            state.game.combatAutomation,
            priorityId,
            enabled,
          ),
        ),
      ),
    moveTargetPriority: (priorityId, direction) =>
      set((state) =>
        commitAutomation(
          state,
          moveTargetPriority(state.game.combatAutomation, priorityId, direction),
        ),
      ),
    saveAutomationPreset: (slot, name) =>
      set((state) => {
        const combatAutomationPresets = saveCurrentAutomationToPreset(
          state.game.combatAutomationPresets,
          slot,
          state.game.combatAutomation,
          name,
        );
        if (combatAutomationPresets === state.game.combatAutomationPresets)
          return state;
        const game = { ...state.game, combatAutomationPresets };
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return flatState(game, state);
      }),
    loadAutomationPreset: (slot) =>
      set((state) => {
        const preset = state.game.combatAutomationPresets.slots[slot];
        if (!preset) return state;
        const combatAutomation = loadAutomationPresetConfig(
          state.game.combatAutomationPresets,
          slot,
          state.game.combatAutomation,
        );
        const game = { ...state.game, combatAutomation };
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return flatState(game, state);
      }),
    renameAutomationPreset: (slot, name) =>
      set((state) => {
        const combatAutomationPresets = renameAutomationPreset(
          state.game.combatAutomationPresets,
          slot,
          name,
        );
        if (combatAutomationPresets === state.game.combatAutomationPresets)
          return state;
        const game = { ...state.game, combatAutomationPresets };
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return flatState(game, state);
      }),
    clearAutomationPreset: (slot) =>
      set((state) => {
        const combatAutomationPresets = clearAutomationPreset(
          state.game.combatAutomationPresets,
          slot,
        );
        if (combatAutomationPresets === state.game.combatAutomationPresets)
          return state;
        const game = { ...state.game, combatAutomationPresets };
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return flatState(game, state);
      }),
    usePotion: () =>
      set((state) => {
        const stats = calculateHunterCombatStats(
          state.game.equipment,
          state.game.inventory,
          state.game.progression,
          state.game.combat.techniques,
        );
        return flatState(useHealingPotion(state.game, stats), state);
      }),
    purchaseProficiencyPerk: (perkId) =>
      set((state) => {
        const result = purchasePerk(state.game.progression, perkId, perkById);
        if (result.outcome !== "purchased") return state;
        const game = syncCombatStats({
          ...state.game,
          progression: result.progression,
        });
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return flatState(game, state);
      }),
    equipItemInstance: (instanceId, slot) =>
      set((state) => {
        if (
          state.game.combat.phase === "active" ||
          state.game.combat.phase === "recovery" ||
          !isEquipmentSlotId(slot)
        )
          return state;
        const result = equipOwnedItemInstance({
          instanceId,
          slotId: slot,
          inventory: state.game.inventory,
          equipment: state.game.equipment,
          masteryLevel: masteryLevelForXp(state.game.progression.masteryXp),
        });
        if (!result.validation.valid) return state;
        if (result.equipment === state.game.equipment) return state;
        const item = getItemDefinitionForInstance(state.game.inventory, instanceId);
        const progression = item?.weaponProficiencyId
          ? discoverProficiency(
              state.game.progression,
              item.weaponProficiencyId,
            )
          : state.game.progression;
        const game = syncCombatStats({
          ...state.game,
          progression,
          equipment: result.equipment,
        });
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return flatState(game, state);
      }),
    unequipEquipmentSlot: (slot) =>
      set((state) => {
        if (
          state.game.combat.phase === "active" ||
          state.game.combat.phase === "recovery" ||
          !isEquipmentSlotId(slot)
        )
          return state;
        const equipment = unequipOwnedEquipmentSlot(state.game.equipment, slot);
        if (equipment === state.game.equipment) return state;
        const game = syncCombatStats({ ...state.game, equipment });
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return flatState(game, state);
      }),
    setInventoryFilter: (inventoryFilter) => set({ inventoryFilter }),
    selectInventoryEntry: (selectedInventoryEntry) =>
      set({ selectedInventoryEntry }),
    selectEquipmentSlot: (selectedEquipmentSlot) =>
      set((state) => ({ selectedEquipmentSlot: isEquipmentSlotId(selectedEquipmentSlot) ? selectedEquipmentSlot : state.selectedEquipmentSlot })),
    selectCollectionEntry: (selectedCollectionEntryId) =>
      set({ selectedCollectionEntryId }),
    setCollectionTab: (collectionTab) => set({ collectionTab }),
    setCombatOverviewTab: (combatOverviewTab) => set({ combatOverviewTab }),
    setReducedMotion: (reducedMotion) =>
      set((state) => {
        const next = { ...state, reducedMotion };
        savePermanent(state.game, {
          reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return next;
      }),
    setShowInspectorButton: (showInspectorButton) =>
      set((state) => {
        savePermanent(state.game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton,
        });
        return { ...state, showInspectorButton };
      }),
    resetGameplay: () => {
      const game = createInitialGameState();
      set((state) => {
        const activeProfileId = state.activeProfileId ?? (import.meta.env.MODE === "test" ? "profile-1" : null);
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return { activeProfileId, ...flatState(game, selectionUi(defaultSelection, state)) };
      });
    },
    resetPrototype: () => get().resetGameplay(),
  };
});

activeProfileIdForPersistence = () => useGameStore.getState().activeProfileId;
