import { itemById, type ItemDefinition } from "../data/items";
import { canEquipItemToSlot } from "../equipment/equipmentRules";
import { EQUIPMENT_SLOT_DEFINITIONS, isEquipmentSlotId, type EquipmentState } from "../equipment/equipmentTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import { isItemInstanceId, itemInstanceSequence, type ItemInstanceId } from "../items/itemTypes";
import { validateItemInstance } from "../items/itemInstanceValidation";

export interface ItemOwnershipValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateItemOwnershipState(
  inventory: InventoryState,
  equipment: EquipmentState,
  items: Record<string, ItemDefinition> = itemById,
): ItemOwnershipValidationResult {
  const errors: string[] = [];
  for (const [definitionId, quantity] of Object.entries(inventory.stackables)) {
    const definition = items[definitionId];
    if (!definition) errors.push(`Stackable store references unknown definition ${definitionId}`);
    else if (definition.inventoryMode !== "stackable") errors.push(`Stackable store contains instance-mode definition ${definitionId}`);
    if (!Number.isInteger(quantity) || quantity < 0) errors.push(`Stackable quantity is invalid for ${definitionId}`);
  }
  const instanceIds = new Set<string>();
  let highestSequence = 0;
  for (const [key, instance] of Object.entries(inventory.instances)) {
    if (!instance || typeof instance !== "object") {
      errors.push(`Instance record is invalid for ${key}`);
      continue;
    }
    if (key !== instance.id || !isItemInstanceId(instance.id)) errors.push(`Instance key/id mismatch for ${key}`);
    const definition = items[instance.definitionId];
    if (!definition) errors.push(`Instance ${key} references unknown definition ${instance.definitionId}`);
    else if (definition.inventoryMode !== "instance") errors.push(`Instance ${key} references stackable definition ${instance.definitionId}`);
    if (!validateItemInstance(instance, items).valid) errors.push(`Instance ${key} has invalid V2 modification state`);
    instanceIds.add(key);
    highestSequence = Math.max(highestSequence, itemInstanceSequence(key as ItemInstanceId));
  }
  if (!Number.isInteger(inventory.nextInstanceSequence) || inventory.nextInstanceSequence <= highestSequence)
    errors.push("nextInstanceSequence would collide with an existing instance");
  const equipped = new Set<string>();
  for (const slotId of Object.keys(equipment.slots))
    if (!isEquipmentSlotId(slotId)) errors.push(`Equipment contains unknown slot ${slotId}`);
  for (const slot of EQUIPMENT_SLOT_DEFINITIONS) {
    const instanceId = equipment.slots[slot.id];
    if (!instanceId) continue;
    if (!instanceIds.has(instanceId)) errors.push(`Equipment slot ${slot.id} references missing instance ${instanceId}`);
    if (equipped.has(instanceId)) errors.push(`Instance ${instanceId} is equipped in multiple slots`);
    equipped.add(instanceId);
    const instance = inventory.instances[instanceId];
    const definition = instance ? items[instance.definitionId] : undefined;
    if (definition && !canEquipItemToSlot(definition, slot.id)) errors.push(`Equipment slot ${slot.id} is incompatible with ${instanceId}`);
  }
  return { valid: errors.length === 0, errors };
}
