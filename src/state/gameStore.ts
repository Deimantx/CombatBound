import { create } from 'zustand'
import { advanceCombat, castSpell as engineCastSpell, createCombatContext, selectEnemy as engineSelectEnemy, setStance as engineSetStance, startHunt as engineStartHunt, syncCombatStats, toggleTechnique as engineToggleTechnique, useHealingPotion } from '../game/combat/combatEngine'
import { calculateHunterCombatStats } from '../game/equipment/derivedStats'
import { itemById } from '../game/data/items'
import { combatLocationById } from '../game/data/world/combatLocations'
import { continentById } from '../game/data/world/continents'
import { createInitialGameState, type GameState } from '../game/gameState'
import { cascadeSelection, getDefaultWorldSelection, isCombatLocationAvailable } from '../game/world/worldSelectors'
import { loadGameSave, saveGame, clearGameSave } from '../game/persistence/saveGame'
import type { CombatSkillId } from '../game/progression/progressionTypes'
import type { StanceId, TechniqueId } from '../game/combat/combatTypes'
import type { ScreenId } from '../shared/types'

interface GameStoreState {
  game: GameState
  screen: ScreenId
  selectedContinentId: string
  selectedRegionId: string
  selectedAreaId: string
  selectedSubAreaId: string
  selectedCombatLocationId: string
  activeCombatLocationId: string | null
  combatActive: boolean
  activity: 'idle' | 'combat'
  selectedTargetId: string
  playerHp: number
  enemyHp: number
  playerAttackProgress: number
  enemyAttackProgress: number
  round: number
  kills: number
  combatLog: GameState['combat']['log']
  inventoryFilter: string
  selectedInventoryItemId: string
  selectedEquipmentSlot: string
  selectedCollectionEntryId: string
  collectionTab: 'Items' | 'Targets'
  combatOverviewTab: 'Session Summary' | 'Rewards' | 'Progression'
  reducedMotion: boolean
  showInspectorButton: boolean
  setScreen: (screen: ScreenId) => void
  selectContinent: (id: string) => void
  selectRegion: (id: string) => void
  selectArea: (id: string) => void
  selectSubArea: (id: string) => void
  selectCombatLocation: (id: string) => void
  startHunt: () => void
  switchHunt: () => void
  stopHunt: () => void
  startCombat: () => void
  stopCombat: () => void
  tickCombat: (delta: number) => void
  selectTarget: (instanceId: string) => void
  setStance: (stance: StanceId) => void
  toggleTechnique: (technique: TechniqueId) => void
  castSpell: (spellId: string) => void
  usePotion: () => void
  setTrainingFocus: (focus: CombatSkillId) => void
  equipItem: (itemId: string, slot: 'weapon' | 'armor') => void
  setInventoryFilter: (filter: string) => void
  selectInventoryItem: (itemId: string) => void
  selectEquipmentSlot: (slotId: string) => void
  selectCollectionEntry: (entryId: string) => void
  setCollectionTab: (tab: 'Items' | 'Targets') => void
  setCombatOverviewTab: (tab: 'Session Summary' | 'Rewards' | 'Progression') => void
  setReducedMotion: (value: boolean) => void
  setShowInspectorButton: (value: boolean) => void
  resetGameplay: () => void
  resetPrototype: () => void
}

const context = createCombatContext({ next: () => Math.random() })
const initial = createInitialGameState()
const saved = loadGameSave()
const defaultSelection = getDefaultWorldSelection()
const hydratedGame: GameState = saved ? syncCombatStats({ combat: { ...initial.combat, phase: 'inactive', playerHp: initial.combat.maxPlayerHp }, progression: saved.progression, inventory: saved.inventory, equipment: saved.equipment, collection: saved.collection, gold: saved.gold }) : initial

type UiState = Pick<GameStoreState, 'screen' | 'selectedContinentId' | 'selectedRegionId' | 'selectedAreaId' | 'selectedSubAreaId' | 'selectedCombatLocationId' | 'inventoryFilter' | 'selectedInventoryItemId' | 'selectedEquipmentSlot' | 'selectedCollectionEntryId' | 'collectionTab' | 'combatOverviewTab' | 'reducedMotion' | 'showInspectorButton'>

function flatState(game: GameState, ui: UiState): Pick<GameStoreState, 'game' | 'screen' | 'selectedContinentId' | 'selectedRegionId' | 'selectedAreaId' | 'selectedSubAreaId' | 'selectedCombatLocationId' | 'activeCombatLocationId' | 'combatActive' | 'activity' | 'selectedTargetId' | 'playerHp' | 'enemyHp' | 'playerAttackProgress' | 'enemyAttackProgress' | 'round' | 'kills' | 'combatLog' | 'inventoryFilter' | 'selectedInventoryItemId' | 'selectedEquipmentSlot' | 'selectedCollectionEntryId' | 'collectionTab' | 'combatOverviewTab' | 'reducedMotion' | 'showInspectorButton'> {
  const combat = game.combat
  const target = combat.enemies.find((enemy) => enemy.instanceId === combat.selectedEnemyInstanceId) ?? combat.enemies[0]
  const active = combat.phase === 'active' || combat.phase === 'recovery'
  return { ...ui, game, activeCombatLocationId: combat.combatLocationId, combatActive: active, activity: active ? 'combat' : 'idle', selectedTargetId: combat.selectedEnemyInstanceId ?? ui.selectedCombatLocationId, playerHp: Math.round(combat.playerHp), enemyHp: Math.round(target?.currentHealth ?? 0), playerAttackProgress: combat.playerAttackInterval > 0 ? 1 - combat.playerAttackTimer / combat.playerAttackInterval : 0, enemyAttackProgress: target ? 1 - target.attackTimer / target.attackInterval : 0, round: combat.groupNumber, kills: Object.values(game.collection.targets).reduce((sum, entry) => sum + entry.defeats, 0), combatLog: combat.log }
}

function savePermanent(game: GameState, settings: { reducedMotion: boolean; showInspectorButton: boolean }) { saveGame({ version: 1, progression: game.progression, inventory: game.inventory, equipment: game.equipment, collection: game.collection, gold: game.gold, settings }) }
function selectionUi(selection: ReturnType<typeof cascadeSelection>, state: GameStoreState): UiState { return { screen: state.screen, selectedContinentId: selection.continentId, selectedRegionId: selection.regionId, selectedAreaId: selection.areaId, selectedSubAreaId: selection.subAreaId, selectedCombatLocationId: selection.combatLocationId, inventoryFilter: state.inventoryFilter, selectedInventoryItemId: state.selectedInventoryItemId, selectedEquipmentSlot: state.selectedEquipmentSlot, selectedCollectionEntryId: state.selectedCollectionEntryId, collectionTab: state.collectionTab, combatOverviewTab: state.combatOverviewTab, reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton } }

export const useGameStore = create<GameStoreState>((set, get) => {
  const ui: UiState = { screen: 'home', selectedContinentId: defaultSelection.continentId, selectedRegionId: defaultSelection.regionId, selectedAreaId: defaultSelection.areaId, selectedSubAreaId: defaultSelection.subAreaId, selectedCombatLocationId: defaultSelection.combatLocationId, inventoryFilter: 'All', selectedInventoryItemId: 'item.training-sword', selectedEquipmentSlot: 'weapon', selectedCollectionEntryId: 'enemy.grey-wolf', collectionTab: 'Items', combatOverviewTab: 'Session Summary', reducedMotion: saved?.settings.reducedMotion ?? false, showInspectorButton: saved?.settings.showInspectorButton ?? true }
  const selectWorldNode = (selection: Partial<ReturnType<typeof cascadeSelection>>) => set((state) => flatState(state.game, selectionUi(cascadeSelection(selection), state)))
  const runHunt = () => set((state) => { const totalLevel = Object.values(state.game.progression.skills).reduce((sum, skill) => sum + skill.level, 0); if (!isCombatLocationAvailable(state.selectedCombatLocationId, totalLevel)) return state; const stats = calculateHunterCombatStats(state.game.equipment, state.game.progression, state.game.combat.stance, state.game.combat.techniques); const prepared = { ...state.game, combat: { ...state.game.combat, playerHp: stats.maxHealth, energy: stats.maxEnergy, shield: 0, stopReason: null } }; const game = engineStartHunt(prepared, state.selectedCombatLocationId, stats, context); return flatState(game, state) })
  return {
    ...flatState(hydratedGame, ui),
    setScreen: (screen) => set({ screen }),
    selectContinent: (id) => { if (continentById[id]) selectWorldNode({ continentId: id }) },
    selectRegion: (id) => selectWorldNode({ regionId: id }),
    selectArea: (id) => selectWorldNode({ areaId: id }),
    selectSubArea: (id) => selectWorldNode({ subAreaId: id }),
    selectCombatLocation: (id) => { if (combatLocationById[id]) selectWorldNode({ combatLocationId: id }) },
    startHunt: runHunt,
    switchHunt: runHunt,
    stopHunt: () => set((state) => flatState({ ...state.game, combat: { ...state.game.combat, phase: 'stopped', stopReason: 'manual', recoveryRemaining: 0, enemies: state.game.combat.enemies.map((enemy) => ({ ...enemy, currentAction: null })) } }, state)),
    startCombat: runHunt,
    stopCombat: () => get().stopHunt(),
    tickCombat: (delta) => set((state) => { const stats = calculateHunterCombatStats(state.game.equipment, state.game.progression, state.game.combat.stance, state.game.combat.techniques); const game = advanceCombat(state.game, delta, context, stats); if (game.combat.session.enemiesDefeated !== state.game.combat.session.enemiesDefeated) savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton }); return flatState(game, state) }),
    selectTarget: (instanceId) => set((state) => flatState({ ...state.game, combat: engineSelectEnemy(state.game.combat, instanceId) }, state)),
    setStance: (stance) => set((state) => { const nextStats = calculateHunterCombatStats(state.game.equipment, state.game.progression, stance, state.game.combat.techniques); return flatState({ ...state.game, combat: engineSetStance(state.game.combat, stance, nextStats) }, state) }),
    toggleTechnique: (technique) => set((state) => flatState(syncCombatStats({ ...state.game, combat: engineToggleTechnique(state.game.combat, technique) }), state)),
    castSpell: (spellId) => set((state) => { const stats = calculateHunterCombatStats(state.game.equipment, state.game.progression, state.game.combat.stance, state.game.combat.techniques); return flatState(engineCastSpell(state.game, spellId, stats, context), state) }),
    usePotion: () => set((state) => { const stats = calculateHunterCombatStats(state.game.equipment, state.game.progression, state.game.combat.stance, state.game.combat.techniques); return flatState(useHealingPotion(state.game, stats), state) }),
    setTrainingFocus: (focus) => set((state) => { const game = { ...state.game, progression: { ...state.game.progression, trainingFocus: focus } }; savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton }); return flatState(game, state) }),
    equipItem: (itemId, slot) => set((state) => { if (state.game.combat.phase === 'active' || state.game.combat.phase === 'recovery' || !itemById[itemId]) return state; const game = syncCombatStats({ ...state.game, equipment: { ...state.game.equipment, slots: { ...state.game.equipment.slots, [slot]: itemId } } }); savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton }); return flatState(game, state) }),
    setInventoryFilter: (inventoryFilter) => set({ inventoryFilter }),
    selectInventoryItem: (selectedInventoryItemId) => set({ selectedInventoryItemId }),
    selectEquipmentSlot: (selectedEquipmentSlot) => set({ selectedEquipmentSlot }),
    selectCollectionEntry: (selectedCollectionEntryId) => set({ selectedCollectionEntryId }),
    setCollectionTab: (collectionTab) => set({ collectionTab }),
    setCombatOverviewTab: (combatOverviewTab) => set({ combatOverviewTab }),
    setReducedMotion: (reducedMotion) => set((state) => { const next = { ...state, reducedMotion }; savePermanent(state.game, { reducedMotion, showInspectorButton: state.showInspectorButton }); return next }),
    setShowInspectorButton: (showInspectorButton) => set((state) => { savePermanent(state.game, { reducedMotion: state.reducedMotion, showInspectorButton }); return { ...state, showInspectorButton } }),
    resetGameplay: () => { clearGameSave(); const game = createInitialGameState(); set((state) => { savePermanent(game, { reducedMotion: state.reducedMotion, showInspectorButton: state.showInspectorButton }); return flatState(game, { ...state, ...defaultSelection }) }) },
    resetPrototype: () => get().resetGameplay(),
  }
})
