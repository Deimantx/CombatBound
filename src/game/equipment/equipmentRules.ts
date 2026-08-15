import { itemById, type ItemDefinition } from "../data/items";
import type { InventoryState } from "../inventory/inventoryTypes";
import {
  EQUIPMENT_SLOT_DEFINITIONS,
  type EquipmentSlotId,
  type EquipmentState,
  getEquipmentSlotDefinition,
} from "./equipmentTypes";

export function canEquipItemToSlot(item: ItemDefinition, slotId: EquipmentSlotId) {
  return item.equipmentSlotKind === getEquipmentSlotDefinition(slotId).kind;
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
