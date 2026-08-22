import { itemById } from "../../data/items"
import { getProfessionLevel } from "../professionProgression"
import { getProfessionPerkDefinitions, type ProfessionPerkRegistry } from "../professionPerkRegistry"
import { activeMasteryMilestones, masteryLevel, resourceMasteryById, getResourceMasteryDefinition, type ResourceMasteryDefinition } from "./miningMastery"
import { getMiningResource, miningResourceById, miningStageById } from "./miningData"
import type { MiningStageId, MiningResourceId, MiningResourceDefinition } from "./miningTypes"
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

export interface MiningDefinitionRegistries {
  resourceRegistry?: Record<string, MiningResourceDefinition>
  masteryRegistry?: Record<string, ResourceMasteryDefinition>
  perkRegistry?: ProfessionPerkRegistry
}

function emptyMiningStats(): MiningDerivedStats {
  return { toolInstanceId: null, toolName: null, miningDamage: 0, swingInterval: 0.2, maxMiningStamina: 1, staminaCost: 1, restDuration: 0.1, oreMultiplier: 0, skillXpMultiplier: 0, masteryXpMultiplier: 0, byproductFindMultiplier: 0, roughGemFindMultiplier: 0, blackStoneFindMultiplier: 0, stageMiningDamageMultiplier: 1, stageOreYieldMultiplier: 1, stageByproductFindMultiplier: 1, stageBreakStaminaRestore: 0, firstRestDurationMultiplier: 1 }
}

function equippedPickaxe(inventory: InventoryState, equipment: EquipmentState) {
  const instanceId = equipment.slots.tool
  const instance = instanceId ? inventory.instances[instanceId] : undefined
  const definition = instance ? itemById[instance.definitionId] : undefined
  return definition?.professionToolKind === "pickaxe" && definition.professionToolStats ? { instanceId, definition } : null
}

function addModifier(totals: Record<string, number>, modifier: string, value: number) {
  const keyByModifier: Record<string, string> = {
    damage: "damage", ore: "ore", maxStamina: "maxStamina", roughGem: "roughGem", cost: "costReduction", byproduct: "byproduct", speed: "speed", blackStone: "blackStone",
    miningDamageIncreased: "damage", swingSpeedIncreased: "speed", maxMiningStaminaFlat: "maxStamina", staminaCostIncreased: "costIncrease", staminaCostReduced: "costReduction", restDurationReduced: "restReduction", oreYieldIncreased: "ore", skillXpIncreased: "skillXp", masteryXpIncreased: "masteryXp", byproductFindIncreased: "byproduct", roughGemFindIncreased: "roughGem", blackStoneFindIncreased: "blackStone", stageMiningDamageIncreased: "stageDamage", stageOreYieldIncreased: "stageOre", stageByproductFindIncreased: "stageByproduct", stageBreakStaminaRestoreFlat: "breakRestore", firstRestDurationReduced: "firstRest",
  }
  const key = keyByModifier[modifier]
  if (key) totals[key] = (totals[key] ?? 0) + value
}

export function getMiningModifierTotals(professions: ProfessionState, stageId: MiningStageId, resourceId: MiningResourceId, registries: MiningDefinitionRegistries = {}) {
  const progress = professions.skills.mining
  const totals: Record<string, number> = { damage: 0, speed: 0, maxStamina: 0, costIncrease: 0, costReduction: 0, restReduction: 0, ore: 0, skillXp: 0, masteryXp: 0, byproduct: 0, roughGem: 0, blackStone: 0, stageDamage: 0, stageOre: 0, stageByproduct: 0, breakRestore: 0, firstRest: 0 }
  const definitions = getProfessionPerkDefinitions("mining", registries.perkRegistry)
  if (progress) for (const [perkId, rank] of Object.entries(progress.purchasedPerks)) {
    const perk = definitions[perkId]
    if (!perk) continue
    for (const effect of perk.effects) {
      if (effect.type !== "miningModifier") continue
      if (effect.resourceIds && !effect.resourceIds.includes(resourceId)) continue
      if (effect.stageIds && !effect.stageIds.includes(stageId)) continue
      addModifier(totals, effect.modifier, effect.valuePerRank * rank)
    }
  }
  const resource = getMiningResource(resourceId, registries.resourceRegistry ?? miningResourceById)
  const masteryDefinition = resource ? getResourceMasteryDefinition(resource.masteryId, registries.masteryRegistry ?? resourceMasteryById) : undefined
  const mastery = resource ? professions.resourceMasteries[resource.masteryId] : undefined
  if (mastery && masteryDefinition) {
    const level = masteryLevel(mastery, masteryDefinition)
    const passivePerLevel = Math.max(0, level - 1)
    totals.ore += passivePerLevel * (masteryDefinition.passivePerLevel.ore ?? 0)
    totals.damage += passivePerLevel * (masteryDefinition.passivePerLevel.damage ?? 0)
    for (const milestone of activeMasteryMilestones(level, masteryDefinition)) {
      for (const [modifier, value] of Object.entries(milestone.effects)) addModifier(totals, modifier, value)
      for (const stageEffect of milestone.stageEffects ?? []) if (stageEffect.stageIds.includes(stageId)) {
        for (const [modifier, value] of Object.entries(stageEffect.effects)) addModifier(totals, modifier, value)
      }
    }
  }
  return totals
}

export function getMiningStats(input: { professions: ProfessionState; inventory: InventoryState; equipment: EquipmentState; stageId?: MiningStageId; resourceId?: MiningResourceId } & MiningDefinitionRegistries): MiningDerivedStats {
  const stageId = input.stageId ?? "outer-crust"
  const resourceId = input.resourceId ?? "mining-resource.iron-vein"
  const resource = getMiningResource(resourceId, input.resourceRegistry ?? miningResourceById)
  const stage = miningStageById[stageId]
  if (!resource || !stage) return emptyMiningStats()
  const totals = getMiningModifierTotals(input.professions, stageId, resourceId, input)
  const tool = equippedPickaxe(input.inventory, input.equipment)
  const damage = tool?.definition.professionToolStats?.miningDamage ?? 0
  const speed = Math.max(-0.8, totals.speed)
  const maxMiningStamina = Math.max(1, resource.baseMaxStamina + totals.maxStamina)
  const costMultiplier = Math.max(0.1, 1 + totals.costIncrease - totals.costReduction)
  return {
    toolInstanceId: tool?.instanceId ?? null,
    toolName: tool?.definition.name ?? null,
    miningDamage: Math.max(0, damage * (1 + totals.damage) * (1 + totals.stageDamage)),
    swingInterval: Math.max(0.2, resource.baseSwingTimeSeconds / (1 + speed)),
    maxMiningStamina,
    staminaCost: Math.max(1, resource.baseStaminaCostPerSwing * costMultiplier),
    restDuration: Math.max(0.1, resource.baseRestDurationSeconds * Math.max(0.1, 1 - totals.restReduction)),
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

export function canStartMining(input: { professions: ProfessionState; inventory: InventoryState; equipment: EquipmentState; resourceId?: MiningResourceId } & MiningDefinitionRegistries) {
  const resourceId = input.resourceId ?? "mining-resource.iron-vein"
  const resource = getMiningResource(resourceId, input.resourceRegistry ?? miningResourceById)
  if (!resource) return { valid: false, reason: "Unknown Mining resource." }
  const level = getProfessionLevel(input.professions, "mining")
  const stats = getMiningStats(input)
  if (level < resource.requiredMiningLevel) return { valid: false, reason: `Requires Mining ${resource.requiredMiningLevel}.` }
  if (!stats.toolInstanceId) return { valid: false, reason: "Equip a Pickaxe in Hero." }
  return { valid: true as const, reason: "" }
}
