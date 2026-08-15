import { ArrowRight, Check, Shield, ShieldCheck, Sparkles, Sword } from "lucide-react";
import { useId, useState } from "react";
import { itemById, itemDefinitions, type ItemDefinition } from "../../../../game/data/items";
import { getEquippedWeaponProficiency } from "../../../../game/progression/progressionSelectors";
import { getProficiencyLevel } from "../../../../game/progression/proficiencyProgression";
import { proficiencyById } from "../../../../game/data/proficiencies";
import { masteryLevelForXp } from "../../../../game/progression/masteryProgression";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import { getDefensiveEquipmentContext } from "../../../../game/equipment/defensiveEquipment";
import {
  ARMOR_TRAINING_SLOT_IDS,
  EQUIPMENT_SLOT_DEFINITIONS,
  getEquipmentSlotsByGroup,
  type EquipmentSlotId,
} from "../../../../game/equipment/equipmentTypes";
import { canEquipItemToSlot, getAvailableItemCopies, validateEquipmentChange } from "../../../../game/equipment/equipmentRules";
import { equipmentGroups } from "../../../../game/presentation/equipmentGroups";
import { buildItemTooltip } from "../../../../game/presentation/tooltipBuilders";
import { formatItemStats } from "../../../../game/presentation/statFormatting";
import { useGameStore } from "../../../../state/gameStore";
import { DisclosureChevron } from "../../../components/DisclosureChevron";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../../components/PlaceholderArt";

export function HeroEquipmentWorkspace() {
  const equipment = useGameStore((state) => state.game.equipment);
  const inventory = useGameStore((state) => state.game.inventory);
  const progression = useGameStore((state) => state.game.progression);
  const stance = useGameStore((state) => state.game.combat.stance);
  const techniques = useGameStore((state) => state.game.combat.techniques);
  const combatPhase = useGameStore((state) => state.game.combat.phase);
  const selectedEquipmentSlot = useGameStore((state) => state.selectedEquipmentSlot);
  const selectEquipmentSlot = useGameStore((state) => state.selectEquipmentSlot);
  const equipItem = useGameStore((state) => state.equipItem);
  const [selectedOpen, setSelectedOpen] = useState(true);
  const [trainingOpen, setTrainingOpen] = useState(false);
  const selected = (EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.id === selectedEquipmentSlot)
    ? selectedEquipmentSlot
    : "weapon") as EquipmentSlotId;
  const selectedDefinition = EQUIPMENT_SLOT_DEFINITIONS.find((slot) => slot.id === selected)!;
  const equippedId = equipment.slots[selected];
  const equipped = equippedId ? itemById[equippedId] : undefined;
  const combatLocked = combatPhase === "active" || combatPhase === "recovery";
  const masteryLevel = masteryLevelForXp(progression.masteryXp);
  const defensiveContext = getDefensiveEquipmentContext(equipment);
  const stats = calculateHunterCombatStats(equipment, progression, stance, techniques);
  const candidates = itemDefinitions.filter((item) => canEquipItemToSlot(item, selected) && (inventory.quantities[item.id] ?? 0) > 0);
  const selectedContentId = `hero-equipment-selected-${useId().replace(/:/g, "")}`;
  const trainingContentId = `hero-equipment-training-${useId().replace(/:/g, "")}`;
  const equippedProficiency = getEquippedWeaponProficiency(equipment);
  const equippedProficiencyName = equippedProficiency ? proficiencyById[equippedProficiency]?.name : undefined;
  const equippedProficiencyLevel = equippedProficiency ? getProficiencyLevel(progression, equippedProficiency) : 0;

  return (
    <section className="hero-equipment-workspace" data-debug-kind="hero-equipment">
      <div className="hero-equipment-heading">
        <div className="panel-heading">
          <span className="panel-icon"><ShieldCheck size={16} /></span>
          <div><h2 className="panel-title">EQUIPMENT</h2><p className="panel-subtitle">Build your Hunter directly from the Hero workspace.</p></div>
        </div>
        <span className="hero-equipment-rating"><Sparkles size={14} /> {stats.attackPower} ATTACK</span>
      </div>

      <div className="hero-loadout-topline">
        <span className="hero-loadout-avatar"><Shield size={24} /></span>
        <span><strong>Vanguard</strong><small>{equippedProficiencyName ?? "No weapon proficiency"} · Lv {equippedProficiencyLevel}</small></span>
        <span className="hero-loadout-lock">{combatLocked ? "LOCKED DURING COMBAT" : "READY TO EQUIP"}</span>
      </div>

      <div className="hero-equipment-slot-groups">
        {equipmentGroups.map((group) => (
          <section key={group.id} className="hero-equipment-slot-group" data-debug-kind="equipment-slot-group" data-debug-group={group.id}>
            <h3>{group.label}</h3>
            <div className="hero-equipment-slots">
              {getEquipmentSlotsByGroup(group.id).map((slot) => {
                const item = itemById[equipment.slots[slot.id] ?? ""];
                const active = selected === slot.id;
                return (
                  <GameTooltip key={slot.id} content={item ? buildItemTooltip(item, { equipped: true, quantity: inventory.quantities[item.id] ?? 0, defensiveContext }) : { id: `equipment-slot.${slot.id}`, title: `${slot.label} slot`, description: "An equipment slot for the Hunter." }}>
                    <button className={`hero-equipment-slot ${active ? "is-selected" : ""}`} onClick={() => selectEquipmentSlot(slot.id)} data-debug-kind="equipment-slot" data-debug-slot-id={slot.id} data-debug-slot={slot.id} data-debug-slot-group={slot.group} data-debug-item-id={item?.id} data-debug-label={slot.label}>
                      <span className="slot-label">{"shortLabel" in slot ? slot.shortLabel : slot.label}</span>
                      <PlaceholderArt icon={item?.icon ?? slot.icon} size="medium" variant={active ? "gold" : "muted"} />
                      <strong>{item?.name ?? "Empty"}</strong>
                      <small>{active ? "Selected" : item?.rarity ?? "Empty"}</small>
                      {active && <span className="selected-check"><Check size={12} /></span>}
                    </button>
                  </GameTooltip>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className={`hero-equipment-disclosure ${selectedOpen ? "is-open" : "is-collapsed"}`} data-debug-kind="hero-equipment-selected" data-debug-slot-id={selected} data-debug-expanded={selectedOpen ? "true" : "false"} data-debug-compatible-count={candidates.length}>
        <DisclosureButton open={selectedOpen} controls={selectedContentId} onClick={() => setSelectedOpen((value) => !value)}>
          <span>SELECTED SLOT · {selectedDefinition.label.toUpperCase()}</span><small>{candidates.length} compatible owned</small>
        </DisclosureButton>
        <div id={selectedContentId} className="hero-equipment-disclosure-content" hidden={!selectedOpen}>
          <div className="hero-selected-item-summary">
            <span className="tiny-label">CURRENTLY EQUIPPED</span>
            <strong>{equipped?.name ?? "Empty slot"}</strong>
            <small>{equipped ? formatItemStats(equipped.stats ?? {}).map((stat) => `${stat.label} ${stat.value}`).join(" · ") || equipped.description : "Choose a compatible owned item below."}</small>
          </div>
          <div className="hero-candidate-header"><span className="tiny-label">COMPATIBLE CANDIDATES</span><span>{combatLocked ? "Stop combat to change equipment." : "Select an item to equip it."}</span></div>
          <div className="candidate-list hero-candidate-list">
            {candidates.map((item) => {
              const validation = validateEquipmentChange({ item, slotId: selected, inventory, equipment, masteryLevel });
              return <HeroCandidateItem key={item.id} item={item} slotId={selected} equipped={item.id === equippedId} canEquip={validation.valid} availableCopies={getAvailableItemCopies(inventory, equipment, item.id, selected)} locked={combatLocked} masteryLocked={validation.reason === "mastery-level"} onEquip={() => equipItem(item.id, selected)} quantity={inventory.quantities[item.id] ?? 0} masteryLevel={masteryLevel} />;
            })}
          </div>
          <div className="comparison-box hero-comparison-box"><span className="tiny-label">COMPARISON</span><div><span>EQUIPPED</span><strong>{equipped?.name ?? "Empty"}</strong><em>{equipped ? formatItemStats(equipped.stats ?? {}).map((stat) => `${stat.label} ${stat.value}`).join(" · ") || "No combat stats" : "No item equipped in this slot."}</em></div><ArrowRight size={15} /><div className="comparison-placeholder"><span>{combatLocked ? "Equipment locked" : "Select an item above"}</span><small>{combatLocked ? "Stop combat before equipping." : "Compatible item stats appear in the candidate tooltip."}</small></div></div>
        </div>
      </section>

      <section className={`hero-equipment-disclosure hero-armor-training ${trainingOpen ? "is-open" : "is-collapsed"}`} data-debug-kind="hero-armor-training" data-debug-expanded={trainingOpen ? "true" : "false"}>
        <DisclosureButton open={trainingOpen} controls={trainingContentId} onClick={() => setTrainingOpen((value) => !value)}>
          <span>ARMOR TRAINING</span><small>{defensiveContext.lightArmorPieces + defensiveContext.mediumArmorPieces + defensiveContext.heavyArmorPieces} qualifying pieces · shield {defensiveContext.shieldEquipped ? "equipped" : "missing"}</small>
        </DisclosureButton>
        <div id={trainingContentId} className="hero-equipment-disclosure-content hero-training-content" hidden={!trainingOpen}>
          <TrainingRate label="Light Armor" pieces={defensiveContext.lightArmorPieces} rate={defensiveContext.lightArmorPieces / ARMOR_TRAINING_SLOT_IDS.length} proficiencyId="light-armor" />
          <TrainingRate label="Medium Armor" pieces={defensiveContext.mediumArmorPieces} rate={defensiveContext.mediumArmorPieces / ARMOR_TRAINING_SLOT_IDS.length} proficiencyId="medium-armor" />
          <TrainingRate label="Heavy Armor" pieces={defensiveContext.heavyArmorPieces} rate={defensiveContext.heavyArmorPieces / ARMOR_TRAINING_SLOT_IDS.length} proficiencyId="heavy-armor" />
          <TrainingRate label="Shield" pieces={defensiveContext.shieldEquipped ? 1 : 0} rate={defensiveContext.shieldEquipped ? 1 : 0} proficiencyId="shield" shield />
        </div>
      </section>
    </section>
  );
}

function DisclosureButton({ open, controls, onClick, children }: { open: boolean; controls: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className="hero-disclosure-button" onClick={onClick} aria-expanded={open} aria-controls={controls}><span>{children}</span><DisclosureChevron open={open} /></button>;
}

function HeroCandidateItem({ item, slotId, equipped, canEquip, availableCopies, locked, masteryLocked, onEquip, quantity, masteryLevel }: { item: ItemDefinition; slotId: EquipmentSlotId; equipped: boolean; canEquip: boolean; availableCopies: number; locked: boolean; masteryLocked: boolean; onEquip: () => void; quantity: number; masteryLevel: number }) {
  const button = <button className={`candidate-item ${equipped ? "is-equipped" : ""}`} onClick={onEquip} disabled={locked || !canEquip} data-debug-kind="equipment-candidate" data-debug-target-id={item.id} data-debug-item-id={item.id} data-debug-slot-id={slotId} data-debug-can-equip={canEquip && !locked ? "true" : "false"} data-debug-available-copies={availableCopies} data-debug-label={item.name}><PlaceholderArt icon={item.icon} size="small" variant={item.rarity === "rare" ? "gold" : item.rarity === "uncommon" ? "blue" : "muted"} /><span><strong>{item.name}</strong><small>{formatItemStats(item.stats ?? {}).map((stat) => `${stat.label} ${stat.value}`).join(" · ") || item.description}</small></span>{equipped ? <span className="equipped-label"><Check size={13} /> Equipped</span> : masteryLocked ? <span className="equipped-label is-unavailable">REQUIRES MASTERY LV {item.requiredMasteryLevel}</span> : !canEquip ? <span className="equipped-label is-unavailable">No spare copy</span> : <ArrowRight size={15} />}</button>;
  const tooltip = <GameTooltip content={buildItemTooltip(item, { quantity, equipped, masteryLevel })}>{locked ? <span className="candidate-tooltip-host">{button}</span> : button}</GameTooltip>;
  return tooltip;
}

function TrainingRate({ label, pieces, rate, proficiencyId, shield = false }: { label: string; pieces: number; rate: number; proficiencyId: string; shield?: boolean }) {
  return <span data-debug-defensive-proficiency={proficiencyId} data-debug-armor-piece-count={pieces} data-debug-training-rate={rate}><strong>{label}</strong><small>{shield ? pieces > 0 ? "Equipped" : "Not equipped" : `${pieces}/${ARMOR_TRAINING_SLOT_IDS.length} pieces`} · {rate.toFixed(2)}× XP</small></span>;
}
