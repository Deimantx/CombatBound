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
  attackProfile?: {
    armorPenetrationPercent?: number;
    armorPenetrationFlat?: number;
    targetBlockEffectMultiplier?: number;
  };
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
  { id: "weapon-archetype.war-axe", familyId: "axe", name: "War Axe", handedness: "one-handed", primaryMechanicId: "weapon-mechanic.axe-wounds", secondaryMechanicId: "weapon-mechanic.axe-momentum" },
  { id: "weapon-archetype.flanged-mace", familyId: "mace", name: "Flanged Mace", handedness: "one-handed", primaryMechanicId: "weapon-mechanic.mace-crushed", secondaryMechanicId: "weapon-mechanic.mace-impact", attackProfile: { armorPenetrationPercent: 0.10, targetBlockEffectMultiplier: 0.90 } },
  { id: "weapon-archetype.combat-dagger", familyId: "dagger", name: "Combat Dagger", handedness: "one-handed", primaryMechanicId: "weapon-mechanic.dagger-combo", secondaryMechanicId: "weapon-mechanic.dagger-flurry" },
  { id: "weapon-archetype.greatsword", familyId: "greatsword", name: "Greatsword", handedness: "two-handed", primaryMechanicId: "weapon-mechanic.greatsword-heavy-rhythm", secondaryMechanicId: "weapon-mechanic.greatsword-perfect-swing" },
  { id: "weapon-archetype.executioner-great-axe", familyId: "great-axe", name: "Executioner Great Axe", handedness: "two-handed", primaryMechanicId: "weapon-mechanic.great-axe-execution", secondaryMechanicId: "weapon-mechanic.great-axe-bloodlust" },
  { id: "weapon-archetype.great-warhammer", familyId: "warhammer", name: "Great Warhammer", handedness: "two-handed", primaryMechanicId: "weapon-mechanic.warhammer-shatter", secondaryMechanicId: "weapon-mechanic.warhammer-charged-impact", attackProfile: { armorPenetrationPercent: 0.20, targetBlockEffectMultiplier: 0.80 } },
  { id: "weapon-archetype.hunting-spear", familyId: "spear", name: "Hunting Spear", handedness: "two-handed", primaryMechanicId: "weapon-mechanic.spear-mark", secondaryMechanicId: "weapon-mechanic.spear-precision-chain", attackProfile: { armorPenetrationPercent: 0.10 } },
]);

export const weaponArchetypeById = Object.fromEntries(
  weaponArchetypeDefinitions.map((definition) => [definition.id, definition]),
) as Record<string, WeaponArchetypeDefinition>;

export const weaponFamilyLabels: Record<WeaponFamilyId, string> = {
  sword: "Sword", axe: "Axe", mace: "Mace", dagger: "Dagger", greatsword: "Greatsword",
  "great-axe": "Great Axe", warhammer: "Warhammer", spear: "Spear",
};

export function getWeaponHandedness(item: { weaponArchetypeId?: string }) {
  return item.weaponArchetypeId ? weaponArchetypeById[item.weaponArchetypeId]?.handedness : undefined;
}

export function isTwoHandedWeapon(item: { weaponArchetypeId?: string }) {
  return getWeaponHandedness(item) === "two-handed";
}
