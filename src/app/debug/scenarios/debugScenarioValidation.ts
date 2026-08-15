import { combatLocationById } from "../../../game/data/world/combatLocations";
import { enemyById } from "../../../game/data/enemies";
import { itemById } from "../../../game/data/items";
import type { DebugScenarioSnapshotV1 } from "./debugScenarioTypes";

export interface ScenarioValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateDebugScenario(value: unknown): ScenarioValidationResult {
  const errors: string[] = [];
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.game) || !isRecord(value.world)) {
    return { valid: false, errors: ["Unsupported or malformed scenario version."] };
  }
  const game = value.game;
  const world = value.world;
  if (typeof world.combatLocationId !== "string" || !combatLocationById[world.combatLocationId]) errors.push(`Missing location: ${String(world.combatLocationId)}`);
  if (!isRecord(game.inventory) || !isRecord(game.equipment) || !isRecord(game.progression) || !isRecord(game.combat)) errors.push("Missing game setup data.");
  if (isRecord(game.inventory) && isRecord(game.inventory.quantities)) for (const id of Object.keys(game.inventory.quantities)) if (!itemById[id]) errors.push(`Missing item: ${id}`);
  if (isRecord(game.combat) && Array.isArray(game.combat.enemies)) for (const enemy of game.combat.enemies) if (isRecord(enemy) && (typeof enemy.enemyId !== "string" || !enemyById[enemy.enemyId])) errors.push(`Missing enemy: ${String(isRecord(enemy) ? enemy.enemyId : enemy)}`);
  return { valid: errors.length === 0, errors };
}

export function isDebugScenarioSnapshot(value: unknown): value is DebugScenarioSnapshotV1 {
  return validateDebugScenario(value).valid;
}
