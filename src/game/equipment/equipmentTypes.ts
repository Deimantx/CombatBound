export type EquipmentSlotId =
  | "weapon"
  | "offhand"
  | "head"
  | "armor"
  | "gloves"
  | "boots"
  | "belt"
  | "cape"
  | "necklace"
  | "ring1"
  | "ring2"
  | "earring1"
  | "earring2";

export type EquipmentSlotKind =
  | "weapon"
  | "offhand"
  | "head"
  | "armor"
  | "gloves"
  | "boots"
  | "belt"
  | "cape"
  | "necklace"
  | "ring"
  | "earring";

export type EquipmentSlotGroup = "weapons" | "armor" | "accessories";

export interface EquipmentSlotDefinition {
  id: EquipmentSlotId;
  kind: EquipmentSlotKind;
  label: string;
  shortLabel?: string;
  group: EquipmentSlotGroup;
  icon: string;
  armorTraining: boolean;
  order: number;
}

export const EQUIPMENT_SLOT_DEFINITIONS = [
  { id: "weapon", kind: "weapon", label: "Weapon", group: "weapons", icon: "sword", armorTraining: false, order: 1 },
  { id: "offhand", kind: "offhand", label: "Offhand", group: "weapons", icon: "shield", armorTraining: false, order: 2 },
  { id: "head", kind: "head", label: "Head", group: "armor", icon: "helm", armorTraining: true, order: 3 },
  { id: "armor", kind: "armor", label: "Armor", group: "armor", icon: "shield", armorTraining: true, order: 4 },
  { id: "gloves", kind: "gloves", label: "Gloves", group: "armor", icon: "shield", armorTraining: true, order: 5 },
  { id: "boots", kind: "boots", label: "Boots", group: "armor", icon: "footprints", armorTraining: true, order: 6 },
  { id: "belt", kind: "belt", label: "Belt", group: "armor", icon: "ring", armorTraining: false, order: 7 },
  { id: "cape", kind: "cape", label: "Cape", group: "armor", icon: "spark", armorTraining: false, order: 8 },
  { id: "necklace", kind: "necklace", label: "Necklace", group: "accessories", icon: "gem", armorTraining: false, order: 9 },
  { id: "ring1", kind: "ring", label: "Ring 1", shortLabel: "Ring 1", group: "accessories", icon: "ring", armorTraining: false, order: 10 },
  { id: "ring2", kind: "ring", label: "Ring 2", shortLabel: "Ring 2", group: "accessories", icon: "ring", armorTraining: false, order: 11 },
  { id: "earring1", kind: "earring", label: "Earring 1", shortLabel: "Earring 1", group: "accessories", icon: "spark", armorTraining: false, order: 12 },
  { id: "earring2", kind: "earring", label: "Earring 2", shortLabel: "Earring 2", group: "accessories", icon: "spark", armorTraining: false, order: 13 },
] as const satisfies readonly EquipmentSlotDefinition[];

export type EquipmentSlot = EquipmentSlotId;
export const EQUIPMENT_SLOT_IDS = EQUIPMENT_SLOT_DEFINITIONS.map((slot) => slot.id) as EquipmentSlotId[];
export const equipmentSlotById = Object.fromEntries(
  EQUIPMENT_SLOT_DEFINITIONS.map((slot) => [slot.id, slot]),
) as Record<EquipmentSlotId, (typeof EQUIPMENT_SLOT_DEFINITIONS)[number]>;
export const ARMOR_TRAINING_SLOT_IDS = EQUIPMENT_SLOT_DEFINITIONS
  .filter((slot) => slot.armorTraining)
  .map((slot) => slot.id) as EquipmentSlotId[];

export function isEquipmentSlotId(value: string): value is EquipmentSlotId {
  return EQUIPMENT_SLOT_IDS.includes(value as EquipmentSlotId);
}

export function getEquipmentSlotDefinition(id: EquipmentSlotId) {
  return equipmentSlotById[id];
}

export function getEquipmentSlotsByGroup(group: EquipmentSlotGroup) {
  return EQUIPMENT_SLOT_DEFINITIONS.filter((slot) => slot.group === group);
}

export function equipmentSlotKindLabel(kind: EquipmentSlotKind) {
  if (kind === "ring") return "Ring";
  if (kind === "earring") return "Earring";
  return getEquipmentSlotDefinition(kind).label;
}

export interface EquipmentState {
  slots: Partial<Record<EquipmentSlotId, import('../items/itemTypes').ItemInstanceId>>;
}

export function createInitialEquipment(inventory: import('../inventory/inventoryTypes').InventoryState): EquipmentState {
  const ironSword = Object.values(inventory.instances).find((instance) => instance.definitionId === "item.iron-sword")
  return ironSword ? { slots: { weapon: ironSword.id } } : { slots: {} };
}
