import { itemById, type ItemDefinition } from "../data/items";
import { getItemInstance } from "../items/itemOwnership";
import { resolveItemInstance } from "../items/itemResolver";
import { isItemInstanceId, type ItemInstanceId } from "../items/itemTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import {
  EQUIPMENT_SLOT_DEFINITIONS,
  type EquipmentSlotId,
  type EquipmentState,
  getEquipmentSlotDefinition,
  isEquipmentSlotId,
} from "./equipmentTypes";

export type EquipmentChangeFailureReason =
  | "unknown-instance"
  | "unknown-definition"
  | "unknown-slot"
  | "invalid-instance"
  | "wrong-slot-kind"
  | "hunter-rank";

export interface EquipmentChangeValidation {
  valid: boolean;
  reason?: EquipmentChangeFailureReason;
}

export function canEquipItemToSlot(item: ItemDefinition, slotId: EquipmentSlotId) {
  return item.inventoryMode === "instance" && item.equipmentSlotKind === getEquipmentSlotDefinition(slotId).kind;
}

export function validateEquipmentChange({
  instanceId,
  slotId,
  inventory,
  hunterRank,
}: {
  instanceId: ItemInstanceId | string;
  slotId: EquipmentSlotId | string;
  inventory: InventoryState;
  equipment: EquipmentState;
  hunterRank: number;
}): EquipmentChangeValidation {
  if (!isEquipmentSlotId(slotId)) return { valid: false, reason: "unknown-slot" };
  if (!isItemInstanceId(instanceId)) return { valid: false, reason: "invalid-instance" };
  const instance = getItemInstance(inventory, instanceId as ItemInstanceId);
  if (!instance) return { valid: false, reason: "unknown-instance" };
  const definition = itemById[instance.definitionId];
  if (!definition) return { valid: false, reason: "unknown-definition" };
  if (definition.inventoryMode !== "instance") return { valid: false, reason: "invalid-instance" };
  if (!canEquipItemToSlot(definition, slotId)) return { valid: false, reason: "wrong-slot-kind" };
  if (definition.requiredHunterRank !== undefined && Math.max(0, Math.floor(hunterRank)) < definition.requiredHunterRank)
    return { valid: false, reason: "hunter-rank" };
  return { valid: true };
}

export function equippedSlotForInstance(equipment: EquipmentState, instanceId: ItemInstanceId) {
  return EQUIPMENT_SLOT_DEFINITIONS.find((slot) => equipment.slots[slot.id] === instanceId)?.id;
}

export function equipItemInstance({
  inventory,
  equipment,
  instanceId,
  slotId,
  hunterRank,
}: {
  inventory: InventoryState;
  equipment: EquipmentState;
  instanceId: ItemInstanceId | string;
  slotId: EquipmentSlotId | string;
  hunterRank: number;
}): { equipment: EquipmentState; validation: EquipmentChangeValidation } {
  const validation = validateEquipmentChange({ instanceId, slotId, inventory, equipment, hunterRank });
  if (!validation.valid || !isEquipmentSlotId(slotId)) return { equipment, validation };
  if (equipment.slots[slotId] === instanceId) return { equipment, validation };
  const nextSlots = { ...equipment.slots };
  for (const slot of EQUIPMENT_SLOT_DEFINITIONS)
    if (nextSlots[slot.id] === instanceId) delete nextSlots[slot.id];
  nextSlots[slotId] = instanceId as ItemInstanceId;
  return { equipment: { slots: nextSlots }, validation };
}

export function previewEquipmentChange(input: {
  inventory: InventoryState;
  equipment: EquipmentState;
  instanceId: ItemInstanceId | string;
  slotId: EquipmentSlotId | string;
  hunterRank: number;
}) {
  return equipItemInstance(input);
}

export function unequipEquipmentSlot(equipment: EquipmentState, slotId: EquipmentSlotId | string) {
  if (!isEquipmentSlotId(slotId) || !equipment.slots[slotId]) return equipment;
  const slots = { ...equipment.slots };
  delete slots[slotId];
  return { slots };
}

export function getCompatibleItemInstances(inventory: InventoryState, slotId: EquipmentSlotId, items: Record<string, ItemDefinition> = itemById) {
  return Object.values(inventory.instances)
    .map((instance) => resolveItemInstance(inventory, instance.id, items))
    .filter((resolved): resolved is NonNullable<typeof resolved> => Boolean(resolved && canEquipItemToSlot(resolved.definition, slotId)))
    .sort((a, b) => a.definition.name.localeCompare(b.definition.name) || a.instance.id.localeCompare(b.instance.id));
}

export function normalizeEquipmentState(
  value: unknown,
  inventory: InventoryState,
  items: Record<string, ItemDefinition> = itemById,
): EquipmentState {
  const rawSlots = value && typeof value === "object" && !Array.isArray(value)
    ? (value as { slots?: unknown }).slots
    : undefined;
  const source = rawSlots && typeof rawSlots === "object" && !Array.isArray(rawSlots)
    ? rawSlots as Record<string, unknown>
    : {};
  const slots: Partial<Record<EquipmentSlotId, ItemInstanceId>> = {};
  const used = new Set<ItemInstanceId>();
  for (const slot of EQUIPMENT_SLOT_DEFINITIONS) {
    const instanceId = source[slot.id];
    if (typeof instanceId !== "string" || !isItemInstanceId(instanceId) || used.has(instanceId as ItemInstanceId)) continue;
    const resolved = resolveItemInstance(inventory, instanceId as ItemInstanceId, items);
    if (!resolved || !canEquipItemToSlot(resolved.definition, slot.id)) continue;
    slots[slot.id] = resolved.instance.id;
    used.add(resolved.instance.id);
  }
  return { slots };
}

export const normalizeEquipmentSlots = normalizeEquipmentState;
