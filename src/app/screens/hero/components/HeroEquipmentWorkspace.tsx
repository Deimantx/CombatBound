import { ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { masteryLevelForXp } from "../../../../game/progression/masteryProgression";
import { getDefensiveEquipmentContext } from "../../../../game/equipment/defensiveEquipment";
import type { EquipmentPreviewState } from "../../../../game/equipment/equipmentPreview";
import { getCompatibleItemInstances, validateEquipmentChange } from "../../../../game/equipment/equipmentRules";
import { EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId } from "../../../../game/equipment/equipmentTypes";
import { useGameStore } from "../../../../state/gameStore";
import { EquipmentLoadout } from "./equipment/EquipmentLoadout";
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

export function HeroEquipmentWorkspace({ preview, hoveredPreview, previewState, onPreviewChange, onHoverPreview, onSlotChange, onEquipCommitted }: {
  preview: HeroEquipmentPreview | null;
  hoveredPreview: HeroEquipmentPreview | null;
  previewState: EquipmentPreviewState;
  onPreviewChange: (preview: HeroEquipmentPreview | null) => void;
  onHoverPreview: (preview: HeroEquipmentPreview | null) => void;
  onSlotChange: (slotId: EquipmentSlotId) => void;
  onEquipCommitted: () => void;
}) {
  const game = useGameStore((state) => state.game);
  const equipment = game.equipment;
  const inventory = game.inventory;
  const progression = game.progression;
  const combatPhase = game.combat.phase;
  const activeProfileId = useGameStore((state) => state.activeProfileId);
  const selectedEquipmentSlot = useGameStore((state) => state.selectedEquipmentSlot);
  const selectEquipmentSlot = useGameStore((state) => state.selectEquipmentSlot);
  const equipItemInstanceAction = useGameStore((state) => state.equipItemInstance);
  const unequipEquipmentSlotAction = useGameStore((state) => state.unequipEquipmentSlot);
  const selected = (EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.id === selectedEquipmentSlot) ? selectedEquipmentSlot : "weapon") as EquipmentSlotId;
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

  const changeSlot = (slotId: EquipmentSlotId) => {
    selectEquipmentSlot(slotId);
    onSlotChange(slotId);
  };
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
    <section className="hero-equipment-workspace" data-debug-kind="hero-equipment">
      <div className="hero-equipment-heading">
        <div className="panel-heading"><span className="panel-icon"><ShieldCheck size={16} /></span><h2 className="panel-title">EQUIPMENT</h2></div>
        <div className="hero-equipment-meta"><strong>{Object.values(equipment.slots).filter(Boolean).length} / {EQUIPMENT_SLOT_DEFINITIONS.length} EQUIPPED</strong><span className={combatLocked ? "is-locked" : ""}>{combatLocked ? "LOCKED DURING COMBAT" : "READY TO EQUIP"}</span></div>
      </div>
      <div className="hero-equipment-workspace-body" data-debug-kind="hero-equipment-two-pane">
        <EquipmentLoadout layout={HERO_EQUIPMENT_LAYOUT} selected={selected} equipment={equipment} inventory={inventory} defensiveContext={defensiveContext} onSelect={changeSlot} />
        <EquipmentSlotInspector slotId={selected} equipment={equipment} inventory={inventory} progression={progression} defensiveContext={defensiveContext} combatLocked={combatLocked} activeProfileId={activeProfileId} models={candidateModels} previewState={effectivePreviewState} pinned={preview} hovered={hoveredPreview} onSelectCandidate={selectCandidate} onHoverCandidate={hoverCandidate} onLeaveCandidate={() => onHoverPreview(null)} onEquip={equipCandidate} onUnequip={unequip} />
      </div>
    </section>
  );
}
