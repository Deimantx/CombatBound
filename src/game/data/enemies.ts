import type { EnemyDefinition } from '../combat/combatTypes'
import { deepFreeze } from './freeze'

// Disposable gameplay MVP definitions.
export const enemyDefinitions = deepFreeze<EnemyDefinition[]>([
  {
    id: 'enemy.grey-wolf', name: 'Grey Wolf', family: 'Wolves', familyId: 'family.wolves', maxHealth: 120, attack: 14, accuracy: 70, defense: 30, attackInterval: 2.2, dodge: 0.05, parry: 0, block: 0,
    traits: [{ id: 'pack-hunter', name: 'Pack Hunter', description: '+5% damage while another Grey Wolf is alive.' }], actions: [], baseXp: 20,
    loot: [{ itemId: 'item.wolf-fang', chance: 0.75, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.wolf-pelt', chance: 0.35, minQuantity: 1, maxQuantity: 1 }], weaknesses: ['fire'], resistances: [], icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.forest-bandit', name: 'Forest Bandit', family: 'Bandits', familyId: 'family.bandits', maxHealth: 180, attack: 18, accuracy: 65, defense: 45, attackInterval: 2.6, dodge: 0.03, parry: 0.03, block: 0.05,
    traits: [{ id: 'guarded', name: 'Guarded', description: 'Uses basic defensive training.' }], actions: [], baseXp: 30,
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.45, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.hunter-armor', chance: 0.2, minQuantity: 1, maxQuantity: 1 }], weaknesses: [], resistances: ['physical'], icon: 'shield', accent: 'blue',
  },
  {
    id: 'enemy.bandit-archer', name: 'Bandit Archer', family: 'Bandits', familyId: 'family.bandits', maxHealth: 140, attack: 16, accuracy: 80, defense: 25, attackInterval: 3, dodge: 0.08, parry: 0, block: 0,
    traits: [{ id: 'ranged-pressure', name: 'Ranged Pressure', description: 'Prepares dangerous Charged Shots.' }], actions: [{ id: 'action.charged-shot', name: 'Charged Shot', description: 'A high-danger ranged attack.', preparationSeconds: 3.5, cooldownSeconds: 7, damageMultiplier: 2, danger: 'high', dodgeable: true, parryable: false, blockable: true, interruptible: true }], baseXp: 35,
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.6, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.hunter-sword', chance: 0.2, minQuantity: 1, maxQuantity: 1 }], weaknesses: ['physical'], resistances: [], icon: 'target', accent: 'gold',
  },
  {
    id: 'enemy.wolf-stalker', name: 'Wolf Stalker', family: 'Wolves', familyId: 'family.wolves', maxHealth: 105, attack: 12, accuracy: 76, defense: 35, attackInterval: 2, dodge: 0.08, parry: 0, block: 0,
    traits: [{ id: 'shadow-step', name: 'Shadow Step', description: 'A quick pack hunter with a higher dodge chance.' }], actions: [], baseXp: 22,
    loot: [{ itemId: 'item.wolf-fang', chance: 0.55, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.wolf-pelt', chance: 0.45, minQuantity: 1, maxQuantity: 1 }], weaknesses: ['fire'], resistances: [], icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.wolf-ravager', name: 'Wolf Ravager', family: 'Wolves', familyId: 'family.wolves', maxHealth: 165, attack: 20, accuracy: 66, defense: 34, attackInterval: 2.8, dodge: 0.03, parry: 0, block: 0,
    traits: [{ id: 'pack-bruiser', name: 'Pack Bruiser', description: 'A heavier wolf that hits harder but attacks slowly.' }], actions: [], baseXp: 35,
    loot: [{ itemId: 'item.wolf-fang', chance: 0.85, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.wolf-pelt', chance: 0.6, minQuantity: 1, maxQuantity: 1 }], weaknesses: ['fire'], resistances: [], icon: 'shield', accent: 'red',
  },
  {
    id: 'enemy.alpha-wolf', name: 'Alpha Wolf', family: 'Wolves', familyId: 'family.wolves', maxHealth: 260, attack: 26, accuracy: 78, defense: 48, attackInterval: 2.7, dodge: 0.06, parry: 0, block: 0.04,
    traits: [{ id: 'alpha-pressure', name: 'Alpha Pressure', description: 'A rare elite that makes every pack more dangerous.' }], actions: [], baseXp: 70,
    loot: [{ itemId: 'item.wolf-fang', chance: 1, minQuantity: 2, maxQuantity: 3 }, { itemId: 'item.wolf-pelt', chance: 0.9, minQuantity: 1, maxQuantity: 2 }], weaknesses: ['fire'], resistances: [], icon: 'shield', accent: 'gold',
  },
  {
    id: 'enemy.bandit-scout', name: 'Bandit Scout', family: 'Bandits', familyId: 'family.bandits', maxHealth: 105, attack: 12, accuracy: 84, defense: 22, attackInterval: 2.1, dodge: 0.09, parry: 0.02, block: 0,
    traits: [{ id: 'lookout', name: 'Lookout', description: 'A fast scout that is difficult to pin down.' }], actions: [], baseXp: 22,
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.85, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.35, minQuantity: 1, maxQuantity: 1 }], weaknesses: [], resistances: [], icon: 'target', accent: 'blue',
  },
  {
    id: 'enemy.bandit-captain', name: 'Bandit Captain', family: 'Bandits', familyId: 'family.bandits', maxHealth: 280, attack: 25, accuracy: 75, defense: 55, attackInterval: 2.9, dodge: 0.02, parry: 0.05, block: 0.08,
    traits: [{ id: 'commanding-presence', name: 'Commanding Presence', description: 'A rare elite with strong defenses and valuable drops.' }], actions: [], baseXp: 75,
    loot: [{ itemId: 'item.bandit-scrap', chance: 1, minQuantity: 2, maxQuantity: 4 }, { itemId: 'item.coin-pouch', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.hunter-sword', chance: 0.1, minQuantity: 1, maxQuantity: 1 }], weaknesses: [], resistances: ['physical'], icon: 'shield', accent: 'gold',
  },
])

export const enemyById = Object.fromEntries(enemyDefinitions.map((enemy) => [enemy.id, enemy])) as Record<string, EnemyDefinition>
