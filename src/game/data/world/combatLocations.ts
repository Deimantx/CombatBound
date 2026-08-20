import { deepFreeze } from '../freeze'
import type { CombatLocationDefinition } from '../../world/worldTypes'
import { deepWoodsSharedLoot } from '../loot/deepWoodsLoot'

const wolfscarTargets = ['enemy.grey-wolf', 'enemy.wolf-stalker', 'enemy.wolf-ravager', 'enemy.alpha-wolf'] as const
const ironbackTargets = ['enemy.stoneback-crab', 'enemy.ironclaw-crab', 'enemy.rustshell-crab', 'enemy.ironback-crusher'] as const
const fallenWatchTargets = ['enemy.ruins-scavenger', 'enemy.deserter-swordsman', 'enemy.relic-hunter', 'enemy.fallen-watch-captain'] as const
const blackrootTargets = ['enemy.restless-corpse', 'enemy.gravebound-skeleton', 'enemy.crypt-hound', 'enemy.blackroot-warden'] as const
const blightedTargets = ['enemy.blighted-stag', 'enemy.thornhide-beast', 'enemy.rotwood-creeper', 'enemy.blightheart-guardian'] as const
const hollowBellTargets = ['enemy.temple-shade', 'enemy.whispering-spirit', 'enemy.bound-wraith', 'enemy.hollow-bell-revenant'] as const

// Arena rank requirements and loot rates are provisional until progression and
// economy values are authored. [TUNING]
const deepWoodsArena = (location: Omit<CombatLocationDefinition, 'areaId' | 'availability' | 'requiredHunterRank'>): CombatLocationDefinition => ({
  ...location,
  areaId: 'area.deep-woods',
  availability: 'available',
  requiredHunterRank: 1,
})

export const combatLocationDefinitions = deepFreeze<CombatLocationDefinition[]>([
  deepWoodsArena({
    id: 'location.wolfscar-hollow', name: 'Wolfscar Hollow', description: 'A wolf territory carved into the deepest hunting trails.', familyId: 'family.wolves', presentation: { accent: 'green', iconKey: 'target' },
    targets: wolfscarTargets.map((enemyId) => ({ enemyId })),
    sharedLoot: deepWoodsSharedLoot.wolfscarHollow(wolfscarTargets),
  }),
  deepWoodsArena({
    id: 'location.ironback-riverbed', name: 'Ironback Riverbed', description: 'A mineral-rich riverbed occupied by heavily armoured crabs.', familyId: 'family.ironback-crabs', presentation: { accent: 'blue', iconKey: 'mountain' },
    targets: ironbackTargets.map((enemyId) => ({ enemyId })),
    sharedLoot: deepWoodsSharedLoot.ironbackRiverbed(ironbackTargets),
  }),
  deepWoodsArena({
    id: 'location.fallen-watch-ruins', name: 'Fallen Watch Ruins', description: 'A ruined watchpost occupied by scavengers and deserters.', familyId: 'family.fallen-watch', presentation: { accent: 'gold', iconKey: 'shield' },
    targets: fallenWatchTargets.map((enemyId) => ({ enemyId })),
    sharedLoot: deepWoodsSharedLoot.fallenWatchRuins(fallenWatchTargets),
  }),
  deepWoodsArena({
    id: 'location.blackroot-cemetery', name: 'Blackroot Cemetery', description: 'An old cemetery where the dead no longer stay buried.', familyId: 'family.undead', presentation: { accent: 'red', iconKey: 'target' },
    targets: blackrootTargets.map((enemyId) => ({ enemyId })),
    sharedLoot: deepWoodsSharedLoot.blackrootCemetery(blackrootTargets),
  }),
  deepWoodsArena({
    id: 'location.blighted-grove', name: 'Blighted Grove', description: 'A corrupted woodland overtaken by warped beasts and living roots.', familyId: 'family.blighted', presentation: { accent: 'green', iconKey: 'trees' },
    targets: blightedTargets.map((enemyId) => ({ enemyId })),
    sharedLoot: deepWoodsSharedLoot.blightedGrove(blightedTargets),
  }),
  deepWoodsArena({
    id: 'location.hollow-bell-temple', name: 'Hollow Bell Temple', description: 'An abandoned temple inhabited by shades, spirits and wraiths.', familyId: 'family.dark-spirits', presentation: { accent: 'blue', iconKey: 'shield' },
    targets: hollowBellTargets.map((enemyId) => ({ enemyId })),
    sharedLoot: deepWoodsSharedLoot.hollowBellTemple(hollowBellTargets),
  }),
  {
    id: 'location.bandit-camp', areaId: 'area.old-road', name: 'Bandit Camp', description: 'A guarded camp where scouts, archers, and veteran raiders rotate through the road.', familyId: 'family.bandits', availability: 'available', requiredHunterRank: 2, recommendedHunterRank: [2, 14], presentation: { accent: 'gold', iconKey: 'tent' },
    targets: [
      { enemyId: 'enemy.forest-bandit' },
      { enemyId: 'enemy.bandit-archer' },
      { enemyId: 'enemy.bandit-scout' },
      { enemyId: 'enemy.bandit-captain' },
    ],
    sharedLoot: [{ itemId: 'item.bandit-scrap', chance: 0.25, minQuantity: 1, maxQuantity: 2 }],
  },
])

const canonicalCombatLocationById = Object.fromEntries(combatLocationDefinitions.map((location) => [location.id, location])) as Record<string, CombatLocationDefinition>

/** Compatibility lookup for pre-Wolfscar fixtures and saves. New state is canonical. */
export const combatLocationById = {
  ...canonicalCombatLocationById,
  'location.wolf-den': canonicalCombatLocationById['location.wolfscar-hollow'],
} as Record<string, CombatLocationDefinition>
