export type ContentAvailability = 'available' | 'locked' | 'coming-soon'
export type WorldAccent = 'gold' | 'blue' | 'green' | 'red'
export type WorldIconKey = 'globe' | 'map' | 'mountain' | 'trees' | 'pin' | 'target' | 'tent' | 'shield'

export interface WorldPresentation {
  accent: WorldAccent
  iconKey: WorldIconKey
}

export interface ContinentDefinition {
  id: string
  name: string
  description: string
  regionIds: string[]
  availability: ContentAvailability
  recommendedHunterRank?: [number, number]
  presentation: WorldPresentation
}

export interface RegionDefinition {
  id: string
  continentId: string
  name: string
  description: string
  areaIds: string[]
  availability: ContentAvailability
  requiredHunterRank?: number
  recommendedHunterRank?: [number, number]
  presentation: WorldPresentation
}

export interface AreaDefinition {
  id: string
  regionId: string
  name: string
  description: string
  combatLocationIds: string[]
  availability: ContentAvailability
  requiredHunterRank?: number
  recommendedHunterRank?: [number, number]
  presentation: WorldPresentation
}

export interface CombatLocationTargetEntry {
  enemyId: string
  minHunterRank?: number
}

export interface CombatLocationDefinition {
  id: string
  areaId: string
  name: string
  description: string
  familyId: string
  targets: CombatLocationTargetEntry[]
  availability: ContentAvailability
  requiredHunterRank: number
  recommendedHunterRank: [number, number]
  sharedLoot?: Array<{ itemId: string; chance: number; minQuantity: number; maxQuantity: number }>
  presentation: WorldPresentation
}

export interface WorldSelection {
  continentId: string
  regionId: string
  areaId: string
  combatLocationId: string
}
