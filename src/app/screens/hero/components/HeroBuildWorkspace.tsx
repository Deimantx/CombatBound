import { useMemo } from "react";
import { getDefensiveEquipmentContext } from "../../../../game/equipment/defensiveEquipment";
import { EQUIPMENT_SLOT_DEFINITIONS, type EquipmentSlotId } from "../../../../game/equipment/equipmentTypes";
import { useGameStore } from "../../../../state/gameStore";
import { EquipmentLoadout } from "./equipment/EquipmentLoadout";
import { HeroCombatStatsPanel } from "./HeroCombatStatsPanel";
import { HERO_EQUIPMENT_LAYOUT, HeroEquipmentWorkspace, type HeroEquipmentPreview } from "./HeroEquipmentWorkspace";
import type { EquipmentPreviewState } from "../../../../game/equipment/equipmentPreview";

export function HeroBuildWorkspace({ preview, hoveredPreview, previewState, onPreviewChange, onHoverPreview, onEquipCommitted, onSlotChange }: {
  preview: HeroEquipmentPreview | null;
  hoveredPreview: HeroEquipmentPreview | null;
  previewState: EquipmentPreviewState;
  onPreviewChange: (preview: HeroEquipmentPreview | null) => void;
  onHoverPreview: (preview: HeroEquipmentPreview | null) => void;
  onEquipCommitted: () => void;
  onSlotChange: () => void;
}) {
  const game = useGameStore((state) => state.game);
  const selectedEquipmentSlot = useGameStore((state) => state.selectedEquipmentSlot);
  const selectEquipmentSlot = useGameStore((state) => state.selectEquipmentSlot);
  const selected = (EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.id === selectedEquipmentSlot) ? selectedEquipmentSlot : "weapon") as EquipmentSlotId;
  const defensiveContext = useMemo(() => getDefensiveEquipmentContext(game.equipment, game.inventory), [game.equipment, game.inventory]);
  const selectSlot = (slotId: EquipmentSlotId) => {
    selectEquipmentSlot(slotId);
    onSlotChange();
  };

  return (
    <section className="hero-build-workspace" data-debug-kind="hero-build-workspace" data-debug-zone="build-workspace">
      <header className="hero-build-workspace-header"><div><span className="tiny-label">HERO BUILD WORKSPACE</span><strong>Equipment, build context, and live combat values</strong></div><span>{Object.values(game.equipment.slots).filter(Boolean).length} / {EQUIPMENT_SLOT_DEFINITIONS.length} equipped</span></header>
      <div className="hero-build-workspace-zones">
        <section className="hero-build-zone hero-loadout-zone" data-debug-kind="equipment-loadout" data-debug-zone="loadout">
          <ZoneHeading label="LOADOUT" detail="Equipped items" />
          <EquipmentLoadout layout={HERO_EQUIPMENT_LAYOUT} selected={selected} equipment={game.equipment} inventory={game.inventory} defensiveContext={defensiveContext} onSelect={selectSlot} />
        </section>
        <section className="hero-build-zone hero-slot-workspace-zone" data-debug-kind="equipment-slot-workspace" data-debug-zone="slot-workspace">
          <HeroEquipmentWorkspace preview={preview} hoveredPreview={hoveredPreview} previewState={previewState} onPreviewChange={onPreviewChange} onHoverPreview={onHoverPreview} onEquipCommitted={onEquipCommitted} />
        </section>
        <section className="hero-build-zone hero-build-stats-zone" data-debug-kind="hero-build-stats" data-debug-zone="build-stats">
          <ZoneHeading label="BUILD STATS" detail="Effective values used by Combat" />
          <HeroCombatStatsPanel previewState={previewState} />
        </section>
      </div>
    </section>
  );
}

function ZoneHeading({ label, detail }: { label: string; detail: string }) {
  return <div className="hero-build-zone-heading"><span className="tiny-label">{label}</span><span>{detail}</span></div>;
}
