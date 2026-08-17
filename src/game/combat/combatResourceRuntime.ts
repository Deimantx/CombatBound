import { techniqueDefinitions } from "../data/techniques";
import { perkById } from "../data/proficiencyPerks";
import { getTechniqueStaminaDrainMultiplier } from "../progression/perkProgression";
import { getPlayerStats } from "./combatRuntime";
import type { CombatContext, CombatState, TechniqueId } from "./combatTypes";
import type { ProgressionState, WeaponProficiencyId } from "../progression/progressionTypes";
import type { HunterCombatStats } from "../equipment/derivedStats";

export function calculateStaminaDelta(
  combat: CombatState,
  stats: HunterCombatStats,
  context: CombatContext,
  progression: ProgressionState,
  weaponProficiencyId: WeaponProficiencyId | null,
) {
  const drain = Object.entries(combat.techniques).reduce(
    (sum, [id, active]) => sum + (active ? techniqueDefinitions[id as TechniqueId].staminaDrainPerSecond : 0),
    0,
  );
  return getPlayerStats(combat, stats, context, progression).staminaRegen -
    drain * getTechniqueStaminaDrainMultiplier(progression, weaponProficiencyId, perkById);
}
