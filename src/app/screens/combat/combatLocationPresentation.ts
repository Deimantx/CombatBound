import { itemById } from '../../../game/data/items'
import { combatLocationById } from '../../../game/data/world/combatLocations'
import { enemyById } from '../../../game/data/enemies'
import { enemyFamilyById } from '../../../game/data/world/enemyFamilies'
import type { CombatLocationDefinition } from '../../../game/world/worldTypes'
import type { TooltipModel } from '../../components/tooltip/tooltipTypes'

export interface CombatLocationPresentation {
  familyName: string
  enemyNames: string[]
  sharedLootNames: string[]
  recommendedMasteryLabel: string
  groupSizeLabel: string
}

export function combatLocationPresentation(location: CombatLocationDefinition): CombatLocationPresentation {
  return {
    familyName: enemyFamilyById[location.familyId]?.name ?? 'Unknown Family',
    enemyNames: location.enemyPool.map((entry) => enemyById[entry.enemyId]?.name ?? 'Unknown Enemy'),
    sharedLootNames: location.sharedLoot?.map((drop) => itemById[drop.itemId]?.name ?? 'Unknown Item') ?? [],
    recommendedMasteryLabel: `Mastery ${location.recommendedMasteryLevel[0]}–${location.recommendedMasteryLevel[1]}`,
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
    rows: [{ label: 'Recommended', value: presentation.recommendedMasteryLabel, tone: 'gold' }],
    sections: [{ id: 'possible-enemies', title: 'POSSIBLE ENEMIES', notes: presentation.enemyNames }],
  }
}
