import type { EnemyDefinition } from '../combat/combatTypes'
import { deepFreeze } from './freeze'
import { deepWoodsLootTuning } from './loot/deepWoodsLootTuning'

// Deep Woods enemy statistics and signature chances are provisional authored
// content until combat balance is finalized. [TUNING]
const t = deepWoodsLootTuning
const signature = (itemId: string, chance = t.signatureDropChance) => ({ itemId, chance, minQuantity: 1, maxQuantity: 1 })

const authoredEnemyDefinitions: EnemyDefinition[] = [
  {
    id: 'enemy.grey-wolf', name: 'Grey Wolf', family: 'Wolves', familyId: 'family.wolves', maxLife: 120, baseAttackDamageMin: 14, baseAttackDamageMax: 14, accuracyRating: 70, armour: 30, evasionRating: 35, baseAttackTime: 2.2, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.predator', rank: 1 }], combatAbilityIds: ['enemy-ability.savage-bite'], loot: [], resistances: { fire: -0.2 }, icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.wolf-stalker', name: 'Wolf Stalker', family: 'Wolves', familyId: 'family.wolves', maxLife: 105, baseAttackDamageMin: 12, baseAttackDamageMax: 12, accuracyRating: 76, armour: 35, evasionRating: 60, baseAttackTime: 2, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.first-strike', rank: 1 }], combatAbilityIds: ['enemy-ability.rending-bite'], loot: [], resistances: { fire: -0.2 }, icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.wolf-ravager', name: 'Wolf Ravager', family: 'Wolves', familyId: 'family.wolves', maxLife: 165, baseAttackDamageMin: 20, baseAttackDamageMax: 20, accuracyRating: 66, armour: 34, evasionRating: 25, baseAttackTime: 2.8, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.bloodied-fury', rank: 1 }], combatAbilityIds: ['enemy-ability.maul'], loot: [], resistances: { fire: -0.2 }, icon: 'shield', accent: 'red',
  },
  {
    id: 'enemy.alpha-wolf', name: 'Alpha Wolf', family: 'Wolves', familyId: 'family.wolves', maxLife: 260, baseAttackDamageMin: 26, baseAttackDamageMax: 26, accuracyRating: 78, armour: 48, evasionRating: 20, baseAttackTime: 2.7, blockChance: 0.04, blockEffect: 0.3,
    enemyTier: 'normal', traits: [{ traitId: 'trait.predator', rank: 2 }, { traitId: 'trait.bloodied-fury', rank: 1 }], combatAbilityIds: ['enemy-ability.savage-bite', 'enemy-ability.maul'], loot: [signature('item.alpha-fang')], resistances: { fire: -0.2 }, icon: 'shield', accent: 'gold',
  },

  {
    id: 'enemy.stoneback-crab', name: 'Stoneback Crab', family: 'Ironback Crabs', familyId: 'family.ironback-crabs', maxLife: 150, baseAttackDamageMin: 16, baseAttackDamageMax: 16, accuracyRating: 65, armour: 55, evasionRating: 20, baseAttackTime: 2.8, blockChance: 0.03, blockEffect: 0.3,
    enemyTier: 'normal', traits: [{ traitId: 'trait.thick-hide', rank: 1 }], combatAbilityIds: ['enemy-ability.heavy-slam'], loot: [], resistances: {}, icon: 'shield', accent: 'blue',
  },
  {
    id: 'enemy.ironclaw-crab', name: 'Ironclaw Crab', family: 'Ironback Crabs', familyId: 'family.ironback-crabs', maxLife: 165, baseAttackDamageMin: 19, baseAttackDamageMax: 19, accuracyRating: 70, armour: 48, evasionRating: 18, baseAttackTime: 2.6, blockChance: 0.03, blockEffect: 0.3,
    enemyTier: 'normal', traits: [{ traitId: 'trait.crushing-blows', rank: 1 }], combatAbilityIds: ['enemy-ability.armour-breaker'], loot: [], resistances: {}, icon: 'target', accent: 'blue',
  },
  {
    id: 'enemy.rustshell-crab', name: 'Rustshell Crab', family: 'Ironback Crabs', familyId: 'family.ironback-crabs', maxLife: 190, baseAttackDamageMin: 17, baseAttackDamageMax: 17, accuracyRating: 62, armour: 70, evasionRating: 10, baseAttackTime: 3, blockChance: 0.05, blockEffect: 0.3,
    enemyTier: 'normal', traits: [{ traitId: 'trait.hardened', rank: 1 }], combatAbilityIds: ['enemy-ability.stone-skin'], loot: [], resistances: {}, icon: 'shield', accent: 'blue',
  },
  {
    id: 'enemy.ironback-crusher', name: 'Ironback Crusher', family: 'Ironback Crabs', familyId: 'family.ironback-crabs', maxLife: 300, baseAttackDamageMin: 28, baseAttackDamageMax: 28, accuracyRating: 75, armour: 70, evasionRating: 15, baseAttackTime: 2.7, blockChance: 0.05, blockEffect: 0.3,
    enemyTier: 'normal', traits: [{ traitId: 'trait.unyielding', rank: 2 }, { traitId: 'trait.heavy-hitter', rank: 2 }], combatAbilityIds: ['enemy-ability.groundbreaker', 'enemy-ability.crushing-strike'], loot: [signature('item.ironback-core'), signature('item.crusher-pincer')], resistances: {}, icon: 'shield', accent: 'gold',
  },

  {
    id: 'enemy.ruins-scavenger', name: 'Ruins Scavenger', family: 'Fallen Watch', familyId: 'family.fallen-watch', maxLife: 145, baseAttackDamageMin: 15, baseAttackDamageMax: 15, accuracyRating: 75, armour: 30, evasionRating: 45, baseAttackTime: 2.3, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.swift', rank: 1 }], combatAbilityIds: ['enemy-ability.quick-shot'], loot: [], resistances: {}, icon: 'target', accent: 'gold',
  },
  {
    id: 'enemy.deserter-swordsman', name: 'Deserter Swordsman', family: 'Fallen Watch', familyId: 'family.fallen-watch', maxLife: 185, baseAttackDamageMin: 20, baseAttackDamageMax: 20, accuracyRating: 68, armour: 52, evasionRating: 20, baseAttackTime: 2.6, blockChance: 0.08, blockEffect: 0.35,
    enemyTier: 'normal', traits: [{ traitId: 'trait.counterguard', rank: 1 }], combatAbilityIds: ['enemy-ability.shield-bash'], loot: [], resistances: {}, icon: 'shield', accent: 'gold',
  },
  {
    id: 'enemy.relic-hunter', name: 'Relic Hunter', family: 'Fallen Watch', familyId: 'family.fallen-watch', maxLife: 160, baseAttackDamageMin: 18, baseAttackDamageMax: 18, accuracyRating: 82, armour: 32, evasionRating: 38, baseAttackTime: 2.4, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.first-strike', rank: 1 }], combatAbilityIds: ['enemy-ability.piercing-shot'], loot: [], resistances: {}, icon: 'target', accent: 'gold',
  },
  {
    id: 'enemy.fallen-watch-captain', name: 'Fallen Watch Captain', family: 'Fallen Watch', familyId: 'family.fallen-watch', maxLife: 290, baseAttackDamageMin: 27, baseAttackDamageMax: 27, accuracyRating: 76, armour: 62, evasionRating: 16, baseAttackTime: 2.8, blockChance: 0.1, blockEffect: 0.35,
    enemyTier: 'normal', traits: [{ traitId: 'trait.battle-hardened', rank: 1 }, { traitId: 'trait.counterguard', rank: 2 }], combatAbilityIds: ['enemy-ability.battle-cry', 'enemy-ability.armour-breaker'], loot: [signature('item.fallen-watch-insignia'), signature('item.captains-blade-fragment')], resistances: {}, icon: 'shield', accent: 'gold',
  },

  {
    id: 'enemy.restless-corpse', name: 'Restless Corpse', family: 'Undead', familyId: 'family.undead', maxLife: 170, baseAttackDamageMin: 17, baseAttackDamageMax: 17, accuracyRating: 62, armour: 38, evasionRating: 12, baseAttackTime: 2.9, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.diseased', rank: 1 }], combatAbilityIds: ['enemy-ability.infectious-wound'], loot: [], resistances: { chaos: 0.1 }, icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.gravebound-skeleton', name: 'Gravebound Skeleton', family: 'Undead', familyId: 'family.undead', maxLife: 190, baseAttackDamageMin: 19, baseAttackDamageMax: 19, accuracyRating: 65, armour: 58, evasionRating: 10, baseAttackTime: 2.8, blockChance: 0.06, blockEffect: 0.3,
    enemyTier: 'normal', traits: [{ traitId: 'trait.iron-guard', rank: 1 }], combatAbilityIds: ['enemy-ability.shield-bash'], loot: [], resistances: { chaos: 0.1 }, icon: 'shield', accent: 'red',
  },
  {
    id: 'enemy.crypt-hound', name: 'Crypt Hound', family: 'Undead', familyId: 'family.undead', maxLife: 180, baseAttackDamageMin: 21, baseAttackDamageMax: 21, accuracyRating: 76, armour: 34, evasionRating: 40, baseAttackTime: 2.3, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.swift', rank: 1 }], combatAbilityIds: ['enemy-ability.rending-bite'], loot: [], resistances: { chaos: 0.1 }, icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.blackroot-warden', name: 'Blackroot Warden', family: 'Undead', familyId: 'family.undead', maxLife: 310, baseAttackDamageMin: 26, baseAttackDamageMax: 26, accuracyRating: 72, armour: 68, evasionRating: 12, baseAttackTime: 2.9, blockChance: 0.08, blockEffect: 0.35,
    enemyTier: 'normal', traits: [{ traitId: 'trait.undying-will', rank: 1 }, { traitId: 'trait.resilient', rank: 2 }], combatAbilityIds: ['enemy-ability.cursed-strike', 'enemy-ability.guard-stance'], loot: [signature('item.wardens-grave-plate')], resistances: { chaos: 0.15 }, icon: 'shield', accent: 'gold',
  },

  {
    id: 'enemy.blighted-stag', name: 'Blighted Stag', family: 'Blighted', familyId: 'family.blighted', maxLife: 190, baseAttackDamageMin: 22, baseAttackDamageMax: 22, accuracyRating: 70, armour: 35, evasionRating: 42, baseAttackTime: 2.5, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.predator', rank: 1 }], combatAbilityIds: ['enemy-ability.headlong-charge'], loot: [], resistances: { chaos: 0.1 }, icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.thornhide-beast', name: 'Thornhide Beast', family: 'Blighted', familyId: 'family.blighted', maxLife: 220, baseAttackDamageMin: 21, baseAttackDamageMax: 21, accuracyRating: 66, armour: 52, evasionRating: 18, baseAttackTime: 2.8, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.spiked-hide', rank: 1 }], combatAbilityIds: ['enemy-ability.stone-skin'], loot: [], resistances: { chaos: 0.1 }, icon: 'shield', accent: 'red',
  },
  {
    id: 'enemy.rotwood-creeper', name: 'Rotwood Creeper', family: 'Blighted', familyId: 'family.blighted', maxLife: 205, baseAttackDamageMin: 20, baseAttackDamageMax: 20, accuracyRating: 68, armour: 44, evasionRating: 22, baseAttackTime: 2.7, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.regenerator', rank: 1 }], combatAbilityIds: ['enemy-ability.toxic-spit'], loot: [], resistances: { chaos: 0.15 }, icon: 'target', accent: 'red',
  },
  {
    id: 'enemy.blightheart-guardian', name: 'Blightheart Guardian', family: 'Blighted', familyId: 'family.blighted', maxLife: 330, baseAttackDamageMin: 29, baseAttackDamageMax: 29, accuracyRating: 74, armour: 64, evasionRating: 14, baseAttackTime: 2.9, blockChance: 0.06, blockEffect: 0.3,
    enemyTier: 'normal', traits: [{ traitId: 'trait.second-wind', rank: 2 }, { traitId: 'trait.withering-touch', rank: 2 }], combatAbilityIds: ['enemy-ability.arcane-ward', 'enemy-ability.withering-blast'], loot: [signature('item.guardian-thorn')], resistances: { chaos: 0.2 }, icon: 'shield', accent: 'gold',
  },

  {
    id: 'enemy.temple-shade', name: 'Temple Shade', family: 'Dark Spirits', familyId: 'family.dark-spirits', maxLife: 180, baseAttackDamageMin: 20, baseAttackDamageMax: 20, accuracyRating: 72, armour: 28, evasionRating: 55, baseAttackTime: 2.5, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.elusive', rank: 1 }], combatAbilityIds: ['enemy-ability.shadow-bolt'], loot: [], resistances: { chaos: 0.2 }, icon: 'target', accent: 'blue',
  },
  {
    id: 'enemy.whispering-spirit', name: 'Whispering Spirit', family: 'Dark Spirits', familyId: 'family.dark-spirits', maxLife: 195, baseAttackDamageMin: 21, baseAttackDamageMax: 21, accuracyRating: 70, armour: 30, evasionRating: 45, baseAttackTime: 2.6, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.arcane-adaptation', rank: 1 }], combatAbilityIds: ['enemy-ability.withering-blast'], loot: [], resistances: { chaos: 0.25 }, icon: 'target', accent: 'blue',
  },
  {
    id: 'enemy.bound-wraith', name: 'Bound Wraith', family: 'Dark Spirits', familyId: 'family.dark-spirits', maxLife: 220, baseAttackDamageMin: 24, baseAttackDamageMax: 24, accuracyRating: 74, armour: 34, evasionRating: 32, baseAttackTime: 2.7, blockChance: 0,
    enemyTier: 'normal', traits: [{ traitId: 'trait.lifedrinker', rank: 1 }], combatAbilityIds: ['enemy-ability.life-drain'], loot: [], resistances: { chaos: 0.3 }, icon: 'target', accent: 'blue',
  },
  {
    id: 'enemy.hollow-bell-revenant', name: 'Hollow Bell Revenant', family: 'Dark Spirits', familyId: 'family.dark-spirits', maxLife: 350, baseAttackDamageMin: 30, baseAttackDamageMax: 30, accuracyRating: 76, armour: 58, evasionRating: 18, baseAttackTime: 2.8, blockChance: 0.04, blockEffect: 0.3,
    enemyTier: 'normal', traits: [{ traitId: 'trait.resilient', rank: 2 }, { traitId: 'trait.arcane-ward', rank: 2 }], combatAbilityIds: ['enemy-ability.shadow-bolt', 'enemy-ability.arcane-ward'], loot: [signature('item.hollow-bell-core'), signature('item.black-bell-fragment')], resistances: { chaos: 0.35 }, icon: 'shield', accent: 'gold',
  },

  // Old Road prototype content remains functional. Bandit Captain is Normal
  // under the current global no-Elite assignment rule. [TUNING]
  {
    id: 'enemy.forest-bandit', name: 'Forest Bandit', family: 'Bandits', familyId: 'family.bandits', maxLife: 180, baseAttackDamageMin: 18, baseAttackDamageMax: 18, accuracyRating: 65, armour: 45, evasionRating: 25, baseAttackTime: 2.6, blockChance: 0.05, blockEffect: 0.3,
    enemyTier: 'normal', traits: [], combatAbilityIds: [],
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.45, minQuantity: 1, maxQuantity: 1 }, { itemId: 'item.hunter-armor', chance: 0.2, minQuantity: 1, maxQuantity: 1 }], resistances: {}, icon: 'shield', accent: 'blue',
  },
  {
    id: 'enemy.bandit-archer', name: 'Bandit Archer', family: 'Bandits', familyId: 'family.bandits', maxLife: 140, baseAttackDamageMin: 16, baseAttackDamageMax: 16, accuracyRating: 80, armour: 25, evasionRating: 50, baseAttackTime: 3, blockChance: 0,
    enemyTier: 'normal', traits: [], combatAbilityIds: ['enemy-ability.charged-shot'],
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.6, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.hunter-sword', chance: 0.2, minQuantity: 1, maxQuantity: 1 }], resistances: {}, icon: 'target', accent: 'gold',
  },
  {
    id: 'enemy.bandit-scout', name: 'Bandit Scout', family: 'Bandits', familyId: 'family.bandits', maxLife: 105, baseAttackDamageMin: 12, baseAttackDamageMax: 12, accuracyRating: 84, armour: 22, evasionRating: 65, baseAttackTime: 2.1, blockChance: 0,
    enemyTier: 'normal', traits: [], combatAbilityIds: [],
    loot: [{ itemId: 'item.bandit-scrap', chance: 0.85, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.coin-pouch', chance: 0.35, minQuantity: 1, maxQuantity: 1 }], resistances: {}, icon: 'target', accent: 'blue',
  },
  {
    id: 'enemy.bandit-captain', name: 'Bandit Captain', family: 'Bandits', familyId: 'family.bandits', maxLife: 280, baseAttackDamageMin: 25, baseAttackDamageMax: 25, accuracyRating: 75, armour: 55, evasionRating: 20, baseAttackTime: 2.9, blockChance: 0.08, blockEffect: 0.3,
    enemyTier: 'normal', traits: [], combatAbilityIds: [],
    loot: [{ itemId: 'item.bandit-scrap', chance: 1, minQuantity: 2, maxQuantity: 4 }, { itemId: 'item.coin-pouch', chance: 0.8, minQuantity: 1, maxQuantity: 2 }, { itemId: 'item.hunter-sword', chance: 0.1, minQuantity: 1, maxQuantity: 1 }], resistances: {}, icon: 'shield', accent: 'gold',
  },
]

export const enemyDefinitions = deepFreeze<EnemyDefinition[]>(authoredEnemyDefinitions)

export const enemyById = Object.fromEntries(enemyDefinitions.map((enemy) => [enemy.id, enemy])) as Record<string, EnemyDefinition>
