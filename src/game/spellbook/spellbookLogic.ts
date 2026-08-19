import { spellDefinitions } from "../data/spells";
import type { SpellbookState } from "./spellbookTypes";
export type { SpellbookState } from "./spellbookTypes";

export function createInitialSpellbook(): SpellbookState {
  return { knownSpellIds: spellDefinitions.map((spell) => spell.id) };
}

/** V12 boundary compatibility: the removed pulse kept its slot as Lightning Pulse. */
export function normalizeSpellId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const normalized = id === "spell.disrupting-pulse" ? "spell.lightning-pulse" : id;
  return spellDefinitions.some((spell) => spell.id === normalized) ? normalized : null;
}

export function normalizeSpellbook(value: Partial<SpellbookState> | undefined): SpellbookState {
  return {
    knownSpellIds: Array.from(
      new Set(
        (value?.knownSpellIds ?? [])
          .map(normalizeSpellId)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  };
}
