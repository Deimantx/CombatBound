import type { GameSaveV13 } from "./saveTypes";
import { proficiencyById } from "../data/proficiencies";
import { perkById } from "../data/proficiencyPerks";
import { COMBAT_SPELL_SLOT_COUNT } from "../spellbook/spellbookTypes";
import { isEquipmentSlotId } from "../equipment/equipmentTypes";
import { itemById } from "../data/items";
import { isItemInstanceId, itemInstanceSequence } from "../items/itemTypes";
import { canEquipItemToSlot } from "../equipment/equipmentRules";
import { validateItemInstance } from "../items/itemInstanceValidation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isGameSave(value: unknown): value is GameSaveV13 {
  if (
    !isRecord(value) ||
    value.version !== 13 ||
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
  const inventory = value.inventory as unknown as GameSaveV13["inventory"];
  const equipment = value.equipment as unknown as GameSaveV13["equipment"];
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
    !Array.isArray(spellbook.equippedSpellSlots) ||
    spellbook.equippedSpellSlots.length !== COMBAT_SPELL_SLOT_COUNT
  )
    return false;
  if (
    typeof automation.enabled !== "boolean" ||
    !Array.isArray(automation.rules) ||
    !Array.isArray(automation.targetPriorityRules) ||
    !Array.isArray(automationPresets.slots) ||
    !Array.isArray(combatAbilities.activeSlots) ||
    !Array.isArray(combatAbilities.techniqueSlots)
  )
    return false;
  return (
    typeof settings.reducedMotion === "boolean" &&
    typeof settings.showInspectorButton === "boolean"
  );
}
