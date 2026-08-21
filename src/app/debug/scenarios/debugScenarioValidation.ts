import { combatLocationById } from "../../../game/data/world/combatLocations";
import { enemyById } from "../../../game/data/enemies";
import { itemById } from "../../../game/data/items";
import { perkById } from "../../../game/data/proficiencyPerks";
import { proficiencyById } from "../../../game/data/proficiencies";
import { normalizeSpellbook } from "../../../game/spellbook/spellbookLogic";
import { normalizeCombatAutomation } from "../../../game/automation/automationLogic";
import { instantiateCombatTarget } from "../../../game/combat/combatState";
import { createCombatPreviewContext } from "../../../game/combat/combatEngine";
import { normalizeEnemyAbilityCooldowns } from "../../../game/enemyAbilities/enemyAbilityRuntime";
import { normalizeCombatLocationId } from "../../../game/world/worldMigration";
import type { DebugScenarioSnapshot, DebugScenarioSnapshotV2 } from "./debugScenarioTypes";

export interface ScenarioValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeLegacyEnemy(value: Record<string, unknown>, encounterSequence: number, context: ReturnType<typeof createCombatPreviewContext>) {
  const enemyId = typeof value.enemyId === "string" ? value.enemyId : undefined;
  if (!enemyId || !enemyById[enemyId]) return null;
  const { actionCooldowns: _actionCooldowns, currentAction: _currentAction, ...legacyEnemy } = value;
  const fresh = instantiateCombatTarget(enemyId, encounterSequence);
  if (!fresh) return null;
  const normalized = {
    ...fresh,
    ...legacyEnemy,
    abilityCooldowns: isRecord(legacyEnemy.abilityCooldowns) ? legacyEnemy.abilityCooldowns : fresh.abilityCooldowns,
    abilityRuntime: isRecord(legacyEnemy.abilityRuntime) ? legacyEnemy.abilityRuntime : fresh.abilityRuntime,
    preparedAbility: isRecord(legacyEnemy.preparedAbility) ? legacyEnemy.preparedAbility : null,
    traitRuntime: isRecord(legacyEnemy.traitRuntime) ? legacyEnemy.traitRuntime : fresh.traitRuntime,
  };
  return { ...normalized, abilityCooldowns: normalizeEnemyAbilityCooldowns(normalized as NonNullable<typeof fresh>, enemyById[enemyId], context) };
}

function normalizeCombatSnapshot(value: Record<string, unknown>, context: ReturnType<typeof createCombatPreviewContext>) {
  const normalized = { ...value };
  const legacyEnemies = Array.isArray(value.enemies) ? value.enemies.filter(isRecord) : [];
  const sequence = typeof value.encounterSequence === "number" && Number.isFinite(value.encounterSequence)
    ? Math.max(0, Math.floor(value.encounterSequence))
    : typeof value.groupNumber === "number" && Number.isFinite(value.groupNumber)
      ? Math.max(0, Math.floor(value.groupNumber))
      : 0;
  const selectedInstanceId = typeof value.selectedEnemyInstanceId === "string" ? value.selectedEnemyInstanceId : undefined;
  const legacyEnemy = isRecord(value.enemy)
    ? value.enemy
    : legacyEnemies.find((candidate) => candidate.instanceId === selectedInstanceId) ?? legacyEnemies.find((candidate) => candidate.defeated !== true) ?? legacyEnemies[0];
  const enemy = legacyEnemy ? normalizeLegacyEnemy(legacyEnemy, sequence, context) : null;
  if (enemy) {
    normalized.enemy = enemy;
    normalized.targetEnemyId = typeof value.targetEnemyId === "string" ? value.targetEnemyId : enemy.enemyId;
  } else if (!isRecord(value.enemy)) {
    normalized.enemy = null;
  }
  normalized.encounterSequence = sequence;
  delete normalized.enemies;
  delete normalized.selectedEnemyInstanceId;
  delete normalized.groupNumber;
  delete normalized.enemyActionsStartedThisStep;
  return normalized;
}

export function validateDebugScenario(value: unknown): ScenarioValidationResult {
  const errors: string[] = [];
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2) || !isRecord(value.game) || !isRecord(value.world)) {
    return { valid: false, errors: ["Unsupported or malformed scenario version."] };
  }
  const game = value.game;
  const world = value.world;
  const normalizedLocationId = normalizeCombatLocationId(world.combatLocationId);
  if (!normalizedLocationId || !combatLocationById[normalizedLocationId]) errors.push(`Missing location: ${String(world.combatLocationId)}`);
  if (!isRecord(game.inventory) || !isRecord(game.equipment) || !isRecord(game.progression) || !isRecord(game.combat)) errors.push("Missing game setup data.");
  if (isRecord(game.inventory) && isRecord(game.inventory.stackables)) for (const id of Object.keys(game.inventory.stackables)) if (!itemById[id]) errors.push(`Missing item: ${id}`);
  if (isRecord(game.inventory) && isRecord(game.inventory.instances)) for (const [instanceId, instance] of Object.entries(game.inventory.instances)) if (!isRecord(instance) || !itemById[String(instance.definitionId)] || instanceId !== instance.id) errors.push(`Invalid item instance: ${instanceId}`);
  if (isRecord(game.combat) && isRecord(game.combat.enemy) && (typeof game.combat.enemy.enemyId !== "string" || !enemyById[game.combat.enemy.enemyId])) errors.push(`Missing enemy: ${String(game.combat.enemy.enemyId)}`);
  return { valid: errors.length === 0, errors };
}

export function normalizeDebugScenarioSnapshot(value: unknown): DebugScenarioSnapshotV2 | null {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2) || !isRecord(value.game) || !isRecord(value.world)) return null;
  const rawGame = value.game;
  const rawProgression = isRecord(rawGame.progression) ? rawGame.progression : {};
  const proficiencies = Object.fromEntries(Object.entries(isRecord(rawProgression.proficiencies) ? rawProgression.proficiencies : {}).filter(([id, progress]) => id !== "light-magic" && id !== "warding-magic" && Boolean(proficiencyById[id]) && isRecord(progress)));
  const purchasedPerks = Object.fromEntries(Object.entries(isRecord(rawProgression.purchasedPerks) ? rawProgression.purchasedPerks : {}).filter(([id, rank]) => Boolean(perkById[id]) && !id.includes("light-magic") && !id.includes("warding-magic") && typeof rank === "number"));
  const combatContext = createCombatPreviewContext();
  const combat = isRecord(rawGame.combat) ? normalizeCombatSnapshot(rawGame.combat, combatContext) : rawGame.combat;
  if (isRecord(combat)) {
    if (Array.isArray(combat.playerEffects)) combat.playerEffects = combat.playerEffects.filter((effect) => isRecord(effect) && effect.effectId !== "effect.protective-sign" && effect.effectId !== "effect.light-purity");
    if (isRecord(combat.enemy) && Array.isArray(combat.enemy.effects)) combat.enemy = { ...combat.enemy, effects: combat.enemy.effects.filter((effect) => isRecord(effect) && effect.effectId !== "effect.protective-sign" && effect.effectId !== "effect.light-purity") };
  }
  const rawWorld = value.world as DebugScenarioSnapshotV2["world"];
  return { version: 2, game: { ...rawGame, progression: { ...rawProgression, proficiencies, purchasedPerks }, spellbook: normalizeSpellbook(isRecord(rawGame.spellbook) ? rawGame.spellbook : undefined), combatAutomation: normalizeCombatAutomation(rawGame.combatAutomation), combat } as DebugScenarioSnapshotV2["game"], world: { ...rawWorld, combatLocationId: normalizeCombatLocationId(rawWorld.combatLocationId) ?? rawWorld.combatLocationId } };
}

export function isDebugScenarioSnapshot(value: unknown): value is DebugScenarioSnapshot {
  return validateDebugScenario(value).valid;
}
