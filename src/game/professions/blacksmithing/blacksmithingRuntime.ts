import { discoverItem } from "../../collection/collectionLogic"
import { itemById } from "../../data/items"
import { itemUpgradeNodeById, itemUpgradeTreeById } from "../../data/gear/itemUpgradeTrees"
import { awardProfessionXp, getProfessionLevel } from "../professionProgression"
import { getItemInstance, getStackableQuantity, removeStackableItem, grantItem } from "../../items/itemOwnership"
import { getItemUpgradeSpecialization } from "../../items/itemUpgradeLogic"
import { validateItemInstance } from "../../items/itemInstanceValidation"
import { getBlacksmithingRecipe, blacksmithingRecipeById } from "./blacksmithingRecipes"
import { effectiveBlacksmithingDuration, effectiveBlacksmithingXp, effectiveForgeStaminaCost, getBlacksmithingStats, operationTagsForItem } from "./blacksmithingStats"
import type { BlacksmithingActiveOperation, BlacksmithingRecipeDefinition, BlacksmithingRuntimeGame, BlacksmithingRuntimeSummary, BlacksmithingState, BlacksmithingStopReason } from "./blacksmithingTypes"

export interface BlacksmithingRng { next(): number }
export type BlacksmithingAdvanceStopReason = BlacksmithingStopReason
export interface BlacksmithingAdvanceOptions { maxEvents?: number }

const safeRng: BlacksmithingRng = { next: () => 0.5 }
const emptySummary = (): BlacksmithingRuntimeSummary => ({ seconds: 0, operationsCompleted: 0, smeltsCompleted: 0, smithsCompleted: 0, upgradesCompleted: 0, restSeconds: 0, blacksmithingXp: 0, levelsGained: 0, outputsGained: {}, materialsConsumed: {}, materialsRecovered: {}, completedUpgradeNodeIds: [] })

function addCount(target: Record<string, number>, id: string, quantity: number) { target[id] = (target[id] ?? 0) + quantity }
function finite(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0 }
function integer(value: unknown) { return Math.floor(finite(value)) }
function stop(state: BlacksmithingState, reason: BlacksmithingStopReason): BlacksmithingState {
  return { ...state, active: false, mode: "idle", activityKind: null, activeOperation: null, actionTimerRemaining: 0, restTimerRemaining: 0, queuedOperationsRemaining: 0, lastStopReason: reason }
}

function restState(game: BlacksmithingRuntimeGame, state: BlacksmithingState) {
  const stats = getBlacksmithingStats(game)
  return { ...state, active: true, mode: "resting" as const, actionTimerRemaining: 0, restTimerRemaining: Math.max(0.1, stats.restDurationSeconds * (state.completedOperations === 0 ? stats.firstRestDurationMultiplier : 1)) }
}

function canReserveCosts(game: BlacksmithingRuntimeGame, costs: readonly { itemId: string; quantity: number }[]) {
  return costs.every((cost) => getStackableQuantity(game.inventory, cost.itemId) >= cost.quantity)
}

function consumeCosts(game: BlacksmithingRuntimeGame, costs: readonly { itemId: string; quantity: number }[]) {
  let inventory = game.inventory
  for (const cost of costs) inventory = removeStackableItem(inventory, cost.itemId, cost.quantity)
  return { ...game, inventory }
}

function recipeTags(recipe: BlacksmithingRecipeDefinition) { return recipe.tags }

function reserveRecipe(game: BlacksmithingRuntimeGame, recipe: BlacksmithingRecipeDefinition): { game: BlacksmithingRuntimeGame; outcome: "started" | "materials-exhausted" | "level-locked" | "stamina-empty"; reason?: string } {
  if (getProfessionLevel(game.professions, "blacksmithing") < recipe.requiredBlacksmithingLevel) return { game, outcome: "level-locked", reason: `Requires Blacksmithing ${recipe.requiredBlacksmithingLevel}.` }
  if (!canReserveCosts(game, recipe.costs)) return { game, outcome: "materials-exhausted", reason: "Not enough materials." }
  if (game.blacksmithing.forgeStamina <= 0) return { game, outcome: "stamina-empty", reason: "Forge Stamina is empty." }
  const stats = getBlacksmithingStats(game, recipeTags(recipe))
  const activeOperation: BlacksmithingActiveOperation = {
    kind: recipe.kind,
    recipeId: recipe.id,
    durationSeconds: effectiveBlacksmithingDuration(recipe.baseDurationSeconds, stats),
    staminaCost: effectiveForgeStaminaCost(recipe.baseForgeStaminaCost, stats),
    xpReward: effectiveBlacksmithingXp(recipe.baseBlacksmithingXp, stats),
    reservedCosts: recipe.costs.map((cost) => ({ ...cost })),
    materialRecoveryChance: stats.materialRecoveryChance,
  }
  const reserved = consumeCosts(game, recipe.costs)
  return { game: { ...reserved, blacksmithing: { ...reserved.blacksmithing, mode: "working", active: true, activeOperation, activityKind: recipe.kind, actionTimerRemaining: activeOperation.durationSeconds, restTimerRemaining: 0 } }, outcome: "started" }
}

export interface BlacksmithingCommandResult { game: BlacksmithingRuntimeGame; outcome: string; reason?: string }

export function startBlacksmithingRecipe<T extends BlacksmithingRuntimeGame>(game: T, recipeId: string, quantity = 1, queueMode: "fixed" | "max" = "fixed"): BlacksmithingCommandResult & { game: T } {
  const recipe = getBlacksmithingRecipe(recipeId)
  if (!recipe) return { game, outcome: "unknown-recipe", reason: "Unknown Blacksmithing recipe." }
  if (game.blacksmithing.active) return { game, outcome: "already-active", reason: "Blacksmithing is already active." }
  if (game.blacksmithing.activeOperation || game.blacksmithing.mode === "resting") return { game: { ...game, blacksmithing: { ...game.blacksmithing, active: true } } as T, outcome: "resumed" }
  const count = Math.max(1, Math.floor(quantity))
  let state: BlacksmithingState = { ...game.blacksmithing, active: true, mode: "working", activityKind: recipe.kind, selectedSmeltingRecipeId: recipe.kind === "smelting" ? recipe.id : game.blacksmithing.selectedSmeltingRecipeId, selectedSmithingRecipeId: recipe.kind === "smithing" ? recipe.id : game.blacksmithing.selectedSmithingRecipeId, queueMode, queuedOperationsRemaining: queueMode === "fixed" ? count : 0, lastStopReason: undefined }
  let nextGame = { ...game, blacksmithing: state } as T
  if (nextGame.blacksmithing.forgeStamina <= 0) {
    nextGame = { ...nextGame, blacksmithing: restState(nextGame, nextGame.blacksmithing) }
    return { game: nextGame, outcome: "resting", reason: "Forge Stamina is empty." }
  }
  const reserved = reserveRecipe(nextGame, recipe)
  if (reserved.outcome !== "started") return { game, outcome: reserved.outcome, reason: reserved.reason }
  state = { ...reserved.game.blacksmithing, queuedOperationsRemaining: queueMode === "fixed" ? Math.max(0, count - 1) : 0 }
  return { game: { ...reserved.game, blacksmithing: state } as T, outcome: "started" }
}

export function startBlacksmithingState<T extends BlacksmithingRuntimeGame>(game: T): T {
  const state = game.blacksmithing
  if (state.active) return game
  if (state.activeOperation || state.mode === "resting") return { ...game, blacksmithing: { ...state, active: true } }
  const recipeId = state.activityKind === "smithing" ? state.selectedSmithingRecipeId : state.selectedSmeltingRecipeId
  return recipeId ? startBlacksmithingRecipe(game, recipeId, state.queueMode === "fixed" ? Math.max(1, state.queuedOperationsRemaining) : 1, state.queueMode).game : game
}

export function stopBlacksmithingState<T extends BlacksmithingRuntimeGame>(game: T): T { return { ...game, blacksmithing: { ...game.blacksmithing, active: false } } }
export function clearBlacksmithingQueue<T extends BlacksmithingRuntimeGame>(game: T): T { return { ...game, blacksmithing: { ...game.blacksmithing, queueMode: "fixed", queuedOperationsRemaining: 0 } } }

function upgradeDepth(nodeId: string, visiting = new Set<string>()): number {
  if (visiting.has(nodeId)) return 99
  const node = itemUpgradeNodeById[nodeId]
  if (!node || node.prerequisiteNodeIds.length === 0) return 1
  const next = new Set(visiting).add(nodeId)
  return 1 + Math.max(...node.prerequisiteNodeIds.map((id) => upgradeDepth(id, next)))
}

export function getBlacksmithingUpgradeProfile(depth: number) {
  const profiles = { 1: { requiredLevel: 5, duration: 5, stamina: 5, xp: 5 }, 2: { requiredLevel: 10, duration: 8, stamina: 7, xp: 8 }, 3: { requiredLevel: 15, duration: 12, stamina: 9, xp: 12 }, 4: { requiredLevel: 20, duration: 18, stamina: 12, xp: 20 } } as const
  return profiles[Math.min(4, Math.max(1, depth)) as 1 | 2 | 3 | 4]
}

export function getBlacksmithingUpgradeProfileForNode(nodeId: string) {
  return itemUpgradeNodeById[nodeId] ? getBlacksmithingUpgradeProfile(upgradeDepth(nodeId)) : null
}

export function startBlacksmithingUpgrade<T extends BlacksmithingRuntimeGame>(game: T, instanceId: string, nodeId: string): BlacksmithingCommandResult & { game: T } {
  if (game.blacksmithing.active) return { game, outcome: "already-active", reason: "Blacksmithing is already active." }
  if (game.blacksmithing.activeOperation || game.blacksmithing.mode === "resting") return { game: { ...game, blacksmithing: { ...game.blacksmithing, active: true } } as T, outcome: "resumed" }
  const instance = getItemInstance(game.inventory, instanceId)
  const node = itemUpgradeNodeById[nodeId]
  const definition = instance ? itemById[instance.definitionId] : undefined
  const tree = definition?.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined
  if (!instance || !node || !tree || !tree.nodeIds.includes(nodeId) || !validateItemInstance(instance).valid) return { game, outcome: "invalid-target", reason: "Choose an exact upgradeable ItemInstance and node." }
  if (instance.unlockedUpgradeNodeIds.includes(nodeId)) return { game, outcome: "already-unlocked" }
  const specialization = getItemUpgradeSpecialization(instance, tree)
  if (specialization.state === "invalid" || (specialization.state === "specialized" && specialization.branchId !== node.branchId)) return { game, outcome: "branch-locked" }
  if (node.prerequisiteNodeIds.some((id) => !instance.unlockedUpgradeNodeIds.includes(id))) return { game, outcome: "prerequisite-locked" }
  if (!canReserveCosts(game, node.costs)) return { game, outcome: "materials-locked" }
  const depth = upgradeDepth(nodeId)
  const profile = getBlacksmithingUpgradeProfile(depth)
  if (getProfessionLevel(game.professions, "blacksmithing") < profile.requiredLevel) return { game, outcome: "level-locked", reason: `Requires Blacksmithing ${profile.requiredLevel}.` }
  if (game.blacksmithing.forgeStamina <= 0) return { game: { ...game, blacksmithing: restState(game, game.blacksmithing) }, outcome: "resting", reason: "Forge Stamina is empty." }
  const tags = operationTagsForItem(instance.definitionId, true)
  const stats = getBlacksmithingStats(game, tags)
  const activeOperation: BlacksmithingActiveOperation = { kind: "upgrade", instanceId, nodeId, depth, operationTags: tags, durationSeconds: effectiveBlacksmithingDuration(profile.duration, stats), staminaCost: effectiveForgeStaminaCost(profile.stamina, stats), xpReward: effectiveBlacksmithingXp(profile.xp, stats), reservedCosts: node.costs.map((cost) => ({ ...cost })) }
  const reserved = consumeCosts(game, node.costs)
  return { game: { ...reserved, blacksmithing: { ...reserved.blacksmithing, active: true, mode: "working", activityKind: "upgrade", activeOperation, actionTimerRemaining: activeOperation.durationSeconds, restTimerRemaining: 0, queuedOperationsRemaining: 0, queueMode: "fixed" } } as T, outcome: "started" }
}

function completeRecipe(game: BlacksmithingRuntimeGame, operation: Extract<BlacksmithingActiveOperation, { kind: "smelting" | "smithing" }>, rng: BlacksmithingRng, summary: BlacksmithingRuntimeSummary) {
  const recipe = blacksmithingRecipeById[operation.recipeId]
  if (!recipe) return game
  const grant = grantItem(game.inventory, recipe.outputItemId, recipe.outputQuantity)
  let nextGame = { ...game, inventory: grant.inventory, collection: discoverItem(game.collection, recipe.outputItemId) }
  const award = awardProfessionXp(nextGame.professions, "blacksmithing", operation.xpReward)
  nextGame = { ...nextGame, professions: award.state }
  const recovered = operation.materialRecoveryChance > 0 && rng.next() < operation.materialRecoveryChance
  if (recovered) {
    const base = operation.reservedCosts[0]
    if (base) { const refund = grantItem(nextGame.inventory, base.itemId, 1); nextGame = { ...nextGame, inventory: refund.inventory }; addCount(summary.materialsRecovered, base.itemId, 1) }
  }
  addCount(summary.outputsGained, recipe.outputItemId, grant.quantityGranted)
  for (const cost of operation.reservedCosts) addCount(summary.materialsConsumed, cost.itemId, cost.quantity)
  summary.operationsCompleted += 1
  if (operation.kind === "smelting") summary.smeltsCompleted += 1
  else summary.smithsCompleted += 1
  summary.blacksmithingXp += operation.xpReward
  summary.levelsGained += award.levelsGained
  return nextGame
}

function completeUpgrade(game: BlacksmithingRuntimeGame, operation: Extract<BlacksmithingActiveOperation, { kind: "upgrade" }>, summary: BlacksmithingRuntimeSummary) {
  const instance = getItemInstance(game.inventory, operation.instanceId)
  const node = itemUpgradeNodeById[operation.nodeId]
  if (!instance || !node || !validateItemInstance(instance).valid || instance.unlockedUpgradeNodeIds.includes(operation.nodeId)) return game
  const tree = itemById[instance.definitionId]?.upgradeTreeId ? itemUpgradeTreeById[itemById[instance.definitionId].upgradeTreeId!] : undefined
  const specialization = getItemUpgradeSpecialization(instance, tree)
  if (!tree || !tree.nodeIds.includes(operation.nodeId) || (specialization.state === "specialized" && specialization.branchId !== node.branchId) || node.prerequisiteNodeIds.some((id) => !instance.unlockedUpgradeNodeIds.includes(id))) return game
  const award = awardProfessionXp(game.professions, "blacksmithing", operation.xpReward)
  const inventory = { ...game.inventory, instances: { ...game.inventory.instances, [instance.id]: { ...instance, unlockedUpgradeNodeIds: [...instance.unlockedUpgradeNodeIds, operation.nodeId] } } }
  summary.operationsCompleted += 1
  summary.upgradesCompleted += 1
  summary.blacksmithingXp += operation.xpReward
  summary.levelsGained += award.levelsGained
  summary.completedUpgradeNodeIds.push(operation.nodeId)
  for (const cost of operation.reservedCosts) addCount(summary.materialsConsumed, cost.itemId, cost.quantity)
  return { ...game, inventory, professions: award.state }
}

function afterCompletion(game: BlacksmithingRuntimeGame, state: BlacksmithingState) {
  const stamina = Math.max(0, state.forgeStamina - (state.activeOperation?.staminaCost ?? 0))
  const completedKind = state.activityKind
  let nextState = { ...state, forgeStamina: stamina, activeOperation: null, actionTimerRemaining: 0, completedOperations: state.completedOperations + 1, completedSmelts: state.completedSmelts + (completedKind === "smelting" ? 1 : 0), completedSmiths: state.completedSmiths + (completedKind === "smithing" ? 1 : 0), completedUpgrades: state.completedUpgrades + (completedKind === "upgrade" ? 1 : 0) }
  if (stamina <= 0) return { ...game, blacksmithing: restState(game, nextState) }
  if (state.activityKind === "upgrade") return { ...game, blacksmithing: stop(nextState, "queue-complete") }
  if (state.queueMode === "fixed" && state.queuedOperationsRemaining <= 0) return { ...game, blacksmithing: stop(nextState, "queue-complete") }
  const recipeId = state.activityKind === "smithing" ? state.selectedSmithingRecipeId : state.selectedSmeltingRecipeId
  const recipe = recipeId ? getBlacksmithingRecipe(recipeId) : undefined
  if (!recipe) return { ...game, blacksmithing: stop(nextState, "activity-ended") }
  const reserved = reserveRecipe({ ...game, blacksmithing: nextState }, recipe)
  if (reserved.outcome !== "started") return { ...game, blacksmithing: stop(nextState, "materials-exhausted") }
  const queued = nextState.queueMode === "fixed" ? Math.max(0, nextState.queuedOperationsRemaining - 1) : 0
  return { ...reserved.game, blacksmithing: { ...reserved.game.blacksmithing, queuedOperationsRemaining: queued } }
}

export function advanceBlacksmithing<T extends BlacksmithingRuntimeGame>(game: T, elapsedSeconds: number, rng: BlacksmithingRng = safeRng, options: BlacksmithingAdvanceOptions = {}) {
  const summary = emptySummary()
  const duration = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0
  if (!game.blacksmithing.active || duration <= 0) return { game, summary, stopReason: "elapsed-time-complete" as const }
  let nextGame = game
  let remaining = duration
  let events = 0
  const maxEvents = Math.max(1, Math.floor(options.maxEvents ?? 100000))
  while (remaining > 0 && nextGame.blacksmithing.active && events < maxEvents) {
    events += 1
    const state = nextGame.blacksmithing
    if (state.mode === "resting") {
      const timer = Math.max(0, state.restTimerRemaining)
      const step = Math.min(remaining, timer)
      remaining -= step
      summary.restSeconds += step
      if (timer - step > 0) { nextGame = { ...nextGame, blacksmithing: { ...state, restTimerRemaining: timer - step } } as T; continue }
      const stats = getBlacksmithingStats(nextGame)
      const reset = { ...state, mode: "working" as const, forgeStamina: stats.maxForgeStamina, restTimerRemaining: 0 }
      if (state.activityKind === "upgrade" && !state.activeOperation) { nextGame = { ...nextGame, blacksmithing: stop(reset, "activity-ended") } as T; continue }
      if (state.activeOperation) { nextGame = { ...nextGame, blacksmithing: reset, actionTimerRemaining: state.activeOperation.durationSeconds } } else {
        const recipeId = state.activityKind === "smithing" ? state.selectedSmithingRecipeId : state.selectedSmeltingRecipeId
        const recipe = recipeId ? getBlacksmithingRecipe(recipeId) : undefined
        const reserved = recipe ? reserveRecipe({ ...nextGame, blacksmithing: reset }, recipe) : { game: nextGame, outcome: "materials-exhausted" as const }
        nextGame = (reserved.outcome === "started" ? { ...reserved.game, blacksmithing: { ...reserved.game.blacksmithing, queuedOperationsRemaining: reset.queueMode === "fixed" ? Math.max(0, reset.queuedOperationsRemaining - 1) : 0 } } : { ...nextGame, blacksmithing: stop(reset, "materials-exhausted") }) as T
      }
      continue
    }
    const operation = state.activeOperation
    if (!operation) { nextGame = { ...nextGame, blacksmithing: stop(state, "activity-ended") } as T; continue }
    const timer = Math.max(0, state.actionTimerRemaining || operation.durationSeconds)
    const step = Math.min(remaining, timer)
    remaining -= step
    if (timer - step > 0) { nextGame = { ...nextGame, blacksmithing: { ...state, actionTimerRemaining: timer - step } } as T; continue }
    nextGame = (operation.kind === "upgrade" ? completeUpgrade(nextGame, operation, summary) : completeRecipe(nextGame, operation, rng, summary)) as T
    nextGame = afterCompletion(nextGame, { ...nextGame.blacksmithing, ...state, forgeStamina: nextGame.blacksmithing.forgeStamina, activeOperation: state.activeOperation }) as T
  }
  summary.seconds = duration - remaining
  return { game: nextGame, summary, stopReason: remaining > 0 ? "safety-limit" as const : "elapsed-time-complete" as const }
}

export function normalizeBlacksmithingState(value: unknown): BlacksmithingState {
  const raw = value && typeof value === "object" ? value as Partial<BlacksmithingState> : {}
  const selectedSmeltingRecipeId = typeof raw.selectedSmeltingRecipeId === "string" && blacksmithingRecipeById[raw.selectedSmeltingRecipeId]?.kind === "smelting" ? raw.selectedSmeltingRecipeId : "blacksmithing-recipe.iron-bar"
  const selectedSmithingRecipeId = typeof raw.selectedSmithingRecipeId === "string" && blacksmithingRecipeById[raw.selectedSmithingRecipeId]?.kind === "smithing" ? raw.selectedSmithingRecipeId : "blacksmithing-recipe.iron-dagger"
  const mode = raw.mode === "working" || raw.mode === "resting" ? raw.mode : "idle"
  const operation = raw.activeOperation && typeof raw.activeOperation === "object" ? raw.activeOperation as BlacksmithingActiveOperation : null
  const normalizedCosts = (costs: unknown) => Array.isArray(costs) ? costs.filter((cost) => cost && typeof cost === "object" && typeof (cost as { itemId?: unknown }).itemId === "string" && Number.isInteger((cost as { quantity?: unknown }).quantity) && (cost as { quantity: number }).quantity > 0).map((cost) => ({ itemId: (cost as { itemId: string }).itemId, quantity: (cost as { quantity: number }).quantity })) : []
  const sameCosts = (actual: readonly { itemId: string; quantity: number }[], expected: readonly { itemId: string; quantity: number }[]) => actual.length === expected.length && actual.every((cost, index) => cost.itemId === expected[index].itemId && cost.quantity === expected[index].quantity)
  const normalizedOperation = operation ? { ...operation, durationSeconds: finite(operation.durationSeconds), staminaCost: finite(operation.staminaCost), xpReward: finite(operation.xpReward), reservedCosts: normalizedCosts(operation.reservedCosts) } as BlacksmithingActiveOperation : null
  const safeOperation = normalizedOperation && normalizedOperation.durationSeconds > 0 && normalizedOperation.staminaCost > 0 && normalizedOperation.xpReward >= 0 && (
    (normalizedOperation.kind === "upgrade" && typeof normalizedOperation.instanceId === "string" && typeof normalizedOperation.nodeId === "string" && Boolean(itemUpgradeNodeById[normalizedOperation.nodeId]) && sameCosts(normalizedOperation.reservedCosts, itemUpgradeNodeById[normalizedOperation.nodeId].costs)) ||
    ((normalizedOperation.kind === "smelting" || normalizedOperation.kind === "smithing") && Boolean(blacksmithingRecipeById[normalizedOperation.recipeId]) && blacksmithingRecipeById[normalizedOperation.recipeId].kind === normalizedOperation.kind && sameCosts(normalizedOperation.reservedCosts, blacksmithingRecipeById[normalizedOperation.recipeId].costs))
  ) ? normalizedOperation : null
  return {
    active: raw.active === true,
    mode: raw.active === true ? mode : mode,
    activityKind: raw.activityKind === "smelting" || raw.activityKind === "smithing" || raw.activityKind === "upgrade" ? raw.activityKind : null,
    selectedSmeltingRecipeId,
    selectedSmithingRecipeId,
    activeOperation: safeOperation,
    queueMode: raw.queueMode === "max" ? "max" : "fixed",
    queuedOperationsRemaining: integer(raw.queuedOperationsRemaining),
    forgeStamina: Math.max(0, Math.min(10000, typeof raw.forgeStamina === "number" && Number.isFinite(raw.forgeStamina) ? raw.forgeStamina : 100)),
    actionTimerRemaining: finite(raw.actionTimerRemaining),
    restTimerRemaining: finite(raw.restTimerRemaining),
    completedOperations: integer(raw.completedOperations),
    completedSmelts: integer(raw.completedSmelts),
    completedSmiths: integer(raw.completedSmiths),
    completedUpgrades: integer(raw.completedUpgrades),
    lastStopReason: raw.lastStopReason === "elapsed-time-complete" || raw.lastStopReason === "materials-exhausted" || raw.lastStopReason === "queue-complete" || raw.lastStopReason === "activity-ended" || raw.lastStopReason === "requirements-lost" || raw.lastStopReason === "safety-limit" ? raw.lastStopReason : undefined,
  }
}
