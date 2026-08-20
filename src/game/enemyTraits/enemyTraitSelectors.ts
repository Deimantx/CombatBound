import type { EnemyDefinition } from "../combat/combatTypes";
import type { EnemyTraitAssignment, EnemyTraitDefinition } from "./enemyTraitTypes";
import { enemyTraitById } from "../data/enemyTraits";

export interface ResolvedEnemyTrait {
  assignment: EnemyTraitAssignment;
  definition: EnemyTraitDefinition;
  rank: NonNullable<EnemyTraitDefinition["ranks"][number]>;
}

export function resolveEnemyTraitAssignment(assignment: EnemyTraitAssignment, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById): ResolvedEnemyTrait | null {
  const definition = definitions[assignment.traitId];
  const rank = definition?.ranks.find((candidate) => candidate.rank === assignment.rank);
  return definition && rank ? { assignment, definition, rank } : null;
}

export function getEnemyResolvedTraits(enemy: EnemyDefinition, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById): ResolvedEnemyTrait[] {
  return enemy.traits.map((assignment) => resolveEnemyTraitAssignment(assignment, definitions)).filter((trait): trait is ResolvedEnemyTrait => Boolean(trait));
}

export function getEnemyTraitDisplayName(assignment: EnemyTraitAssignment, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById) {
  return definitions[assignment.traitId]?.name ?? assignment.traitId;
}

export function getEnemyTraitRankDescription(assignment: EnemyTraitAssignment, definitions: Record<string, EnemyTraitDefinition> = enemyTraitById) {
  return definitions[assignment.traitId]?.ranks.find((rank) => rank.rank === assignment.rank)?.description ?? "Trait data unavailable.";
}
