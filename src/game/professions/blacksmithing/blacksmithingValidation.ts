import { itemById } from "../../data/items"
import { blacksmithingPerks } from "./blacksmithingPerks"
import { blacksmithingRecipes } from "./blacksmithingRecipes"
import type { BlacksmithingRecipeDefinition } from "./blacksmithingTypes"

const VALID_TAGS = new Set(["smelting", "weapon", "defensive", "shield", "tool", "iron"])

export function validateBlacksmithingRecipes(recipes: readonly BlacksmithingRecipeDefinition[] = blacksmithingRecipes) {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const recipe of recipes) {
    if (ids.has(recipe.id)) errors.push(`Duplicate Blacksmithing recipe ID ${recipe.id}`)
    ids.add(recipe.id)
    if (!recipe.id || !recipe.name) errors.push("Blacksmithing recipes require stable IDs and names")
    if (recipe.kind !== "smelting" && recipe.kind !== "smithing") errors.push(`${recipe.id} has an invalid recipe kind`)
    if (recipe.requiredBlacksmithingLevel < 1 || !Number.isInteger(recipe.requiredBlacksmithingLevel)) errors.push(`${recipe.id} has an invalid Blacksmithing requirement`)
    if (!itemById[recipe.outputItemId]) errors.push(`${recipe.id} references unknown output ${recipe.outputItemId}`)
    if (itemById[recipe.outputItemId]?.inventoryMode !== "instance" && recipe.kind === "smithing") errors.push(`${recipe.id} must output an instance-owned item`)
    if (itemById[recipe.outputItemId]?.inventoryMode !== "stackable" && recipe.kind === "smelting") errors.push(`${recipe.id} must output a stackable item`)
    if (!Number.isInteger(recipe.outputQuantity) || recipe.outputQuantity <= 0) errors.push(`${recipe.id} has invalid output quantity`)
    if (!Number.isFinite(recipe.baseDurationSeconds) || recipe.baseDurationSeconds <= 0) errors.push(`${recipe.id} has invalid duration`)
    if (!Number.isFinite(recipe.baseForgeStaminaCost) || recipe.baseForgeStaminaCost <= 0) errors.push(`${recipe.id} has invalid Forge Stamina cost`)
    if (!Number.isFinite(recipe.baseBlacksmithingXp) || recipe.baseBlacksmithingXp < 0) errors.push(`${recipe.id} has invalid XP`)
    for (const cost of recipe.costs) {
      const material = itemById[cost.itemId]
      if (!material || material.inventoryMode !== "stackable") errors.push(`${recipe.id} has an invalid stackable cost ${cost.itemId}`)
      if (!Number.isInteger(cost.quantity) || cost.quantity <= 0) errors.push(`${recipe.id} has invalid cost quantity`)
    }
    if (new Set(recipe.tags).size !== recipe.tags.length) errors.push(`${recipe.id} contains duplicate tags`)
    for (const tag of recipe.tags) if (!VALID_TAGS.has(tag)) errors.push(`${recipe.id} has invalid tag ${tag}`)
  }
  const ironBar = recipes.find((entry) => entry.id === "blacksmithing-recipe.iron-bar")
  if (!ironBar || ironBar.kind !== "smelting" || ironBar.outputItemId !== "item.iron-bar" || ironBar.outputQuantity !== 1 || ironBar.costs.length !== 1 || ironBar.costs[0].itemId !== "item.iron-ore" || ironBar.costs[0].quantity !== 5) errors.push("Iron Bar must be exactly 5 Iron Ore -> 1 Iron Bar")
  if (recipes.filter((entry) => entry.kind === "smelting").length !== 1) errors.push("V1 must contain exactly one Smelting recipe")
  if (recipes.filter((entry) => entry.kind === "smithing").length !== 14) errors.push("V1 must contain exactly fourteen Smithing recipes")
  return { valid: errors.length === 0, errors }
}

export function validateBlacksmithingPerks() {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const perk of blacksmithingPerks) {
    if (ids.has(perk.id)) errors.push(`Duplicate Blacksmithing perk ID ${perk.id}`)
    ids.add(perk.id)
    if (perk.skillId !== "blacksmithing") errors.push(`${perk.id} is not a Blacksmithing perk`)
    if (perk.costPerRank !== 1 || perk.maxRank < 1) errors.push(`${perk.id} has an invalid rank cost`)
    for (const rule of perk.prerequisiteRules) {
      if (rule.requirements.length === 0) errors.push(`${perk.id} has an empty prerequisite rule`)
      if (rule.mode === "any" && (!Number.isInteger(rule.minimumSatisfied) || (rule.minimumSatisfied ?? 0) < 1 || (rule.minimumSatisfied ?? 0) > rule.requirements.length)) errors.push(`${perk.id} has an invalid any-prerequisite threshold`)
      for (const requirement of rule.requirements) {
        const candidate = blacksmithingPerks.find((entry) => entry.id === requirement.perkId)
        if (!candidate) errors.push(`${perk.id} references unknown prerequisite ${requirement.perkId}`)
        else if (!Number.isInteger(requirement.requiredRank) || requirement.requiredRank < 1 || requirement.requiredRank > candidate.maxRank) errors.push(`${perk.id} has an invalid prerequisite rank for ${requirement.perkId}`)
      }
    }
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string) => {
    if (visiting.has(id)) { errors.push(`Cycle detected at ${id}`); return }
    if (visited.has(id)) return
    visiting.add(id)
    const perk = blacksmithingPerks.find((entry) => entry.id === id)
    for (const rule of perk?.prerequisiteRules ?? []) for (const requirement of rule.requirements) visit(requirement.perkId)
    visiting.delete(id)
    visited.add(id)
  }
  for (const perk of blacksmithingPerks) visit(perk.id)
  return { valid: errors.length === 0, errors }
}
