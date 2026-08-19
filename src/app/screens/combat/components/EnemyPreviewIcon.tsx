import type { EnemyDefinition } from '../../../../game/combat/combatTypes'
import { PlaceholderArt } from '../../../components/PlaceholderArt'

export function EnemyPreviewIcon({ enemy }: { enemy: EnemyDefinition }) {
  return <PlaceholderArt icon={enemy.icon} variant={enemy.accent} size="small" />
}
