import { deepFreeze } from "../freeze";

export type WeaponFamilyId =
  | "sword"
  | "axe"
  | "mace"
  | "dagger"
  | "greatsword"
  | "great-axe"
  | "warhammer"
  | "spear";

export type WeaponArchetypeId = string;

export interface WeaponArchetypeDefinition {
  id: WeaponArchetypeId;
  familyId: WeaponFamilyId;
  name: string;
  handedness: "one-handed" | "two-handed";
  primaryMechanicId?: string;
  secondaryMechanicId?: string;
}

export const weaponArchetypeDefinitions = deepFreeze<WeaponArchetypeDefinition[]>([
  {
    id: "weapon-archetype.longsword",
    familyId: "sword",
    name: "Longsword",
    handedness: "one-handed",
    primaryMechanicId: "weapon-mechanic.duelist-rhythm",
    secondaryMechanicId: "weapon-mechanic.riposte",
  },
]);

export const weaponArchetypeById = Object.fromEntries(
  weaponArchetypeDefinitions.map((definition) => [definition.id, definition]),
) as Record<string, WeaponArchetypeDefinition>;
