import type { EquipmentSlotGroup } from "../equipment/equipmentTypes";

export const equipmentGroups: ReadonlyArray<{ id: EquipmentSlotGroup; label: string }> = [
  { id: "weapons", label: "WEAPONS" },
  { id: "armor", label: "ARMOR & GEAR" },
  { id: "accessories", label: "ACCESSORIES" },
  { id: "tools", label: "TOOLS" },
];
