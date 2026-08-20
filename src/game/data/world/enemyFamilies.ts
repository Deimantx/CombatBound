import { deepFreeze } from '../freeze'

export const enemyFamilyDefinitions = deepFreeze([
  { id: 'family.wolves', name: 'Wolves', description: 'A mobile pack that hunts the forest margins.' },
  { id: 'family.bandits', name: 'Bandits', description: 'Organized raiders occupying old roads and camps.' },
  { id: 'family.ironback-crabs', name: 'Ironback Crabs', description: 'Armoured riverbed predators hardened by mineral deposits.' },
  { id: 'family.fallen-watch', name: 'Fallen Watch', description: 'Scavengers and deserters occupying a ruined watchpost.' },
  { id: 'family.undead', name: 'Undead', description: 'Restless dead bound to old graves and root-choked earth.' },
  { id: 'family.blighted', name: 'Blighted', description: 'Warped beasts and living growth altered by corruption.' },
  { id: 'family.dark-spirits', name: 'Dark Spirits', description: 'Shades and wraiths haunting an abandoned temple.' },
])

export const enemyFamilyById = Object.fromEntries(enemyFamilyDefinitions.map((family) => [family.id, family])) as Record<string, typeof enemyFamilyDefinitions[number]>
