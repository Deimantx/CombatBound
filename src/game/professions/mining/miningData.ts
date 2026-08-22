import type { MiningResourceDefinition, MiningStageDefinition } from "./miningTypes"

export const miningStages: MiningStageDefinition[] = [
  { id: "outer-crust", name: "Outer Crust", durability: 240, orePerEffectiveDamage: 0.035, skillXpPerEffectiveDamage: 0.08, masteryXpPerEffectiveDamage: 0.04, roughGemChancePerReferenceDamage: 0.0002, blackStoneChancePerReferenceDamage: 0 },
  { id: "exposed-seam", name: "Exposed Seam", durability: 190, orePerEffectiveDamage: 0.05, skillXpPerEffectiveDamage: 0.12, masteryXpPerEffectiveDamage: 0.06, roughGemChancePerReferenceDamage: 0.0005, blackStoneChancePerReferenceDamage: 0 },
  { id: "dense-vein", name: "Dense Vein", durability: 150, orePerEffectiveDamage: 0.07, skillXpPerEffectiveDamage: 0.18, masteryXpPerEffectiveDamage: 0.09, roughGemChancePerReferenceDamage: 0.0012, blackStoneChancePerReferenceDamage: 0 },
  { id: "rich-core", name: "Rich Core", durability: 110, orePerEffectiveDamage: 0.1, skillXpPerEffectiveDamage: 0.28, masteryXpPerEffectiveDamage: 0.14, roughGemChancePerReferenceDamage: 0.003, blackStoneChancePerReferenceDamage: 0.0001 },
  { id: "heart-of-iron", name: "Heart of Iron", durability: 75, orePerEffectiveDamage: 0.15, skillXpPerEffectiveDamage: 0.45, masteryXpPerEffectiveDamage: 0.22, roughGemChancePerReferenceDamage: 0.0075, blackStoneChancePerReferenceDamage: 0.0005 },
]

export const ironVein: MiningResourceDefinition = {
  id: "mining-resource.iron-vein",
  name: "Iron Vein",
  requiredMiningLevel: 1,
  primaryItemId: "item.iron-ore",
  baseSwingTimeSeconds: 2,
  baseMaxStamina: 100,
  baseStaminaCostPerSwing: 8,
  baseRestDurationSeconds: 10,
  stageIds: miningStages.map((stage) => stage.id),
  masteryId: "mastery.iron-vein",
}

export const miningStageById = Object.fromEntries(miningStages.map((stage) => [stage.id, stage])) as Record<string, MiningStageDefinition>
export const miningResourceById = { [ironVein.id]: ironVein }

export function createInitialMiningState(): import("./miningTypes").MiningState {
  return { selectedResourceId: ironVein.id, active: false, mode: "idle", currentStageId: "outer-crust", stageDurabilityRemaining: ironVein.stageIds.length ? miningStageById[ironVein.stageIds[0]].durability : 0, miningStamina: ironVein.baseMaxStamina, swingTimerRemaining: 0, restTimerRemaining: 0, yieldRemainders: {}, completedDeposits: 0, totalSwings: 0, exhaustionRestsThisDeposit: 0 }
}
