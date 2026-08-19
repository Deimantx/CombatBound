import { deepFreeze } from './freeze'
import type { DefensiveProficiencyId, WeaponProficiencyId } from '../progression/progressionTypes'
import type { EquipmentSlotKind } from '../equipment/equipmentTypes'
import type { ItemInventoryMode, ItemStats } from '../items/itemTypes'

export type ItemCategory = 'weapon' | 'armor' | 'accessory' | 'material' | 'consumable' | 'currency'
export type ItemRarity = 'common' | 'uncommon' | 'rare'

export interface ItemDefinition {
  id: string
  name: string
  category: ItemCategory
  rarity: ItemRarity
  description: string
  icon: string
  inventoryMode: ItemInventoryMode
  requiredHunterRank?: number
  weaponProficiencyId?: WeaponProficiencyId
  equipmentSlotKind?: EquipmentSlotKind
  defensiveProficiencyId?: DefensiveProficiencyId
  stats?: ItemStats
}

// FUTURE: Add a progression stage only when deterministic item evolution/transformation design is locked.

const authoredItemDefinitions: ItemDefinition[] = [
  // Prototype gear is intentionally debug/acquisition content for V8.7. [TUNING]
  { id: 'item.training-sword', name: 'Training Sword', category: 'weapon', rarity: 'common', description: 'A dependable starter weapon.', icon: 'sword', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'weapon', weaponProficiencyId: 'one-handed-sword', stats: { baseDamageMin: 24, baseDamageMax: 32, accuracyRating: 5, baseAttackTime: 2.4 } }, // [TUNING]
  { id: 'item.hunter-sword', name: 'Hunter Sword', category: 'weapon', rarity: 'uncommon', description: 'A sharper sword recovered from repeated hunts.', icon: 'sword', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'weapon', weaponProficiencyId: 'one-handed-sword', stats: { baseDamageMin: 29, baseDamageMax: 39, accuracyRating: 8, baseAttackTime: 2.2 } }, // [TUNING]
  { id: 'item.vanguard-sword', name: 'Vanguard Sword', category: 'weapon', rarity: 'rare', description: 'A balanced veteran blade built around speed and precision.', icon: 'sword', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'weapon', weaponProficiencyId: 'one-handed-sword', stats: { baseDamageMin: 34, baseDamageMax: 46, accuracyRating: 14, baseAttackTime: 2.05, criticalStrikeChance: .02 } }, // [TUNING]
  { id: 'item.training-shield', name: 'Training Shield', category: 'armor', rarity: 'common', description: 'A simple offhand shield for learning to guard.', icon: 'shield', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'offhand', defensiveProficiencyId: 'shield', stats: { armour: 5, blockChance: .05, blockEffect: .25 } },
  { id: 'item.hunter-shield', name: 'Hunter Shield', category: 'armor', rarity: 'uncommon', description: 'A reliable shield for hunters who have learned to hold the line.', icon: 'shield', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'offhand', defensiveProficiencyId: 'shield', stats: { armour: 9, maxLife: 15, blockChance: .08, blockEffect: .35 } },
  { id: 'item.vanguard-shield', name: 'Vanguard Shield', category: 'armor', rarity: 'rare', description: 'A veteran shield reinforced against sustained pressure.', icon: 'shield', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'offhand', defensiveProficiencyId: 'shield', stats: { armour: 14, maxLife: 30, blockChance: .12, blockEffect: .45 } },
  { id: 'item.training-hood', name: 'Training Hood', category: 'armor', rarity: 'common', description: 'A light hood for defensive training.', icon: 'helm', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'head', defensiveProficiencyId: 'light-armor', stats: { armour: 2, maxMana: 5, manaRegenFlat: .2 } },
  { id: 'item.hunter-cap', name: 'Hunter Cap', category: 'armor', rarity: 'uncommon', description: 'A practical cap for mobile hunters.', icon: 'helm', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'head', defensiveProficiencyId: 'medium-armor', stats: { armour: 5, evasionRating: 2, maxStamina: 5, staminaRegen: .3 } },
  { id: 'item.vanguard-helm', name: 'Vanguard Helm', category: 'armor', rarity: 'rare', description: 'A heavy helm built for veteran front-line work.', icon: 'helm', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'head', defensiveProficiencyId: 'heavy-armor', stats: { armour: 9, maxLife: 15, lifeRegenFlat: .2 } },
  { id: 'item.training-armor', name: 'Training Armor', category: 'armor', rarity: 'common', description: 'Light armor for a new hunter.', icon: 'shield', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'armor', defensiveProficiencyId: 'light-armor', stats: { maxLife: 20, armour: 8, maxMana: 10, manaRegenFlat: .2 } },
  { id: 'item.hunter-armor', name: 'Hunter Armor', category: 'armor', rarity: 'uncommon', description: 'A sturdier medium armor recovered from a difficult encounter.', icon: 'shield', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'armor', defensiveProficiencyId: 'medium-armor', stats: { maxLife: 40, armour: 15, maxStamina: 10, staminaRegen: .4 } },
  { id: 'item.vanguard-plate', name: 'Vanguard Plate', category: 'armor', rarity: 'rare', description: 'A heavy torso-and-leg armor package for veteran hunters.', icon: 'shield', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'armor', defensiveProficiencyId: 'heavy-armor', stats: { maxLife: 70, armour: 24, lifeRegenFlat: .5 } },
  { id: 'item.training-gloves', name: 'Training Gloves', category: 'armor', rarity: 'common', description: 'Light gloves for defensive training.', icon: 'hand', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'gloves', defensiveProficiencyId: 'light-armor', stats: { armour: 2, evasionRating: 2, manaRegenFlat: .1 } },
  { id: 'item.hunter-gloves', name: 'Hunter Gloves', category: 'armor', rarity: 'uncommon', description: 'Flexible gloves for precise medium-armored movement.', icon: 'hand', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'gloves', defensiveProficiencyId: 'medium-armor', stats: { armour: 5, accuracyRating: 3, maxStamina: 4, staminaRegen: .2 } },
  { id: 'item.vanguard-gauntlets', name: 'Vanguard Gauntlets', category: 'armor', rarity: 'rare', description: 'Heavy gauntlets that reinforce a guarded posture.', icon: 'hand', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'gloves', defensiveProficiencyId: 'heavy-armor', stats: { armour: 9, maxLife: 10, blockChance: .03 } },
  { id: 'item.training-boots', name: 'Training Boots', category: 'armor', rarity: 'common', description: 'Light boots for defensive training.', icon: 'footprints', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'boots', defensiveProficiencyId: 'light-armor', stats: { armour: 2, evasionRating: 2, manaRegenFlat: .1 } },
  { id: 'item.hunter-boots', name: 'Hunter Boots', category: 'armor', rarity: 'uncommon', description: 'Medium boots made for measured pursuit.', icon: 'footprints', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'boots', defensiveProficiencyId: 'medium-armor', stats: { armour: 5, evasionRating: 3, maxStamina: 4, staminaRegen: .3 } },
  { id: 'item.vanguard-boots', name: 'Vanguard Boots', category: 'armor', rarity: 'rare', description: 'Heavy boots that keep a veteran anchored under pressure.', icon: 'footprints', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'boots', defensiveProficiencyId: 'heavy-armor', stats: { armour: 9, maxLife: 15, lifeRegenFlat: .2 } },
  { id: 'item.traveler-belt', name: 'Traveler Belt', category: 'accessory', rarity: 'common', description: 'A sturdy belt with room for a long road.', icon: 'belt', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'belt', stats: { maxStamina: 8 } },
  { id: 'item.hunter-belt', name: 'Hunter Belt', category: 'accessory', rarity: 'uncommon', description: 'A balanced belt for a practiced hunter.', icon: 'belt', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'belt', stats: { maxStamina: 14, staminaRegen: .35 } },
  { id: 'item.war-belt', name: 'War Belt', category: 'accessory', rarity: 'rare', description: 'A broad belt built for long engagements.', icon: 'belt', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'belt', stats: { maxStamina: 20, staminaRegen: .6, maxLife: 15 } },
  { id: 'item.traveler-cape', name: 'Traveler Cape', category: 'accessory', rarity: 'common', description: 'A light cape that never catches on the trail.', icon: 'cape', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'cape', stats: { evasionRating: 2 } },
  { id: 'item.warden-cape', name: 'Warden Cape', category: 'accessory', rarity: 'uncommon', description: 'A warded cape that turns aside physical blows.', icon: 'cape', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'cape', stats: { armour: 8 } },
  { id: 'item.vanguard-cape', name: 'Vanguard Cape', category: 'accessory', rarity: 'rare', description: 'A veteran cape layered with protective insignia.', icon: 'cape', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'cape', stats: { armour: 7, maxLife: 20 } },
  { id: 'item.apprentice-pendant', name: 'Apprentice Pendant', category: 'accessory', rarity: 'common', description: 'A small pendant that steadies a novice caster.', icon: 'necklace', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'necklace', stats: { maxMana: 8 } },
  { id: 'item.elemental-pendant', name: 'Elemental Pendant', category: 'accessory', rarity: 'uncommon', description: 'A pendant tuned to the elemental schools.', icon: 'necklace', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'necklace', stats: { maxMana: 14, manaRegenFlat: .35, fireResistance: .03, coldResistance: .03 } },
  { id: 'item.arcane-necklace', name: 'Arcane Necklace', category: 'accessory', rarity: 'rare', description: 'A necklace that carries a deep reserve of arcane energy.', icon: 'necklace', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'necklace', stats: { maxMana: 22, manaRegenFlat: .6 } },
  { id: 'item.copper-signet', name: 'Copper Signet', category: 'accessory', rarity: 'common', description: 'A plain signet prized for its reliable fit.', icon: 'ring', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'ring', stats: { accuracyRating: 3 } },
  { id: 'item.duelist-ring', name: 'Duelist Ring', category: 'accessory', rarity: 'uncommon', description: 'A ring favored by hunters who value timing and footwork.', icon: 'ring', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'ring', stats: { accuracyRating: 5, evasionRating: 2, criticalStrikeChance: .02 } },
  { id: 'item.ring-of-precision', name: 'Ring of Precision', category: 'accessory', rarity: 'rare', description: 'A finely balanced ring for exacting strikes.', icon: 'ring', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'ring', stats: { accuracyRating: 8, criticalStrikeChance: .03, criticalStrikeMultiplier: .1 } },
  { id: 'item.mana-stud', name: 'Mana Stud', category: 'accessory', rarity: 'common', description: 'A small stud with a faint magical pulse.', icon: 'earring', inventoryMode: 'instance', requiredHunterRank: 1, equipmentSlotKind: 'earring', stats: { manaRegenFlat: .15 } },
  { id: 'item.wind-earring', name: 'Wind Earring', category: 'accessory', rarity: 'uncommon', description: 'An earring that makes every step feel lighter.', icon: 'earring', inventoryMode: 'instance', requiredHunterRank: 5, equipmentSlotKind: 'earring', stats: { evasionRating: 3, staminaRegen: .2 } },
  { id: 'item.star-earring', name: 'Star Earring', category: 'accessory', rarity: 'rare', description: 'A star-bright earring tuned to shadow and arcane forces.', icon: 'earring', inventoryMode: 'instance', requiredHunterRank: 10, equipmentSlotKind: 'earring', stats: { manaRegenFlat: .35, accuracyRating: 4, chaosResistance: .03 } },
  { id: 'item.healing-potion', name: 'Healing Potion', category: 'consumable', rarity: 'common', description: 'Restores health during combat.', icon: 'cross', inventoryMode: 'stackable' },
  { id: 'item.wolf-fang', name: 'Wolf Fang', category: 'material', rarity: 'common', description: 'A small trophy from a Grey Wolf.', icon: 'target', inventoryMode: 'stackable' },
  { id: 'item.wolf-pelt', name: 'Wolf Pelt', category: 'material', rarity: 'uncommon', description: 'A useful hunting material.', icon: 'cube', inventoryMode: 'stackable' },
  { id: 'item.bandit-scrap', name: 'Bandit Scrap', category: 'material', rarity: 'common', description: 'Recovered from a bandit camp.', icon: 'cube', inventoryMode: 'stackable' },
  { id: 'item.coin-pouch', name: 'Coin Pouch', category: 'currency', rarity: 'uncommon', description: 'A small purse of prototype gold.', icon: 'coin', inventoryMode: 'stackable' },
]

export const itemDefinitions = deepFreeze<ItemDefinition[]>(authoredItemDefinitions)

export const itemById = Object.fromEntries(itemDefinitions.map((item) => [item.id, item])) as Record<string, ItemDefinition>
export const prototypeEquipmentDefinitions = itemDefinitions.filter((item) => Boolean(item.equipmentSlotKind))
