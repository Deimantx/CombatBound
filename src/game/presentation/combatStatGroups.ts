import type { CombatReferenceCategory } from "../data/combatGlossary";
import { COMBAT_STAT_REGISTRY } from "./combatStatRegistry";

/**
 * The single presentation catalogue for the combat stats shown by Hero and
 * other build-facing consumers. The values themselves still come from the
 * canonical combat stat pipeline.
 */
const summaryGroups = ["offense", "defense", "resources", "resistances"] as const;
export const combatStatGroups = summaryGroups.map((id) => ({
  id,
  title: id === "resources" ? "RESOURCES & REGEN" : id.toUpperCase(),
  keys: COMBAT_STAT_REGISTRY.filter((entry) => entry.summaryGroup === id).map((entry) => entry.id),
})) satisfies ReadonlyArray<{
  id: CombatReferenceCategory;
  title: string;
  keys: readonly string[];
}>;

export type CombatStatGroup = (typeof combatStatGroups)[number];
export type CombatStatGroupId = CombatStatGroup["id"];
