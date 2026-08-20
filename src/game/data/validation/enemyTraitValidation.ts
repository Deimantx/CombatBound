import { effectById } from "../effects";
import { enemyTraitDefinitions, enemyTraitById } from "../enemyTraits";
import { COMBAT_STAT_REGISTRY } from "../../presentation/combatStatRegistry";
import type { EnemyDefinition } from "../../combat/combatTypes";
import { COMBAT_SOURCE_CATEGORIES, ENEMY_TRAIT_CATEGORIES, ENEMY_TIERS, type EnemyTraitDefinition, type EnemyTraitMechanic, type EnemyTraitAssignment, type EnemyTier } from "../../enemyTraits/enemyTraitTypes";

export interface EnemyTraitValidationResult {
  errors: string[];
  warnings: string[];
}

const statKeys = new Set(COMBAT_STAT_REGISTRY.map((entry) => entry.id));
const groupWords = /ally|allies|all-enem|random-enem|living-enemy|group-size|pack-size/i;
const add = (result: EnemyTraitValidationResult, message: string) => result.errors.push(message);
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);

function validateMechanic(mechanic: EnemyTraitMechanic, trait: EnemyTraitDefinition, result: EnemyTraitValidationResult, effectDefinitions: Record<string, unknown>) {
  const candidate = mechanic as unknown as Record<string, unknown>;
  for (const value of Object.values(candidate)) if (typeof value === "string" && groupWords.test(value)) add(result, `${trait.id}: group/ally mechanic is forbidden (${value}).`);
  if (typeof candidate.sourceCategory === "string" && !COMBAT_SOURCE_CATEGORIES.includes(candidate.sourceCategory as never)) add(result, `${trait.id}: invalid source category.`);
  if (mechanic.type === "stat-modifier" || mechanic.type === "conditional-stat-modifier" || mechanic.type === "linear-hp-stat-scaling" || mechanic.type === "timed-stat-modifier" || mechanic.type === "stack-stat-modifier" || mechanic.type === "phase-stack" || mechanic.type === "fight-stack") {
    const modifiers = "modifiers" in mechanic ? mechanic.modifiers : "perStack" in mechanic ? mechanic.perStack : [];
    for (const modifier of modifiers) {
      if (!statKeys.has(modifier.stat)) add(result, `${trait.id}: unknown stat key ${modifier.stat}.`);
      if (!finite(modifier.value)) add(result, `${trait.id}: non-finite stat modifier.`);
    }
  }
  if (mechanic.type === "effect-proc") {
    if (!effectDefinitions[mechanic.effectId]) add(result, `${trait.id}: unknown Effect ID ${mechanic.effectId}.`);
    if (!finite(mechanic.chance) || mechanic.chance < 0 || mechanic.chance > 1) add(result, `${trait.id}: effect chance must be between 0 and 1.`);
    if (mechanic.stacks !== undefined && (!Number.isInteger(mechanic.stacks) || mechanic.stacks < 1)) add(result, `${trait.id}: effect stacks must be a positive integer.`);
  }
  if (mechanic.type === "outgoing-damage-modifier" || mechanic.type === "incoming-damage-modifier") {
    if (!finite(mechanic.value) || mechanic.value < 0 || mechanic.value > 1) add(result, `${trait.id}: damage modifier must be a fraction between 0 and 1.`);
  }
  if (mechanic.type === "critical-damage-resistance") {
    if (!finite(mechanic.perStack) || !finite(mechanic.cap) || mechanic.perStack < 0 || mechanic.cap < 0 || mechanic.perStack > mechanic.cap || mechanic.cap > 1) add(result, `${trait.id}: invalid Critical Damage Resistance.`);
  }
  if (mechanic.type === "linear-hp-stat-scaling" && (!finite(mechanic.maxBonus) || !finite(mechanic.fullEffectAtHpFraction) || mechanic.fullEffectAtHpFraction < 0 || mechanic.fullEffectAtHpFraction > 1)) add(result, `${trait.id}: invalid HP scaling values.`);
  if (mechanic.type === "threshold-heal" || mechanic.type === "threshold-barrier" || mechanic.type === "threshold-timed-stat-modifier" || mechanic.type === "lethal-intercept" || mechanic.type === "action-cooldown-below-threshold") {
    const threshold = mechanic.threshold;
    if (!finite(threshold) || (threshold ?? 0) < 0 || (threshold ?? 0) > 1) add(result, `${trait.id}: invalid HP threshold.`);
    if ("durationSeconds" in mechanic && mechanic.durationSeconds !== undefined && (!finite(mechanic.durationSeconds) || mechanic.durationSeconds < 0)) add(result, `${trait.id}: invalid duration.`);
    if ("healFraction" in mechanic && mechanic.healFraction !== undefined && (!finite(mechanic.healFraction) || mechanic.healFraction < 0 || mechanic.healFraction > 1)) add(result, `${trait.id}: invalid healing fraction.`);
    if ("barrierFraction" in mechanic && mechanic.barrierFraction !== undefined && (!finite(mechanic.barrierFraction) || mechanic.barrierFraction < 0 || mechanic.barrierFraction > 1)) add(result, `${trait.id}: invalid barrier fraction.`);
  }
  if (mechanic.type === "timed-stat-modifier" && (!finite(mechanic.durationSeconds) || mechanic.durationSeconds < 0)) add(result, `${trait.id}: invalid duration.`);
  if (mechanic.type === "action-cooldown-on-normal-hit" || mechanic.type === "action-cooldown-on-action-hit" || mechanic.type === "action-cooldown-on-action-use" || mechanic.type === "action-cooldown-below-threshold" || mechanic.type === "action-cooldown-static") if (!finite(mechanic.value) || mechanic.value < 0 || mechanic.value > 1) add(result, `${trait.id}: invalid cooldown percentage.`);
  if (mechanic.type === "action-cooldown-on-action-use" && mechanic.cap !== undefined && (!finite(mechanic.cap) || mechanic.cap < 0 || mechanic.cap > 1)) add(result, `${trait.id}: invalid cooldown cap.`);
  if (mechanic.type === "stack-stat-modifier" && (!Number.isInteger(mechanic.maxStacks) || mechanic.maxStacks < 0)) add(result, `${trait.id}: invalid stack cap.`);
  if (mechanic.type === "fight-stack" && (!finite(mechanic.intervalSeconds) || mechanic.intervalSeconds <= 0 || !Number.isInteger(mechanic.maxStacks) || mechanic.maxStacks < 0)) add(result, `${trait.id}: invalid fight stack timing or cap.`);
  if (mechanic.type === "action-damage-modifier" && (!finite(mechanic.value) || mechanic.value < 0)) add(result, `${trait.id}: invalid action damage modifier.`);
  if (mechanic.type === "effect-duration-modifier") { const value = mechanic.value; if (!finite(value) || (value ?? 0) < 0 || (value ?? 0) > 1) add(result, `${trait.id}: invalid duration multiplier.`); }
}

export function validateEnemyTraitDefinitions(definitions: readonly EnemyTraitDefinition[] = enemyTraitDefinitions, effectDefinitions: Record<string, unknown> = effectById): EnemyTraitValidationResult {
  const result: EnemyTraitValidationResult = { errors: [], warnings: [] };
  const ids = new Set<string>();
  for (const trait of definitions) {
    if (!trait.id || !trait.id.trim()) add(result, "Trait has a blank ID.");
    if (ids.has(trait.id)) add(result, `Duplicate Trait ID ${trait.id}.`);
    ids.add(trait.id);
    if (!trait.id.startsWith("trait.")) add(result, `${trait.id}: ID must start with trait.`);
    if (!trait.name?.trim()) add(result, `${trait.id}: missing name.`);
    if (!ENEMY_TRAIT_CATEGORIES.includes(trait.category)) add(result, `${trait.id}: invalid category.`);
    if (!trait.allowedEnemyTiers.length || trait.allowedEnemyTiers.some((tier) => !ENEMY_TIERS.includes(tier))) add(result, `${trait.id}: invalid allowed enemy tier.`);
    if (!trait.ranks.length) add(result, `${trait.id}: no ranks.`);
    const rankIds = new Set<number>();
    for (const rank of trait.ranks) {
      if (rankIds.has(rank.rank)) add(result, `${trait.id}: duplicate rank ${rank.rank}.`);
      rankIds.add(rank.rank);
      if (![1, 2, 3].includes(rank.rank)) add(result, `${trait.id}: rank outside 1-3.`);
      for (const mechanic of rank.mechanics) validateMechanic(mechanic, trait, result, effectDefinitions);
    }
    if (trait.maxRank !== Math.max(...trait.ranks.map((rank) => rank.rank))) add(result, `${trait.id}: maxRank is inconsistent with authored ranks.`);
    if (trait.maxRank === 1 && trait.ranks.some((rank) => rank.rank !== 1)) add(result, `${trait.id}: Rank 2/3 present on a Rank 1 Trait.`);
  }
  return result;
}

export function validateEnemyTraitAssignments(enemy: Pick<EnemyDefinition, "id" | "enemyTier" | "traits"> | { id: string; enemyTier: unknown; traits: readonly EnemyTraitAssignment[] }, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById): EnemyTraitValidationResult {
  const result: EnemyTraitValidationResult = { errors: [], warnings: [] };
  const tier = enemy.enemyTier as EnemyTier;
  if (!ENEMY_TIERS.includes(tier)) add(result, `${enemy.id}: invalid enemy tier.`);
  const seen = new Set<string>();
  for (const assignment of enemy.traits) {
    if (!assignment || typeof assignment.traitId !== "string") { add(result, `${enemy.id}: missing Trait ID.`); continue; }
    if (seen.has(assignment.traitId)) add(result, `${enemy.id}: duplicate Trait assignment ${assignment.traitId}.`);
    seen.add(assignment.traitId);
    const trait = definitions[assignment.traitId];
    if (!trait) { add(result, `${enemy.id}: unknown Trait ID ${assignment.traitId}.`); continue; }
    if (!Number.isInteger(assignment.rank)) add(result, `${enemy.id}: missing or invalid rank for ${assignment.traitId}.`);
    else if (assignment.rank < 1 || assignment.rank > 3) add(result, `${enemy.id}: invalid rank for ${assignment.traitId}.`);
    else if (assignment.rank > trait.maxRank) add(result, `${enemy.id}: ${assignment.traitId} exceeds max rank.`);
    if (!trait.allowedEnemyTiers.includes(tier)) add(result, `${enemy.id}: ${assignment.traitId} is not allowed on ${tier}.`);
  }
  return result;
}
