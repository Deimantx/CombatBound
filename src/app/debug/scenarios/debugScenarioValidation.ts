import { combatLocationById } from "../../../game/data/world/combatLocations";
import { enemyById } from "../../../game/data/enemies";
import { itemById } from "../../../game/data/items";
import { perkById } from "../../../game/data/proficiencyPerks";
import { proficiencyById } from "../../../game/data/proficiencies";
import { normalizeSpellbook } from "../../../game/spellbook/spellbookLogic";
import { normalizeCombatAutomation } from "../../../game/automation/automationLogic";
import type { DebugScenarioSnapshot, DebugScenarioSnapshotV2 } from "./debugScenarioTypes";

export interface ScenarioValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function validateDebugScenario(value: unknown): ScenarioValidationResult {
  const errors: string[] = [];
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2) || !isRecord(value.game) || !isRecord(value.world)) {
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

export function normalizeDebugScenarioSnapshot(value: unknown): DebugScenarioSnapshotV2 | null {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2) || !isRecord(value.game) || !isRecord(value.world)) return null;
  const rawGame = value.game;
  const rawProgression = isRecord(rawGame.progression) ? rawGame.progression : {};
  const proficiencies = Object.fromEntries(Object.entries(isRecord(rawProgression.proficiencies) ? rawProgression.proficiencies : {}).filter(([id, progress]) => id !== "light-magic" && id !== "warding-magic" && Boolean(proficiencyById[id]) && isRecord(progress)));
  const purchasedPerks = Object.fromEntries(Object.entries(isRecord(rawProgression.purchasedPerks) ? rawProgression.purchasedPerks : {}).filter(([id, rank]) => Boolean(perkById[id]) && !id.includes("light-magic") && !id.includes("warding-magic") && typeof rank === "number"));
  const combat = isRecord(rawGame.combat) ? { ...rawGame.combat } : rawGame.combat;
  if (isRecord(combat)) {
    if (Array.isArray(combat.playerEffects)) combat.playerEffects = combat.playerEffects.filter((effect) => isRecord(effect) && effect.effectId !== "effect.protective-sign" && effect.effectId !== "effect.light-purity");
    if (Array.isArray(combat.enemies)) combat.enemies = combat.enemies.map((enemy) => isRecord(enemy) && Array.isArray(enemy.effects) ? { ...enemy, effects: enemy.effects.filter((effect) => isRecord(effect) && effect.effectId !== "effect.protective-sign" && effect.effectId !== "effect.light-purity") } : enemy);
  }
  return { version: 2, game: { ...rawGame, progression: { ...rawProgression, proficiencies, purchasedPerks }, spellbook: normalizeSpellbook(isRecord(rawGame.spellbook) ? rawGame.spellbook : undefined), combatAutomation: normalizeCombatAutomation(rawGame.combatAutomation), combat } as DebugScenarioSnapshotV2["game"], world: value.world as DebugScenarioSnapshotV2["world"] };
}

export function isDebugScenarioSnapshot(value: unknown): value is DebugScenarioSnapshot {
  return validateDebugScenario(value).valid;
}
