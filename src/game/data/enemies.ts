import type { EnemyDefinition } from '../combat/combatTypes'
import { deepFreeze } from './freeze'

// Content remains intentionally conservative; the combat engine now consumes
// canonical Armor/Evasion and numeric typed resistances.
const authoredEnemyDefinitions: EnemyDefinition[] = [
  {
    id: 'enemy.grey-wolf', name: 'Grey Wolf', family: 'Wolves', familyId: 'family.wolves', maxLife: 120, baseAttackDamageMin: 14, baseAttackDamageMax: 14, accuracyRating: 70, armour: 30, evasionRating: 35, baseAttackTime: 2.2, attackBlockChance: 0,
    traits: [{ id: 'pack-hunter', name: 'Pack Hunter', description: '+5% damage while another Grey Wolf is alive.' }], actions: [],
    loot: [{ itemId: 'item.wolf-fang', chance: 0.75, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.wolf-pelt', chance: 0.35, minQuantity: 1, maxQuantity: 1 }], resistances: { fire: -0.2 }, icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.forest-bandit', name: 'Forest Bandit', family: 'Bandits', familyId: 'family.bandits', maxLife: 180, baseAttackDamageMin: 18, baseAttackDamageMax: 18, accuracyRating: 65, armour: 45, evasionRating: 25, baseAttackTime: 2.6, attackBlockChance: 0.05,
    traits: [{ id: 'guarded', name: 'Guarded', description: 'Uses basic defensive training.' }], actions: [],
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.45, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.hunter-armor', chance: 0.2, minQuantity: 1, maxQuantity: 1 }], resistances: {}, additionalPhysicalDamageReduction: 0.2, icon: 'shield', accent: 'blue',
  },
  {
    id: 'enemy.bandit-archer', name: 'Bandit Archer', family: 'Bandits', familyId: 'family.bandits', maxLife: 140, baseAttackDamageMin: 16, baseAttackDamageMax: 16, accuracyRating: 80, armour: 25, evasionRating: 50, baseAttackTime: 3, attackBlockChance: 0,
    traits: [{ id: 'ranged-pressure', name: 'Ranged Pressure', description: 'Prepares dangerous Charged Shots.' }], actions: [{ id: 'action.charged-shot', name: 'Charged Shot', description: 'A high-danger ranged attack.', preparationSeconds: 3.5, cooldownSeconds: 7, damageMultiplier: 2, danger: 'high', canMiss: true, canBeEvaded: true, blockable: true, interruptible: true }],
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.6, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.hunter-sword', chance: 0.2, minQuantity: 1, maxQuantity: 1 }], resistances: {}, icon: 'target', accent: 'gold',
  },
  {
    id: 'enemy.wolf-stalker', name: 'Wolf Stalker', family: 'Wolves', familyId: 'family.wolves', maxLife: 105, baseAttackDamageMin: 12, baseAttackDamageMax: 12, accuracyRating: 76, armour: 35, evasionRating: 60, baseAttackTime: 2, attackBlockChance: 0,
    traits: [{ id: 'shadow-step', name: 'Shadow Step', description: 'A quick pack hunter with higher Evasion Rating.' }], actions: [],
    loot: [{ itemId: 'item.wolf-fang', chance: 0.55, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.wolf-pelt', chance: 0.45, minQuantity: 1, maxQuantity: 1 }], resistances: { fire: -0.2 }, icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.wolf-ravager', name: 'Wolf Ravager', family: 'Wolves', familyId: 'family.wolves', maxLife: 165, baseAttackDamageMin: 20, baseAttackDamageMax: 20, accuracyRating: 66, armour: 34, evasionRating: 25, baseAttackTime: 2.8, attackBlockChance: 0,
    traits: [{ id: 'pack-bruiser', name: 'Pack Bruiser', description: 'A heavier wolf that hits harder but attacks slowly.' }], actions: [],
    loot: [{ itemId: 'item.wolf-fang', chance: 0.85, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.wolf-pelt', chance: 0.6, minQuantity: 1, maxQuantity: 1 }], resistances: { fire: -0.2 }, icon: 'shield', accent: 'red',
  },
  {
    id: 'enemy.alpha-wolf', name: 'Alpha Wolf', family: 'Wolves', familyId: 'family.wolves', maxLife: 260, baseAttackDamageMin: 26, baseAttackDamageMax: 26, accuracyRating: 78, armour: 48, evasionRating: 20, baseAttackTime: 2.7, attackBlockChance: 0.04,
    traits: [{ id: 'alpha-pressure', name: 'Alpha Pressure', description: 'A rare elite that makes every pack more dangerous.' }], actions: [],
    loot: [{ itemId: 'item.wolf-fang', chance: 1, minQuantity: 2, maxQuantity: 3 }, { itemId: 'item.wolf-pelt', chance: 0.9, minQuantity: 1, maxQuantity: 2 }], resistances: { fire: -0.2 }, icon: 'shield', accent: 'gold',
  },
  {
    id: 'enemy.bandit-scout', name: 'Bandit Scout', family: 'Bandits', familyId: 'family.bandits', maxLife: 105, baseAttackDamageMin: 12, baseAttackDamageMax: 12, accuracyRating: 84, armour: 22, evasionRating: 65, baseAttackTime: 2.1, attackBlockChance: 0,
    traits: [{ id: 'lookout', name: 'Lookout', description: 'A fast scout that is difficult to pin down.' }], actions: [],
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.85, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.35, minQuantity: 1, maxQuantity: 1 }], resistances: {}, icon: 'target', accent: 'blue',
  },
  {
    id: 'enemy.bandit-captain', name: 'Bandit Captain', family: 'Bandits', familyId: 'family.bandits', maxLife: 280, baseAttackDamageMin: 25, baseAttackDamageMax: 25, accuracyRating: 75, armour: 55, evasionRating: 20, baseAttackTime: 2.9, attackBlockChance: 0.08,
    traits: [{ id: 'commanding-presence', name: 'Commanding Presence', description: 'A rare elite with strong defenses and valuable drops.' }], actions: [],
    loot: [{ itemId: 'item.bandit-scrap', chance: 1, minQuantity: 2, maxQuantity: 4 }, { itemId: 'item.coin-pouch', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.hunter-sword', chance: 0.1, minQuantity: 1, maxQuantity: 1 }], resistances: {}, additionalPhysicalDamageReduction: 0.2, icon: 'shield', accent: 'gold',
  },
]

export const enemyDefinitions = deepFreeze<EnemyDefinition[]>(authoredEnemyDefinitions)

export const enemyById = Object.fromEntries(enemyDefinitions.map((enemy) => [enemy.id, enemy])) as Record<string, EnemyDefinition>
