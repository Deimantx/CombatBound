const combatLocationMigration: Record<string, string> = {
  'location.wolf-den': 'location.wolfscar-hollow',
}

export function normalizeCombatLocationId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return combatLocationMigration[value] ?? value
}

export const legacyCombatLocationMigration = combatLocationMigration
