import { LockKeyhole } from "lucide-react";
import { EquipmentBuildChanges } from "../../../../components/equipment/EquipmentBuildChanges";
import { GameTooltip } from "../../../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../../../components/PlaceholderArt";
import { itemRarityArtVariant, itemRarityClass } from "../../../../../game/presentation/itemRarity";
import { buildPlayerItemInstanceTooltip } from "../../../../../game/presentation/tooltipBuilders";
import type { EquipmentComparisonRow } from "../../../../../game/presentation/equipmentComparison";
import { buildEquipmentItemModifierRows, type EquipmentItemDifferenceRow } from "../../../../../game/presentation/equipmentItemComparison";
import type { ResolvedItemInstance } from "../../../../../game/items/itemTypes";
import { proficiencyById } from "../../../../../game/data/proficiencies";
import { buildItemPresentation } from "../../../../../game/presentation/itemPresentation";

export function EquipmentItemComparison({ slotLabel, current, candidate, itemRows, buildRows, combatLocked, hunterRankLocked, proficiencyLocked, proficiencyId, requiredProficiencyLevel, actionLabel, canEquip, validationReason, willDiscoverProficiency, onEquip }: {
  slotLabel: string;
  current: ResolvedItemInstance | null;
  candidate?: ResolvedItemInstance;
  itemRows: readonly EquipmentItemDifferenceRow[];
  buildRows: readonly EquipmentComparisonRow[];
  combatLocked: boolean;
  hunterRankLocked: boolean;
  proficiencyLocked: boolean;
  proficiencyId?: string;
  requiredProficiencyLevel?: number;
  actionLabel: string;
  canEquip: boolean;
  validationReason?: string;
  willDiscoverProficiency?: boolean;
  onEquip: () => void;
}) {
  const modifierRows = buildEquipmentItemModifierRows(current ?? undefined, candidate);
  return <section className="equipment-item-comparison" data-debug-kind="equipment-item-comparison">
    <header className="equipment-comparison-heading"><div><span className="tiny-label">ITEM COMPARISON</span><strong>{candidate ? "Exact item comparison" : "Current equipment"}</strong></div>{candidate && <span className="equipment-comparison-slot">{slotLabel}</span>}</header>
    <div className="equipment-comparison-identities">
      <ComparisonIdentity label="CURRENT" item={current} equipped />
      <span className="equipment-comparison-arrow" aria-hidden="true">-&gt;</span>
      <ComparisonIdentity label="CANDIDATE" item={candidate} />
    </div>
    {!candidate ? <p className="equipment-comparison-prompt">{current ? `${current.definition.name} is currently equipped.` : "This slot is empty."}<br />Hover or select an item to compare.</p> : <>
      <DifferenceRows rows={itemRows} />
      {modifierRows.length > 0 && <ModifierRows rows={modifierRows} />}
      {buildRows.length > 0 && <EquipmentBuildChanges rows={buildRows} replacementName={current?.definition.name} slotLabel={slotLabel} debugKind="hero-equipment-build-changes" title="BUILD IMPACT" />}
      <div className="equipment-comparison-action">
        {combatLocked && <p className="equipment-action-note"><LockKeyhole size={14} />Equipment changes are locked during combat. Preview remains available.</p>}
        {!combatLocked && hunterRankLocked && <p className="equipment-action-note is-hunter-rank"><LockKeyhole size={14} />Requires Hunter Rank {candidate.definition.requiredHunterRank}.</p>}
        {!combatLocked && proficiencyLocked && <p className="equipment-action-note is-proficiency"><LockKeyhole size={14} />Requires {proficiencyById[proficiencyId ?? ""]?.name ?? proficiencyId ?? "weapon proficiency"} Level {requiredProficiencyLevel}.</p>}
        {!combatLocked && validationReason === "two-handed-conflict" && <p className="equipment-action-note is-proficiency"><LockKeyhole size={14} />Unequip your two-handed weapon first.</p>}
        {!combatLocked && willDiscoverProficiency && <p className="equipment-action-note">Unlocks {proficiencyById[proficiencyId ?? ""]?.name ?? proficiencyId ?? "weapon proficiency"} at Level 1 on first equip.</p>}
        <button type="button" className="button button-primary" onClick={onEquip} disabled={!canEquip} data-debug-action="equip-preview">{actionLabel}</button>
      </div>
    </>}
  </section>;
}

function ComparisonIdentity({ label, item, equipped = false }: { label: string; item?: ResolvedItemInstance | null; equipped?: boolean }) {
  if (!item) return <div className="equipment-comparison-identity is-empty"><span className="tiny-label">{label}</span><div className="equipment-comparison-empty-art"><span>-</span></div><strong>Empty Slot</strong></div>;
  const tooltip = buildPlayerItemInstanceTooltip(item, { equipped });
  const presentation = buildItemPresentation(item);
  return <GameTooltip content={tooltip}><div className={`equipment-comparison-identity ${itemRarityClass(item.definition.rarity)}`} data-debug-kind="equipment-comparison-identity" data-debug-instance-id={item.instance.id} data-debug-item-id={item.definition.id}><span className="tiny-label">{label}</span><PlaceholderArt icon={item.definition.icon} size="small" variant={itemRarityArtVariant(item.definition.rarity)} /><strong>{item.definition.name}</strong>{presentation.upgradeProgress && <small>{presentation.specialization?.label ?? "Unspecialized"} - {presentation.upgradeProgress.unlocked}/{presentation.upgradeProgress.total}</small>}{equipped && <small>Equipped</small>}</div></GameTooltip>;
}

function DifferenceRows({ rows }: { rows: readonly EquipmentItemDifferenceRow[] }) {
  return <section className="equipment-item-differences" data-debug-kind="equipment-item-differences"><header>ITEM DIFFERENCES</header>{rows.length ? <div className="equipment-item-difference-list">{rows.map((row) => <div key={row.key} className={`equipment-item-difference-row ${row.tone}`}><span>{row.label}</span><strong>{row.current ?? "-"} -&gt; {row.candidate ?? "-"}</strong><em>{row.delta ?? ""}</em></div>)}</div> : <p>No item stat changes.</p>}</section>;
}

function ModifierRows({ rows }: { rows: ReturnType<typeof buildEquipmentItemModifierRows> }) {
  const currentRows = rows.filter((row) => row.side === "current");
  const candidateRows = rows.filter((row) => row.side === "candidate");
  return <section className="equipment-item-modifiers" data-debug-kind="equipment-item-modifiers"><header>MODIFIERS</header><div className="equipment-item-modifier-columns"><div><small>CURRENT</small>{currentRows.length ? currentRows.map((row) => <span key={row.id}>{row.label} <strong>{row.value}</strong></span>) : <em>None</em>}</div><div><small>CANDIDATE</small>{candidateRows.length ? candidateRows.map((row) => <span key={row.id}>{row.label} <strong>{row.value}</strong></span>) : <em>None</em>}</div></div></section>;
}
