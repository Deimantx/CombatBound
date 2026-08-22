import { weaponArchetypeById } from "../data/gear/weaponArchetypes";
import { itemUpgradeNodeById } from "../data/gear/itemUpgradeTrees";
import type { ItemDefinition } from "../data/items";
import type { ItemInstance } from "../items/itemTypes";
import type { DuelistRhythmParameters, RiposteParameters, WeaponMechanicParameters } from "./weaponMechanicTypes";
import { weaponAttackProfile, weaponMechanicSchemaById } from "./weaponMechanicRegistry";

export function resolveWeaponMechanicParameters(definition: ItemDefinition, instance: ItemInstance): WeaponMechanicParameters | null {
  const archetypeId = definition.weaponArchetypeId;
  const archetype = archetypeId ? weaponArchetypeById[archetypeId] : undefined;
  if (!archetype) return null;
  const mechanicIds = [archetype.primaryMechanicId, archetype.secondaryMechanicId].filter((id): id is string => Boolean(id));
  const mechanics = Object.fromEntries(mechanicIds.map((id) => [id, { ...(weaponMechanicSchemaById[id]?.defaults ?? {}) }])) as Record<string, Record<string, number>>;
  const result: WeaponMechanicParameters = {
    archetypeId: archetype.id,
    mechanics,
    attackProfile: weaponAttackProfile(archetype),
    rhythm: mechanics["weapon-mechanic.duelist-rhythm"] as unknown as DuelistRhythmParameters | undefined,
    riposte: mechanics["weapon-mechanic.riposte"] as unknown as RiposteParameters | undefined,
  };
  for (const nodeId of instance.unlockedUpgradeNodeIds) {
    for (const effect of itemUpgradeNodeById[nodeId]?.effects ?? []) {
      if (effect.type !== "weaponMechanicModifier") continue;
      const parameters = mechanics[effect.mechanicId];
      if (parameters && effect.modifier in parameters) parameters[effect.modifier] += effect.value;
    }
  }
  return result;
}
