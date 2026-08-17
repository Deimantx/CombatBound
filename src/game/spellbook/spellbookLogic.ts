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

/** V12 boundary compatibility: the removed pulse kept its slot as Lightning Pulse. */
export function normalizeSpellId(id: unknown): string | null {
  if (typeof id !== "string") return null;
  const normalized = id === "spell.disrupting-pulse" ? "spell.lightning-pulse" : id;
  return spellDefinitions.some((spell) => spell.id === normalized) ? normalized : null;
}

export function normalizeSpellbook(
  value: Partial<SpellbookState> | undefined,
): SpellbookState {
  const knownSpellIds = Array.from(
    new Set(
      (value?.knownSpellIds ?? []).map(normalizeSpellId).filter((id): id is string => Boolean(id)),
    ),
  );
  const used = new Set<string>();
  const equippedSpellSlots = Array.from(
    { length: COMBAT_SPELL_SLOT_COUNT },
    (_, index) => {
      const id = normalizeSpellId(value?.equippedSpellSlots?.[index]);
      if (!id || !knownSpellIds.includes(id) || used.has(id))
        return null;
      used.add(id);
      return id;
    },
  );
  return { knownSpellIds, equippedSpellSlots };
}

function validSlot(slot: number) {
  return Number.isInteger(slot) && slot >= 0 && slot < COMBAT_SPELL_SLOT_COUNT;
}

function knownSpell(value: SpellbookState, spellId: string) {
  const normalized = normalizeSpellId(spellId);
  return Boolean(normalized && value.knownSpellIds.includes(normalized));
}

/** Equip a known spell into a slot. A spell already equipped elsewhere is moved. */
export function equipSpellToSlot(value: SpellbookState, spellId: string, targetSlot: number): SpellbookState {
  const normalizedSpellId = normalizeSpellId(spellId);
  if (!validSlot(targetSlot) || !normalizedSpellId || !knownSpell(value, normalizedSpellId)) return value;
  const sourceSlot = value.equippedSpellSlots.findIndex((id) => id === normalizedSpellId);
  if (sourceSlot === targetSlot) return value;
  const equippedSpellSlots = [...value.equippedSpellSlots];
  if (sourceSlot >= 0) equippedSpellSlots[sourceSlot] = null;
  equippedSpellSlots[targetSlot] = normalizedSpellId;
  return { ...value, equippedSpellSlots };
}

/** Move an equipped spell, swapping when the destination is occupied. */
export function moveEquippedSpell(value: SpellbookState, sourceSlot: number, targetSlot: number, expectedSpellId?: string): SpellbookState {
  if (!validSlot(sourceSlot) || !validSlot(targetSlot) || sourceSlot === targetSlot) return value;
  const sourceSpellId = value.equippedSpellSlots[sourceSlot];
  if (!sourceSpellId || !knownSpell(value, sourceSpellId) || (expectedSpellId && sourceSpellId !== expectedSpellId)) return value;
  const equippedSpellSlots = [...value.equippedSpellSlots];
  [equippedSpellSlots[sourceSlot], equippedSpellSlots[targetSlot]] = [
    equippedSpellSlots[targetSlot] ?? null,
    equippedSpellSlots[sourceSlot] ?? null,
  ];
  return { ...value, equippedSpellSlots };
}

export function unequipSpellSlot(value: SpellbookState, slot: number): SpellbookState {
  if (!validSlot(slot) || !value.equippedSpellSlots[slot]) return value;
  const equippedSpellSlots = [...value.equippedSpellSlots];
  equippedSpellSlots[slot] = null;
  return { ...value, equippedSpellSlots };
}
