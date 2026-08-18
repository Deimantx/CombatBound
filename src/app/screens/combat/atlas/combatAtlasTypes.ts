export type CombatAtlasLevel = 'world' | 'continent' | 'region' | 'area'
export type CombatAtlasMode = 'territories' | 'constellation' | 'arenas'
export type AtlasAtmosphere = 'world' | 'forest' | 'marsh' | 'highland' | 'coast' | 'moor' | 'road'
export type AtlasAccent = 'forest' | 'frost' | 'ember' | 'storm' | 'moor' | 'marsh' | 'highland' | 'coast' | 'road' | 'gold'
export type AtlasIconKey = 'globe' | 'map' | 'mountain' | 'trees' | 'pin' | 'target' | 'tent' | 'shield' | 'snowflake' | 'flame' | 'waves' | 'moon' | 'swords'

export interface AtlasPoint {
  x: number
  y: number
}

export interface CombatAtlasNodeLayout extends AtlasPoint {
  sourceId: string
  kind: 'continent' | 'region' | 'area' | 'arena'
  accent: AtlasAccent
  icon: AtlasIconKey
}

export interface CombatAtlasConnection {
  from: string
  to: string
  curve?: number
  emphasis?: 'normal' | 'subtle'
}

export type CombatAtlasDecoration =
  | { kind: 'ring'; x: number; y: number; radius: number }
  | { kind: 'route'; points: readonly AtlasPoint[]; tone?: 'forest' | 'road' | 'water' }

export interface CombatAtlasViewDefinition {
  id: string
  level: CombatAtlasLevel
  mode: CombatAtlasMode
  atmosphere: AtlasAtmosphere
  parentId?: string
  sourceId?: string
  nodes: readonly CombatAtlasNodeLayout[]
  connections?: readonly CombatAtlasConnection[]
  decorations?: readonly CombatAtlasDecoration[]
}
