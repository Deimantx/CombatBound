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

function validSlot(slot: number) {
  return Number.isInteger(slot) && slot >= 0 && slot < COMBAT_SPELL_SLOT_COUNT;
}

function knownSpell(value: SpellbookState, spellId: string) {
  return spellDefinitions.some((spell) => spell.id === spellId) && value.knownSpellIds.includes(spellId);
}

/** Equip a known spell into a slot. A spell already equipped elsewhere is moved. */
export function equipSpellToSlot(value: SpellbookState, spellId: string, targetSlot: number): SpellbookState {
  if (!validSlot(targetSlot) || !knownSpell(value, spellId)) return value;
  const sourceSlot = value.equippedSpellSlots.findIndex((id) => id === spellId);
  if (sourceSlot === targetSlot) return value;
  const equippedSpellSlots = [...value.equippedSpellSlots];
  if (sourceSlot >= 0) equippedSpellSlots[sourceSlot] = null;
  equippedSpellSlots[targetSlot] = spellId;
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
