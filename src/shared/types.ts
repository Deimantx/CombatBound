export type ScreenId = 'home' | 'combat' | 'equipment' | 'proficiencies' | 'inventory' | 'collection' | 'settings' | 'info'

export type ActivityType = 'idle' | 'combat'

export type InventoryCategory = 'All' | 'Weapons' | 'Armor' | 'Accessories' | 'Materials' | 'Other'

export type CollectionCategory = 'Items' | 'Targets'

export interface CombatTarget {
  id: string
  name: string
  region: string
  area: string
  level: number
  maxHp: number
  attack: number
  defence: number
  traits: string[]
  reward: string
  rewardValue: number
  accent: 'red' | 'blue' | 'gold'
}

export interface InventoryItem {
  id: string
  name: string
  category: Exclude<InventoryCategory, 'All'>
  rarity: 'Common' | 'Uncommon' | 'Rare'
  quantity: number
  level: number
  description: string
  stats: string[]
  icon: string
}

export interface EquipmentItem {
  id: string
  slot: string
  name: string
  rarity: 'Common' | 'Uncommon' | 'Rare'
  icon: string
  stats: string[]
}

export interface CollectionEntry {
  id: string
  name: string
  category: CollectionCategory
  discovered: boolean
  description: string
  icon: string
  meta: string
}

export interface CombatLogEntry {
  id: number
  time: string
  text: string
  type: 'player' | 'enemy' | 'system'
}
