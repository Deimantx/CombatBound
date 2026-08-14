export const COMBAT_SPELL_SLOT_COUNT = 5

export interface SpellbookState {
  knownSpellIds: string[]
  equippedSpellSlots: Array<string | null>
}
