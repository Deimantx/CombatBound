import { spellDefinitions } from "../data/spells";
import { COMBAT_SPELL_SLOT_COUNT, type SpellbookState } from "./spellbookTypes";
export type { SpellbookState } from "./spellbookTypes";

export function createInitialSpellbook(): SpellbookState {
  return {
    knownSpellIds: spellDefinitions.map((spell) => spell.id),
    equippedSpellSlots: spellDefinitions
      .slice(0, COMBAT_SPELL_SLOT_COUNT)
      .map((spell) => spell.id),
  };
}

export function normalizeSpellbook(
  value: Partial<SpellbookState> | undefined,
): SpellbookState {
  const knownSpellIds = Array.from(
    new Set(
      (value?.knownSpellIds ?? []).filter(
        (id): id is string =>
          typeof id === "string" &&
          Boolean(spellDefinitions.find((spell) => spell.id === id)),
      ),
    ),
  );
  const used = new Set<string>();
  const equippedSpellSlots = Array.from(
    { length: COMBAT_SPELL_SLOT_COUNT },
    (_, index) => {
      const id = value?.equippedSpellSlots?.[index];
      if (typeof id !== "string" || !knownSpellIds.includes(id) || used.has(id))
        return null;
      used.add(id);
      return id;
    },
  );
  return { knownSpellIds, equippedSpellSlots };
}
