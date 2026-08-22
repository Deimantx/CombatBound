import { itemById } from "../../data/items"
import type { BlacksmithingRecipeDefinition, BlacksmithingRecipeId } from "./blacksmithingTypes"

const recipe = (
  id: BlacksmithingRecipeId,
  name: string,
  kind: "smelting" | "smithing",
  requiredBlacksmithingLevel: number,
  bars: number,
  duration: number,
  stamina: number,
  xp: number,
  outputItemId: string,
  tags: BlacksmithingRecipeDefinition["tags"],
): BlacksmithingRecipeDefinition => ({
  id, name, kind, requiredBlacksmithingLevel,
  costs: [{ itemId: kind === "smelting" ? "item.iron-ore" : "item.iron-bar", quantity: bars }],
  outputItemId, outputQuantity: 1, baseDurationSeconds: duration, baseForgeStaminaCost: stamina, baseBlacksmithingXp: xp, tags,
})

export const ironBarRecipe = recipe("blacksmithing-recipe.iron-bar", "Iron Bar", "smelting", 1, 5, 4, 3, 2, "item.iron-bar", ["iron", "smelting"])

export const blacksmithingSmithingRecipes: BlacksmithingRecipeDefinition[] = [
  recipe("blacksmithing-recipe.iron-dagger", "Iron Dagger", "smithing", 2, 2, 5, 5, 4, "item.iron-dagger", ["iron", "weapon"]),
  recipe("blacksmithing-recipe.iron-sword", "Iron Sword", "smithing", 3, 4, 8, 7, 8, "item.iron-sword", ["iron", "weapon"]),
  recipe("blacksmithing-recipe.iron-gloves", "Iron Gloves", "smithing", 4, 3, 7, 6, 6, "item.iron-gloves", ["iron", "defensive"]),
  recipe("blacksmithing-recipe.iron-boots", "Iron Boots", "smithing", 5, 3, 7, 6, 6, "item.iron-boots", ["iron", "defensive"]),
  recipe("blacksmithing-recipe.iron-helmet", "Iron Helmet", "smithing", 6, 4, 8, 7, 8, "item.iron-helmet", ["iron", "defensive"]),
  recipe("blacksmithing-recipe.iron-axe", "Iron Axe", "smithing", 7, 5, 9, 8, 10, "item.iron-axe", ["iron", "weapon"]),
  recipe("blacksmithing-recipe.iron-mace", "Iron Mace", "smithing", 8, 5, 9, 8, 10, "item.iron-mace", ["iron", "weapon"]),
  recipe("blacksmithing-recipe.iron-spear", "Iron Spear", "smithing", 9, 5, 10, 8, 10, "item.iron-spear", ["iron", "weapon"]),
  recipe("blacksmithing-recipe.iron-shield", "Iron Shield", "smithing", 10, 5, 10, 8, 10, "item.iron-shield", ["iron", "defensive", "shield"]),
  recipe("blacksmithing-recipe.iron-pickaxe", "Iron Pickaxe", "smithing", 10, 4, 10, 8, 12, "item.iron-pickaxe", ["iron", "tool"]),
  recipe("blacksmithing-recipe.iron-armor", "Iron Armor", "smithing", 12, 8, 14, 10, 16, "item.iron-armor", ["iron", "defensive"]),
  recipe("blacksmithing-recipe.iron-greatsword", "Iron Greatsword", "smithing", 14, 8, 15, 10, 18, "item.iron-greatsword", ["iron", "weapon"]),
  recipe("blacksmithing-recipe.iron-great-axe", "Iron Great Axe", "smithing", 16, 9, 16, 11, 20, "item.iron-great-axe", ["iron", "weapon"]),
  recipe("blacksmithing-recipe.iron-warhammer", "Iron Warhammer", "smithing", 18, 10, 18, 12, 22, "item.iron-warhammer", ["iron", "weapon"]),
]

export const blacksmithingRecipes: BlacksmithingRecipeDefinition[] = [ironBarRecipe, ...blacksmithingSmithingRecipes]
export const blacksmithingRecipeById = Object.fromEntries(blacksmithingRecipes.map((entry) => [entry.id, entry])) as Record<string, BlacksmithingRecipeDefinition>

export function getBlacksmithingRecipe(recipeId: string) { return blacksmithingRecipeById[recipeId] }
export function ownedRecipeOutputExists(recipeDefinition: BlacksmithingRecipeDefinition) { return Boolean(itemById[recipeDefinition.outputItemId]) }
