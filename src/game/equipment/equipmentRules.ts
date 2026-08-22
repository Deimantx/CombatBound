import { itemById, type ItemDefinition } from "../data/items";
import { getItemInstance } from "../items/itemOwnership";
import { resolveItemInstance } from "../items/itemResolver";
import { isItemInstanceId, type ItemInstanceId } from "../items/itemTypes";
import type { InventoryState } from "../inventory/inventoryTypes";
import type { ProgressionState } from "../progression/progressionTypes";
import { getProficiencyLevelForState } from "../progression/proficiencyProgression";
import { discoverProficiency } from "../progression/proficiencyProgression";
import { isTwoHandedWeapon } from "../data/gear/weaponArchetypes";
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
  | "hunter-rank"
  | "proficiency-level"
  | "two-handed-conflict";

export interface EquipmentChangeValidation {
  valid: boolean;
  reason?: EquipmentChangeFailureReason;
  proficiencyId?: string;
  requiredLevel?: number;
  currentLevel?: number;
  willDiscoverProficiency?: boolean;
}

export function canEquipItemToSlot(item: ItemDefinition, slotId: EquipmentSlotId) {
  return item.inventoryMode === "instance" && item.equipmentSlotKind === getEquipmentSlotDefinition(slotId).kind;
}

export function validateEquipmentChange({
  instanceId,
  slotId,
  inventory,
  equipment,
  hunterRank,
  progression,
  ignoreRequirements,
}: {
  instanceId: ItemInstanceId | string;
  slotId: EquipmentSlotId | string;
  inventory: InventoryState;
  equipment: EquipmentState;
  hunterRank: number;
  progression?: ProgressionState;
  ignoreRequirements?: boolean;
}): EquipmentChangeValidation {
  if (!isEquipmentSlotId(slotId)) return { valid: false, reason: "unknown-slot" };
  if (!isItemInstanceId(instanceId)) return { valid: false, reason: "invalid-instance" };
  const instance = getItemInstance(inventory, instanceId as ItemInstanceId);
  if (!instance) return { valid: false, reason: "unknown-instance" };
  const definition = itemById[instance.definitionId];
  if (!definition) return { valid: false, reason: "unknown-definition" };
  if (definition.inventoryMode !== "instance") return { valid: false, reason: "invalid-instance" };
  if (!canEquipItemToSlot(definition, slotId)) return { valid: false, reason: "wrong-slot-kind" };
  if (slotId === "offhand" && equipment.slots.weapon) {
    const weapon = getItemInstance(inventory, equipment.slots.weapon);
    const weaponDefinition = weapon ? itemById[weapon.definitionId] : undefined;
    if (weaponDefinition && isTwoHandedWeapon(weaponDefinition)) return { valid: false, reason: "two-handed-conflict" };
  }
  if (!ignoreRequirements && definition.requiredHunterRank !== undefined && Math.max(0, Math.floor(hunterRank)) < definition.requiredHunterRank)
    return { valid: false, reason: "hunter-rank" };
  if (!ignoreRequirements && definition.weaponProficiencyId && definition.requiredProficiencyLevel !== undefined) {
    const currentLevel = progression ? getProficiencyLevelForState(progression, definition.weaponProficiencyId) : 0;
    if (currentLevel < definition.requiredProficiencyLevel) {
      const canDiscoverBaseWeapon = definition.category === "weapon" && definition.materialTierId === "iron" && definition.requiredProficiencyLevel === 1 && currentLevel === 0;
      if (canDiscoverBaseWeapon) return { valid: true, proficiencyId: definition.weaponProficiencyId, requiredLevel: definition.requiredProficiencyLevel, currentLevel, willDiscoverProficiency: true };
      return { valid: false, reason: "proficiency-level", proficiencyId: definition.weaponProficiencyId, requiredLevel: definition.requiredProficiencyLevel, currentLevel };
    }
  }
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
  progression,
  ignoreRequirements,
}: {
  inventory: InventoryState;
  equipment: EquipmentState;
  instanceId: ItemInstanceId | string;
  slotId: EquipmentSlotId | string;
  hunterRank: number;
  progression?: ProgressionState;
  ignoreRequirements?: boolean;
}): { equipment: EquipmentState; validation: EquipmentChangeValidation; progression?: ProgressionState } {
  const validation = validateEquipmentChange({ instanceId, slotId, inventory, equipment, hunterRank, progression, ignoreRequirements });
  if (!validation.valid || !isEquipmentSlotId(slotId)) return { equipment, validation };
  if (equipment.slots[slotId] === instanceId) return { equipment, validation };
  const nextSlots = { ...equipment.slots };
  for (const slot of EQUIPMENT_SLOT_DEFINITIONS)
    if (nextSlots[slot.id] === instanceId) delete nextSlots[slot.id];
  const instance = getItemInstance(inventory, instanceId as ItemInstanceId);
  const definition = instance ? itemById[instance.definitionId] : undefined;
  if (slotId === "weapon" && definition && isTwoHandedWeapon(definition)) delete nextSlots.offhand;
  nextSlots[slotId] = instanceId as ItemInstanceId;
  return {
    equipment: { slots: nextSlots },
    validation,
    progression: validation.willDiscoverProficiency && progression && validation.proficiencyId
      ? discoverProficiency(progression, validation.proficiencyId as never)
      : progression,
  };
}

export function previewEquipmentChange(input: {
  inventory: InventoryState;
  equipment: EquipmentState;
  instanceId: ItemInstanceId | string;
  slotId: EquipmentSlotId | string;
  hunterRank: number;
  progression?: ProgressionState;
}) {
  return equipItemInstance({ ...input, ignoreRequirements: true });
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
  const weaponId = slots.weapon;
  const weapon = weaponId ? resolveItemInstance(inventory, weaponId, items)?.definition : undefined;
  if (weapon && isTwoHandedWeapon(weapon)) delete slots.offhand;
  return { slots };
}

export const normalizeEquipmentSlots = normalizeEquipmentState;
