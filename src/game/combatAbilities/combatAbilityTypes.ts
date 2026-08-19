import type { PlayerActionKind } from "../combat/combatTypes";

export const COMBAT_ABILITY_SLOT_COUNT = 5;

export interface CombatAbilityLoadoutState {
  slots: Array<string | null>;
}

export type CombatAbilityCatalogueEntry =
  | { kind: "core"; id: string; name: string; description: string; icon: string }
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
      kind: "spell";
      actionId: string;
      category: "magic";
      name: string;
      description: string;
      icon: string;
      magicProficiencyId?: string;
    };

export function isCombatAbilityLoadoutActionKind(kind: PlayerActionKind) {
  return kind === "defensive" || kind === "weapon-skill" || kind === "spell";
}
