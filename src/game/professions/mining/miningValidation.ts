import { ironVein, miningStages } from "./miningData"
import { miningPerks, MINING_PERK_TREE_COST } from "./miningPerks"

export interface MiningValidationResult { valid: boolean; errors: string[] }

export function validateMiningContent(): MiningValidationResult {
  const errors: string[] = []
  if (miningStages.length !== 5) errors.push("Iron Vein must have exactly five stages.")
  for (let index = 1; index < miningStages.length; index += 1) {
    if (miningStages[index - 1].durability <= miningStages[index].durability) errors.push("Mining stage durability must decrease with depth.")
    if (miningStages[index - 1].orePerEffectiveDamage >= miningStages[index].orePerEffectiveDamage) errors.push("Mining ore efficiency must increase with depth.")
    if (miningStages[index - 1].skillXpPerEffectiveDamage >= miningStages[index].skillXpPerEffectiveDamage) errors.push("Mining XP efficiency must increase with depth.")
    if (miningStages[index - 1].masteryXpPerEffectiveDamage >= miningStages[index].masteryXpPerEffectiveDamage) errors.push("Mining mastery efficiency must increase with depth.")
  }
  if (ironVein.requiredMiningLevel < 1 || ironVein.baseSwingTimeSeconds <= 0 || ironVein.baseMaxStamina <= 0 || ironVein.baseStaminaCostPerSwing <= 0 || ironVein.baseRestDurationSeconds <= 0) errors.push("Iron Vein base values must be positive.")
  if (MINING_PERK_TREE_COST <= 99) errors.push("Mining perk tree must cost more than 99 points.")
  if (new Set(miningPerks.map((perk) => perk.id)).size !== miningPerks.length) errors.push("Mining perk IDs must be unique.")
  return { valid: errors.length === 0, errors }
}
