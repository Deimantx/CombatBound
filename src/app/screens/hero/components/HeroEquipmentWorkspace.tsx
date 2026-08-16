import { useMemo } from "react";
import { masteryLevelForXp } from "../../../../game/progression/masteryProgression";
import { getDefensiveEquipmentContext } from "../../../../game/equipment/defensiveEquipment";
import type { EquipmentPreviewState } from "../../../../game/equipment/equipmentPreview";
import { getCompatibleItemInstances, validateEquipmentChange } from "../../../../game/equipment/equipmentRules";
import { EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId } from "../../../../game/equipment/equipmentTypes";
import { useGameStore } from "../../../../state/gameStore";
import { EquipmentSlotInspector } from "./equipment/EquipmentSlotInspector";
import type { EquipmentCandidateModel } from "./equipment/EquipmentCandidateCard";

export interface HeroEquipmentPreview {
  slotId: EquipmentSlotId;
  instanceId: string;
}

export const HERO_EQUIPMENT_LAYOUT = [
  ["earring1", "head", "earring2"],
  ["weapon", "necklace", "offhand"],
  ["gloves", "armor", "boots"],
  ["ring1", "belt", "ring2"],
  [null, "cape", null],
] as const satisfies ReadonlyArray<ReadonlyArray<EquipmentSlotId | null>>;

export function HeroEquipmentWorkspace({ preview, hoveredPreview, previewState, onPreviewChange, onHoverPreview, onEquipCommitted }: {
  preview: HeroEquipmentPreview | null;
  hoveredPreview: HeroEquipmentPreview | null;
  previewState: EquipmentPreviewState;
  onPreviewChange: (preview: HeroEquipmentPreview | null) => void;
  onHoverPreview: (preview: HeroEquipmentPreview | null) => void;
  onEquipCommitted: () => void;
}) {
  const game = useGameStore((state) => state.game);
  const selectedEquipmentSlot = useGameStore((state) => state.selectedEquipmentSlot);
  const equipment = game.equipment;
  const inventory = game.inventory;
  const progression = game.progression;
  const combatPhase = game.combat.phase;
  const activeProfileId = useGameStore((state) => state.activeProfileId);
  const equipItemInstanceAction = useGameStore((state) => state.equipItemInstance);
  const unequipEquipmentSlotAction = useGameStore((state) => state.unequipEquipmentSlot);
  const selected = (EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.id === selectedEquipmentSlot) ? selectedEquipmentSlot : "weapon") as EquipmentSlotId;
  const selectedDefinition = EQUIPMENT_SLOT_DEFINITIONS.find((slot) => slot.id === selected)!;
  const combatLocked = combatPhase === "active" || combatPhase === "recovery";
  const masteryLevel = masteryLevelForXp(progression.masteryXp);
  const defensiveContext = useMemo(() => getDefensiveEquipmentContext(equipment, inventory), [equipment, inventory]);
  const effectivePreviewState = previewState;
  const candidates = useMemo(() => getCompatibleItemInstances(inventory, selected), [inventory, selected]);
  const candidateModels = useMemo<EquipmentCandidateModel[]>(() => candidates.map((entry) => {
    const validation = validateEquipmentChange({ instanceId: entry.instance.id, slotId: selected, inventory, equipment, masteryLevel });
    const equipped = entry.instance.id === equipment.slots[selected];
    return { entry, validation, equipped, masteryLocked: validation.reason === "mastery-level", canEquip: validation.valid && !combatLocked && !equipped, combatLocked };
  }), [candidates, combatLocked, equipment, inventory, masteryLevel, selected]);

  const selectCandidate = (instanceId: string) => onPreviewChange({ slotId: selected, instanceId });
  const hoverCandidate = (instanceId: string) => onHoverPreview({ slotId: selected, instanceId });
  const equipCandidate = (instanceId: string) => {
    const model = candidateModels.find((candidate) => candidate.entry.instance.id === instanceId);
    if (!model || !model.canEquip) return;
    equipItemInstanceAction(instanceId, selected);
    onEquipCommitted();
  };
  const unequip = () => {
    if (combatLocked) return;
    unequipEquipmentSlotAction(selected);
    onEquipCommitted();
  };

  return (
    <section className="hero-equipment-workspace hero-slot-workspace" data-debug-kind="hero-equipment" data-debug-zone="slot-workspace">
      <div className="hero-equipment-heading">
        <div><span className="tiny-label">SLOT WORKSPACE</span><h2>{selectedDefinition.label.toUpperCase()}</h2><p>{candidates.length} compatible owned item{candidates.length === 1 ? "" : "s"}</p></div>
        <div className={`hero-equipment-meta ${combatLocked ? "is-locked" : ""}`}>{combatLocked ? "LOCKED DURING COMBAT" : "READY TO EQUIP"}</div>
      </div>
      <div className="hero-equipment-workspace-body" data-debug-kind="hero-equipment-two-pane">
        <EquipmentSlotInspector slotId={selected} equipment={equipment} inventory={inventory} progression={progression} defensiveContext={defensiveContext} combatLocked={combatLocked} activeProfileId={activeProfileId} models={candidateModels} previewState={effectivePreviewState} pinned={preview} hovered={hoveredPreview} onSelectCandidate={selectCandidate} onHoverCandidate={hoverCandidate} onLeaveCandidate={() => onHoverPreview(null)} onEquip={equipCandidate} onUnequip={unequip} />
      </div>
    </section>
  );
}
