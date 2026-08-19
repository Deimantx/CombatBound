import { getActiveAbilityActionDefinitions } from "../combat/playerActions";
import { spellDefinitions } from "../data/spells";
import { normalizeSpellId } from "../spellbook/spellbookLogic";
import { COMBAT_ABILITY_SLOT_COUNT, type CombatAbilityLoadoutState } from "./combatAbilityTypes";

const defaultActiveSlots = [
  "defense.guard",
  "defense.evasive-step",
  "defense.brace",
  null,
  null,
] as Array<string | null>;

const slottableActionIds = new Set([
  ...getActiveAbilityActionDefinitions().map((action) => action.id),
  ...spellDefinitions.map((spell) => spell.id),
]);

function validSlot(slot: number) {
  return Number.isInteger(slot) && slot >= 0 && slot < COMBAT_ABILITY_SLOT_COUNT;
}

function knownAction(id: string, knownSpellIds: readonly string[]) {
  if (!slottableActionIds.has(id)) return false;
  const isSpell = spellDefinitions.some((spell) => spell.id === id);
  return !isSpell || knownSpellIds.includes(id);
}

export function createInitialCombatAbilityLoadout(
  knownSpellIds: readonly string[] = spellDefinitions.map((spell) => spell.id),
): CombatAbilityLoadoutState {
  const slots = [...defaultActiveSlots];
  for (const spellId of spellDefinitions.map((spell) => spell.id)) {
    if (!knownSpellIds.includes(spellId)) continue;
    const emptySlot = slots.findIndex((slot) => slot === null);
    if (emptySlot < 0) break;
    slots[emptySlot] = spellId;
  }
  return { slots };
}

export function normalizeCombatAbilityLoadout(
  value: unknown,
  knownSpellIds: readonly string[] = spellDefinitions.map((spell) => spell.id),
): CombatAbilityLoadoutState {
  const raw = value && typeof value === "object" ? value as { slots?: unknown } : {};
  const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];
  const used = new Set<string>();
  const slots = Array.from({ length: COMBAT_ABILITY_SLOT_COUNT }, (_, index) => {
    const rawId = rawSlots[index];
    const id = typeof rawId === "string" ? normalizeSpellId(rawId) ?? rawId : null;
    if (!id || !knownAction(id, knownSpellIds) || used.has(id)) return null;
    used.add(id);
    return id;
  });
  return { slots };
}

export function equipCombatAbility(
  value: CombatAbilityLoadoutState,
  actionId: string,
  targetSlot: number,
  knownSpellIds: readonly string[] = spellDefinitions.map((spell) => spell.id),
): CombatAbilityLoadoutState {
  if (!validSlot(targetSlot) || !knownAction(actionId, knownSpellIds)) return value;
  const sourceSlot = value.slots.findIndex((id) => id === actionId);
  if (sourceSlot === targetSlot) return value;
  const slots = [...value.slots];
  if (sourceSlot >= 0) slots[sourceSlot] = null;
  slots[targetSlot] = actionId;
  return { ...value, slots };
}

export function moveCombatAbility(
  value: CombatAbilityLoadoutState,
  sourceSlot: number,
  targetSlot: number,
  expectedActionId?: string,
): CombatAbilityLoadoutState {
  if (!validSlot(sourceSlot) || !validSlot(targetSlot) || sourceSlot === targetSlot) return value;
  const sourceActionId = value.slots[sourceSlot];
  if (!sourceActionId || (expectedActionId && sourceActionId !== expectedActionId)) return value;
  const slots = [...value.slots];
  [slots[sourceSlot], slots[targetSlot]] = [slots[targetSlot] ?? null, slots[sourceSlot] ?? null];
  return { ...value, slots };
}

export function unequipCombatAbility(value: CombatAbilityLoadoutState, slot: number): CombatAbilityLoadoutState {
  if (!validSlot(slot) || !value.slots[slot]) return value;
  const slots = [...value.slots];
  slots[slot] = null;
  return { ...value, slots };
}
