import { itemById } from '../../../game/data/items'
import { combatLocationById } from '../../../game/data/world/combatLocations'
import { enemyFamilyById } from '../../../game/data/world/enemyFamilies'
import type { CombatLocationDefinition } from '../../../game/world/worldTypes'
import type { TooltipModel } from '../../components/tooltip/tooltipTypes'
import { enemyPresentation, type EnemyPresentation } from './enemyPresentation'

export interface CombatLocationPresentation {
  familyName: string
  enemies: Array<EnemyPresentation & { enemy: NonNullable<EnemyPresentation['enemy']> }>
  sharedLootNames: string[]
  recommendedHunterRankLabel: string
  groupSizeLabel: string
}

export function combatLocationPresentation(location: CombatLocationDefinition): CombatLocationPresentation {
  return {
    familyName: enemyFamilyById[location.familyId]?.name ?? 'Unknown Family',
    enemies: location.enemyPool.map((entry) => enemyPresentation(entry.enemyId)).filter((entry): entry is EnemyPresentation & { enemy: NonNullable<EnemyPresentation['enemy']> } => Boolean(entry.enemy)),
    sharedLootNames: location.sharedLoot?.map((drop) => itemById[drop.itemId]?.name ?? 'Unknown Item') ?? [],
    recommendedHunterRankLabel: `Hunter Rank ${location.recommendedHunterRank[0]}–${location.recommendedHunterRank[1]}`,
    groupSizeLabel: `${location.groupGeneration.minGroupSize}-${location.groupGeneration.maxGroupSize}`,
  }
}

export function combatArenaTooltipModel(locationId: string, status: string, active: boolean, selected: boolean): TooltipModel {
  const location = combatLocationById[locationId]
  if (!location) {
    return {
      id: `combat-arena:${locationId}`,
      icon: 'target',
      title: 'Unknown Arena',
      subtitle: status,
      tone: active ? 'green' : selected ? 'gold' : 'default',
      description: 'Combat arena details are unavailable.',
    }
  }

  const presentation = combatLocationPresentation(location)
  return {
    id: `combat-arena:${location.id}`,
    icon: 'target',
    title: location.name,
    subtitle: `${presentation.familyName} · ${status}`,
    tone: active ? 'green' : selected ? 'gold' : 'default',
    description: location.description,
    rows: [{ label: 'Recommended', value: presentation.recommendedHunterRankLabel, tone: 'gold' }],
    sections: [{ id: 'possible-enemies', title: 'POSSIBLE ENEMIES', notes: presentation.enemies.map((enemy) => enemy.name) }],
  }
}
