import { ArrowRight } from "lucide-react";
import { EQUIPMENT_SLOT_DEFINITIONS, getEquipmentSlotDefinition, type EquipmentState, type EquipmentSlotId } from "../../../game/equipment/equipmentTypes";
import { equippedSlotForInstance } from "../../../game/equipment/equipmentRules";
import type { InventoryState } from "../../../game/inventory/inventoryTypes";
import { resolveItemInstance } from "../../../game/items/itemResolver";
import type { ItemInstanceId, ResolvedItemInstance } from "../../../game/items/itemTypes";

export interface EquipmentReplacementPresentation {
  slotId: EquipmentSlotId;
  slotLabel: string;
  current?: { instanceId: ItemInstanceId; name: string };
  candidate: { instanceId: ItemInstanceId; name: string };
  action: "equip" | "move" | "equipped";
}

export function buildEquipmentReplacementPresentation(candidate: ResolvedItemInstance, slotId: EquipmentSlotId, equipment: EquipmentState, inventory: InventoryState): EquipmentReplacementPresentation {
  const currentInstanceId = equipment.slots[slotId];
  const current = currentInstanceId ? resolveItemInstance(inventory, currentInstanceId) : undefined;
  const candidateSlot = equippedSlotForInstance(equipment, candidate.instance.id);
  return { slotId, slotLabel: getEquipmentSlotDefinition(slotId).label, current: current ? { instanceId: current.instance.id, name: current.definition.name } : undefined, candidate: { instanceId: candidate.instance.id, name: candidate.definition.name }, action: candidateSlot === slotId ? "equipped" : candidateSlot ? "move" : "equip" };
}

export function EquipmentReplacementContext({ presentation, debugKind = "equipment-replacement-context" }: { presentation: EquipmentReplacementPresentation; debugKind?: string }) {
  if (presentation.action === "equipped") return <section className="inventory-replacement-context equipment-replacement-context" data-debug-kind={debugKind}><header>EQUIPPED · {presentation.slotLabel}</header><strong>{presentation.candidate.name}</strong><span>Currently Equipped</span></section>;
  return <section className="inventory-replacement-context equipment-replacement-context" data-debug-kind={debugKind}><header>{presentation.action === "move" ? "MOVE TO" : "EQUIP TO"} · {presentation.slotLabel}</header><div className="inventory-replacement-flow"><span>{presentation.current?.name ?? `Empty ${presentation.slotLabel} Slot`}</span><ArrowRight size={13} aria-hidden="true" /><strong>{presentation.candidate.name}</strong></div></section>;
}

export function equipmentSlotTargets(kind: NonNullable<ResolvedItemInstance["definition"]["equipmentSlotKind"]>) {
  return EQUIPMENT_SLOT_DEFINITIONS.filter((slot) => slot.kind === kind);
}
