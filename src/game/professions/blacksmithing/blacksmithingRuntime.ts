import { discoverItem } from "../../collection/collectionLogic"
import { itemById } from "../../data/items"
import { awardProfessionXp, getProfessionLevel } from "../professionProgression"
import { getStackableQuantity, removeStackableItem, grantItem } from "../../items/itemOwnership"
import { getBlacksmithingRecipe, blacksmithingRecipeById } from "./blacksmithingRecipes"
import { effectiveBlacksmithingDuration, effectiveBlacksmithingXp, effectiveForgeStaminaCost, getBlacksmithingStats } from "./blacksmithingStats"
import type { BlacksmithingActiveOperation, BlacksmithingRecipeDefinition, BlacksmithingRuntimeGame, BlacksmithingRuntimeSummary, BlacksmithingState, BlacksmithingStopReason } from "./blacksmithingTypes"

export interface BlacksmithingRng { next(): number }
export type BlacksmithingAdvanceStopReason = BlacksmithingStopReason
export interface BlacksmithingAdvanceOptions { maxEvents?: number }

const safeRng: BlacksmithingRng = { next: () => 0.5 }
const emptySummary = (): BlacksmithingRuntimeSummary => ({ seconds: 0, operationsCompleted: 0, smeltsCompleted: 0, smithsCompleted: 0, restSeconds: 0, blacksmithingXp: 0, levelsGained: 0, outputsGained: {}, materialsConsumed: {}, materialsRecovered: {} })

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

function reserveRecipe(game: BlacksmithingRuntimeGame, recipe: BlacksmithingRecipeDefinition): { game: BlacksmithingRuntimeGame; outcome: "started" | "materials-exhausted" | "level-locked" | "stamina-empty"; reason?: string } {
  if (getProfessionLevel(game.professions, "blacksmithing") < recipe.requiredBlacksmithingLevel) return { game, outcome: "level-locked", reason: `Requires Blacksmithing ${recipe.requiredBlacksmithingLevel}.` }
  if (!canReserveCosts(game, recipe.costs)) return { game, outcome: "materials-exhausted", reason: "Not enough materials." }
  if (game.blacksmithing.forgeStamina <= 0) return { game, outcome: "stamina-empty", reason: "Forge Stamina is empty." }
  const stats = getBlacksmithingStats(game, recipe.tags)
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
  const state: BlacksmithingState = { ...game.blacksmithing, active: true, mode: "working", activityKind: recipe.kind, selectedSmeltingRecipeId: recipe.kind === "smelting" ? recipe.id : game.blacksmithing.selectedSmeltingRecipeId, selectedSmithingRecipeId: recipe.kind === "smithing" ? recipe.id : game.blacksmithing.selectedSmithingRecipeId, queueMode, queuedOperationsRemaining: queueMode === "fixed" ? count : 0, lastStopReason: undefined }
  let nextGame = { ...game, blacksmithing: state } as T
  if (nextGame.blacksmithing.forgeStamina <= 0) {
    nextGame = { ...nextGame, blacksmithing: restState(nextGame, nextGame.blacksmithing) }
    return { game: nextGame, outcome: "resting", reason: "Forge Stamina is empty." }
  }
  const reserved = reserveRecipe(nextGame, recipe)
  if (reserved.outcome !== "started") return { game, outcome: reserved.outcome, reason: reserved.reason }
  return { game: { ...reserved.game, blacksmithing: { ...reserved.game.blacksmithing, queuedOperationsRemaining: queueMode === "fixed" ? Math.max(0, count - 1) : 0 } } as T, outcome: "started" }
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

function completeRecipe(game: BlacksmithingRuntimeGame, operation: BlacksmithingActiveOperation, rng: BlacksmithingRng, summary: BlacksmithingRuntimeSummary) {
  const recipe = blacksmithingRecipeById[operation.recipeId]
  if (!recipe) return game
  const grant = grantItem(game.inventory, recipe.outputItemId, recipe.outputQuantity)
  let nextGame = { ...game, inventory: grant.inventory, collection: discoverItem(game.collection, recipe.outputItemId) }
  const award = awardProfessionXp(nextGame.professions, "blacksmithing", operation.xpReward)
  nextGame = { ...nextGame, professions: award.state }
  if (operation.materialRecoveryChance > 0 && rng.next() < operation.materialRecoveryChance) {
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

function afterCompletion(game: BlacksmithingRuntimeGame, state: BlacksmithingState) {
  const stamina = Math.max(0, state.forgeStamina - (state.activeOperation?.staminaCost ?? 0))
  const completedKind = state.activityKind
  const nextState = { ...state, forgeStamina: stamina, activeOperation: null, actionTimerRemaining: 0, completedOperations: state.completedOperations + 1, completedSmelts: state.completedSmelts + (completedKind === "smelting" ? 1 : 0), completedSmiths: state.completedSmiths + (completedKind === "smithing" ? 1 : 0) }
  if (state.queueMode === "fixed" && state.queuedOperationsRemaining <= 0) return { ...game, blacksmithing: stop(nextState, "queue-complete") }
  const recipeId = state.activityKind === "smithing" ? state.selectedSmithingRecipeId : state.selectedSmeltingRecipeId
  const recipe = recipeId ? getBlacksmithingRecipe(recipeId) : undefined
  if (!recipe) return { ...game, blacksmithing: stop(nextState, "activity-ended") }
  if (getProfessionLevel(game.professions, "blacksmithing") < recipe.requiredBlacksmithingLevel) return { ...game, blacksmithing: stop(nextState, "requirements-lost") }
  if (!canReserveCosts(game, recipe.costs)) return { ...game, blacksmithing: stop(nextState, "materials-exhausted") }
  if (stamina <= 0) return { ...game, blacksmithing: restState(game, nextState) }
  const reserved = reserveRecipe({ ...game, blacksmithing: nextState }, recipe)
  if (reserved.outcome !== "started") return { ...game, blacksmithing: stop(nextState, reserved.outcome === "level-locked" ? "requirements-lost" : "materials-exhausted") }
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
      if (state.activeOperation) nextGame = { ...nextGame, blacksmithing: reset, actionTimerRemaining: state.activeOperation.durationSeconds } as T
      else {
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
    nextGame = afterCompletion(completeRecipe(nextGame, operation, rng, summary), state) as T
  }
  summary.seconds = duration - remaining
  const stopReason = remaining > 0 && nextGame.blacksmithing.active ? "safety-limit" as const : nextGame.blacksmithing.lastStopReason ?? "elapsed-time-complete" as const
  return { game: nextGame, summary, stopReason }
}

export function normalizeBlacksmithingState(value: unknown): BlacksmithingState {
  const raw = value && typeof value === "object" ? value as Partial<BlacksmithingState> : {}
  const selectedSmeltingRecipeId = typeof raw.selectedSmeltingRecipeId === "string" && blacksmithingRecipeById[raw.selectedSmeltingRecipeId]?.kind === "smelting" ? raw.selectedSmeltingRecipeId : "blacksmithing-recipe.iron-bar"
  const selectedSmithingRecipeId = typeof raw.selectedSmithingRecipeId === "string" && blacksmithingRecipeById[raw.selectedSmithingRecipeId]?.kind === "smithing" ? raw.selectedSmithingRecipeId : "blacksmithing-recipe.iron-dagger"
  const mode = raw.mode === "working" || raw.mode === "resting" ? raw.mode : "idle"
  const operation = raw.activeOperation && typeof raw.activeOperation === "object" ? raw.activeOperation as Partial<BlacksmithingActiveOperation> : null
  const normalizedCosts = (costs: unknown) => {
    if (!Array.isArray(costs) || costs.length === 0) return null
    const normalized = costs.map((cost) => {
      if (!cost || typeof cost !== "object") return null
      const itemId = (cost as { itemId?: unknown }).itemId
      const quantity = (cost as { quantity?: unknown }).quantity
      return typeof itemId === "string" && itemById[itemId]?.inventoryMode === "stackable" && Number.isInteger(quantity) && (quantity as number) > 0 ? { itemId, quantity: quantity as number } : null
    })
    return normalized.every((cost): cost is { itemId: string; quantity: number } => cost !== null) ? normalized : null
  }
  const costs = normalizedCosts(operation?.reservedCosts)
  const safeOperation = operation && costs && (operation.kind === "smelting" || operation.kind === "smithing") && typeof operation.recipeId === "string" && blacksmithingRecipeById[operation.recipeId]?.kind === operation.kind && finite(operation.durationSeconds) > 0 && finite(operation.staminaCost) > 0 && finite(operation.xpReward) >= 0
    ? { ...operation, durationSeconds: finite(operation.durationSeconds), staminaCost: finite(operation.staminaCost), xpReward: finite(operation.xpReward), reservedCosts: costs } as BlacksmithingActiveOperation
    : null
  const activityKind = raw.activityKind === "smelting" || raw.activityKind === "smithing" ? raw.activityKind : null
  const safeMode = safeOperation || (mode === "resting" && activityKind) ? mode : "idle"
  return {
    active: raw.active === true,
    mode: safeMode,
    activityKind,
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
    lastStopReason: raw.lastStopReason === "elapsed-time-complete" || raw.lastStopReason === "materials-exhausted" || raw.lastStopReason === "queue-complete" || raw.lastStopReason === "activity-ended" || raw.lastStopReason === "requirements-lost" || raw.lastStopReason === "safety-limit" ? raw.lastStopReason : undefined,
  }
}
