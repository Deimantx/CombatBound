export type CombatPhase = 'inactive' | 'active' | 'recovery' | 'defeat' | 'stopped'
export type CombatStopReason = 'manual' | 'defeat' | 'safety' | 'consumablesDepleted' | 'victoryLimit' | 'completed'
export type StanceId = 'high' | 'mid' | 'low'
export type TechniqueId = 'careful-positioning' | 'heightened-reflexes'
export type SpellTargetMode = 'self' | 'selectedEnemy' | 'allEnemies'
export type DamageType = 'physical' | 'fire'

export interface DefensiveEligibility {
  dodgeable: boolean
  parryable: boolean
  blockable: boolean
  interruptible: boolean
}

export interface EnemyActionDefinition extends DefensiveEligibility {
  id: string
  name: string
  description: string
  preparationSeconds: number
  cooldownSeconds: number
  damageMultiplier: number
  danger: 'low' | 'medium' | 'high'
}

export interface EnemyActionRuntime {
  actionId: string
  remainingSeconds: number
  totalSeconds: number
}

export interface EnemyTraitDefinition {
  id: string
  name: string
  description: string
}

export interface LootEntry {
  itemId: string
  chance: number
  minQuantity: number
  maxQuantity: number
}

export interface EnemyDefinition {
  id: string
  name: string
  family: string
  familyId?: string
  maxHealth: number
  attack: number
  accuracy: number
  defense: number
  attackInterval: number
  dodge: number
  parry: number
  block: number
  traits: EnemyTraitDefinition[]
  actions: EnemyActionDefinition[]
  baseXp: number
  loot: LootEntry[]
  weaknesses: string[]
  resistances: string[]
  icon: string
  accent: 'red' | 'blue' | 'gold'
}

export interface EnemyCombatInstance {
  instanceId: string
  enemyId: string
  displayName: string
  currentHealth: number
  maxHealth: number
  attackTimer: number
  attackInterval: number
  specialCooldownRemaining: number
  currentAction: EnemyActionRuntime | null
  defeated: boolean
  rewardResolved: boolean
}

export interface SpellRuntime {
  spellId: string
  cooldownRemaining: number
  autoEnabled: boolean
}

export interface CombatLogEntry {
  id: number
  text: string
  type: 'player' | 'enemy' | 'system'
  time: string
}

export interface CombatSession {
  elapsedSeconds: number
  groupClears: number
  enemiesDefeated: number
  damageDealt: number
  damageTaken: number
  healing: number
  xpGained: number
  itemsGained: number
  lootGained: Record<string, number>
  goldGained: number
  highestHit: number
}

export interface CombatState {
  phase: CombatPhase
  combatLocationId: string | null
  groupNumber: number
  enemies: EnemyCombatInstance[]
  selectedEnemyInstanceId: string | null
  playerHp: number
  maxPlayerHp: number
  playerAttackTimer: number
  playerAttackInterval: number
  energy: number
  maxEnergy: number
  adrenaline: number
  maxAdrenaline: number
  stance: StanceId
  stanceCooldownRemaining: number
  techniques: Record<TechniqueId, boolean>
  spells: SpellRuntime[]
  shield: number
  potionCooldownRemaining: number
  recoveryRemaining: number
  stopReason: CombatStopReason | null
  lastDamageSource: string | null
  log: CombatLogEntry[]
  session: CombatSession
  eventSequence: number
}

export interface CombatRng { next: () => number }

export interface CombatContext {
  enemies: Record<string, EnemyDefinition>
  locations: Record<string, import('../world/worldTypes').CombatLocationDefinition>
  spells: Record<string, { id: string; name: string; cost: number; cooldownSeconds: number; targetMode: SpellTargetMode; damage: number; description: string }>
  items: Record<string, { id: string; name: string }>
  rng: CombatRng
}

export interface CombatEvent { text: string; type: CombatLogEntry['type'] }
