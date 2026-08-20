import { enemyById } from "../enemies";
import { enemyCombatAbilityDefinitions, enemyCombatAbilityById } from "../enemyCombatAbilities";
import { effectById } from "../effects";
import { enemyAbilityEffectById } from "../enemyAbilityEffects";
import type { EnemyCombatAbilityDefinition } from "../../enemyAbilities/enemyAbilityTypes";

export interface EnemyCombatAbilityValidationResult { errors: string[]; warnings: string[] }

export function validateEnemyCombatAbilities(): EnemyCombatAbilityValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();
  if (enemyCombatAbilityDefinitions.length !== 60) errors.push(`Expected exactly 60 authored abilities, found ${enemyCombatAbilityDefinitions.length}.`);
  for (const ability of enemyCombatAbilityDefinitions) {
    if (ids.has(ability.id)) errors.push(`Duplicate ability ID: ${ability.id}.`);
    ids.add(ability.id);
    if (!ability.id.startsWith("enemy-ability.")) errors.push(`Invalid ability ID: ${ability.id}.`);
    if (ability.cooldownSeconds < 0) errors.push(`${ability.id}: cooldown must be non-negative.`);
    if (ability.mechanics.length === 0 && !ability.draft) errors.push(`${ability.id}: non-draft ability has no mechanics.`);
    validateMechanics(ability, errors);
  }
  for (const enemy of Object.values(enemyById)) for (const id of enemy.combatAbilityIds ?? []) {
    const ability = enemyCombatAbilityById[id];
    if (!ability) errors.push(`${enemy.id}: unknown combat ability ${id}.`);
    else if (!ability.allowedEnemyTiers.includes(enemy.enemyTier)) errors.push(`${enemy.id}: ${id} is not allowed on ${enemy.enemyTier}.`);
  }
  return { errors, warnings: [] };
}

function validateMechanics(ability: EnemyCombatAbilityDefinition, errors: string[]) {
  const effects = { ...effectById, ...enemyAbilityEffectById };
  for (const mechanic of ability.mechanics) {
    if (mechanic.type === "apply-effect" && !effects[mechanic.effectId]) errors.push(`${ability.id}: unknown effect ${mechanic.effectId}.`);
    if (mechanic.type === "ability-stat-effect" && !effects[mechanic.effectId]) errors.push(`${ability.id}: unknown self effect ${mechanic.effectId}.`);
    if (mechanic.type === "multi-hit" && mechanic.hits < 1) errors.push(`${ability.id}: multi-hit count must be positive.`);
  }
}
