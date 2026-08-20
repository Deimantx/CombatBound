import { enemyById } from "../enemies";
import { enemyCombatAbilityDefinitions, enemyCombatAbilityById } from "../enemyCombatAbilities";
import { combatEffectById } from "../effects";
import type {
  EnemyCombatAbilityApplyEffectMechanic,
  EnemyCombatAbilityCondition,
  EnemyCombatAbilityDefinition,
  EnemyCombatAbilityMechanic,
} from "../../enemyAbilities/enemyAbilityTypes";

export interface EnemyCombatAbilityValidationResult {
  errors: string[];
  warnings: string[];
}

const enemyTiers = new Set(["normal", "elite", "boss"]);
const categories = new Set(["melee", "ranged", "fire", "cold", "lightning", "chaos", "ailment", "defensive", "healing", "conditional", "elite", "boss"]);
const targets = new Set(["player", "self"]);
const damageTypes = new Set(["physical", "fire", "cold", "lightning", "chaos"]);
const sourceCategories = new Set(["melee", "ranged", "magic"]);

export function validateEnemyCombatAbilities(): EnemyCombatAbilityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();

  for (const ability of enemyCombatAbilityDefinitions) {
    validateAbility(ability, ids, errors);
  }

  for (const enemy of Object.values(enemyById)) {
    for (const id of enemy.combatAbilityIds ?? []) {
      const ability = enemyCombatAbilityById[id];
      if (!ability) {
        errors.push(`${enemy.id}: unknown combat ability ${id}.`);
      } else if (!ability.allowedEnemyTiers.includes(enemy.enemyTier)) {
        errors.push(`${enemy.id}: ${id} is not allowed on ${enemy.enemyTier}.`);
      } else if (ability.mechanics.some((mechanic) => mechanic.type === "advance-phase") && !(enemy.phases ?? []).length) {
        warnings.push(`${enemy.id}: ${id} has no authored phases and will remain ineligible.`);
      }
    }
  }

  return { errors, warnings };
}

function validateAbility(ability: EnemyCombatAbilityDefinition, ids: Set<string>, errors: string[]) {
  if (ids.has(ability.id)) errors.push(`Duplicate ability ID: ${ability.id}.`);
  ids.add(ability.id);
  if (!ability.id.startsWith("enemy-ability.")) errors.push(`${ability.id}: ID must use the enemy-ability namespace.`);
  if (!ability.name.trim()) errors.push(`${ability.id}: name must not be empty.`);
  if (!ability.description.trim()) errors.push(`${ability.id}: description must not be empty.`);
  if (!categories.has(ability.category)) errors.push(`${ability.id}: invalid category ${ability.category}.`);
  if (!targets.has(ability.target)) errors.push(`${ability.id}: invalid target ${ability.target}.`);
  if (!finiteNonNegative(ability.cooldownSeconds)) errors.push(`${ability.id}: cooldown must be finite and non-negative.`);
  if (ability.weight !== undefined && !finiteNonNegative(ability.weight)) errors.push(`${ability.id}: weight must be finite and non-negative.`);
  if (ability.usageLimitPerFight !== undefined && (!Number.isInteger(ability.usageLimitPerFight) || ability.usageLimitPerFight < 1)) {
    errors.push(`${ability.id}: usageLimitPerFight must be a positive integer.`);
  }
  for (const tier of ability.allowedEnemyTiers) {
    if (!enemyTiers.has(tier)) errors.push(`${ability.id}: invalid enemy tier ${tier}.`);
  }
  if (!ability.draft && ability.mechanics.length === 0) errors.push(`${ability.id}: non-draft ability has no mechanics.`);
  for (const condition of ability.conditions ?? []) validateCondition(ability.id, condition, errors);
  for (const mechanic of ability.mechanics) validateMechanic(ability.id, mechanic, errors);
}

function validateCondition(abilityId: string, condition: EnemyCombatAbilityCondition, errors: string[]) {
  if ("fraction" in condition && !finiteFraction(condition.fraction)) errors.push(`${abilityId}: condition fraction must be between 0 and 1.`);
  if (condition.type === "player-has-effect-id" || condition.type === "self-has-effect-id" || condition.type === "self-missing-effect-id") {
    if (!combatEffectById[condition.effectId]) errors.push(`${abilityId}: unknown condition effect ${condition.effectId}.`);
  }
  if (condition.type === "once-per-fight-not-used" && condition.abilityId && !enemyCombatAbilityById[condition.abilityId]) {
    errors.push(`${abilityId}: unknown once-per-fight ability ${condition.abilityId}.`);
  }
}

function validateMechanic(abilityId: string, mechanic: EnemyCombatAbilityMechanic, errors: string[]) {
  switch (mechanic.type) {
    case "damage":
      if (!sourceCategories.has(mechanic.sourceCategory)) errors.push(`${abilityId}: invalid damage source category.`);
      if (!damageTypes.has(mechanic.damageType)) errors.push(`${abilityId}: invalid damage type.`);
      if (!finiteNonNegative(mechanic.attackDamageMultiplier)) errors.push(`${abilityId}: damage multiplier must be finite and non-negative.`);
      if (mechanic.accuracyMultiplier !== undefined && !finiteNonNegative(mechanic.accuracyMultiplier)) errors.push(`${abilityId}: accuracy multiplier must be finite and non-negative.`);
      if (mechanic.flatCriticalChanceBonus !== undefined && !finiteFraction(mechanic.flatCriticalChanceBonus)) errors.push(`${abilityId}: critical chance bonus must be between 0 and 1.`);
      if (mechanic.armourPenetrationPercent !== undefined && !finiteFraction(mechanic.armourPenetrationPercent)) errors.push(`${abilityId}: armour penetration must be between 0 and 1.`);
      if (mechanic.targetBlockEffectMultiplier !== undefined && !finiteNonNegative(mechanic.targetBlockEffectMultiplier)) errors.push(`${abilityId}: block effect multiplier must be finite and non-negative.`);
      if (mechanic.conditionalMultiplierOverride) {
        validateCondition(abilityId, mechanic.conditionalMultiplierOverride.condition, errors);
        if (!finiteNonNegative(mechanic.conditionalMultiplierOverride.attackDamageMultiplier)) errors.push(`${abilityId}: conditional damage multiplier must be finite and non-negative.`);
      }
      for (const effect of mechanic.onHitEffects ?? []) validateApplyEffect(abilityId, effect, errors);
      break;
    case "multi-hit":
      if (!Number.isInteger(mechanic.hits) || mechanic.hits < 1) errors.push(`${abilityId}: multi-hit count must be a positive integer.`);
      validateMechanic(abilityId, mechanic.hit, errors);
      for (const effect of mechanic.perHitEffects ?? []) validateApplyEffect(abilityId, effect, errors);
      break;
    case "apply-effect":
      validateApplyEffect(abilityId, mechanic, errors);
      break;
    case "barrier":
      if (!finiteFraction(mechanic.maxHpFraction)) errors.push(`${abilityId}: barrier max HP fraction must be between 0 and 1.`);
      break;
    case "heal-self":
      if (!finiteFraction(mechanic.maxHpFraction)) errors.push(`${abilityId}: heal max HP fraction must be between 0 and 1.`);
      break;
    case "damage-based-heal":
      if (!finiteFraction(mechanic.fraction)) errors.push(`${abilityId}: damage-based heal fraction must be between 0 and 1.`);
      break;
    case "ability-stat-effect":
      if (!combatEffectById[mechanic.effectId]) errors.push(`${abilityId}: unknown self effect ${mechanic.effectId}.`);
      break;
    case "advance-phase":
      // A catalogue entry may be authored before a boss phase table is
      // assigned. Runtime eligibility still requires a real next phase.
      break;
  }
}

function validateApplyEffect(abilityId: string, mechanic: EnemyCombatAbilityApplyEffectMechanic, errors: string[]) {
  if (!combatEffectById[mechanic.effectId]) errors.push(`${abilityId}: unknown effect ${mechanic.effectId}.`);
  if (!targets.has(mechanic.target)) errors.push(`${abilityId}: invalid effect target ${mechanic.target}.`);
  if (!finiteFraction(mechanic.chance)) errors.push(`${abilityId}: effect chance must be between 0 and 1.`);
  if (mechanic.stacks !== undefined && (!Number.isInteger(mechanic.stacks) || mechanic.stacks < 1)) errors.push(`${abilityId}: effect stacks must be a positive integer.`);
  if (mechanic.durationMultiplier !== undefined && !finiteNonNegative(mechanic.durationMultiplier)) errors.push(`${abilityId}: duration multiplier must be finite and non-negative.`);
  if (mechanic.durationOverrideSeconds !== undefined && !finiteNonNegative(mechanic.durationOverrideSeconds)) errors.push(`${abilityId}: duration override must be finite and non-negative.`);
  if (mechanic.magnitudeMultiplier !== undefined && !finiteNonNegative(mechanic.magnitudeMultiplier)) errors.push(`${abilityId}: magnitude multiplier must be finite and non-negative.`);
}

function finiteNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

function finiteFraction(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}
