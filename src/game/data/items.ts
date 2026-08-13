import { deepFreeze } from './freeze'
import type { WeaponProficiencyId } from '../progression/progressionTypes'

export type ItemCategory = 'weapon' | 'armor' | 'accessory' | 'material' | 'consumable' | 'currency'
export type ItemRarity = 'common' | 'uncommon' | 'rare'

export interface ItemDefinition {
  id: string
  name: string
  category: ItemCategory
  rarity: ItemRarity
  description: string
  icon: string
  weaponProficiencyId?: WeaponProficiencyId
  stats?: {
    attackPower?: number
    attack?: number
    accuracy?: number
    armor?: number
    defense?: number
    evasion?: number
    maxHealth?: number
    attackInterval?: number
    critChance?: number
    critDamage?: number
    dodgeChance?: number
    parryChance?: number
    blockChance?: number
    blockPower?: number
    physicalResistance?: number
    fireResistance?: number
    waterResistance?: number
    earthResistance?: number
    airResistance?: number
    lightResistance?: number
    darknessResistance?: number
    natureResistance?: number
    mysticResistance?: number
  }
}

export const itemDefinitions = deepFreeze<ItemDefinition[]>([
  { id: 'item.training-sword', name: 'Training Sword', category: 'weapon', rarity: 'common', description: 'A dependable starter weapon.', icon: 'sword', weaponProficiencyId: 'one-handed-sword', stats: { attackPower: 8, accuracy: 5, attackInterval: 2.4 } },
  { id: 'item.hunter-sword', name: 'Hunter Sword', category: 'weapon', rarity: 'uncommon', description: 'A sharper sword recovered from repeated hunts.', icon: 'sword', weaponProficiencyId: 'one-handed-sword', stats: { attackPower: 14, accuracy: 8, attackInterval: 2.2 } },
  { id: 'item.training-armor', name: 'Training Armor', category: 'armor', rarity: 'common', description: 'Light armor for a new hunter.', icon: 'shield', stats: { maxHealth: 20, armor: 8 } },
  { id: 'item.hunter-armor', name: 'Hunter Armor', category: 'armor', rarity: 'uncommon', description: 'A sturdier armor set recovered from a difficult encounter.', icon: 'shield', stats: { maxHealth: 40, armor: 15 } },
  { id: 'item.healing-potion', name: 'Healing Potion', category: 'consumable', rarity: 'common', description: 'Restores health during combat.', icon: 'cross' },
  { id: 'item.wolf-fang', name: 'Wolf Fang', category: 'material', rarity: 'common', description: 'A small trophy from a Grey Wolf.', icon: 'target' },
  { id: 'item.wolf-pelt', name: 'Wolf Pelt', category: 'material', rarity: 'uncommon', description: 'A useful hunting material.', icon: 'cube' },
  { id: 'item.bandit-scrap', name: 'Bandit Scrap', category: 'material', rarity: 'common', description: 'Recovered from a bandit camp.', icon: 'cube' },
  { id: 'item.coin-pouch', name: 'Coin Pouch', category: 'currency', rarity: 'uncommon', description: 'A small purse of prototype gold.', icon: 'coin' },
])

export const itemById = Object.fromEntries(itemDefinitions.map((item) => [item.id, item])) as Record<string, ItemDefinition>
