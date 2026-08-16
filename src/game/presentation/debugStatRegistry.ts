import type { CombatStatKey, DamageType } from "../combat/combatTypes";
import { COMBAT_STAT_REGISTRY } from "./combatStatRegistry";

export type ResistanceDamageType = Exclude<DamageType, "physical">;
export type DebugStatInspectionId = CombatStatKey | `resistance:${ResistanceDamageType}`;
export type DebugStatCategory = "offense" | "defense" | "resources" | "resistances";
export type DebugStatFormat = "number" | "percent" | "seconds" | "per-second";

export interface DebugStatDefinition {
  id: DebugStatInspectionId;
  label: string;
  category: DebugStatCategory;
  format: DebugStatFormat;
  description: string;
}

export const COMBAT_STAT_KEYS: CombatStatKey[] = COMBAT_STAT_REGISTRY.map((entry) => entry.id);
export const RESISTANCE_DAMAGE_TYPES: ResistanceDamageType[] = ["fire", "cold", "lightning", "chaos"];

const registryDefinitions: DebugStatDefinition[] = COMBAT_STAT_REGISTRY.map((entry) => ({ id: entry.id, label: entry.label, category: entry.category, format: entry.format, description: entry.description }));
const resistanceDefinitions: DebugStatDefinition[] = RESISTANCE_DAMAGE_TYPES.map((id) => ({ id: `resistance:${id}`, label: `${id[0].toUpperCase()}${id.slice(1)} Resistance (effective)`, category: "resistances", format: "percent", description: `Current effective ${id} damage resistance after maximum, Exposure, and penetration.` }));

export const DEBUG_STAT_DEFINITIONS: DebugStatDefinition[] = [...registryDefinitions, ...resistanceDefinitions];

export const DEBUG_STAT_DEFINITION_BY_ID = Object.fromEntries(DEBUG_STAT_DEFINITIONS.map((definition) => [definition.id, definition])) as Record<DebugStatInspectionId, DebugStatDefinition>;
