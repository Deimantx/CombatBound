import type { PlayerActionKind, TechniqueId } from "../combat/combatTypes";

export const COMBAT_ABILITY_SLOT_COUNT = 5;
export const TECHNIQUE_SLOT_COUNT = 2;

export interface CombatAbilityLoadoutState {
  activeSlots: Array<string | null>;
  techniqueSlots: Array<TechniqueId | null>;
}

export type CombatAbilityCatalogueEntry =
  | {
      kind: "core";
      id: string;
      name: string;
      description: string;
      icon: string;
    }
  | {
      kind: "active-action";
      actionId: string;
      category: "active-defense" | "weapon-skill";
      name: string;
      description: string;
      icon: string;
      proficiencyId?: string;
      plannedUnlockLevel?: number;
    }
  | {
      kind: "technique";
      techniqueId: TechniqueId;
      name: string;
      description: string;
      icon: string;
    };

export function isCombatAbilityLoadoutActionKind(kind: PlayerActionKind) {
  return kind === "defensive" || kind === "weapon-skill";
}
