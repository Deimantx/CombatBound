import {
  ArrowRight,
  Check,
  ChevronDown,
  Shield,
  ShieldCheck,
  Sparkles,
  Sword,
  Swords,
} from "lucide-react";
import { useId, useState } from "react";
import { itemById, itemDefinitions, type ItemDefinition } from "../../../game/data/items";
import { proficiencyById } from "../../../game/data/proficiencies";
import { getEquippedWeaponProficiency } from "../../../game/progression/progressionSelectors";
import { getProficiencyLevel } from "../../../game/progression/proficiencyProgression";
import { masteryLevelForXp } from "../../../game/progression/masteryProgression";
import { calculateHunterCombatStats } from "../../../game/equipment/derivedStats";
import { calculateArmorMitigation } from "../../../game/combat/combatMath";
import { getDefensiveEquipmentContext } from "../../../game/equipment/defensiveEquipment";
import {
  ARMOR_TRAINING_SLOT_IDS,
  EQUIPMENT_SLOT_DEFINITIONS,
  getEquipmentSlotsByGroup,
  type EquipmentSlotGroup,
  type EquipmentSlotId,
} from "../../../game/equipment/equipmentTypes";
import { canEquipItemToSlot, getAvailableItemCopies, validateEquipmentChange } from "../../../game/equipment/equipmentRules";
import type { CombatReferenceCategory } from "../../../game/data/combatGlossary";
import {
  formatCombatStatValue,
  formatItemStats,
  labelForStatKey,
} from "../../../game/presentation/statFormatting";
import { buildItemTooltip } from "../../../game/presentation/tooltipBuilders";
import { useGameStore } from "../../../state/gameStore";
import { CollapsiblePanel } from "../../components/CollapsiblePanel";
import { GameTooltip } from "../../components/tooltip/GameTooltip";
import { Panel } from "../../components/Panel";
import { PlaceholderArt } from "../../components/PlaceholderArt";
import { StatLine } from "../../components/StatLine";
import { ScreenHeading } from "../../shell/ScreenHeading";

export const statGroups: Array<{
  id: CombatReferenceCategory;
  title: string;
  keys: string[];
}> = [
  {
    id: "offense",
    title: "OFFENSE",
    keys: [
      "attackPower",
      "accuracy",
      "attackInterval",
      "critChance",
      "critDamage",
    ],
  },
  {
    id: "defense",
    title: "DEFENSE",
    keys: [
      "maxHealth",
      "armor",
      "physicalDirectMitigation",
      "evasion",
      "dodgeChance",
      "parryChance",
      "blockChance",
      "blockPower",
      "statusResistance",
      "healthRegen",
    ],
  },
  {
    id: "resources",
    title: "RESOURCES",
    keys: ["maxStamina", "staminaRegen", "maxMana", "manaRegen"],
  },
  {
    id: "resistances",
    title: "RESISTANCES",
    keys: [
      "physicalResistance",
      "fireResistance",
      "waterResistance",
      "airResistance",
      "earthResistance",
      "lightResistance",
      "darknessResistance",
      "natureResistance",
      "mysticResistance",
    ],
  },
];

const EQUIPMENT_STAT_GROUPS_STORAGE_KEY = "combatbound-equipment-stat-groups";
const equipmentGroups: Array<{ id: EquipmentSlotGroup; label: string }> = [
  { id: "weapons", label: "WEAPONS" },
  { id: "armor", label: "ARMOR & GEAR" },
  { id: "accessories", label: "ACCESSORIES" },
];
type EquipmentStatGroupId = (typeof statGroups)[number]["id"];
type EquipmentStatGroupState = Partial<Record<EquipmentStatGroupId, boolean>>;

function readEquipmentStatGroupState(): EquipmentStatGroupState {
  try {
    const saved = window.localStorage.getItem(
      EQUIPMENT_STAT_GROUPS_STORAGE_KEY,
    );
    return saved ? (JSON.parse(saved) as EquipmentStatGroupState) : {};
  } catch {
    return {};
  }
}

function persistEquipmentStatGroupState(
  id: EquipmentStatGroupId,
  open: boolean,
) {
  try {
    window.localStorage.setItem(
      EQUIPMENT_STAT_GROUPS_STORAGE_KEY,
      JSON.stringify({ ...readEquipmentStatGroupState(), [id]: open }),
    );
  } catch {
    // Storage is optional; the component state still works for the current mount.
  }
}

export function EquipmentScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const game = useGameStore((state) => state.game);
  const selectedSlot = useGameStore((state) => state.selectedEquipmentSlot);
  const selectSlot = useGameStore((state) => state.selectEquipmentSlot);
  const equipItem = useGameStore((state) => state.equipItem);
  const selected = (EQUIPMENT_SLOT_DEFINITIONS.some((slot) => slot.id === selectedSlot)
    ? selectedSlot
    : "weapon") as EquipmentSlotId;
  const selectedDefinition = EQUIPMENT_SLOT_DEFINITIONS.find((slot) => slot.id === selected)!;
  const combatLocked =
    game.combat.phase === "active" || game.combat.phase === "recovery";
  const equippedId = game.equipment.slots[selected];
  const equipped = equippedId ? itemById[equippedId] : undefined;
  const candidates = itemDefinitions.filter(
    (item) =>
      canEquipItemToSlot(item, selected) &&
      (game.inventory.quantities[item.id] ?? 0) > 0,
  );
  const stats = calculateHunterCombatStats(
    game.equipment,
    game.progression,
    game.combat.stance,
    game.combat.techniques,
  );
  const equippedProficiency = getEquippedWeaponProficiency(game.equipment);
  const equippedProficiencyName = equippedProficiency
    ? proficiencyById[equippedProficiency]?.name
    : undefined;
  const equippedProficiencyLevel = equippedProficiency
    ? getProficiencyLevel(game.progression, equippedProficiency)
    : 0;
  const resistance = (key: string) =>
    stats.resistances[
      key
        .replace("Resistance", "")
        .toLowerCase() as keyof typeof stats.resistances
    ] ?? 0;
  const valueFor = (key: string) =>
    key === "physicalDirectMitigation"
      ? calculateArmorMitigation(stats.armor)
      : key.endsWith("Resistance")
        ? resistance(key)
        : (stats[key as keyof typeof stats] as number);
  const defensiveContext = getDefensiveEquipmentContext(game.equipment);
  const masteryLevel = masteryLevelForXp(game.progression.masteryXp);
  const detailFor = (key: string) =>
    key === "attackInterval"
        ? `${formatCombatStatValue(key, valueFor(key))} · ${(1 / stats.attackInterval).toFixed(2)} attacks/sec`
        : undefined;

  return (
    <div className="screen equipment-screen" data-debug-screen={embedded ? "hero" : "equipment"}>
      {!embedded && <ScreenHeading screen="hero" />}
      <div className="equipment-layout">
        <Panel
          title="Equipment loadout"
          subtitle={
            combatLocked
              ? "Viewing is allowed · Stop combat to change equipment."
              : "Combat-only equipment slots"
          }
          icon={ShieldCheck}
          panelId="equipmentLoadout"
          screen="hero"
          className="equipment-loadout"
        >
          <div className="loadout-topline">
            <div className="loadout-avatar">
              <Shield size={32} />
            </div>
            <div>
              <h3>Vanguard</h3>
              <p>
                {equippedProficiencyName
                  ? `${equippedProficiencyName} · Lv ${equippedProficiencyLevel}`
                  : "No weapon proficiency"}{" "}
                · {stats.attackPower} Attack Power
              </p>
            </div>
            <span className="loadout-rating">
              <Sparkles size={14} /> {stats.maxHealth} Max HP
            </span>
          </div>
          <div className="equipment-slot-groups">
            {equipmentGroups.map((group) => (
              <section
                key={group.id}
                className="equipment-slot-group"
                data-debug-kind="equipment-slot-group"
                data-debug-group={group.id}
              >
                <h3 className="equipment-slot-group-title">{group.label}</h3>
                <div className="equipment-slots">
                  {getEquipmentSlotsByGroup(group.id).map((slot) => {
                    const item = slot.id in game.equipment.slots
                      ? itemById[game.equipment.slots[slot.id] as string]
                      : undefined;
                    const active = selected === slot.id;
                    return (
                      <GameTooltip
                        key={slot.id}
                        content={
                          item
                            ? buildItemTooltip(item, {
                                equipped: true,
                                quantity: game.inventory.quantities[item.id] ?? 0,
                                defensiveContext,
                              })
                            : {
                                id: `equipment-slot.${slot.id}`,
                                title: `${slot.label} slot`,
                                description: "An equipment slot for the Hunter.",
                              }
                        }
                      >
                        <button
                          className={`equipment-slot ${active ? "is-selected" : ""}`}
                          onClick={() => selectSlot(slot.id)}
                          data-debug-kind="equipment-slot"
                          data-debug-slot={slot.id}
                          data-debug-slot-id={slot.id}
                          data-debug-slot-kind={slot.kind}
                          data-debug-slot-group={slot.group}
                          data-debug-item-id={item?.id}
                          data-debug-label={slot.label}
                        >
                          <span className="slot-label">{slot.label}</span>
                          <PlaceholderArt
                            icon={item?.icon ?? slot.icon}
                            size="medium"
                            variant={active ? "gold" : "muted"}
                          />
                          <strong>{item?.name ?? "Empty"}</strong>
                          <small>{active ? "Selected" : (item?.rarity ?? "Empty")}</small>
                          {active && (
                            <span className="selected-check">
                              <Check size={12} />
                            </span>
                          )}
                        </button>
                      </GameTooltip>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <div
            className="defensive-training-summary"
            data-debug-kind="defensive-training-summary"
          >
            <span className="tiny-label">ARMOR TRAINING</span>
            <div>
              <TrainingRate
                label="Light Armor"
                pieces={defensiveContext.lightArmorPieces}
                rate={defensiveContext.lightArmorPieces / ARMOR_TRAINING_SLOT_IDS.length}
                proficiencyId="light-armor"
              />
              <TrainingRate
                label="Medium Armor"
                pieces={defensiveContext.mediumArmorPieces}
                rate={defensiveContext.mediumArmorPieces / ARMOR_TRAINING_SLOT_IDS.length}
                proficiencyId="medium-armor"
              />
              <TrainingRate
                label="Heavy Armor"
                pieces={defensiveContext.heavyArmorPieces}
                rate={defensiveContext.heavyArmorPieces / ARMOR_TRAINING_SLOT_IDS.length}
                proficiencyId="heavy-armor"
              />
              <TrainingRate
                label="Shield"
                pieces={defensiveContext.shieldEquipped ? 1 : 0}
                rate={defensiveContext.shieldEquipped ? 1 : 0}
                proficiencyId="shield"
                shield
              />
            </div>
          </div>
          <div className="loadout-total">
            <span>Total combat rating</span>
            <strong>{stats.attackPower}</strong>
            <span className="text-green">
              {combatLocked ? "Locked during combat" : "Ready to equip"}
            </span>
          </div>
        </Panel>

        <CollapsiblePanel
          title="Hunter Combat Stats"
          subtitle="All derived values used by live combat"
          icon={Swords}
          panelId="equipmentStats"
          screen="hero"
          className="equipment-stats"
          summary={
            <>
              <span>Attack Power {stats.attackPower}</span>
              <span>Armor {Math.round(stats.armor)}</span>
              <span>Accuracy {Math.round(stats.accuracy)}</span>
              <span>Max Health {Math.round(stats.maxHealth)}</span>
            </>
          }
        >
          <div className="equipment-stat-groups">
            {statGroups.map((group) => (
              <EquipmentStatGroup
                key={group.id}
                group={group}
                valueFor={valueFor}
                detailFor={detailFor}
              />
            ))}
          </div>
          <div className="stat-tip">
            <Sparkles size={14} />
            <span>
              Preparation matters
              <br />
              <small>
                Temporary combat effects are shown on the Combat screen.
              </small>
            </span>
          </div>
        </CollapsiblePanel>

        <Panel
          title="Compatible items"
          subtitle={`Owned ${selectedDefinition.label} candidates`}
          icon={Sword}
          panelId="equipmentCandidates"
          screen="hero"
          actions={
            <span className="target-count">{candidates.length} compatible</span>
          }
        >
          <div className="candidate-list">
            {candidates.map((item) => (
              <CandidateItem
                key={item.id}
                item={item}
                slotId={selected}
                equipped={item.id === equippedId}
                canEquip={validateEquipmentChange({ item, slotId: selected, inventory: game.inventory, equipment: game.equipment, masteryLevel }).valid}
                availableCopies={getAvailableItemCopies(game.inventory, game.equipment, item.id, selected)}
                locked={combatLocked}
                masteryLocked={validateEquipmentChange({ item, slotId: selected, inventory: game.inventory, equipment: game.equipment, masteryLevel }).reason === "mastery-level"}
                onEquip={() => equipItem(item.id, selected)}
                quantity={game.inventory.quantities[item.id] ?? 0}
                masteryLevel={masteryLevel}
              />
            ))}
          </div>
          <div className="comparison-box">
            <span className="tiny-label">COMPARISON</span>
            <div>
              <span>Equipped</span>
              <strong>{equipped?.name ?? "Empty"}</strong>
              <em>
                {equipped
                  ? formatItemStats(equipped.stats ?? {})
                      .map((stat) => `${stat.label} ${stat.value}`)
                      .join(" · ") || "No combat stats"
                  : "No item equipped in this slot."}
              </em>
            </div>
            <ArrowRight size={15} />
            <div className="comparison-placeholder">
              <span>
                {combatLocked ? "Equipment locked" : "Select an item above"}
              </span>
              <small>
                {combatLocked
                  ? "Stop combat before equipping."
                  : "Click a candidate to equip it."}
              </small>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function EquipmentStatGroup({
  group,
  valueFor,
  detailFor,
}: {
  group: (typeof statGroups)[number];
  valueFor: (key: string) => number;
  detailFor: (key: string) => string | undefined;
}) {
  const [open, setOpen] = useState(
    () => readEquipmentStatGroupState()[group.id] ?? true,
  );
  const generatedId = useId().replace(/:/g, "");
  const contentId = `equipment-stat-group-${group.id}-${generatedId}`;
  return (
    <section
      className={`equipment-stat-group ${open ? "is-open" : "is-collapsed"}`}
      data-debug-panel-section={group.id}
    >
      <button
        type="button"
        className="equipment-stat-group-toggle"
        onClick={() =>
          setOpen((value) => {
            const next = !value;
            persistEquipmentStatGroupState(group.id, next);
            return next;
          })
        }
        aria-expanded={open}
        aria-controls={contentId}
        data-debug-kind="collapsible-stat-group"
        data-debug-panel-section={group.id}
        data-debug-label={group.title}
      >
        <h3>{group.title}</h3>
        <ChevronDown
          size={16}
          className={`equipment-stat-group-chevron ${open ? "is-open" : ""}`}
          aria-hidden="true"
        />
      </button>
      <div
        id={contentId}
        className="equipment-stat-group-content"
        hidden={!open}
        aria-hidden={!open}
      >
        <div
          className={
            group.id === "resistances"
              ? "equipment-resistance-grid"
              : "stat-stack"
          }
        >
          {group.keys.map((key) => {
            const value = valueFor(key);
            return (
              <StatLine
                key={key}
                label={labelForStatKey(key)}
                value={formatCombatStatValue(key, value)}
                detail={detailFor(key)}
                accent={
                  key.endsWith("Resistance")
                    ? value > 0
                      ? "green"
                      : value < 0
                        ? "red"
                        : undefined
                    : key === "attackPower"
                      ? "gold"
                      : undefined
                }
                statKey={key}
                statValue={value}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CandidateItem({
  item,
  slotId,
  equipped,
  canEquip,
  availableCopies,
  locked,
  masteryLocked,
  onEquip,
  quantity,
  masteryLevel,
}: {
  item: ItemDefinition;
  slotId: EquipmentSlotId;
  equipped: boolean;
  canEquip: boolean;
  availableCopies: number;
  locked: boolean;
  masteryLocked: boolean;
  onEquip: () => void;
  quantity: number;
  masteryLevel: number;
}) {
  const button = (
    <button
      className={`candidate-item ${equipped ? "is-equipped" : ""}`}
      onClick={onEquip}
      disabled={locked || !canEquip}
      data-debug-kind="equipment-candidate"
      data-debug-target-id={item.id}
      data-debug-item-id={item.id}
      data-debug-slot-id={slotId}
      data-debug-can-equip={canEquip && !locked ? "true" : "false"}
      data-debug-available-copies={availableCopies}
      data-debug-label={item.name}
    >
      <PlaceholderArt
        icon={item.icon}
        size="small"
        variant={
          item.rarity === "rare"
            ? "gold"
            : item.rarity === "uncommon"
              ? "blue"
              : "muted"
        }
      />
      <span>
        <strong>{item.name}</strong>
        <small>
          {formatItemStats(item.stats ?? {})
            .map((stat) => `${stat.label} ${stat.value}`)
            .join(" · ") || item.description}
        </small>
      </span>
      {equipped ? (
        <span className="equipped-label">
          <Check size={13} /> Equipped
        </span>
      ) : masteryLocked ? (
        <span className="equipped-label is-unavailable">REQUIRES MASTERY LV {item.requiredMasteryLevel}</span>
      ) : !canEquip ? (
        <span className="equipped-label is-unavailable">No spare copy</span>
      ) : (
        <ArrowRight size={15} />
      )}
    </button>
  );
  return locked ? (
    <GameTooltip content={buildItemTooltip(item, { quantity, equipped, masteryLevel })}>
      <span className="candidate-tooltip-host">{button}</span>
    </GameTooltip>
  ) : (
    <GameTooltip content={buildItemTooltip(item, { quantity, equipped, masteryLevel })}>
      {button}
    </GameTooltip>
  );
}

function TrainingRate({
  label,
  pieces,
  rate,
  proficiencyId,
  shield = false,
}: {
  label: string;
  pieces: number;
  rate: number;
  proficiencyId: string;
  shield?: boolean;
}) {
  return (
    <span
      data-debug-defensive-proficiency={proficiencyId}
      data-debug-armor-piece-count={pieces}
      data-debug-training-rate={rate}
    >
      <strong>{label}</strong>
      <small>
        {shield
          ? pieces > 0
            ? "Equipped"
            : "Not equipped"
          : `${pieces}/${ARMOR_TRAINING_SLOT_IDS.length} pieces`}{" "}
        · {rate.toFixed(2)}× XP
      </small>
    </span>
  );
}
