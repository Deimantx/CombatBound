export type CombatWorldMapLevel = 'world' | 'continent' | 'region' | 'area'
export type CombatMapNodeKind = 'continent' | 'region' | 'area' | 'arena'
export type CombatMapMarkerKind = 'normal' | 'elite' | 'boss'

export interface CombatMapNodeLayout {
  kind: CombatMapNodeKind
  sourceId: string
  x: number
  y: number
  markerKind?: CombatMapMarkerKind
}

export interface CombatMapViewDefinition {
  id: string
  level: CombatWorldMapLevel
  parentId?: string
  sourceId?: string
  backgroundKey: string
  backgroundAsset?: string
  backgroundAspectRatio?: number
  nodes: readonly CombatMapNodeLayout[]
}
