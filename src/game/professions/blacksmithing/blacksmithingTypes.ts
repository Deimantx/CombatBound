import type { ProfessionState } from "../professionTypes"

export type BlacksmithingRecipeKind = "smelting" | "smithing"
export type BlacksmithingRecipeTag = "smelting" | "weapon" | "defensive" | "shield" | "tool" | "iron" | "upgrade"
export type BlacksmithingRecipeId = string
export type BlacksmithingMode = "idle" | "working" | "resting"
export type BlacksmithingActivityKind = "smelting" | "smithing" | "upgrade"
export type BlacksmithingQueueMode = "fixed" | "max"

export type BlacksmithingModifier =
  | "blacksmithingXpIncreased" | "maxForgeStaminaFlat" | "forgeStaminaCostReduced" | "forgeStaminaCostIncreased"
  | "forgeRestDurationReduced" | "firstForgeRestDurationReduced" | "allOperationSpeedIncreased"
  | "smeltingSpeedIncreased" | "smithingSpeedIncreased" | "upgradeSpeedIncreased"
  | "weaponSmithingSpeedIncreased" | "defensiveSmithingSpeedIncreased" | "toolSmithingSpeedIncreased"
  | "weaponUpgradeSpeedIncreased" | "defensiveUpgradeSpeedIncreased"
  | "smeltingXpIncreased" | "smithingXpIncreased" | "upgradeXpIncreased"
  | "weaponSmithingXpIncreased" | "defensiveSmithingXpIncreased" | "weaponUpgradeXpIncreased" | "defensiveUpgradeXpIncreased"
  | "smeltingStaminaCostReduced" | "weaponSmithingStaminaCostReduced" | "defensiveSmithingStaminaCostReduced"
  | "toolSmithingStaminaCostReduced" | "weaponUpgradeStaminaCostReduced" | "defensiveUpgradeStaminaCostReduced"
  | "smeltingBaseMaterialRecoveryChance" | "weaponBaseMaterialRecoveryChance"
  | "defensiveBaseMaterialRecoveryChance" | "toolBaseMaterialRecoveryChance" | "globalBaseMaterialRecoveryChance"

export interface BlacksmithingRecipeCost {
  itemId: string
  quantity: number
}

export interface BlacksmithingRecipeDefinition {
  id: BlacksmithingRecipeId
  name: string
  kind: BlacksmithingRecipeKind
  requiredBlacksmithingLevel: number
  costs: BlacksmithingRecipeCost[]
  outputItemId: string
  outputQuantity: number
  baseDurationSeconds: number
  baseForgeStaminaCost: number
  baseBlacksmithingXp: number
  tags: BlacksmithingRecipeTag[]
}

export interface BlacksmithingReservedCost {
  itemId: string
  quantity: number
}

export interface BlacksmithingRecipeOperation {
  kind: "smelting" | "smithing"
  recipeId: BlacksmithingRecipeId
  durationSeconds: number
  staminaCost: number
  xpReward: number
  reservedCosts: BlacksmithingReservedCost[]
  materialRecoveryChance: number
}

export interface BlacksmithingUpgradeOperation {
  kind: "upgrade"
  instanceId: string
  nodeId: string
  durationSeconds: number
  staminaCost: number
  xpReward: number
  reservedCosts: BlacksmithingReservedCost[]
  depth: number
  operationTags: BlacksmithingRecipeTag[]
}

export type BlacksmithingActiveOperation = BlacksmithingRecipeOperation | BlacksmithingUpgradeOperation

export interface BlacksmithingState {
  active: boolean
  mode: BlacksmithingMode
  activityKind: BlacksmithingActivityKind | null
  selectedSmeltingRecipeId: BlacksmithingRecipeId
  selectedSmithingRecipeId: BlacksmithingRecipeId | null
  activeOperation: BlacksmithingActiveOperation | null
  queueMode: BlacksmithingQueueMode
  queuedOperationsRemaining: number
  forgeStamina: number
  actionTimerRemaining: number
  restTimerRemaining: number
  completedOperations: number
  completedSmelts: number
  completedSmiths: number
  completedUpgrades: number
  lastStopReason?: BlacksmithingStopReason
}

export type BlacksmithingStopReason = "elapsed-time-complete" | "materials-exhausted" | "queue-complete" | "activity-ended" | "requirements-lost" | "safety-limit"

export interface BlacksmithingRuntimeSummary {
  seconds: number
  operationsCompleted: number
  smeltsCompleted: number
  smithsCompleted: number
  upgradesCompleted: number
  restSeconds: number
  blacksmithingXp: number
  levelsGained: number
  outputsGained: Record<string, number>
  materialsConsumed: Record<string, number>
  materialsRecovered: Record<string, number>
  completedUpgradeNodeIds: string[]
}

export interface BlacksmithingRuntimeGame {
  inventory: import("../../inventory/inventoryTypes").InventoryState
  equipment: import("../../equipment/equipmentTypes").EquipmentState
  professions: ProfessionState
  collection: import("../../collection/collectionTypes").CollectionState
  blacksmithing: BlacksmithingState
}
