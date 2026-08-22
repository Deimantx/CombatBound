import type { ProfessionState, ResourceMasteryId } from "../professionTypes"

export type MiningResourceId = string
export type MiningStageId = "outer-crust" | "exposed-seam" | "dense-vein" | "rich-core" | "heart-of-iron"
export type MiningMode = "idle" | "swinging" | "resting"

export interface MiningStageDefinition {
  id: MiningStageId
  name: string
  durability: number
  orePerEffectiveDamage: number
  skillXpPerEffectiveDamage: number
  masteryXpPerEffectiveDamage: number
  roughGemChancePerReferenceDamage: number
  blackStoneChancePerReferenceDamage: number
}

export interface MiningResourceDefinition {
  id: MiningResourceId
  name: string
  requiredMiningLevel: number
  primaryItemId: string
  baseSwingTimeSeconds: number
  baseMaxStamina: number
  baseStaminaCostPerSwing: number
  baseRestDurationSeconds: number
  stageIds: MiningStageId[]
  masteryId: ResourceMasteryId
}

export interface MiningState {
  selectedResourceId: MiningResourceId
  active: boolean
  mode: MiningMode
  currentStageId: MiningStageId
  stageDurabilityRemaining: number
  miningStamina: number
  swingTimerRemaining: number
  restTimerRemaining: number
  yieldRemainders: Record<string, number>
  completedDeposits: number
  totalSwings: number
  exhaustionRestsThisDeposit: number
}

export interface MiningRuntimeSummary {
  seconds: number
  swings: number
  stagesBroken: number
  deposits: number
  restSeconds: number
  ironOre: number
  roughGems: number
  blackStones: number
  expectedRoughGems: number
  expectedBlackStones: number
  miningXp: number
  masteryXp: number
  miningLevelsGained: number
  masteryLevelsGained: number
}

export interface MiningRuntimeGame {
  inventory: import("../../inventory/inventoryTypes").InventoryState
  equipment: import("../../equipment/equipmentTypes").EquipmentState
  progression: import("../../progression/progressionTypes").ProgressionState
  professions: ProfessionState
  mining: MiningState
  collection: import("../../collection/collectionTypes").CollectionState
}
