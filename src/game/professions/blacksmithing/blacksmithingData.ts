import type { BlacksmithingState } from "./blacksmithingTypes"
import { ironBarRecipe } from "./blacksmithingRecipes"

export const BASE_MAX_FORGE_STAMINA = 100
export const BASE_FORGE_REST_DURATION_SECONDS = 10

export function createInitialBlacksmithingState(): BlacksmithingState {
  return {
    active: false,
    mode: "idle",
    activityKind: null,
    selectedSmeltingRecipeId: ironBarRecipe.id,
    selectedSmithingRecipeId: "blacksmithing-recipe.iron-dagger",
    activeOperation: null,
    queueMode: "fixed",
    queuedOperationsRemaining: 0,
    forgeStamina: BASE_MAX_FORGE_STAMINA,
    actionTimerRemaining: 0,
    restTimerRemaining: 0,
    completedOperations: 0,
    completedSmelts: 0,
    completedSmiths: 0,
  }
}
