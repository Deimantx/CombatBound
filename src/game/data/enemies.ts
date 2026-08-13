import type { EnemyDefinition } from '../combat/combatTypes'
import { deepFreeze } from './freeze'

// Content remains intentionally conservative; the combat engine now consumes
// canonical Armor/Evasion and numeric typed resistances.
export const enemyDefinitions = deepFreeze<EnemyDefinition[]>([
  {
    id: 'enemy.grey-wolf', name: 'Grey Wolf', family: 'Wolves', familyId: 'family.wolves', maxHealth: 120, attackPower: 14, accuracy: 70, armor: 30, evasion: 35, attackInterval: 2.2, dodgeChance: 0.05, parryChance: 0, blockChance: 0, blockPower: 0.5,
    traits: [{ id: 'pack-hunter', name: 'Pack Hunter', description: '+5% damage while another Grey Wolf is alive.' }], actions: [],
    loot: [{ itemId: 'item.wolf-fang', chance: 0.75, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.wolf-pelt', chance: 0.35, minQuantity: 1, maxQuantity: 1 }], resistances: { fire: -0.2 }, weaknesses: ['fire'], resistanceLabels: [], icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.forest-bandit', name: 'Forest Bandit', family: 'Bandits', familyId: 'family.bandits', maxHealth: 180, attackPower: 18, accuracy: 65, armor: 45, evasion: 25, attackInterval: 2.6, dodgeChance: 0.03, parryChance: 0.03, blockChance: 0.05, blockPower: 0.5,
    traits: [{ id: 'guarded', name: 'Guarded', description: 'Uses basic defensive training.' }], actions: [],
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.45, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.hunter-armor', chance: 0.2, minQuantity: 1, maxQuantity: 1 }], resistances: { physical: 0.2 }, weaknesses: [], resistanceLabels: ['physical'], icon: 'shield', accent: 'blue',
  },
  {
    id: 'enemy.bandit-archer', name: 'Bandit Archer', family: 'Bandits', familyId: 'family.bandits', maxHealth: 140, attackPower: 16, accuracy: 80, armor: 25, evasion: 50, attackInterval: 3, dodgeChance: 0.08, parryChance: 0, blockChance: 0, blockPower: 0.5,
    traits: [{ id: 'ranged-pressure', name: 'Ranged Pressure', description: 'Prepares dangerous Charged Shots.' }], actions: [{ id: 'action.charged-shot', name: 'Charged Shot', description: 'A high-danger ranged attack.', preparationSeconds: 3.5, cooldownSeconds: 7, damageMultiplier: 2, danger: 'high', dodgeable: true, parryable: false, blockable: true, interruptible: true }],
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.6, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.hunter-sword', chance: 0.2, minQuantity: 1, maxQuantity: 1 }], resistances: { physical: -0.2 }, weaknesses: ['physical'], resistanceLabels: [], icon: 'target', accent: 'gold',
  },
  {
    id: 'enemy.wolf-stalker', name: 'Wolf Stalker', family: 'Wolves', familyId: 'family.wolves', maxHealth: 105, attackPower: 12, accuracy: 76, armor: 35, evasion: 60, attackInterval: 2, dodgeChance: 0.08, parryChance: 0, blockChance: 0, blockPower: 0.5,
    traits: [{ id: 'shadow-step', name: 'Shadow Step', description: 'A quick pack hunter with a higher dodge chance.' }], actions: [],
    loot: [{ itemId: 'item.wolf-fang', chance: 0.55, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.wolf-pelt', chance: 0.45, minQuantity: 1, maxQuantity: 1 }], resistances: { fire: -0.2 }, weaknesses: ['fire'], resistanceLabels: [], icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.wolf-ravager', name: 'Wolf Ravager', family: 'Wolves', familyId: 'family.wolves', maxHealth: 165, attackPower: 20, accuracy: 66, armor: 34, evasion: 25, attackInterval: 2.8, dodgeChance: 0.03, parryChance: 0, blockChance: 0, blockPower: 0.5,
    traits: [{ id: 'pack-bruiser', name: 'Pack Bruiser', description: 'A heavier wolf that hits harder but attacks slowly.' }], actions: [],
    loot: [{ itemId: 'item.wolf-fang', chance: 0.85, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.wolf-pelt', chance: 0.6, minQuantity: 1, maxQuantity: 1 }], resistances: { fire: -0.2 }, weaknesses: ['fire'], resistanceLabels: [], icon: 'shield', accent: 'red',
  },
  {
    id: 'enemy.alpha-wolf', name: 'Alpha Wolf', family: 'Wolves', familyId: 'family.wolves', maxHealth: 260, attackPower: 26, accuracy: 78, armor: 48, evasion: 20, attackInterval: 2.7, dodgeChance: 0.06, parryChance: 0, blockChance: 0.04, blockPower: 0.5,
    traits: [{ id: 'alpha-pressure', name: 'Alpha Pressure', description: 'A rare elite that makes every pack more dangerous.' }], actions: [],
    loot: [{ itemId: 'item.wolf-fang', chance: 1, minQuantity: 2, maxQuantity: 3 }, { itemId: 'item.wolf-pelt', chance: 0.9, minQuantity: 1, maxQuantity: 2 }], resistances: { fire: -0.2 }, weaknesses: ['fire'], resistanceLabels: [], icon: 'shield', accent: 'gold',
  },
  {
    id: 'enemy.bandit-scout', name: 'Bandit Scout', family: 'Bandits', familyId: 'family.bandits', maxHealth: 105, attackPower: 12, accuracy: 84, armor: 22, evasion: 65, attackInterval: 2.1, dodgeChance: 0.09, parryChance: 0.02, blockChance: 0, blockPower: 0.5,
    traits: [{ id: 'lookout', name: 'Lookout', description: 'A fast scout that is difficult to pin down.' }], actions: [],
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.85, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.35, minQuantity: 1, maxQuantity: 1 }], resistances: {}, weaknesses: [], resistanceLabels: [], icon: 'target', accent: 'blue',
  },
  {
    id: 'enemy.bandit-captain', name: 'Bandit Captain', family: 'Bandits', familyId: 'family.bandits', maxHealth: 280, attackPower: 25, accuracy: 75, armor: 55, evasion: 20, attackInterval: 2.9, dodgeChance: 0.02, parryChance: 0.05, blockChance: 0.08, blockPower: 0.5,
    traits: [{ id: 'commanding-presence', name: 'Commanding Presence', description: 'A rare elite with strong defenses and valuable drops.' }], actions: [],
    loot: [{ itemId: 'item.bandit-scrap', chance: 1, minQuantity: 2, maxQuantity: 4 }, { itemId: 'item.coin-pouch', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.hunter-sword', chance: 0.1, minQuantity: 1, maxQuantity: 1 }], resistances: { physical: 0.2 }, weaknesses: [], resistanceLabels: ['physical'], icon: 'shield', accent: 'gold',
  },
])

export const enemyById = Object.fromEntries(enemyDefinitions.map((enemy) => [enemy.id, enemy])) as Record<string, EnemyDefinition>
