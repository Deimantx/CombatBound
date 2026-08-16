import {
  EquipmentBuildChanges,
  type EquipmentBuildChangesProps,
} from "../../components/equipment/EquipmentBuildChanges";

export function InventoryBuildChanges(
  props: Omit<EquipmentBuildChangesProps, "debugKind">,
) {
  return <EquipmentBuildChanges {...props} debugKind="inventory-build-changes" />;
}
