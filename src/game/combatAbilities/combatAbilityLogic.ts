import { getActiveAbilityActionDefinitions } from "../combat/playerActions";
import { techniqueDefinitions } from "../data/techniques";
import {
  COMBAT_ABILITY_SLOT_COUNT,
  TECHNIQUE_SLOT_COUNT,
  type CombatAbilityLoadoutState,
} from "./combatAbilityTypes";
import type { TechniqueId } from "../combat/combatTypes";

const defaultActiveSlots = [
  "defense.guard",
  "defense.evasive-step",
  "defense.brace",
  null,
  null,
] as Array<string | null>;
const defaultTechniqueSlots = [
  "careful-positioning",
  "heightened-reflexes",
] as Array<TechniqueId | null>;

const activeAbilityIds = new Set(
  getActiveAbilityActionDefinitions().map((action) => action.id),
);
const techniqueIds = new Set<TechniqueId>(
  Object.keys(techniqueDefinitions) as TechniqueId[],
);

export function createInitialCombatAbilityLoadout(): CombatAbilityLoadoutState {
  return {
    activeSlots: [...defaultActiveSlots],
    techniqueSlots: [...defaultTechniqueSlots],
  };
}

export function normalizeCombatAbilityLoadout(
  value: unknown,
): CombatAbilityLoadoutState {
  const raw = value && typeof value === "object"
    ? value as Partial<CombatAbilityLoadoutState>
    : {};
  const usedActions = new Set<string>();
  const usedTechniques = new Set<TechniqueId>();
  const activeSlots = Array.from(
    { length: COMBAT_ABILITY_SLOT_COUNT },
    (_, index) => {
      const id = raw.activeSlots?.[index];
      if (
        typeof id !== "string" ||
        !activeAbilityIds.has(id) ||
        usedActions.has(id)
      )
        return null;
      usedActions.add(id);
      return id;
    },
  );
  const techniqueSlots = Array.from(
    { length: TECHNIQUE_SLOT_COUNT },
    (_, index) => {
      const id = raw.techniqueSlots?.[index];
      if (
        typeof id !== "string" ||
        !techniqueIds.has(id as TechniqueId) ||
        usedTechniques.has(id as TechniqueId)
      )
        return null;
      usedTechniques.add(id as TechniqueId);
      return id as TechniqueId;
    },
  );
  return { activeSlots, techniqueSlots };
}

function validActiveSlot(slot: number) {
  return Number.isInteger(slot) && slot >= 0 && slot < COMBAT_ABILITY_SLOT_COUNT;
}

function validTechniqueSlot(slot: number) {
  return Number.isInteger(slot) && slot >= 0 && slot < TECHNIQUE_SLOT_COUNT;
}

function knownActiveAction(id: string) {
  return activeAbilityIds.has(id);
}

function knownTechnique(id: string): id is TechniqueId {
  return techniqueIds.has(id as TechniqueId);
}

export function equipCombatAbility(
  value: CombatAbilityLoadoutState,
  actionId: string,
  targetSlot: number,
): CombatAbilityLoadoutState {
  if (!validActiveSlot(targetSlot) || !knownActiveAction(actionId)) return value;
  const sourceSlot = value.activeSlots.findIndex((id) => id === actionId);
  if (sourceSlot === targetSlot) return value;
  const activeSlots = [...value.activeSlots];
  if (sourceSlot >= 0) activeSlots[sourceSlot] = null;
  activeSlots[targetSlot] = actionId;
  return { ...value, activeSlots };
}

export function moveCombatAbility(
  value: CombatAbilityLoadoutState,
  sourceSlot: number,
  targetSlot: number,
  expectedActionId?: string,
): CombatAbilityLoadoutState {
  if (
    !validActiveSlot(sourceSlot) ||
    !validActiveSlot(targetSlot) ||
    sourceSlot === targetSlot
  )
    return value;
  const sourceActionId = value.activeSlots[sourceSlot];
  if (
    !sourceActionId ||
    !knownActiveAction(sourceActionId) ||
    (expectedActionId && sourceActionId !== expectedActionId)
  )
    return value;
  const activeSlots = [...value.activeSlots];
  [activeSlots[sourceSlot], activeSlots[targetSlot]] = [
    activeSlots[targetSlot] ?? null,
    activeSlots[sourceSlot] ?? null,
  ];
  return { ...value, activeSlots };
}

export function unequipCombatAbility(
  value: CombatAbilityLoadoutState,
  slot: number,
): CombatAbilityLoadoutState {
  if (!validActiveSlot(slot) || !value.activeSlots[slot]) return value;
  const activeSlots = [...value.activeSlots];
  activeSlots[slot] = null;
  return { ...value, activeSlots };
}

export function equipTechnique(
  value: CombatAbilityLoadoutState,
  techniqueId: TechniqueId,
  targetSlot: number,
): CombatAbilityLoadoutState {
  if (!validTechniqueSlot(targetSlot) || !knownTechnique(techniqueId)) return value;
  const sourceSlot = value.techniqueSlots.findIndex((id) => id === techniqueId);
  if (sourceSlot === targetSlot) return value;
  const techniqueSlots = [...value.techniqueSlots];
  if (sourceSlot >= 0) techniqueSlots[sourceSlot] = null;
  techniqueSlots[targetSlot] = techniqueId;
  return { ...value, techniqueSlots };
}

export function moveTechnique(
  value: CombatAbilityLoadoutState,
  sourceSlot: number,
  targetSlot: number,
  expectedTechniqueId?: TechniqueId,
): CombatAbilityLoadoutState {
  if (
    !validTechniqueSlot(sourceSlot) ||
    !validTechniqueSlot(targetSlot) ||
    sourceSlot === targetSlot
  )
    return value;
  const sourceTechniqueId = value.techniqueSlots[sourceSlot];
  if (
    !sourceTechniqueId ||
    !knownTechnique(sourceTechniqueId) ||
    (expectedTechniqueId && sourceTechniqueId !== expectedTechniqueId)
  )
    return value;
  const techniqueSlots = [...value.techniqueSlots];
  [techniqueSlots[sourceSlot], techniqueSlots[targetSlot]] = [
    techniqueSlots[targetSlot] ?? null,
    techniqueSlots[sourceSlot] ?? null,
  ];
  return { ...value, techniqueSlots };
}

export function unequipTechnique(
  value: CombatAbilityLoadoutState,
  slot: number,
): CombatAbilityLoadoutState {
  if (!validTechniqueSlot(slot) || !value.techniqueSlots[slot]) return value;
  const techniqueSlots = [...value.techniqueSlots];
  techniqueSlots[slot] = null;
  return { ...value, techniqueSlots };
}
