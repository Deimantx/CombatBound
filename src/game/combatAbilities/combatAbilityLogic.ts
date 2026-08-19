import { getActiveAbilityActionDefinitions } from "../combat/playerActions";
import { magicArtDefinitions } from "../data/magicArts";
import { COMBAT_ABILITY_SLOT_COUNT, type CombatAbilityLoadoutState } from "./combatAbilityTypes";

const defaultActiveSlots = [
  "defense.guard",
  "defense.evasive-step",
  "defense.brace",
  "magic-art.earth-shield",
  null,
] as Array<string | null>;

const slottableActionIds = new Set([
  ...getActiveAbilityActionDefinitions().map((action) => action.id),
  ...magicArtDefinitions.map((art) => art.id),
]);

function validSlot(slot: number) {
  return Number.isInteger(slot) && slot >= 0 && slot < COMBAT_ABILITY_SLOT_COUNT;
}

function knownAction(id: string, knownArtIds: readonly string[] = []) {
  if (!slottableActionIds.has(id)) return false;
  const isMagicArt = magicArtDefinitions.some((art) => art.id === id);
  return !isMagicArt || knownArtIds.includes(id);
}

export function createInitialCombatAbilityLoadout(
  knownArtIds: readonly string[] = [],
): CombatAbilityLoadoutState {
  return knownArtIds.length > 0 ? { slots: [...defaultActiveSlots] } : { slots: defaultActiveSlots.map((id) => id?.startsWith("magic-art.") ? null : id) };
}

export function normalizeCombatAbilityLoadout(
  value: unknown,
  knownArtIds: readonly string[] = [],
): CombatAbilityLoadoutState {
  const raw = value && typeof value === "object" ? value as { slots?: unknown } : {};
  const rawSlots = Array.isArray(raw.slots) ? raw.slots : [];
  const used = new Set<string>();
  const slots = Array.from({ length: COMBAT_ABILITY_SLOT_COUNT }, (_, index) => {
    const rawId = rawSlots[index];
    const id = typeof rawId === "string" ? rawId : null;
    if (!id || !knownAction(id, knownArtIds) || used.has(id)) return null;
    used.add(id);
    return id;
  });
  return { slots };
}

export function equipCombatAbility(
  value: CombatAbilityLoadoutState,
  actionId: string,
  targetSlot: number,
  knownArtIds: readonly string[] = [],
): CombatAbilityLoadoutState {
  if (!validSlot(targetSlot) || !knownAction(actionId, knownArtIds)) return value;
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
