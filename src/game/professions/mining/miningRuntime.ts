import { discoverItem } from "../../collection/collectionLogic"
import { grantItem } from "../../items/itemOwnership"
import { awardProfessionXp } from "../professionProgression"
import { awardMasteryXp, ironMasteryLevel } from "./miningMastery"
import { ironVein, miningStageById } from "./miningData"
import { getMiningStats } from "./miningStats"
import type { MiningRuntimeGame, MiningRuntimeSummary, MiningState, MiningStageId } from "./miningTypes"

export interface MiningRng { next(): number }

// V1 runtime policy: the state machine and fast-forward path intentionally
// target the one authored Iron Vein resource. Registry-driven stats are ready
// for future resources, but multi-resource runtime selection is deferred until
// a second real resource is designed.

const EMPTY_SUMMARY = (): MiningRuntimeSummary => ({ seconds: 0, swings: 0, stagesBroken: 0, deposits: 0, restSeconds: 0, ironOre: 0, roughGems: 0, blackStones: 0, expectedRoughGems: 0, expectedBlackStones: 0, miningXp: 0, masteryXp: 0, miningLevelsGained: 0, masteryLevelsGained: 0 })
const safeRng: MiningRng = { next: () => 0.5 }

export type MiningAdvanceStopReason = "requested-time-complete" | "safety-limit"

export interface MiningAdvanceOptions {
  maxEvents?: number
}

export function startMiningState(state: MiningState, game: MiningRuntimeGame): MiningState {
  const stats = getMiningStats({ ...game, stageId: state.currentStageId, resourceId: state.selectedResourceId })
  if (state.mode === "resting" && state.restTimerRemaining > 0) return { ...state, active: true }
  if (state.miningStamina <= 0) return beginRest({ ...state, active: true }, stats.restDuration, stats.firstRestDurationMultiplier)
  return { ...state, active: true, mode: "swinging", swingTimerRemaining: state.swingTimerRemaining > 0 ? state.swingTimerRemaining : stats.swingInterval, restTimerRemaining: 0 }
}

export function stopMiningState(state: MiningState): MiningState {
  return { ...state, active: false }
}

function beginRest(state: MiningState, normalDuration: number, firstRestDurationMultiplier = 1) {
  const reduced = state.exhaustionRestsThisDeposit === 0
  return { ...state, mode: "resting" as const, restTimerRemaining: normalDuration * (reduced ? firstRestDurationMultiplier : 1), swingTimerRemaining: 0, exhaustionRestsThisDeposit: state.exhaustionRestsThisDeposit + 1 }
}

function currentStageIndex(state: MiningState) { return ironVein.stageIds.indexOf(state.currentStageId) }

function transitionAfterBreak(state: MiningState, summary: MiningRuntimeSummary) {
  const index = currentStageIndex(state)
  if (index < ironVein.stageIds.length - 1) {
    const nextStage = ironVein.stageIds[index + 1]
    return { state: { ...state, currentStageId: nextStage, stageDurabilityRemaining: miningStageById[nextStage].durability }, depositCompleted: false }
  }
  const outer = ironVein.stageIds[0]
  summary.deposits += 1
  return { state: { ...state, currentStageId: outer, stageDurabilityRemaining: miningStageById[outer].durability, completedDeposits: state.completedDeposits + 1, exhaustionRestsThisDeposit: 0 }, depositCompleted: true }
}

function addReward(game: MiningRuntimeGame, itemId: string, quantity: number) {
  if (quantity <= 0) return game
  const result = grantItem(game.inventory, itemId, quantity)
  return { ...game, inventory: result.inventory, collection: discoverItem(game.collection, itemId) }
}

function rollChance(rng: MiningRng, baseChance: number, effectiveDamage: number, relativeMultiplier: number) {
  if (baseChance <= 0 || effectiveDamage <= 0) return false
  const chance = Math.max(0, Math.min(1, 1 - Math.pow(1 - baseChance, effectiveDamage / 10)))
  return rng.next() < Math.max(0, Math.min(1, chance * relativeMultiplier))
}

function expectedChance(baseChance: number, effectiveDamage: number, relativeMultiplier: number) {
  if (baseChance <= 0 || effectiveDamage <= 0) return 0
  return Math.max(0, Math.min(1, (1 - Math.pow(1 - baseChance, effectiveDamage / 10)) * relativeMultiplier))
}

function processSwing(game: MiningRuntimeGame, state: MiningState, rng: MiningRng, summary: MiningRuntimeSummary) {
  const stage = miningStageById[state.currentStageId]
  const stats = getMiningStats({ ...game, stageId: state.currentStageId, resourceId: state.selectedResourceId })
  const effectiveDamage = Math.max(0, Math.min(stats.miningDamage, state.stageDurabilityRemaining))
  const ore = effectiveDamage * stage.orePerEffectiveDamage * stats.oreMultiplier
  const miningXp = effectiveDamage * stage.skillXpPerEffectiveDamage * stats.skillXpMultiplier
  const masteryXp = effectiveDamage * stage.masteryXpPerEffectiveDamage * stats.masteryXpMultiplier
  let nextGame = game
  const remainder = Math.max(0, Math.min(0.999999, game.mining.yieldRemainders[ironVein.primaryItemId] ?? 0)) + ore
  const wholeOre = Math.floor(remainder)
  if (wholeOre > 0) {
    nextGame = addReward(nextGame, ironVein.primaryItemId, wholeOre)
    summary.ironOre += wholeOre
  }
  const roughGemMultiplier = stats.byproductFindMultiplier * stats.roughGemFindMultiplier
  const blackStoneMultiplier = stats.byproductFindMultiplier * stats.blackStoneFindMultiplier
  summary.expectedRoughGems += expectedChance(stage.roughGemChancePerReferenceDamage, effectiveDamage, roughGemMultiplier)
  summary.expectedBlackStones += expectedChance(stage.blackStoneChancePerReferenceDamage, effectiveDamage, blackStoneMultiplier)
  if (rollChance(rng, stage.roughGemChancePerReferenceDamage, effectiveDamage, roughGemMultiplier)) { nextGame = addReward(nextGame, "item.rough-gem", 1); summary.roughGems += 1 }
  if (rollChance(rng, stage.blackStoneChancePerReferenceDamage, effectiveDamage, blackStoneMultiplier)) { nextGame = addReward(nextGame, "item.black-stone", 1); summary.blackStones += 1 }
  const professionAward = awardProfessionXp(nextGame.professions, "mining", miningXp)
  const oldMasteryLevel = ironMasteryLevel(nextGame.professions.resourceMasteries[ironVein.masteryId])
  const mastery = awardMasteryXp(nextGame.professions.resourceMasteries[ironVein.masteryId], masteryXp)
  const newMasteryLevel = ironMasteryLevel(mastery)
  nextGame = { ...nextGame, professions: { ...professionAward.state, resourceMasteries: { ...professionAward.state.resourceMasteries, [ironVein.masteryId]: mastery } }, mining: { ...state, yieldRemainders: { ...state.yieldRemainders, [ironVein.primaryItemId]: remainder - wholeOre }, stageDurabilityRemaining: Math.max(0, state.stageDurabilityRemaining - effectiveDamage), totalSwings: state.totalSwings + 1 } }
  summary.swings += 1
  summary.miningXp += miningXp
  summary.masteryXp += masteryXp
  summary.miningLevelsGained += professionAward.levelsGained
  summary.masteryLevelsGained += Math.max(0, newMasteryLevel - oldMasteryLevel)
  let nextState = { ...nextGame.mining, miningStamina: Math.max(0, nextGame.mining.miningStamina - stats.staminaCost) }
  if (nextState.stageDurabilityRemaining <= 0) {
    summary.stagesBroken += 1
    nextState = { ...nextState, miningStamina: Math.min(stats.maxMiningStamina, nextState.miningStamina + stats.stageBreakStaminaRestore) }
    nextState = transitionAfterBreak(nextState, summary).state
  }
  const currentStats = getMiningStats({ ...nextGame, stageId: nextState.currentStageId, resourceId: nextState.selectedResourceId })
  nextGame = { ...nextGame, mining: nextState.miningStamina <= 0 ? beginRest({ ...nextState, active: true }, currentStats.restDuration, currentStats.firstRestDurationMultiplier) : { ...nextState, active: true, mode: "swinging", swingTimerRemaining: currentStats.swingInterval, restTimerRemaining: 0 } }
  return nextGame
}

export function advanceMining<T extends MiningRuntimeGame>(game: T, elapsedSeconds: number, rng: MiningRng = safeRng, options: MiningAdvanceOptions = {}): { game: T; summary: MiningRuntimeSummary; stopReason: MiningAdvanceStopReason } {
  const summary = EMPTY_SUMMARY()
  const duration = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0
  if (!game.mining.active || duration <= 0) return { game, summary, stopReason: "requested-time-complete" }
  let nextGame = game
  let remaining = duration
  let events = 0
  const maxEvents = Math.max(1, Math.floor(options.maxEvents ?? 100000))
  while (remaining > 0 && nextGame.mining.active && events < maxEvents) {
    events += 1
    const mining = nextGame.mining
    if (mining.mode === "resting") {
      const step = Math.min(remaining, Math.max(0, mining.restTimerRemaining))
      summary.restSeconds += step
      remaining -= step
      const restTimer = Math.max(0, mining.restTimerRemaining - step)
      if (restTimer > 0) { nextGame = { ...nextGame, mining: { ...mining, restTimerRemaining: restTimer } } as T; continue }
      const stats = getMiningStats({ ...nextGame, stageId: mining.currentStageId, resourceId: mining.selectedResourceId })
      nextGame = { ...nextGame, mining: { ...mining, miningStamina: stats.maxMiningStamina, mode: "swinging", swingTimerRemaining: stats.swingInterval, restTimerRemaining: 0 } } as T
      continue
    }
    const stats = getMiningStats({ ...nextGame, stageId: mining.currentStageId, resourceId: mining.selectedResourceId })
    const timer = mining.swingTimerRemaining > 0 ? mining.swingTimerRemaining : stats.swingInterval
    const step = Math.min(remaining, timer)
    remaining -= step
    const nextTimer = timer - step
    if (nextTimer > 0) { nextGame = { ...nextGame, mining: { ...mining, mode: "swinging", swingTimerRemaining: nextTimer } } as T; continue }
    nextGame = processSwing(nextGame, { ...mining, swingTimerRemaining: 0 }, rng, summary) as T
  }
  summary.seconds = duration - remaining
  return { game: nextGame, summary, stopReason: remaining > 0 ? "safety-limit" : "requested-time-complete" }
}

export function normalizeMiningState(value: unknown): MiningState {
  const raw = value && typeof value === "object" ? value as Partial<MiningState> : {}
  const stage = typeof raw.currentStageId === "string" && raw.currentStageId in miningStageById ? raw.currentStageId as MiningStageId : "outer-crust"
  const durability = Number.isFinite(raw.stageDurabilityRemaining) ? Math.max(0, Math.min(miningStageById[stage].durability, raw.stageDurabilityRemaining as number)) : miningStageById[stage].durability
  const stamina = Number.isFinite(raw.miningStamina) ? Math.max(0, Math.min(1000, raw.miningStamina as number)) : ironVein.baseMaxStamina
  const mode = raw.mode === "swinging" || raw.mode === "resting" ? raw.mode : "idle"
  return {
    selectedResourceId: "mining-resource.iron-vein", active: raw.active === true, mode, currentStageId: stage, stageDurabilityRemaining: durability, miningStamina: stamina,
    swingTimerRemaining: finite(raw.swingTimerRemaining), restTimerRemaining: finite(raw.restTimerRemaining), yieldRemainders: normalizeRemainders(raw.yieldRemainders), completedDeposits: integer(raw.completedDeposits), totalSwings: integer(raw.totalSwings), exhaustionRestsThisDeposit: integer(raw.exhaustionRestsThisDeposit),
  }
}
function finite(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0 }
function integer(value: unknown) { return Math.max(0, Math.floor(finite(value))) }
function normalizeRemainders(value: unknown) { const result: Record<string, number> = {}; if (!value || typeof value !== "object" || Array.isArray(value)) return result; for (const [id, amount] of Object.entries(value)) if (typeof amount === "number" && Number.isFinite(amount)) result[id] = Math.max(0, Math.min(0.999999, amount)); return result }
