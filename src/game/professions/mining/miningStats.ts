import { itemById } from "../../data/items"
import { getProfessionLevel } from "../professionProgression"
import { miningPerkById } from "./miningPerks"
import { ironMasteryLevel, activeIronMasteryMilestones } from "./miningMastery"
import { ironVein, miningStageById } from "./miningData"
import type { MiningStageId, MiningResourceId } from "./miningTypes"
import type { ProfessionState } from "../professionTypes"
import type { InventoryState } from "../../inventory/inventoryTypes"
import type { EquipmentState } from "../../equipment/equipmentTypes"

export interface MiningDerivedStats {
  toolInstanceId: string | null
  toolName: string | null
  miningDamage: number
  swingInterval: number
  maxMiningStamina: number
  staminaCost: number
  restDuration: number
  oreMultiplier: number
  skillXpMultiplier: number
  masteryXpMultiplier: number
  byproductFindMultiplier: number
  roughGemFindMultiplier: number
  blackStoneFindMultiplier: number
  stageMiningDamageMultiplier: number
  stageOreYieldMultiplier: number
  stageByproductFindMultiplier: number
  stageBreakStaminaRestore: number
  firstRestDurationMultiplier: number
}

function equippedPickaxe(inventory: InventoryState, equipment: EquipmentState) {
  const instanceId = equipment.slots.tool
  const instance = instanceId ? inventory.instances[instanceId] : undefined
  const definition = instance ? itemById[instance.definitionId] : undefined
  return definition?.professionToolKind === "pickaxe" && definition.professionToolStats ? { instanceId, definition } : null
}

export function getMiningModifierTotals(professions: ProfessionState, stageId: MiningStageId, resourceId: MiningResourceId) {
  const progress = professions.skills.mining
  const totals = { damage: 0, speed: 0, maxStamina: 0, costIncrease: 0, costReduction: 0, restReduction: 0, ore: 0, skillXp: 0, masteryXp: 0, byproduct: 0, roughGem: 0, blackStone: 0, stageDamage: 0, stageOre: 0, stageByproduct: 0, breakRestore: 0, firstRest: 0 }
  if (progress) for (const [perkId, rank] of Object.entries(progress.purchasedPerks)) {
    const perk = miningPerkById[perkId]
    if (!perk) continue
    for (const effect of perk.effects) {
      if (effect.resourceIds && !effect.resourceIds.includes(resourceId)) continue
      if (effect.stageIds && !effect.stageIds.includes(stageId)) continue
      const value = effect.valuePerRank * rank
      if (effect.modifier === "miningDamageIncreased") totals.damage += value
      if (effect.modifier === "swingSpeedIncreased") totals.speed += value
      if (effect.modifier === "maxMiningStaminaFlat") totals.maxStamina += value
      if (effect.modifier === "staminaCostIncreased") totals.costIncrease += value
      if (effect.modifier === "staminaCostReduced") totals.costReduction += value
      if (effect.modifier === "restDurationReduced") totals.restReduction += value
      if (effect.modifier === "oreYieldIncreased") totals.ore += value
      if (effect.modifier === "skillXpIncreased") totals.skillXp += value
      if (effect.modifier === "masteryXpIncreased") totals.masteryXp += value
      if (effect.modifier === "byproductFindIncreased") totals.byproduct += value
      if (effect.modifier === "roughGemFindIncreased") totals.roughGem += value
      if (effect.modifier === "blackStoneFindIncreased") totals.blackStone += value
      if (effect.modifier === "stageMiningDamageIncreased") totals.stageDamage += value
      if (effect.modifier === "stageOreYieldIncreased") totals.stageOre += value
      if (effect.modifier === "stageByproductFindIncreased") totals.stageByproduct += value
      if (effect.modifier === "stageBreakStaminaRestoreFlat") totals.breakRestore += value
      if (effect.modifier === "firstRestDurationReduced") totals.firstRest += value
    }
  }
  const mastery = professions.resourceMasteries["mastery.iron-vein"]
  const masteryLevel = mastery ? ironMasteryLevel(mastery) : 1
  const masteryPassive = Math.max(0, masteryLevel - 1)
  totals.ore += masteryPassive * 0.001
  totals.damage += masteryPassive * 0.0005
  for (const milestone of activeIronMasteryMilestones(masteryLevel)) {
    const effects = milestone.effects as Partial<Record<"damage" | "ore" | "maxStamina" | "roughGem" | "cost" | "deepOre" | "deepDamage" | "byproduct" | "speed" | "blackStone", number>>
    totals.damage += effects.damage ?? 0
    totals.ore += effects.ore ?? 0
    totals.maxStamina += effects.maxStamina ?? 0
    totals.roughGem += effects.roughGem ?? 0
    totals.costReduction += effects.cost ?? 0
    if (stageId === "dense-vein" || stageId === "rich-core" || stageId === "heart-of-iron") totals.ore += effects.deepOre ?? 0
    if (stageId === "rich-core" || stageId === "heart-of-iron") totals.stageDamage += effects.deepDamage ?? 0
    totals.byproduct += effects.byproduct ?? 0
    totals.speed += effects.speed ?? 0
    totals.blackStone += effects.blackStone ?? 0
  }
  return totals
}

export function getMiningStats(input: { professions: ProfessionState; inventory: InventoryState; equipment: EquipmentState; stageId?: MiningStageId; resourceId?: MiningResourceId }): MiningDerivedStats {
  const stageId = input.stageId ?? "outer-crust"
  const resourceId = input.resourceId ?? ironVein.id
  const totals = getMiningModifierTotals(input.professions, stageId, resourceId)
  const tool = equippedPickaxe(input.inventory, input.equipment)
  const damage = tool?.definition.professionToolStats?.miningDamage ?? 0
  const speed = Math.max(-0.8, totals.speed)
  const maxMiningStamina = Math.max(1, ironVein.baseMaxStamina + totals.maxStamina)
  const costMultiplier = Math.max(0.1, 1 + totals.costIncrease - totals.costReduction)
  return {
    toolInstanceId: tool?.instanceId ?? null,
    toolName: tool?.definition.name ?? null,
    miningDamage: Math.max(0, damage * (1 + totals.damage) * (1 + totals.stageDamage)),
    swingInterval: Math.max(0.2, ironVein.baseSwingTimeSeconds / (1 + speed)),
    maxMiningStamina,
    staminaCost: Math.max(1, ironVein.baseStaminaCostPerSwing * costMultiplier),
    restDuration: Math.max(0.1, ironVein.baseRestDurationSeconds * Math.max(0.1, 1 - totals.restReduction)),
    oreMultiplier: Math.max(0, 1 + totals.ore + totals.stageOre),
    skillXpMultiplier: Math.max(0, 1 + totals.skillXp),
    masteryXpMultiplier: Math.max(0, 1 + totals.masteryXp),
    byproductFindMultiplier: Math.max(0, 1 + totals.byproduct + totals.stageByproduct),
    roughGemFindMultiplier: Math.max(0, 1 + totals.roughGem),
    blackStoneFindMultiplier: Math.max(0, 1 + totals.blackStone),
    stageMiningDamageMultiplier: 1,
    stageOreYieldMultiplier: 1,
    stageByproductFindMultiplier: 1,
    stageBreakStaminaRestore: Math.max(0, totals.breakRestore),
    firstRestDurationMultiplier: Math.max(0.1, 1 - totals.firstRest),
  }
}

export function getMiningStageValues(stageId: MiningStageId) {
  return miningStageById[stageId]
}

export function canStartMining(input: { professions: ProfessionState; inventory: InventoryState; equipment: EquipmentState; resourceId?: MiningResourceId }) {
  const level = getProfessionLevel(input.professions, "mining")
  const resource = ironVein
  const stats = getMiningStats(input)
  if (level < resource.requiredMiningLevel) return { valid: false, reason: `Requires Mining ${resource.requiredMiningLevel}.` }
  if (!stats.toolInstanceId) return { valid: false, reason: "Equip a Pickaxe in Hero." }
  return { valid: true as const, reason: "" }
}
