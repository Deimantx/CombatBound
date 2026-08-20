import type { EnemyTraitAssignment } from "./enemyTraitTypes";
import { getEnemyTraitDisplayName, getEnemyTraitRankDescription } from "./enemyTraitSelectors";

export function formatEnemyTrait(assignment: EnemyTraitAssignment) {
  return `${getEnemyTraitDisplayName(assignment)} · Rank ${assignment.rank}`;
}

export function formatEnemyTraitDescription(assignment: EnemyTraitAssignment) {
  return getEnemyTraitRankDescription(assignment);
}
