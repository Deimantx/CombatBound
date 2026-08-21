import { weaponArchetypeById } from "../data/gear/weaponArchetypes";
import { itemUpgradeNodeById } from "../data/gear/itemUpgradeTrees";
import type { ItemDefinition } from "../data/items";
import type { ItemInstance } from "../items/itemTypes";
import type { DuelistRhythmParameters, RiposteParameters, WeaponMechanicParameters } from "./weaponMechanicTypes";

const baseRhythm: DuelistRhythmParameters = { maxStacks: 3, accuracyPerStack: 3, attackSpeedPerStack: 0.02, maxStackDamageBonus: 0.05 };
const baseRiposte: RiposteParameters = { durationSeconds: 5, damageMore: 0.15, critChanceFlat: 0.10, grantsRhythmOnHit: 0 };

export function resolveWeaponMechanicParameters(definition: ItemDefinition, instance: ItemInstance): WeaponMechanicParameters | null {
  const archetypeId = definition.weaponArchetypeId;
  const archetype = archetypeId ? weaponArchetypeById[archetypeId] : undefined;
  if (!archetype) return null;
  const result: WeaponMechanicParameters = { archetypeId: archetype.id, rhythm: archetype.primaryMechanicId === "weapon-mechanic.duelist-rhythm" ? { ...baseRhythm } : undefined, riposte: archetype.secondaryMechanicId === "weapon-mechanic.riposte" ? { ...baseRiposte } : undefined };
  for (const nodeId of instance.unlockedUpgradeNodeIds) {
    for (const effect of itemUpgradeNodeById[nodeId]?.effects ?? []) {
      if (effect.type !== "weaponMechanicModifier") continue;
      if (effect.mechanicId === "weapon-mechanic.duelist-rhythm" && result.rhythm) {
        if (effect.modifier === "maxStacks") result.rhythm.maxStacks += effect.value;
        if (effect.modifier === "accuracyPerStack") result.rhythm.accuracyPerStack += effect.value;
        if (effect.modifier === "attackSpeedPerStack") result.rhythm.attackSpeedPerStack += effect.value;
        if (effect.modifier === "maxStackDamageBonus") result.rhythm.maxStackDamageBonus += effect.value;
      }
      if (effect.mechanicId === "weapon-mechanic.riposte" && result.riposte) {
        if (effect.modifier === "durationSeconds") result.riposte.durationSeconds += effect.value;
        if (effect.modifier === "damageMore") result.riposte.damageMore += effect.value;
        if (effect.modifier === "critChanceFlat") result.riposte.critChanceFlat += effect.value;
        if (effect.modifier === "grantsRhythmOnHit") result.riposte.grantsRhythmOnHit += effect.value;
      }
    }
  }
  return result;
}
