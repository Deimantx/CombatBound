import { itemById, type ItemDefinition } from "../data/items";
import type { InventoryState } from "../inventory/inventoryTypes";
import {
  EQUIPMENT_SLOT_DEFINITIONS,
  type EquipmentSlotId,
  type EquipmentState,
  getEquipmentSlotDefinition,
} from "./equipmentTypes";
import { isEquipmentSlotId } from "./equipmentTypes";

export type EquipmentChangeFailureReason =
  | "unknown-item"
  | "unknown-slot"
  | "wrong-slot-kind"
  | "not-owned"
  | "no-spare-copy"
  | "mastery-level";

export interface EquipmentChangeValidation {
  valid: boolean;
  reason?: EquipmentChangeFailureReason;
}

export function canEquipItemToSlot(item: ItemDefinition, slotId: EquipmentSlotId) {
  return item.equipmentSlotKind === getEquipmentSlotDefinition(slotId).kind;
}

export function validateEquipmentChange({
  item,
  slotId,
  inventory,
  equipment,
  masteryLevel,
}: {
  item: ItemDefinition | undefined;
  slotId: EquipmentSlotId | string;
  inventory: InventoryState;
  equipment: EquipmentState;
  masteryLevel: number;
}): EquipmentChangeValidation {
  if (!item) return { valid: false, reason: "unknown-item" };
  if (!isEquipmentSlotId(slotId)) return { valid: false, reason: "unknown-slot" };
  if (!canEquipItemToSlot(item, slotId)) return { valid: false, reason: "wrong-slot-kind" };
  const quantity = Math.max(0, Math.floor(inventory.quantities[item.id] ?? 0));
  if (quantity <= 0) return { valid: false, reason: "not-owned" };
  if (getAvailableItemCopies(inventory, equipment, item.id, slotId) <= 0)
    return { valid: false, reason: "no-spare-copy" };
  if (
    item.requiredMasteryLevel !== undefined &&
    Math.max(0, Math.floor(masteryLevel)) < item.requiredMasteryLevel
  )
    return { valid: false, reason: "mastery-level" };
  return { valid: true };
}

export function countEquippedItemCopies(
  equipment: EquipmentState,
  itemId: string,
  excludeSlot?: EquipmentSlotId,
) {
  return EQUIPMENT_SLOT_DEFINITIONS.reduce(
    (count, slot) => count + (slot.id !== excludeSlot && equipment.slots[slot.id] === itemId ? 1 : 0),
    0,
  );
}

export function getAvailableItemCopies(
  inventory: InventoryState,
  equipment: EquipmentState,
  itemId: string,
  targetSlot?: EquipmentSlotId,
) {
  const owned = Math.max(0, Math.floor(inventory.quantities[itemId] ?? 0));
  return Math.max(0, owned - countEquippedItemCopies(equipment, itemId, targetSlot));
}

export function normalizeEquipmentState(
  value: unknown,
  quantities?: Record<string, number>,
  items: Record<string, ItemDefinition> = itemById,
): EquipmentState {
  const rawSlots = value && typeof value === "object" && !Array.isArray(value)
    ? (value as { slots?: unknown }).slots
    : undefined;
  const source = rawSlots && typeof rawSlots === "object" && !Array.isArray(rawSlots)
    ? rawSlots as Record<string, unknown>
    : {};
  const usedCopies: Record<string, number> = {};
  const slots: Partial<Record<EquipmentSlotId, string>> = {};
  for (const definition of EQUIPMENT_SLOT_DEFINITIONS) {
    const itemId = source[definition.id];
    if (typeof itemId !== "string") continue;
    const item = items[itemId];
    if (!item || !canEquipItemToSlot(item, definition.id)) continue;
    const maxCopies = quantities ? Math.max(0, Math.floor(quantities[itemId] ?? 0)) : Number.POSITIVE_INFINITY;
    const used = usedCopies[itemId] ?? 0;
    if (used >= maxCopies) continue;
    slots[definition.id] = itemId;
    usedCopies[itemId] = used + 1;
  }
  return { slots };
}

export const normalizeEquipmentSlots = normalizeEquipmentState;
