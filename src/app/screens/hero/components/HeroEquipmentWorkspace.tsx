import { Check, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import { masteryLevelForXp } from "../../../../game/progression/masteryProgression";
import { getDefensiveEquipmentContext } from "../../../../game/equipment/defensiveEquipment";
import { getCompatibleItemInstances, validateEquipmentChange } from "../../../../game/equipment/equipmentRules";
import { EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId } from "../../../../game/equipment/equipmentTypes";
import { resolveItemInstance } from "../../../../game/items/itemResolver";
import type { ResolvedItemInstance } from "../../../../game/items/itemTypes";
import { buildItemInstanceTooltip } from "../../../../game/presentation/tooltipBuilders";
import { useGameStore } from "../../../../state/gameStore";
import { DisclosureChevron } from "../../../components/DisclosureChevron";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../../components/PlaceholderArt";

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

export function HeroEquipmentWorkspace({
  preview,
  hoveredPreview,
  onPreviewChange,
  onHoverPreview,
  onSlotChange,
  onEquipCommitted,
}: {
  preview: HeroEquipmentPreview | null;
  hoveredPreview: HeroEquipmentPreview | null;
  onPreviewChange: (preview: HeroEquipmentPreview | null) => void;
  onHoverPreview: (preview: HeroEquipmentPreview | null) => void;
  onSlotChange: (slotId: EquipmentSlotId) => void;
  onEquipCommitted: () => void;
}) {
  const equipment = useGameStore((state) => state.game.equipment);
  const inventory = useGameStore((state) => state.game.inventory);
  const progression = useGameStore((state) => state.game.progression);
  const combatPhase = useGameStore((state) => state.game.combat.phase);
  const selectedEquipmentSlot = useGameStore((state) => state.selectedEquipmentSlot);
  const selectEquipmentSlot = useGameStore((state) => state.selectEquipmentSlot);
  const equipItemInstanceAction = useGameStore((state) => state.equipItemInstance);
  const [optionsOpen, setOptionsOpen] = useState(true);
  const selected = (EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.id === selectedEquipmentSlot) ? selectedEquipmentSlot : "weapon") as EquipmentSlotId;
  const selectedDefinition = EQUIPMENT_SLOT_DEFINITIONS.find((slot) => slot.id === selected)!;
  const equippedInstanceId = equipment.slots[selected];
  const equipped = equippedInstanceId ? resolveItemInstance(inventory, equippedInstanceId) : null;
  const combatLocked = combatPhase === "active" || combatPhase === "recovery";
  const masteryLevel = masteryLevelForXp(progression.masteryXp);
  const defensiveContext = getDefensiveEquipmentContext(equipment, inventory);
  const candidates = getCompatibleItemInstances(inventory, selected);
  const selectedPreview = preview?.slotId === selected ? candidates.find((entry) => entry.instance.id === preview.instanceId) ?? null : null;
  const selectedPreviewValidation = selectedPreview
    ? validateEquipmentChange({ instanceId: selectedPreview.instance.id, slotId: selected, inventory, equipment, masteryLevel })
    : undefined;
  const optionsContentId = `hero-equipment-options-${useId().replace(/:/g, "")}`;

  const changeSlot = (slotId: EquipmentSlotId) => {
    selectEquipmentSlot(slotId);
    onSlotChange(slotId);
  };
  const previewCandidate = (entry: ResolvedItemInstance) => onPreviewChange({ slotId: selected, instanceId: entry.instance.id });
  const commitPreview = () => {
    if (!selectedPreview || !selectedPreviewValidation?.valid || combatLocked || selectedPreview.instance.id === equippedInstanceId) return;
    equipItemInstanceAction(selectedPreview.instance.id, selected);
    onEquipCommitted();
  };

  return (
    <section className="hero-equipment-workspace" data-debug-kind="hero-equipment">
      <div className="hero-equipment-heading">
        <div className="panel-heading"><span className="panel-icon"><ShieldCheck size={16} /></span><h2 className="panel-title">EQUIPMENT</h2></div>
        <div className="hero-equipment-meta"><strong>{Object.values(equipment.slots).filter(Boolean).length} / {EQUIPMENT_SLOT_DEFINITIONS.length} EQUIPPED</strong><span className={combatLocked ? "is-locked" : ""}>{combatLocked ? "LOCKED DURING COMBAT" : "READY TO EQUIP"}</span></div>
      </div>
      <div className="hero-equipment-body-layout" data-debug-kind="hero-equipment-body-layout">
        {HERO_EQUIPMENT_LAYOUT.flatMap((row, rowIndex) => row.map((slotId, columnIndex) => (
          <div key={`${rowIndex}-${columnIndex}-${slotId ?? "empty"}`} className={`hero-equipment-body-cell ${slotId ? "" : "is-empty"}`}>
            {slotId && <EquipmentSlotCard slotId={slotId} equipment={equipment} inventory={inventory} defensiveContext={defensiveContext} selected={selected === slotId} onSelect={() => changeSlot(slotId)} />}
          </div>
        )))}
      </div>
      <section className={`hero-equipment-disclosure hero-equipment-options ${optionsOpen ? "is-open" : "is-collapsed"}`} data-debug-kind="hero-equipment-selected" data-debug-options="true" data-debug-slot-id={selected} data-debug-expanded={optionsOpen ? "true" : "false"} data-debug-compatible-count={candidates.length}>
        <button type="button" className="hero-disclosure-button" onClick={() => setOptionsOpen((value) => !value)} aria-expanded={optionsOpen} aria-controls={optionsContentId}><span><strong>{selectedDefinition.label.toUpperCase()} OPTIONS</strong><small>{candidates.length} owned instance{candidates.length === 1 ? "" : "s"}</small></span><DisclosureChevron open={optionsOpen} /></button>
        <div id={optionsContentId} className="hero-equipment-disclosure-content" hidden={!optionsOpen}>
          <div className="hero-equipment-current-preview"><span className="tiny-label">CURRENT</span><CompactItemCard item={equipped ?? undefined} emptyLabel="Empty slot" status={equipped ? "CURRENT" : "EMPTY"} /></div>
          <div className="hero-candidate-header"><span className="tiny-label">OWNED ALTERNATIVES</span><span>{combatLocked ? "Preview is allowed · Equip is locked." : "Click or hover to preview."}</span></div>
          <div className="hero-equipment-candidate-grid">
            {candidates.length ? candidates.map((entry) => {
              const validation = validateEquipmentChange({ instanceId: entry.instance.id, slotId: selected, inventory, equipment, masteryLevel });
              const isEquipped = entry.instance.id === equippedInstanceId;
              return <HeroCandidateItem key={entry.instance.id} entry={entry} slotId={selected} equipped={isEquipped} selected={preview?.slotId === selected && preview.instanceId === entry.instance.id} hovered={hoveredPreview?.slotId === selected && hoveredPreview.instanceId === entry.instance.id} validation={validation} combatLocked={combatLocked} onPreview={() => previewCandidate(entry)} onHover={() => onHoverPreview({ slotId: selected, instanceId: entry.instance.id })} onLeave={() => onHoverPreview(null)} masteryLevel={masteryLevel} />;
            }) : <p className="hero-equipment-empty-copy">No compatible owned items for this slot.</p>}
          </div>
          {selectedPreview && <div className="hero-selected-preview-card" data-debug-kind="hero-equipment-preview" data-debug-preview-instance-id={selectedPreview.instance.id} data-debug-preview-item-id={selectedPreview.definition.id} data-debug-preview-slot-id={selected}>
            <div><span className="tiny-label">SELECTED PREVIEW</span><CompactItemCard item={selectedPreview} status={selectedPreviewValidation?.reason === "mastery-level" ? `MASTERY ${selectedPreview.definition.requiredMasteryLevel} REQUIRED` : selectedPreview.instance.id === equippedInstanceId ? "CURRENT" : undefined} /></div>
            <button type="button" className="button button-primary hero-equip-preview-button" onClick={commitPreview} disabled={combatLocked || !selectedPreviewValidation?.valid || selectedPreview.instance.id === equippedInstanceId} data-debug-action="equip-preview">EQUIP</button>
          </div>}
        </div>
      </section>
    </section>
  );
}

function EquipmentSlotCard({ slotId, equipment, inventory, defensiveContext, selected, onSelect }: { slotId: EquipmentSlotId; equipment: ReturnType<typeof useGameStore.getState>["game"]["equipment"]; inventory: ReturnType<typeof useGameStore.getState>["game"]["inventory"]; defensiveContext: ReturnType<typeof getDefensiveEquipmentContext>; selected: boolean; onSelect: () => void }) {
  const definition = EQUIPMENT_SLOT_DEFINITIONS.find((slot) => slot.id === slotId)!;
  const item = equipment.slots[slotId] ? resolveItemInstance(inventory, equipment.slots[slotId]!) : null;
  return <GameTooltip content={item ? buildItemInstanceTooltip(item, { equipped: true, defensiveContext }) : { id: `equipment-slot.${slotId}`, title: `${definition.label} slot`, description: "An equipment slot for the Hunter." }}><button type="button" className={`hero-equipment-slot ${selected ? "is-selected" : ""} ${item ? "has-item" : "is-empty"}`} onClick={onSelect} data-debug-kind="equipment-slot" data-debug-slot-id={slotId} data-debug-slot={slotId} data-debug-slot-group={definition.group} data-debug-item-id={item?.definition.id} data-debug-instance-id={item?.instance.id} data-debug-label={definition.label}><span className="slot-label">{"shortLabel" in definition ? definition.shortLabel : definition.label}</span><PlaceholderArt icon={item?.definition.icon ?? definition.icon} size="medium" variant={selected ? "gold" : item ? "blue" : "muted"} /><strong>{item?.definition.name ?? "Empty"}</strong><small>{selected ? "Selected" : item?.definition.rarity ?? "Empty"}</small>{selected && <span className="selected-check"><Check size={12} /></span>}</button></GameTooltip>;
}

function CompactItemCard({ item, emptyLabel = "Empty", status }: { item?: ResolvedItemInstance; emptyLabel?: string; status?: string }) {
  const definition = item?.definition;
  return <div className={`hero-compact-item-card ${definition ? "has-item" : "is-empty"}`}><PlaceholderArt icon={definition?.icon ?? "cube"} size="small" variant={definition?.rarity === "rare" ? "gold" : definition?.rarity === "uncommon" ? "blue" : "muted"} /><span><strong>{definition?.name ?? emptyLabel}</strong>{definition ? <small>{definition.rarity.toUpperCase()} · MASTERY {definition.requiredMasteryLevel ?? 1}</small> : <small>NO ITEM EQUIPPED</small>}</span>{status && <em>{status}</em>}</div>;
}

function HeroCandidateItem({ entry, slotId, equipped, selected, hovered, validation, combatLocked, onPreview, onHover, onLeave, masteryLevel }: { entry: ResolvedItemInstance; slotId: EquipmentSlotId; equipped: boolean; selected: boolean; hovered: boolean; validation: ReturnType<typeof validateEquipmentChange>; combatLocked: boolean; onPreview: () => void; onHover: () => void; onLeave: () => void; masteryLevel: number }) {
  const { definition, instance } = entry;
  const status = equipped ? "CURRENT" : validation.reason === "mastery-level" ? `MASTERY ${definition.requiredMasteryLevel} REQUIRED` : combatLocked ? "LOCKED DURING COMBAT" : "PREVIEW";
  return <GameTooltip content={buildItemInstanceTooltip(entry, { equipped, masteryLevel })}><button type="button" className={`hero-equipment-candidate ${selected ? "is-selected" : ""} ${hovered ? "is-hovered" : ""}`} onClick={onPreview} onMouseEnter={onHover} onMouseLeave={onLeave} data-debug-kind="equipment-candidate" data-debug-target-id={instance.id} data-debug-item-id={definition.id} data-debug-instance-id={instance.id} data-debug-slot-id={slotId} data-debug-preview-selected={selected ? "true" : "false"} data-debug-preview-hovered={hovered ? "true" : "false"} data-debug-can-equip={validation.valid && !combatLocked && !equipped ? "true" : "false"} data-debug-label={definition.name}><PlaceholderArt icon={definition.icon} size="small" variant={definition.rarity === "rare" ? "gold" : definition.rarity === "uncommon" ? "blue" : "muted"} /><span><strong>{definition.name}</strong><small>{definition.rarity.toUpperCase()}</small><small>MASTERY {definition.requiredMasteryLevel ?? 1}</small></span><em>{status}</em></button></GameTooltip>;
}
