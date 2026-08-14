import { deepFreeze } from './freeze'
import type { DefensiveProficiencyId, WeaponProficiencyId } from '../progression/progressionTypes'
import type { EquipmentSlot } from '../equipment/equipmentTypes'

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
  equipmentSlot?: EquipmentSlot
  defensiveProficiencyId?: DefensiveProficiencyId
  stats?: {
    attackPower?: number
    attack?: number
    accuracy?: number
    armor?: number
    defense?: number
    evasion?: number
    maxHealth?: number
    healthRegen?: number
    maxStamina?: number
    staminaRegen?: number
    maxMana?: number
    manaRegen?: number
    statusResistance?: number
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
  { id: 'item.training-sword', name: 'Training Sword', category: 'weapon', rarity: 'common', description: 'A dependable starter weapon.', icon: 'sword', equipmentSlot: 'weapon', weaponProficiencyId: 'one-handed-sword', stats: { attackPower: 8, accuracy: 5, attackInterval: 2.4 } },
  { id: 'item.hunter-sword', name: 'Hunter Sword', category: 'weapon', rarity: 'uncommon', description: 'A sharper sword recovered from repeated hunts.', icon: 'sword', equipmentSlot: 'weapon', weaponProficiencyId: 'one-handed-sword', stats: { attackPower: 14, accuracy: 8, attackInterval: 2.2 } },
  { id: 'item.training-armor', name: 'Training Armor', category: 'armor', rarity: 'common', description: 'Light armor for a new hunter.', icon: 'shield', equipmentSlot: 'chest', defensiveProficiencyId: 'light-armor', stats: { maxHealth: 20, armor: 8 } },
  { id: 'item.hunter-armor', name: 'Hunter Armor', category: 'armor', rarity: 'uncommon', description: 'A sturdier medium armor recovered from a difficult encounter.', icon: 'shield', equipmentSlot: 'chest', defensiveProficiencyId: 'medium-armor', stats: { maxHealth: 40, armor: 15 } },
  { id: 'item.training-hood', name: 'Training Hood', category: 'armor', rarity: 'common', description: 'A light hood for defensive training.', icon: 'helmet', equipmentSlot: 'head', defensiveProficiencyId: 'light-armor', stats: { armor: 2, manaRegen: .2 } },
  { id: 'item.training-gloves', name: 'Training Gloves', category: 'armor', rarity: 'common', description: 'Light gloves for defensive training.', icon: 'shield', equipmentSlot: 'hands', defensiveProficiencyId: 'light-armor', stats: { armor: 2, evasion: 2 } },
  { id: 'item.training-boots', name: 'Training Boots', category: 'armor', rarity: 'common', description: 'Light boots for defensive training.', icon: 'footprints', equipmentSlot: 'feet', defensiveProficiencyId: 'light-armor', stats: { armor: 2, evasion: 2 } },
  { id: 'item.training-shield', name: 'Training Shield', category: 'armor', rarity: 'common', description: 'A simple offhand shield for learning to guard.', icon: 'shield', equipmentSlot: 'offhand', defensiveProficiencyId: 'shield', stats: { armor: 5, blockChance: .05, blockPower: .05 } },
  { id: 'item.healing-potion', name: 'Healing Potion', category: 'consumable', rarity: 'common', description: 'Restores health during combat.', icon: 'cross' },
  { id: 'item.wolf-fang', name: 'Wolf Fang', category: 'material', rarity: 'common', description: 'A small trophy from a Grey Wolf.', icon: 'target' },
  { id: 'item.wolf-pelt', name: 'Wolf Pelt', category: 'material', rarity: 'uncommon', description: 'A useful hunting material.', icon: 'cube' },
  { id: 'item.bandit-scrap', name: 'Bandit Scrap', category: 'material', rarity: 'common', description: 'Recovered from a bandit camp.', icon: 'cube' },
  { id: 'item.coin-pouch', name: 'Coin Pouch', category: 'currency', rarity: 'uncommon', description: 'A small purse of prototype gold.', icon: 'coin' },
])

export const itemById = Object.fromEntries(itemDefinitions.map((item) => [item.id, item])) as Record<string, ItemDefinition>
