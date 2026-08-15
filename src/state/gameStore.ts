import { create } from "zustand";
import {
  advanceCombat,
  castSpell as engineCastSpell,
  createCombatContext,
  executePlayerAction as engineExecutePlayerAction,
  selectEnemy as engineSelectEnemy,
  setStance as engineSetStance,
  startHunt as engineStartHunt,
  stopHunt as engineStopHunt,
  syncCombatStats,
  toggleTechnique as engineToggleTechnique,
  useHealingPotion,
} from "../game/combat/combatEngine";
import { calculateHunterCombatStats } from "../game/equipment/derivedStats";
import { itemById } from "../game/data/items";
import { canEquipItemToSlot, getAvailableItemCopies } from "../game/equipment/equipmentRules";
import { combatLocationById } from "../game/data/world/combatLocations";
import { continentById } from "../game/data/world/continents";
import { createInitialGameState, type GameState } from "../game/gameState";
import { masteryLevelForXp } from "../game/progression/masteryProgression";
import { discoverProficiency } from "../game/progression/proficiencyProgression";
import { purchasePerk } from "../game/progression/perkProgression";
import { getEquippedWeaponProficiency } from "../game/progression/progressionSelectors";
import { perkById } from "../game/data/proficiencyPerks";
import {
  cascadeSelection,
  getDefaultWorldSelection,
  isCombatLocationAvailable,
  selectionForLocation,
} from "../game/world/worldSelectors";
import {
  loadGameSave,
  saveGame,
  clearGameSave,
  CURRENT_SAVE_VERSION,
} from "../game/persistence/saveGame";
import type { StanceId, TechniqueId } from "../game/combat/combatTypes";
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
import { COMBAT_SPELL_SLOT_COUNT } from "../game/spellbook/spellbookTypes";
import { isEquipmentSlotId, type EquipmentSlotId } from "../game/equipment/equipmentTypes";
import type { HeroWindowRequest, ScreenId } from "../shared/types";
import type { AutomationCondition, AutomationRule } from "../game/automation/automationTypes";

interface GameStoreState {
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
  selectedInventoryItemId: string;
  selectedEquipmentSlot: EquipmentSlotId;
  selectedCollectionEntryId: string;
  collectionTab: "Items" | "Targets";
  combatOverviewTab: "Session Summary" | "Loot" | "Progression";
  reducedMotion: boolean;
  showInspectorButton: boolean;
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
  setStance: (stance: StanceId) => void;
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
  equipItem: (itemId: string, slot: EquipmentSlotId) => void;
  setInventoryFilter: (filter: string) => void;
  selectInventoryItem: (itemId: string) => void;
  selectEquipmentSlot: (slotId: EquipmentSlotId) => void;
  selectCollectionEntry: (entryId: string) => void;
  setCollectionTab: (tab: "Items" | "Targets") => void;
  setCombatOverviewTab: (
    tab: "Session Summary" | "Loot" | "Progression",
  ) => void;
  setReducedMotion: (value: boolean) => void;
  setShowInspectorButton: (value: boolean) => void;
  resetGameplay: () => void;
  resetPrototype: () => void;
}

const context = createCombatContext({ next: () => Math.random() });
const initial = createInitialGameState();
const saved = loadGameSave();
const defaultSelection = getDefaultWorldSelection();
const hydratedGame: GameState = saved
  ? syncCombatStats({
      combat: {
        ...initial.combat,
        phase: "inactive",
        playerHp: initial.combat.maxPlayerHp,
      },
      progression: saved.progression,
      inventory: saved.inventory,
       equipment: saved.equipment,
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
    })
  : initial;

type UiState = Pick<
  GameStoreState,
  | "screen"
  | "heroWindowRequest"
  | "selectedContinentId"
  | "selectedRegionId"
  | "selectedAreaId"
  | "selectedCombatLocationId"
  | "inventoryFilter"
  | "selectedInventoryItemId"
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
  | "selectedInventoryItemId"
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

function savePermanent(
  game: GameState,
  settings: { reducedMotion: boolean; showInspectorButton: boolean },
) {
  saveGame({
    version: CURRENT_SAVE_VERSION,
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
    selectedInventoryItemId: state.selectedInventoryItemId,
    selectedEquipmentSlot: state.selectedEquipmentSlot,
    selectedCollectionEntryId: state.selectedCollectionEntryId,
    collectionTab: state.collectionTab,
    combatOverviewTab: state.combatOverviewTab,
    reducedMotion: state.reducedMotion,
    showInspectorButton: state.showInspectorButton,
    heroWindowRequest: state.heroWindowRequest,
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
    selectedInventoryItemId: "item.training-sword",
    selectedEquipmentSlot: "weapon",
    selectedCollectionEntryId: "enemy.grey-wolf",
    collectionTab: "Items",
    combatOverviewTab: "Session Summary",
    reducedMotion: saved?.settings.reducedMotion ?? false,
    showInspectorButton: saved?.settings.showInspectorButton ?? true,
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
  const runHunt = () =>
    set((state) => {
      const masteryLevel = masteryLevelForXp(state.game.progression.masteryXp);
      if (
        !isCombatLocationAvailable(state.selectedCombatLocationId, masteryLevel)
      )
        return state;
      const stats = calculateHunterCombatStats(
        state.game.equipment,
        state.game.progression,
        state.game.combat.stance,
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
      return flatState(game, state);
    });
  return {
    ...flatState(hydratedGame, ui),
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
    stopHunt: () =>
      set((state) =>
        flatState(
          {
            ...state.game,
            combat: engineStopHunt(state.game.combat, context.effects),
          },
          state,
        ),
      ),
    startCombat: runHunt,
    stopCombat: () => get().stopHunt(),
    tickCombat: (delta) =>
      set((state) => {
        const stats = calculateHunterCombatStats(
          state.game.equipment,
          state.game.progression,
          state.game.combat.stance,
          state.game.combat.techniques,
        );
        const game = advanceCombat(state.game, delta, context, stats);
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
    setStance: (stance) =>
      set((state) => {
        const nextStats = calculateHunterCombatStats(
          state.game.equipment,
          state.game.progression,
          stance,
          state.game.combat.techniques,
        );
        return flatState(
          {
            ...state.game,
            combat: engineSetStance(
              state.game.combat,
              stance,
              nextStats,
              state.game.progression,
              getEquippedWeaponProficiency(state.game.equipment),
            ),
          },
          state,
        );
      }),
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
          state.game.progression,
          state.game.combat.stance,
          state.game.combat.techniques,
        );
        const game = engineCastSpell(state.game, spellId, stats, context);
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
          state.game.progression,
          state.game.combat.stance,
          state.game.combat.techniques,
        );
        return flatState(
          engineExecutePlayerAction(state.game, actionId, stats, context),
          state,
        );
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
          state.game.progression,
          state.game.combat.stance,
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
    equipItem: (itemId, slot) =>
      set((state) => {
        if (
          state.game.combat.phase === "active" ||
          state.game.combat.phase === "recovery" ||
          !isEquipmentSlotId(slot) ||
          !itemById[itemId]
        )
          return state;
        const item = itemById[itemId];
        if (!canEquipItemToSlot(item, slot)) return state;
        if (state.game.equipment.slots[slot] === itemId) return state;
        if (getAvailableItemCopies(state.game.inventory, state.game.equipment, itemId, slot) <= 0) return state;
        const progression = item.weaponProficiencyId
          ? discoverProficiency(
              state.game.progression,
              item.weaponProficiencyId,
            )
          : state.game.progression;
        const game = syncCombatStats({
          ...state.game,
          progression,
          equipment: {
            ...state.game.equipment,
            slots: { ...state.game.equipment.slots, [slot]: itemId },
          },
        });
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return flatState(game, state);
      }),
    setInventoryFilter: (inventoryFilter) => set({ inventoryFilter }),
    selectInventoryItem: (selectedInventoryItemId) =>
      set({ selectedInventoryItemId }),
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
      clearGameSave();
      const game = createInitialGameState();
      set((state) => {
        savePermanent(game, {
          reducedMotion: state.reducedMotion,
          showInspectorButton: state.showInspectorButton,
        });
        return flatState(game, selectionUi(defaultSelection, state));
      });
    },
    resetPrototype: () => get().resetGameplay(),
  };
});
