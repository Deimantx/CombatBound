import { deepFreeze } from './freeze'
import type { DefensiveProficiencyId, WeaponProficiencyId } from '../progression/progressionTypes'
import type { EquipmentSlotKind } from '../equipment/equipmentTypes'

export type ItemCategory = 'weapon' | 'armor' | 'accessory' | 'material' | 'consumable' | 'currency'
export type ItemRarity = 'common' | 'uncommon' | 'rare'

export interface ItemDefinition {
  id: string
  name: string
  category: ItemCategory
  rarity: ItemRarity
  description: string
  icon: string
  requiredMasteryLevel?: number
  weaponProficiencyId?: WeaponProficiencyId
  equipmentSlotKind?: EquipmentSlotKind
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
  // Prototype gear is intentionally debug/acquisition content for V8.7. [TUNING]
  { id: 'item.training-sword', name: 'Training Sword', category: 'weapon', rarity: 'common', description: 'A dependable starter weapon.', icon: 'sword', requiredMasteryLevel: 1, equipmentSlotKind: 'weapon', weaponProficiencyId: 'one-handed-sword', stats: { attackPower: 8, accuracy: 5, attackInterval: 2.4 } },
  { id: 'item.hunter-sword', name: 'Hunter Sword', category: 'weapon', rarity: 'uncommon', description: 'A sharper sword recovered from repeated hunts.', icon: 'sword', requiredMasteryLevel: 5, equipmentSlotKind: 'weapon', weaponProficiencyId: 'one-handed-sword', stats: { attackPower: 14, accuracy: 8, attackInterval: 2.2 } },
  { id: 'item.vanguard-sword', name: 'Vanguard Sword', category: 'weapon', rarity: 'rare', description: 'A balanced veteran blade built around speed and precision.', icon: 'sword', requiredMasteryLevel: 10, equipmentSlotKind: 'weapon', weaponProficiencyId: 'one-handed-sword', stats: { attackPower: 20, accuracy: 14, attackInterval: 2.05, critChance: .02 } },
  { id: 'item.training-shield', name: 'Training Shield', category: 'armor', rarity: 'common', description: 'A simple offhand shield for learning to guard.', icon: 'shield', requiredMasteryLevel: 1, equipmentSlotKind: 'offhand', defensiveProficiencyId: 'shield', stats: { armor: 5, blockChance: .05, blockPower: .05 } },
  { id: 'item.hunter-shield', name: 'Hunter Shield', category: 'armor', rarity: 'uncommon', description: 'A reliable shield for hunters who have learned to hold the line.', icon: 'shield', requiredMasteryLevel: 5, equipmentSlotKind: 'offhand', defensiveProficiencyId: 'shield', stats: { armor: 9, maxHealth: 15, blockChance: .08, blockPower: .10 } },
  { id: 'item.vanguard-shield', name: 'Vanguard Shield', category: 'armor', rarity: 'rare', description: 'A veteran shield reinforced against sustained pressure.', icon: 'shield', requiredMasteryLevel: 10, equipmentSlotKind: 'offhand', defensiveProficiencyId: 'shield', stats: { armor: 14, maxHealth: 30, blockChance: .12, blockPower: .15, statusResistance: .05 } },
  { id: 'item.training-hood', name: 'Training Hood', category: 'armor', rarity: 'common', description: 'A light hood for defensive training.', icon: 'helm', requiredMasteryLevel: 1, equipmentSlotKind: 'head', defensiveProficiencyId: 'light-armor', stats: { armor: 2, maxMana: 5, manaRegen: .2 } },
  { id: 'item.hunter-cap', name: 'Hunter Cap', category: 'armor', rarity: 'uncommon', description: 'A practical cap for mobile hunters.', icon: 'helm', requiredMasteryLevel: 5, equipmentSlotKind: 'head', defensiveProficiencyId: 'medium-armor', stats: { armor: 5, evasion: 2, maxStamina: 5, staminaRegen: .3 } },
  { id: 'item.vanguard-helm', name: 'Vanguard Helm', category: 'armor', rarity: 'rare', description: 'A heavy helm built for veteran front-line work.', icon: 'helm', requiredMasteryLevel: 10, equipmentSlotKind: 'head', defensiveProficiencyId: 'heavy-armor', stats: { armor: 9, maxHealth: 15, healthRegen: .2, statusResistance: .03 } },
  { id: 'item.training-armor', name: 'Training Armor', category: 'armor', rarity: 'common', description: 'Light armor for a new hunter.', icon: 'shield', requiredMasteryLevel: 1, equipmentSlotKind: 'armor', defensiveProficiencyId: 'light-armor', stats: { maxHealth: 20, armor: 8, maxMana: 10, manaRegen: .2 } },
  { id: 'item.hunter-armor', name: 'Hunter Armor', category: 'armor', rarity: 'uncommon', description: 'A sturdier medium armor recovered from a difficult encounter.', icon: 'shield', requiredMasteryLevel: 5, equipmentSlotKind: 'armor', defensiveProficiencyId: 'medium-armor', stats: { maxHealth: 40, armor: 15, maxStamina: 10, staminaRegen: .4 } },
  { id: 'item.vanguard-plate', name: 'Vanguard Plate', category: 'armor', rarity: 'rare', description: 'A heavy torso-and-leg armor package for veteran hunters.', icon: 'shield', requiredMasteryLevel: 10, equipmentSlotKind: 'armor', defensiveProficiencyId: 'heavy-armor', stats: { maxHealth: 70, armor: 24, healthRegen: .5, statusResistance: .05 } },
  { id: 'item.training-gloves', name: 'Training Gloves', category: 'armor', rarity: 'common', description: 'Light gloves for defensive training.', icon: 'hand', requiredMasteryLevel: 1, equipmentSlotKind: 'gloves', defensiveProficiencyId: 'light-armor', stats: { armor: 2, evasion: 2, manaRegen: .1 } },
  { id: 'item.hunter-gloves', name: 'Hunter Gloves', category: 'armor', rarity: 'uncommon', description: 'Flexible gloves for precise medium-armored movement.', icon: 'hand', requiredMasteryLevel: 5, equipmentSlotKind: 'gloves', defensiveProficiencyId: 'medium-armor', stats: { armor: 5, accuracy: 3, maxStamina: 4, staminaRegen: .2 } },
  { id: 'item.vanguard-gauntlets', name: 'Vanguard Gauntlets', category: 'armor', rarity: 'rare', description: 'Heavy gauntlets that turn a guarded stance into a weapon.', icon: 'hand', requiredMasteryLevel: 10, equipmentSlotKind: 'gloves', defensiveProficiencyId: 'heavy-armor', stats: { armor: 9, maxHealth: 10, statusResistance: .02, blockPower: .03 } },
  { id: 'item.training-boots', name: 'Training Boots', category: 'armor', rarity: 'common', description: 'Light boots for defensive training.', icon: 'footprints', requiredMasteryLevel: 1, equipmentSlotKind: 'boots', defensiveProficiencyId: 'light-armor', stats: { armor: 2, evasion: 2, manaRegen: .1 } },
  { id: 'item.hunter-boots', name: 'Hunter Boots', category: 'armor', rarity: 'uncommon', description: 'Medium boots made for measured pursuit.', icon: 'footprints', requiredMasteryLevel: 5, equipmentSlotKind: 'boots', defensiveProficiencyId: 'medium-armor', stats: { armor: 5, evasion: 3, maxStamina: 4, staminaRegen: .3 } },
  { id: 'item.vanguard-boots', name: 'Vanguard Boots', category: 'armor', rarity: 'rare', description: 'Heavy boots that keep a veteran anchored under pressure.', icon: 'footprints', requiredMasteryLevel: 10, equipmentSlotKind: 'boots', defensiveProficiencyId: 'heavy-armor', stats: { armor: 9, maxHealth: 15, healthRegen: .2, statusResistance: .02 } },
  { id: 'item.traveler-belt', name: 'Traveler Belt', category: 'accessory', rarity: 'common', description: 'A sturdy belt with room for a long road.', icon: 'belt', requiredMasteryLevel: 1, equipmentSlotKind: 'belt', stats: { maxStamina: 8 } },
  { id: 'item.hunter-belt', name: 'Hunter Belt', category: 'accessory', rarity: 'uncommon', description: 'A balanced belt for a practiced hunter.', icon: 'belt', requiredMasteryLevel: 5, equipmentSlotKind: 'belt', stats: { maxStamina: 14, staminaRegen: .35 } },
  { id: 'item.war-belt', name: 'War Belt', category: 'accessory', rarity: 'rare', description: 'A broad belt built for long engagements.', icon: 'belt', requiredMasteryLevel: 10, equipmentSlotKind: 'belt', stats: { maxStamina: 20, staminaRegen: .6, maxHealth: 15 } },
  { id: 'item.traveler-cape', name: 'Traveler Cape', category: 'accessory', rarity: 'common', description: 'A light cape that never catches on the trail.', icon: 'cape', requiredMasteryLevel: 1, equipmentSlotKind: 'cape', stats: { evasion: 2 } },
  { id: 'item.warden-cape', name: 'Warden Cape', category: 'accessory', rarity: 'uncommon', description: 'A warded cape that turns aside physical blows.', icon: 'cape', requiredMasteryLevel: 5, equipmentSlotKind: 'cape', stats: { armor: 4, physicalResistance: .03 } },
  { id: 'item.vanguard-cape', name: 'Vanguard Cape', category: 'accessory', rarity: 'rare', description: 'A veteran cape layered with protective insignia.', icon: 'cape', requiredMasteryLevel: 10, equipmentSlotKind: 'cape', stats: { armor: 7, maxHealth: 20, statusResistance: .05 } },
  { id: 'item.apprentice-pendant', name: 'Apprentice Pendant', category: 'accessory', rarity: 'common', description: 'A small pendant that steadies a novice caster.', icon: 'necklace', requiredMasteryLevel: 1, equipmentSlotKind: 'necklace', stats: { maxMana: 8 } },
  { id: 'item.elemental-pendant', name: 'Elemental Pendant', category: 'accessory', rarity: 'uncommon', description: 'A pendant tuned to the elemental schools.', icon: 'necklace', requiredMasteryLevel: 5, equipmentSlotKind: 'necklace', stats: { maxMana: 14, manaRegen: .35, fireResistance: .03, waterResistance: .03 } },
  { id: 'item.arcane-necklace', name: 'Arcane Necklace', category: 'accessory', rarity: 'rare', description: 'A necklace that carries a deep reserve of arcane energy.', icon: 'necklace', requiredMasteryLevel: 10, equipmentSlotKind: 'necklace', stats: { maxMana: 22, manaRegen: .6, statusResistance: .04 } },
  { id: 'item.copper-signet', name: 'Copper Signet', category: 'accessory', rarity: 'common', description: 'A plain signet prized for its reliable fit.', icon: 'ring', requiredMasteryLevel: 1, equipmentSlotKind: 'ring', stats: { accuracy: 3 } },
  { id: 'item.duelist-ring', name: 'Duelist Ring', category: 'accessory', rarity: 'uncommon', description: 'A ring favored by hunters who value timing and footwork.', icon: 'ring', requiredMasteryLevel: 5, equipmentSlotKind: 'ring', stats: { accuracy: 5, evasion: 2, critChance: .02 } },
  { id: 'item.ring-of-precision', name: 'Ring of Precision', category: 'accessory', rarity: 'rare', description: 'A finely balanced ring for exacting strikes.', icon: 'ring', requiredMasteryLevel: 10, equipmentSlotKind: 'ring', stats: { accuracy: 8, critChance: .03, critDamage: .1 } },
  { id: 'item.mana-stud', name: 'Mana Stud', category: 'accessory', rarity: 'common', description: 'A small stud with a faint magical pulse.', icon: 'earring', requiredMasteryLevel: 1, equipmentSlotKind: 'earring', stats: { manaRegen: .15 } },
  { id: 'item.wind-earring', name: 'Wind Earring', category: 'accessory', rarity: 'uncommon', description: 'An earring that makes every step feel lighter.', icon: 'earring', requiredMasteryLevel: 5, equipmentSlotKind: 'earring', stats: { evasion: 3, staminaRegen: .2 } },
  { id: 'item.star-earring', name: 'Star Earring', category: 'accessory', rarity: 'rare', description: 'A star-bright earring that resists light and darkness alike.', icon: 'earring', requiredMasteryLevel: 10, equipmentSlotKind: 'earring', stats: { manaRegen: .35, accuracy: 4, lightResistance: .03, darknessResistance: .03 } },
  { id: 'item.healing-potion', name: 'Healing Potion', category: 'consumable', rarity: 'common', description: 'Restores health during combat.', icon: 'cross' },
  { id: 'item.wolf-fang', name: 'Wolf Fang', category: 'material', rarity: 'common', description: 'A small trophy from a Grey Wolf.', icon: 'target' },
  { id: 'item.wolf-pelt', name: 'Wolf Pelt', category: 'material', rarity: 'uncommon', description: 'A useful hunting material.', icon: 'cube' },
  { id: 'item.bandit-scrap', name: 'Bandit Scrap', category: 'material', rarity: 'common', description: 'Recovered from a bandit camp.', icon: 'cube' },
  { id: 'item.coin-pouch', name: 'Coin Pouch', category: 'currency', rarity: 'uncommon', description: 'A small purse of prototype gold.', icon: 'coin' },
])

export const itemById = Object.fromEntries(itemDefinitions.map((item) => [item.id, item])) as Record<string, ItemDefinition>
export const prototypeEquipmentDefinitions = itemDefinitions.filter((item) => Boolean(item.equipmentSlotKind))
