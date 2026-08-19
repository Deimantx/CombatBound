import type { GameSaveV14 } from "./saveTypes";
import { proficiencyById } from "../data/proficiencies";
import { perkById } from "../data/proficiencyPerks";
import { COMBAT_ABILITY_SLOT_COUNT } from "../combatAbilities/combatAbilityTypes";
import { spellDefinitions } from "../data/spells";
import { getActiveAbilityActionDefinitions } from "../combat/playerActions";
import { isEquipmentSlotId } from "../equipment/equipmentTypes";
import { itemById } from "../data/items";
import { isItemInstanceId, itemInstanceSequence } from "../items/itemTypes";
import { canEquipItemToSlot } from "../equipment/equipmentRules";
import { validateItemInstance } from "../items/itemInstanceValidation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isGameSave(value: unknown): value is GameSaveV14 {
  if (
    !isRecord(value) ||
    value.version !== 14 ||
    typeof value.gold !== "number" ||
    !isRecord(value.progression) ||
    !isRecord(value.inventory) ||
    !isRecord(value.equipment) ||
    !isRecord(value.collection) ||
    !isRecord(value.settings) ||
    !isRecord(value.spellbook) ||
    !isRecord(value.combatAutomation) ||
    !isRecord(value.combatAutomationPresets) ||
    !isRecord(value.combatAbilities)
  )
    return false;
  const progression = value.progression;
  if (
    !isRecord(progression.proficiencies) ||
    typeof progression.hunterRankPoints !== "number" ||
    !Number.isFinite(progression.hunterRankPoints) ||
    progression.hunterRankPoints < 0 ||
    typeof progression.bonusPerkPoints !== "number" ||
    !Number.isInteger(progression.bonusPerkPoints) ||
    progression.bonusPerkPoints < 0 ||
    !isRecord(progression.purchasedPerks)
  )
    return false;
  for (const [id, progress] of Object.entries(progression.proficiencies))
    if (
      !proficiencyById[id] ||
      !isRecord(progress) ||
      progress.proficiencyId !== id ||
      typeof progress.totalXp !== "number" ||
      progress.totalXp < 0
    )
      return false;
  if (
    Object.entries(progression.purchasedPerks).some(([perkId, rank]) => {
      const perk = perkById[perkId];
      if (!perk || typeof rank !== "number" || !Number.isInteger(rank))
        return true;
      return (
        rank < 0 ||
        rank > perk.maxRank ||
        (perk.branch !== "Legacy" &&
          !proficiencyById[perk.proficiencyId].perkIds.includes(perkId))
      );
    })
  )
    return false;
  const inventory = value.inventory as unknown as GameSaveV14["inventory"];
  const equipment = value.equipment as unknown as GameSaveV14["equipment"];
  const collection = value.collection;
  const settings = value.settings;
  const spellbook = value.spellbook;
  const automation = value.combatAutomation;
  const automationPresets = value.combatAutomationPresets;
  const combatAbilities = value.combatAbilities;
  if (
    !isRecord(inventory.stackables) ||
    !isRecord(inventory.instances) ||
    typeof inventory.nextInstanceSequence !== "number" ||
    !Number.isInteger(inventory.nextInstanceSequence) ||
    inventory.nextInstanceSequence < 1 ||
    !isRecord(equipment.slots) ||
    !Array.isArray(collection.discoveredItems) ||
    !isRecord(collection.targets)
  )
    return false;
  const instanceIds = new Set<string>();
  let highestInstanceSequence = 0;
  for (const [definitionId, quantity] of Object.entries(inventory.stackables)) {
    const definition = itemById[definitionId];
    if (!definition || definition.inventoryMode !== "stackable" || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 0) return false;
  }
  for (const [key, rawInstance] of Object.entries(inventory.instances)) {
    if (!isRecord(rawInstance) || rawInstance.id !== key || !isItemInstanceId(rawInstance.id) || rawInstance.version !== 2 || typeof rawInstance.definitionId !== "string" || !validateItemInstance(rawInstance).valid) return false;
    const definition = itemById[rawInstance.definitionId];
    if (!definition || definition.inventoryMode !== "instance") return false;
    instanceIds.add(key);
    highestInstanceSequence = Math.max(highestInstanceSequence, itemInstanceSequence(key));
  }
  if (inventory.nextInstanceSequence <= highestInstanceSequence) return false;
  for (const [slot, instanceId] of Object.entries(equipment.slots)) {
    if (!isEquipmentSlotId(slot) || typeof instanceId !== "string" || !instanceIds.has(instanceId)) return false;
    const instance = inventory.instances[instanceId];
    const definition = instance && typeof instance.definitionId === "string" ? itemById[instance.definitionId] : undefined;
    if (!definition || !canEquipItemToSlot(definition, slot)) return false;
    if (Object.entries(equipment.slots).filter(([, value]) => value === instanceId).length > 1) return false;
  }
  if (
    !Array.isArray(spellbook.knownSpellIds) ||
    spellbook.knownSpellIds.some((id) => typeof id !== "string" || !spellDefinitions.some((spell) => spell.id === id))
  )
    return false;
  if (
    typeof automation.enabled !== "boolean" ||
    !Array.isArray(automation.rules) ||
    !Array.isArray(automation.targetPriorityRules) ||
    !Array.isArray(automationPresets.slots) ||
    !Array.isArray(combatAbilities.slots) ||
    combatAbilities.slots.length !== COMBAT_ABILITY_SLOT_COUNT ||
    "activeSlots" in combatAbilities ||
    "techniqueSlots" in combatAbilities
  )
    return false;
  const knownSpellIds = new Set(spellbook.knownSpellIds as string[]);
  const validActionIds = new Set([
    ...getActiveAbilityActionDefinitions().map((action) => action.id),
    ...spellDefinitions.map((spell) => spell.id),
  ]);
  const usedActionIds = new Set<string>();
  for (const actionId of combatAbilities.slots) {
    if (actionId === null) continue;
    if (typeof actionId !== "string" || !validActionIds.has(actionId) || usedActionIds.has(actionId)) return false;
    if (spellDefinitions.some((spell) => spell.id === actionId) && !knownSpellIds.has(actionId)) return false;
    usedActionIds.add(actionId);
  }
  return (
    typeof settings.reducedMotion === "boolean" &&
    typeof settings.showInspectorButton === "boolean"
  );
}
