import { deepFreeze } from '../freeze'

export const enemyFamilyDefinitions = deepFreeze([
  { id: 'family.wolves', name: 'Wolves', description: 'A mobile pack that hunts the forest margins.' },
  { id: 'family.bandits', name: 'Bandits', description: 'Organized raiders occupying old roads and camps.' },
])

export const enemyFamilyById = Object.fromEntries(enemyFamilyDefinitions.map((family) => [family.id, family])) as Record<string, typeof enemyFamilyDefinitions[number]>
