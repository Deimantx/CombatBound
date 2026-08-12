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
  recommendedCombatLevel?: [number, number]
  presentation: WorldPresentation
}

export interface RegionDefinition {
  id: string
  continentId: string
  name: string
  description: string
  areaIds: string[]
  availability: ContentAvailability
  requiredCombatLevel?: number
  recommendedCombatLevel?: [number, number]
  presentation: WorldPresentation
}

export interface AreaDefinition {
  id: string
  regionId: string
  name: string
  description: string
  subAreaIds: string[]
  availability: ContentAvailability
  requiredCombatLevel?: number
  recommendedCombatLevel?: [number, number]
  presentation: WorldPresentation
}

export interface SubAreaDefinition {
  id: string
  areaId: string
  name: string
  description: string
  combatLocationIds: string[]
  availability: ContentAvailability
  requiredCombatLevel?: number
  recommendedCombatLevel?: [number, number]
  presentation: WorldPresentation
}

export interface CombatLocationEnemyEntry {
  enemyId: string
  weight: number
  minCopiesPerGroup?: number
  maxCopiesPerGroup?: number
  minCombatLevel?: number
  role?: 'common' | 'support' | 'dangerous' | 'elite'
}

export interface CombatGroupGenerationDefinition {
  minGroupSize: number
  maxGroupSize: number
  allowDuplicateEnemyTypes: boolean
  minimumDistinctTypes?: number
  guaranteedEnemyIds?: string[]
  generationMode: 'weighted-random'
}

export interface CombatLocationDefinition {
  id: string
  subAreaId: string
  name: string
  description: string
  familyId: string
  enemyPool: CombatLocationEnemyEntry[]
  groupGeneration: CombatGroupGenerationDefinition
  availability: ContentAvailability
  requiredCombatLevel: number
  recommendedCombatLevel: [number, number]
  sharedLoot?: Array<{ itemId: string; chance: number; minQuantity: number; maxQuantity: number }>
  presentation: WorldPresentation
}

export interface WorldSelection {
  continentId: string
  regionId: string
  areaId: string
  subAreaId: string
  combatLocationId: string
}
