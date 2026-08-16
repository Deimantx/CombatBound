import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getActionById,
  getEffectivePlayerActionCost,
} from "../../../../game/combat/playerActions";
import { createCombatPreviewContext } from "../../../../game/combat/combatEngine";
import { techniqueDefinitions } from "../../../../game/data/techniques";
import { weaponSkillById } from "../../../../game/data/weaponSkills";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import { calculateHitChance } from "../../../../game/combat/combatMath";
import { getEnemyEffectiveCombatStats, getPlayerEffectiveCombatStats } from "../../../../game/combat/combatSelectors";
import { proficiencyById } from "../../../../game/data/proficiencies";
import { getEquippedWeaponProficiency } from "../../../../game/progression/progressionSelectors";
import { getProficiencyLevel } from "../../../../game/progression/proficiencyProgression";
import { getWeaponSkillGroups, type WeaponSkillGroup } from "../../../../game/presentation/weaponSkillCatalogue";
import {
  getCombatAbilityAvailability,
  getCombatAbilityEquippedSlot,
  getKnownCombatAbilities,
  getTechniqueEquippedSlot,
} from "../../../../game/combatAbilities/combatAbilitySelectors";
import {
  COMBAT_ABILITY_SLOT_COUNT,
  TECHNIQUE_SLOT_COUNT,
  type CombatAbilityCatalogueEntry,
} from "../../../../game/combatAbilities/combatAbilityTypes";
import type { TechniqueId } from "../../../../game/combat/combatTypes";
import type { GameState } from "../../../../game/gameState";
import { useGameStore } from "../../../../state/gameStore";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { CatalogueAccordionGroup } from "../../../components/CatalogueAccordionGroup";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { buildCombatAbilityTooltip } from "../../../../game/presentation/tooltipBuilders";

type LibraryFilter = "all" | "core" | "active-defense" | "weapon-skills" | "techniques";
type CombatAbilityDragPayload =
  | { kind: "active-ability"; actionId: string; sourceSlot?: number }
  | { kind: "technique"; techniqueId: TechniqueId; sourceSlot?: number };
type DropState = "idle" | "valid" | "invalid" | "over";

interface DragState {
  payload: CombatAbilityDragPayload | null;
  target: string | null;
  state: DropState;
}

const emptyDrag: DragState = { payload: null, target: null, state: "idle" };

export function CombatAbilitiesWindow({
  game,
  onOpenAutomation,
}: {
  game: GameState;
  onOpenAutomation: (actionId?: string, createRule?: boolean) => void;
}) {
  const equipCombatAbility = useGameStore((state) => state.equipCombatAbility);
  const moveCombatAbility = useGameStore((state) => state.moveCombatAbility);
  const unequipCombatAbility = useGameStore((state) => state.unequipCombatAbility);
  const equipTechnique = useGameStore((state) => state.setTechniqueSlot);
  const moveTechnique = useGameStore((state) => state.moveTechnique);
  const unequipTechnique = useGameStore((state) => state.unequipTechnique);
  const combatLocked = game.combat.phase === "active" || game.combat.phase === "recovery";
  const context = useMemo(() => createCombatPreviewContext(), []);
  const stats = calculateHunterCombatStats(
    game.equipment,
    game.progression,
    game.combat.stance,
    game.combat.techniques,
  );
  const entries = getKnownCombatAbilities(game);
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("defense.guard");
  const [selectedActiveSlot, setSelectedActiveSlot] = useState(0);
  const [selectedTechniqueSlot, setSelectedTechniqueSlot] = useState(0);
  const [drag, setDrag] = useState<DragState>(emptyDrag);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(["all.core", "all.weapon-skills", "all.active-defense"]));
  const weaponSkillGroups = useMemo(() => getWeaponSkillGroups(), []);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = entries.filter((entry) => {
    if (filter === "all") return true;
    if (filter === "core") return entry.kind === "core";
    if (filter === "active-defense") return entry.kind === "active-action" && entry.category === "active-defense";
    if (filter === "weapon-skills") return entry.kind === "active-action" && entry.category === "weapon-skill";
    return entry.kind === "technique";
  }).filter((entry) => combatAbilityEntryMatchesQuery(entry, normalizedQuery));
  const selectedEntry = entries.find((entry) =>
    entry.kind === "core"
      ? entry.id === selectedId
      : entry.kind === "active-action"
        ? entry.actionId === selectedId
        : entry.techniqueId === selectedId,
  );
  const equippedWeaponProficiency = getEquippedWeaponProficiency(game.equipment);
  const defaultWeaponGroupId = getDefaultWeaponGroupId(game, entries, selectedId, weaponSkillGroups);
  useEffect(() => {
    if ((filter !== "weapon-skills" && filter !== "all") || !defaultWeaponGroupId) return;
    setExpandedGroups((current) => current.has(defaultWeaponGroupId) ? current : new Set([...current, defaultWeaponGroupId]));
  }, [defaultWeaponGroupId, filter]);
  const toggleGroup = (groupId: string) => {
    if (drag.payload) return;
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };
  const isGroupExpanded = (groupId: string) => Boolean(normalizedQuery) || expandedGroups.has(groupId);
  const clearDrag = () => setDrag(emptyDrag);
  const startDrag = (event: React.DragEvent, payload: CombatAbilityDragPayload) => {
    if (combatLocked) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", payload.kind === "technique" ? payload.techniqueId : payload.actionId);
    setDrag({ payload, target: null, state: "idle" });
  };
  const targetIsValid = (target: string) => {
    const payload = drag.payload;
    if (!payload || combatLocked) return false;
    if (target === "library") return payload.sourceSlot !== undefined;
    if (target.startsWith("active-")) {
      return payload.kind === "active-ability" && payload.sourceSlot !== Number(target.slice(7));
    }
    if (target.startsWith("technique-")) {
      return payload.kind === "technique" && payload.sourceSlot !== Number(target.slice(10));
    }
    return false;
  };
  const setTarget = (target: string, event?: React.DragEvent) => {
    if (event) event.preventDefault();
    const valid = targetIsValid(target);
    if (event) event.dataTransfer.dropEffect = valid ? "move" : "none";
    setDrag((current) => ({ ...current, target, state: valid ? "valid" : "invalid" }));
  };
  const handleDrop = (target: string) => {
    const payload = drag.payload;
    if (!payload || !targetIsValid(target)) {
      clearDrag();
      return;
    }
    if (target === "library") {
      if (payload.kind === "active-ability" && payload.sourceSlot !== undefined)
        unequipCombatAbility(payload.sourceSlot);
      if (payload.kind === "technique" && payload.sourceSlot !== undefined)
        unequipTechnique(payload.sourceSlot);
    } else if (target.startsWith("active-") && payload.kind === "active-ability") {
      const slot = Number(target.slice(7));
      if (payload.sourceSlot === undefined) equipCombatAbility(payload.actionId, slot);
      else moveCombatAbility(payload.sourceSlot, slot);
      setSelectedId(payload.actionId);
      setSelectedActiveSlot(slot);
    } else if (target.startsWith("technique-") && payload.kind === "technique") {
      const slot = Number(target.slice(10));
      if (payload.sourceSlot === undefined) equipTechnique(slot, payload.techniqueId);
      else moveTechnique(payload.sourceSlot, slot);
      setSelectedId(payload.techniqueId);
      setSelectedTechniqueSlot(slot);
    }
    clearDrag();
  };
  const libraryDropValid = drag.payload?.sourceSlot !== undefined;
  const entryKey = (entry: CombatAbilityCatalogueEntry) => entry.kind === "core" ? entry.id : entry.kind === "active-action" ? entry.actionId : entry.techniqueId;
  const renderEntry = (entry: CombatAbilityCatalogueEntry) => <LibraryEntry
    key={entryKey(entry)}
    entry={entry}
    game={game}
    selected={selectedEntry === entry}
    drag={drag}
    combatLocked={combatLocked}
    onSelect={() => setSelectedId(entryKey(entry))}
    onDragStart={startDrag}
    onDragEnd={clearDrag}
  />;
  const renderWeaponGroups = () => weaponSkillGroups.map((group) => {
    const groupEntries = filteredEntries.filter((entry) => entry.kind === "active-action" && entry.category === "weapon-skill" && entry.proficiencyId === group.proficiencyId);
    if (!groupEntries.length) return null;
    const authoredEntries = entries.filter((entry) => entry.kind === "active-action" && entry.category === "weapon-skill" && entry.proficiencyId === group.proficiencyId);
    const equippedCount = authoredEntries.filter((entry) => entry.kind === "active-action" && game.combatAbilities.activeSlots.includes(entry.actionId)).length;
    const groupId = `weapon.${group.proficiencyId}`;
    const level = getProficiencyLevel(game.progression, group.proficiencyId);
    return <CatalogueAccordionGroup
      key={groupId}
      id={groupId}
      label={group.name}
      icon={group.icon}
      count={groupEntries.length}
      expanded={isGroupExpanded(groupId)}
      onToggle={() => toggleGroup(groupId)}
      className="combat-ability-weapon-group"
      debugGroupType="weapon"
      debugProficiencyId={group.proficiencyId}
      meta={<span className="combat-ability-group-meta"><span>{authoredEntries.length} skills · {equippedCount} equipped · Lv {level}</span>{equippedWeaponProficiency === group.proficiencyId && <em>CURRENT WEAPON</em>}</span>}
    >
      {groupEntries.map(renderEntry)}
    </CatalogueAccordionGroup>;
  });
  const renderAllSection = (id: string, label: string, icon: string, sectionEntries: CombatAbilityCatalogueEntry[], children?: React.ReactNode) => {
    if (!sectionEntries.length) return null;
    return <CatalogueAccordionGroup id={`all.${id}`} label={label} icon={icon} count={sectionEntries.length} expanded={isGroupExpanded(`all.${id}`)} onToggle={() => toggleGroup(`all.${id}`)}>{children ?? sectionEntries.map(renderEntry)}</CatalogueAccordionGroup>;
  };
  const renderLibrary = () => {
    if (filter === "weapon-skills") return renderWeaponGroups();
    if (filter === "all") {
      const core = filteredEntries.filter((entry) => entry.kind === "core");
      const weapons = filteredEntries.filter((entry) => entry.kind === "active-action" && entry.category === "weapon-skill");
      const defenses = filteredEntries.filter((entry) => entry.kind === "active-action" && entry.category === "active-defense");
      const techniques = filteredEntries.filter((entry) => entry.kind === "technique");
      return <>
        {renderAllSection("core", "CORE", "cross", core)}
        {renderAllSection("weapon-skills", "WEAPON SKILLS", "sword", weapons, renderWeaponGroups())}
        {renderAllSection("active-defense", "ACTIVE DEFENSE", "shield", defenses)}
        {renderAllSection("techniques", "TECHNIQUES", "spark", techniques)}
      </>;
    }
    return filteredEntries.map(renderEntry);
  };

  return (
    <div className="combat-abilities-window" data-debug-kind="combat-abilities-window">
      <div className="combat-abilities-lock-note">
        {combatLocked
          ? "COMBAT ACTIVE · Loadouts are locked until the Hunt stops. You can still inspect every ability."
          : "Active Abilities spend Stamina when used. Sustained Techniques drain Stamina continuously while enabled."}
      </div>
      <div className="combat-abilities-callout">
        <strong>Only equipped abilities appear in Combat.</strong>
        <span>Stances are configured directly during Combat and do not use ability slots.</span>
      </div>
      <section className="combat-ability-loadout" aria-label="Active ability loadout">
        <div className="section-title"><span className="tiny-label">ACTIVE ABILITY LOADOUT</span><span>{game.combatAbilities.activeSlots.filter(Boolean).length} / {COMBAT_ABILITY_SLOT_COUNT} equipped</span></div>
        <p className="combat-ability-dnd-hint">Drag active abilities into slots · drag slots to reorder</p>
        <div className="combat-ability-slots">
          {Array.from({ length: COMBAT_ABILITY_SLOT_COUNT }, (_, slot) => {
            const actionId = game.combatAbilities.activeSlots[slot];
            const entry = entries.find((candidate) => candidate.kind === "active-action" && candidate.actionId === actionId);
            return <LoadoutSlot
              key={slot}
              kind="active"
              slot={slot}
              label={entry?.name ?? "EMPTY ABILITY SLOT"}
              icon={entry?.icon ?? "shield"}
              selected={selectedActiveSlot === slot && selectedEntry?.kind === "active-action"}
              actionId={actionId}
              drag={drag}
              combatLocked={combatLocked}
              onSelect={() => { setSelectedActiveSlot(slot); if (actionId) setSelectedId(actionId); }}
              onDragStart={(event) => actionId && startDrag(event, { kind: "active-ability", actionId, sourceSlot: slot })}
              onDragOver={(event) => setTarget(`active-${slot}`, event)}
              onDrop={() => handleDrop(`active-${slot}`)}
              onDragEnd={clearDrag}
            />;
          })}
        </div>
      </section>
      <section className="technique-loadout" aria-label="Sustained technique loadout">
        <div className="section-title"><span className="tiny-label">SUSTAINED TECHNIQUE LOADOUT</span><span>{game.combatAbilities.techniqueSlots.filter(Boolean).length} / {TECHNIQUE_SLOT_COUNT} equipped</span></div>
        <p className="combat-ability-dnd-hint">Drag techniques into slots · drag slots to reorder</p>
        <div className="technique-slots">
          {Array.from({ length: TECHNIQUE_SLOT_COUNT }, (_, slot) => {
            const techniqueId = game.combatAbilities.techniqueSlots[slot];
            const entry = techniqueId ? techniqueDefinitions[techniqueId] : undefined;
            return <LoadoutSlot
              key={slot}
              kind="technique"
              slot={slot}
              label={entry?.name ?? "EMPTY TECHNIQUE SLOT"}
              icon="spark"
              selected={selectedTechniqueSlot === slot && selectedEntry?.kind === "technique"}
              techniqueId={techniqueId}
              drag={drag}
              combatLocked={combatLocked}
              onSelect={() => { setSelectedTechniqueSlot(slot); if (techniqueId) setSelectedId(techniqueId); }}
              onDragStart={(event) => techniqueId && startDrag(event, { kind: "technique", techniqueId, sourceSlot: slot })}
              onDragOver={(event) => setTarget(`technique-${slot}`, event)}
              onDrop={() => handleDrop(`technique-${slot}`)}
              onDragEnd={clearDrag}
            />;
          })}
        </div>
      </section>
      <div className="combat-ability-filters" role="tablist" aria-label="Combat ability filters">
        {([
          ["all", "ALL"],
          ["core", "CORE"],
          ["active-defense", "ACTIVE DEFENSE"],
          ["weapon-skills", "WEAPON SKILLS"],
          ["techniques", "TECHNIQUES"],
        ] as Array<[LibraryFilter, string]>).map(([value, label]) => <button key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      <div
        className={`combat-ability-browser ${drag.target === "library" ? "is-unequip-target" : ""}`}
        onDrop={(event) => { if (event.target !== event.currentTarget) return; event.preventDefault(); handleDrop("library"); }}
        data-debug-kind="combat-ability-library-dropzone"
        data-debug-dragging={drag.payload ? "true" : "false"}
        data-debug-drop-state={drag.target === "library" ? drag.state : "idle"}
      >
        <section className="combat-ability-library combatbound-scroll" aria-label="Combat ability library" onDragOver={(event) => setTarget("library", event)} onDrop={(event) => { event.preventDefault(); handleDrop("library"); }}>
          <div className="section-title"><span className="tiny-label">ABILITY LIBRARY</span><span>{filteredEntries.length}{normalizedQuery ? " matches" : ""}</span></div>
          <label className="catalogue-search combat-ability-search">
            <Search size={13} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search abilities..." aria-label="Search abilities" data-debug-kind="combat-ability-search" />
          </label>
          {filteredEntries.length ? renderLibrary() : <p className="catalogue-no-results">No combat abilities match “{query}”.</p>}
          {libraryDropValid && <div className="combat-ability-unequip-copy"><X size={13} /> DROP HERE TO UNEQUIP</div>}
        </section>
        <CombatAbilityDetails
          game={game}
          entry={selectedEntry}
          stats={stats}
          context={context}
          selectedActiveSlot={selectedActiveSlot}
          selectedTechniqueSlot={selectedTechniqueSlot}
          combatLocked={combatLocked}
          onEquipActive={(actionId) => equipCombatAbility(actionId, selectedActiveSlot)}
          onUnequipActive={unequipCombatAbility}
          onEquipTechnique={(techniqueId) => equipTechnique(selectedTechniqueSlot, techniqueId)}
          onUnequipTechnique={unequipTechnique}
          onOpenAutomation={onOpenAutomation}
        />
      </div>
    </div>
  );
}

function combatAbilityEntryMatchesQuery(entry: CombatAbilityCatalogueEntry, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  const proficiencyName = entry.kind === "active-action" && entry.proficiencyId
    ? proficiencyById[entry.proficiencyId]?.name ?? entry.proficiencyId
    : "";
  const category = entry.kind === "core"
    ? "core combat"
    : entry.kind === "technique"
      ? "technique sustained stamina evasion accuracy"
      : entry.category === "weapon-skill"
        ? "weapon skill stamina"
        : "active defense stamina";
  const tags = entry.kind === "active-action" && entry.category === "weapon-skill"
    ? weaponSkillById[entry.actionId]?.tags.join(" ") ?? ""
    : "";
  return [entry.kind === "core" ? entry.id : "", entry.kind === "active-action" ? entry.actionId : "", entry.kind === "technique" ? entry.techniqueId : "", entry.name, entry.description, proficiencyName, category, tags].join(" ").toLowerCase().includes(normalizedQuery);
}

function getDefaultWeaponGroupId(
  game: GameState,
  entries: CombatAbilityCatalogueEntry[],
  selectedId: string,
  groups: WeaponSkillGroup[],
) {
  const selected = entries.find((entry) => entry.kind === "active-action" && entry.category === "weapon-skill" && entry.actionId === selectedId);
  if (selected?.kind === "active-action" && selected.proficiencyId) return `weapon.${selected.proficiencyId}`;
  const equippedWeapon = getEquippedWeaponProficiency(game.equipment);
  if (equippedWeapon && groups.some((group) => group.proficiencyId === equippedWeapon)) return `weapon.${equippedWeapon}`;
  const equippedSkill = entries.find((entry) => entry.kind === "active-action" && entry.category === "weapon-skill" && game.combatAbilities.activeSlots.includes(entry.actionId));
  if (equippedSkill?.kind === "active-action" && equippedSkill.proficiencyId) return `weapon.${equippedSkill.proficiencyId}`;
  return groups[0] ? `weapon.${groups[0].proficiencyId}` : undefined;
}

function LoadoutSlot({
  kind,
  slot,
  label,
  icon,
  selected,
  actionId,
  techniqueId,
  drag,
  combatLocked,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  kind: "active" | "technique";
  slot: number;
  label: string;
  icon: string;
  selected: boolean;
  actionId?: string | null;
  techniqueId?: TechniqueId | null;
  drag: DragState;
  combatLocked: boolean;
  onSelect: () => void;
  onDragStart: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const value = actionId ?? techniqueId;
  const dragging = drag.payload?.sourceSlot === slot && (kind === "active" ? drag.payload.kind === "active-ability" : drag.payload.kind === "technique");
  const target = drag.target === `${kind}-${slot}`;
  return <button
    className={`combat-ability-slot ${selected ? "is-selected" : ""} ${dragging ? "is-dragging" : ""} ${target ? "is-drop-target" : ""} ${target && drag.state === "valid" ? "is-drop-valid" : ""} ${target && drag.state === "invalid" ? "is-drop-invalid" : ""}`}
    onClick={onSelect}
    draggable={Boolean(value) && !combatLocked}
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={(event) => { event.preventDefault(); onDrop(); }}
    onDragEnd={onDragEnd}
    data-debug-kind={kind === "active" ? "combat-ability-slot" : "technique-loadout-slot"}
    data-debug-slot={slot}
    data-debug-action-id={actionId ?? undefined}
    data-debug-technique-id={techniqueId ?? undefined}
    data-debug-dragging={dragging ? "true" : "false"}
    data-debug-drop-state={target ? drag.state : "idle"}
  >
    <span className="combat-ability-slot-number">{slot + 1}</span>
    <PlaceholderArt icon={icon} size="small" variant={value ? "gold" : "muted"} />
    <strong>{label}</strong>
    <small>{value ? (kind === "technique" ? "SUSTAINED · TOGGLE" : "ACTIVE · STAMINA") : "Configure in Hero"}</small>
    {!value && drag.payload && <em>DROP HERE</em>}
  </button>;
}

function LibraryEntry({
  entry,
  game,
  selected,
  drag,
  combatLocked,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  entry: CombatAbilityCatalogueEntry;
  game: GameState;
  selected: boolean;
  drag: DragState;
  combatLocked: boolean;
  onSelect: () => void;
  onDragStart: (event: React.DragEvent, payload: CombatAbilityDragPayload) => void;
  onDragEnd: () => void;
}) {
  const actionId = entry.kind === "active-action" ? entry.actionId : undefined;
  const techniqueId = entry.kind === "technique" ? entry.techniqueId : undefined;
  const equippedSlot = actionId !== undefined
    ? getCombatAbilityEquippedSlot(game, actionId)
    : techniqueId !== undefined
      ? getTechniqueEquippedSlot(game, techniqueId)
      : -1;
  const availability = actionId ? getCombatAbilityAvailability(game, actionId) : undefined;
  const action = actionId ? getActionById(game, actionId, createCombatPreviewContext()) : undefined;
  const dragging = drag.payload && ((actionId && drag.payload.kind === "active-ability" && drag.payload.actionId === actionId) || (techniqueId && drag.payload.kind === "technique" && drag.payload.techniqueId === techniqueId));
  return <GameTooltip content={buildCombatAbilityTooltip(entry, { action, availability, equippedSlot })}><button
    className={`combat-ability-library-entry ${selected ? "is-selected" : ""} ${dragging ? "is-dragging" : ""}`}
    onClick={onSelect}
    draggable={entry.kind !== "core" && !combatLocked}
    onDragStart={(event) => {
      if (entry.kind === "active-action") onDragStart(event, { kind: "active-ability", actionId: entry.actionId });
      if (entry.kind === "technique") onDragStart(event, { kind: "technique", techniqueId: entry.techniqueId });
    }}
    onDragEnd={onDragEnd}
    data-debug-kind="combat-ability-library-entry"
    data-debug-ability-id={entry.kind === "core" ? entry.id : entry.kind === "active-action" ? entry.actionId : entry.techniqueId}
    data-debug-ability-kind={entry.kind === "active-action" ? entry.category : entry.kind}
    data-debug-proficiency-id={entry.kind === "active-action" ? entry.proficiencyId : undefined}
    data-debug-dragging={dragging ? "true" : "false"}
  >
    <PlaceholderArt icon={entry.icon} size="small" variant={entry.kind === "technique" ? "blue" : "gold"} />
    <span><strong>{entry.name}</strong><small>{entry.kind === "core" ? "CORE COMBAT · ALWAYS AVAILABLE" : entry.kind === "technique" ? `${techniqueDefinitions[entry.techniqueId].staminaDrainPerSecond.toFixed(1)} Stamina/s · SUSTAINED TECHNIQUE` : `${entry.category === "active-defense" ? "ACTIVE DEFENSE" : "WEAPON SKILL"} · ${getActionById(game, entry.actionId, createCombatPreviewContext())?.resourceCost?.stamina ?? 0} Stamina`}</small></span>
    <em className={availability && !availability.usable ? "is-invalid" : equippedSlot >= 0 ? "is-equipped" : ""}>{entry.kind === "core" ? "ALWAYS AVAILABLE" : equippedSlot >= 0 ? `${entry.kind === "technique" ? "EQUIPPED T" : "EQUIPPED "}${equippedSlot + 1}` : availability && !availability.usable ? availability.label : "KNOWN"}</em>
  </button></GameTooltip>;
}

function CombatAbilityDetails({
  game,
  entry,
  stats,
  context,
  selectedActiveSlot,
  selectedTechniqueSlot,
  combatLocked,
  onEquipActive,
  onUnequipActive,
  onEquipTechnique,
  onUnequipTechnique,
  onOpenAutomation,
}: {
  game: GameState;
  entry?: CombatAbilityCatalogueEntry;
  stats: ReturnType<typeof calculateHunterCombatStats>;
  context: ReturnType<typeof createCombatPreviewContext>;
  selectedActiveSlot: number;
  selectedTechniqueSlot: number;
  combatLocked: boolean;
  onEquipActive: (actionId: string) => void;
  onUnequipActive: (slot: number) => void;
  onEquipTechnique: (techniqueId: TechniqueId) => void;
  onUnequipTechnique: (slot: number) => void;
  onOpenAutomation: (actionId?: string, createRule?: boolean) => void;
}) {
  if (!entry) return <section className="combat-ability-details"><span className="muted-copy">Select an ability to inspect it.</span></section>;
  if (entry.kind === "core") return <section className="combat-ability-details" aria-label={`${entry.name} details`}><DetailHeading icon={entry.icon} title={entry.name} subtitle="Core Combat" /><div className="combat-ability-detail-callout"><strong>Always Available</strong><span>Does not use an Active Ability slot.</span></div><DetailRow label="Resource" value="None" /><DetailRow label="Global Cooldown" value="No" /><DetailRow label="Attack cadence" value={`${stats.attackInterval.toFixed(1)}s Attack Interval`} /><DetailCopy label="TARGET" value="Selected Enemy" /><DetailCopy label="DESCRIPTION" value="Your equipped weapon performs this background attack automatically." /></section>;
  if (entry.kind === "technique") {
    const technique = techniqueDefinitions[entry.techniqueId];
    const equippedSlot = getTechniqueEquippedSlot(game, entry.techniqueId);
    const equippedDrain = game.combatAbilities.techniqueSlots.reduce((sum, id) => sum + (id ? techniqueDefinitions[id].staminaDrainPerSecond : 0), 0);
    const net = stats.staminaRegen - equippedDrain;
    return <section className="combat-ability-details" aria-label={`${entry.name} details`}><DetailHeading icon={entry.icon} title={entry.name} subtitle="Sustained Technique" /><div className="combat-ability-detail-grid"><DetailRow label="Stamina Drain" value={`${technique.staminaDrainPerSecond.toFixed(1)} / second`} /><DetailRow label="Current Slot" value={equippedSlot >= 0 ? `Technique ${equippedSlot + 1}` : "Not Equipped"} /><DetailRow label="Current Regen" value={`${stats.staminaRegen.toFixed(1)} / second`} /><DetailRow label="Net with Loadout" value={`${net >= 0 ? "+" : ""}${net.toFixed(1)} / second`} /></div><DetailCopy label="DESCRIPTION" value={technique.description} /><DetailCopy label="STAT EFFECTS" value={`${technique.accuracyRating ? `+${technique.accuracyRating} Accuracy Rating` : ""}${technique.evasionRating ? `${technique.accuracyRating ? " · " : ""}+${technique.evasionRating} Evasion Rating` : ""}`} /><DetailCopy label="ACTIVATION" value="Toggle during Combat. Automatically disables if Stamina reaches zero." /><div className="combat-ability-equip-actions"><button className="button button-primary" disabled={combatLocked || equippedSlot === selectedTechniqueSlot} onClick={() => onEquipTechnique(entry.techniqueId)}>{combatLocked ? "LOADOUT LOCKED" : `EQUIP TO SLOT ${selectedTechniqueSlot + 1}`}</button>{equippedSlot >= 0 && <button className="button button-ghost" disabled={combatLocked} onClick={() => onUnequipTechnique(equippedSlot)}>UNEQUIP</button>}</div></section>;
  }
  const action = getActionById(game, entry.actionId, context);
  const availability = getCombatAbilityAvailability(game, entry.actionId);
  const equippedSlot = getCombatAbilityEquippedSlot(game, entry.actionId);
  const cost = action ? getEffectivePlayerActionCost(game, action, stats, context) : { stamina: 0, mana: 0 };
  const skill = action?.sourceWeaponSkillId ? weaponSkillById[action.sourceWeaponSkillId] : undefined;
  const target = game.combat.enemies.find((enemy) => enemy.instanceId === game.combat.selectedEnemyInstanceId && !enemy.defeated);
  const effectivePlayerStats = getPlayerEffectiveCombatStats(game.combat, stats, game.progression);
  const effectiveTargetStats = target ? getEnemyEffectiveCombatStats(target) : undefined;
  const normalHitChance = effectiveTargetStats
    ? calculateHitChance(effectivePlayerStats.accuracyRating ?? 0, effectiveTargetStats.evasionRating ?? 0)
    : undefined;
  const skillHitChance = skill && effectiveTargetStats
    ? calculateHitChance((effectivePlayerStats.accuracyRating ?? 0) + skill.accuracyModifier, effectiveTargetStats.evasionRating ?? 0)
    : undefined;
  const rules = game.combatAutomation.rules.filter((rule) => rule.actionId === entry.actionId);
  /*
  return <section className="combat-ability-details" aria-label={`${entry.name} details`} data-debug-kind={entry.category === "weapon-skill" ? "weapon-skill-details" : "combat-ability-details"} data-debug-ability-id={entry.actionId} data-debug-proficiency-id={skill?.proficiencyId}><DetailHeading icon={entry.icon} title={entry.name} subtitle={entry.category === "active-defense" ? "Active Defense" : "Weapon Skill"} /><div className="combat-ability-detail-grid"><DetailRow label="Stamina Cost" value={`${cost.stamina}`} /><DetailRow label="Cooldown" value={`${action?.cooldown.toFixed(1) ?? "0.0"}s`} /><DetailRow label="Global Cooldown" value={action?.globalCooldown === "none" ? "No" : action?.globalCooldown === "standard" ? "Yes" : `${action?.globalCooldown ?? 0}s`} /><DetailRow label="Target" value={action?.targetMode === "self" ? "Self" : "Selected Enemy"} />{skill && <DetailRow label="Damage" value={`${Math.round(skill.damageMultiplier * 100)}% weapon damage`} />}{skill && <DetailRow label="Accuracy" value={`${skill.accuracyModifier >= 0 ? "+" : ""}${skill.accuracyModifier}`} />}</div>{skill && <div className="combat-ability-detail-grid"><DetailRow label="Planned Unlock" value={`${skill.proficiencyId} Lv ${skill.unlock.level}`} /><DetailRow label="Prototype" value="Unlocked for testing" />{skillHitChance !== undefined && <DetailRow label="Current Hit Chance" value={`${Math.round(skillHitChance * 100)}%`} />}</div>{skillHitChance !== undefined && <DetailCopy label="CURRENT TARGET" value={`Normal Weapon Hit Chance ${Math.round((normalHitChance ?? 0) * 100)}% · ${entry.name} ${Math.round(skillHitChance * 100)}%`} />}<div className={`combat-ability-status ${availability.usable ? "is-ready" : "is-invalid"}`}><strong>{equippedSlot >= 0 ? availability.label : "NOT EQUIPPED"}</strong>{availability.requirement && <span>{availability.requirement}</span>}</div><DetailCopy label="DESCRIPTION" value={entry.description} />{skill?.selfEffectId && <DetailCopy label="ON SUCCESSFUL HP HIT" value={`${weaponSkillById[skill.id]?.selfEffectId ? "Applies " : ""}${skill.selfEffectId}`} />} {skill?.targetEffectId && <DetailCopy label="ON SUCCESSFUL HP HIT" value={`Applies ${skill.targetEffectId}`} />} {skill?.cleave && <DetailCopy label="CLEAVE" value={`Up to ${skill.cleave.maxSecondaryTargets} additional living enemies take ${Math.round(skill.cleave.primaryResolvedDamageFraction * 100)}% of resolved primary HP damage.`} />}{action?.requirements && <DetailCopy label="REQUIREMENTS" value={availability.requirement ?? "Equipment requirements satisfied"} />}<div className="combat-ability-automation"><span className="tiny-label">AUTOMATION</span><strong>{rules.length} rule{rules.length === 1 ? "" : "s"}</strong><div className="hero-inline-actions"><button className="button button-ghost" onClick={() => onOpenAutomation(entry.actionId, false)}>VIEW RULES</button><button className="button button-ghost" onClick={() => onOpenAutomation(entry.actionId, true)}>ADD RULE</button></div></div><div className="combat-ability-equip-actions"><span className="tiny-label">{equippedSlot >= 0 ? `EQUIPPED SLOT ${equippedSlot + 1}` : `TARGET SLOT ${selectedActiveSlot + 1}`}</span><button className="button button-primary" disabled={combatLocked || equippedSlot === selectedActiveSlot} onClick={() => onEquipActive(entry.actionId)}>{combatLocked ? "LOADOUT LOCKED" : "EQUIP TO SLOT"}</button>{equippedSlot >= 0 && <button className="button button-ghost" disabled={combatLocked} onClick={() => onUnequipActive(equippedSlot)}>UNEQUIP</button>}</div></section>;
  */
  return (
    <section
      className="combat-ability-details"
      aria-label={`${entry.name} details`}
      data-debug-kind={entry.category === "weapon-skill" ? "weapon-skill-details" : "combat-ability-details"}
      data-debug-ability-id={entry.actionId}
      data-debug-proficiency-id={skill?.proficiencyId}
    >
      <DetailHeading icon={entry.icon} title={entry.name} subtitle={entry.category === "active-defense" ? "Active Defense" : "Weapon Skill"} />
      <div className="combat-ability-detail-grid">
        <DetailRow label="Stamina Cost" value={`${cost.stamina}`} />
        <DetailRow label="Cooldown" value={`${action?.cooldown.toFixed(1) ?? "0.0"}s`} />
        <DetailRow label="Global Cooldown" value={action?.globalCooldown === "none" ? "No" : action?.globalCooldown === "standard" ? "Yes" : `${action?.globalCooldown ?? 0}s`} />
        <DetailRow label="Target" value={action?.targetMode === "self" ? "Self" : "Selected Enemy"} />
        {skill && <DetailRow label="Damage" value={`${Math.round(skill.damageMultiplier * 100)}% weapon damage`} />}
        {skill && <DetailRow label="Accuracy" value={`${skill.accuracyModifier >= 0 ? "+" : ""}${skill.accuracyModifier}`} />}
      </div>
      {skill && <div className="combat-ability-detail-grid">
        <DetailRow label="Planned Unlock" value={`${skill.proficiencyId} Lv ${skill.unlock.level}`} />
        <DetailRow label="Prototype" value="Unlocked for testing" />
        {skillHitChance !== undefined && <DetailRow label="Current Hit Chance" value={`${Math.round(skillHitChance * 100)}%`} />}
      </div>}
      {skillHitChance !== undefined && <DetailCopy label="CURRENT TARGET" value={`Normal Weapon Hit Chance ${Math.round((normalHitChance ?? 0) * 100)}% · ${entry.name} ${Math.round(skillHitChance * 100)}%`} />}
      <div className={`combat-ability-status ${availability.usable ? "is-ready" : "is-invalid"}`}>
        <strong>{equippedSlot >= 0 ? availability.label : "NOT EQUIPPED"}</strong>
        {availability.requirement && <span>{availability.requirement}</span>}
      </div>
      <DetailCopy label="DESCRIPTION" value={entry.description} />
      {skill?.selfEffectId && <DetailCopy label="ON SUCCESSFUL HP HIT" value={`Applies ${skill.selfEffectId}`} />}
      {skill?.targetEffectId && <DetailCopy label="ON SUCCESSFUL HP HIT" value={`Applies ${skill.targetEffectId}`} />}
      {skill?.cleave && <DetailCopy label="CLEAVE" value={`Up to ${skill.cleave.maxSecondaryTargets} additional living enemies take ${Math.round(skill.cleave.primaryResolvedDamageFraction * 100)}% of resolved primary HP damage.`} />}
      {action?.requirements && <DetailCopy label="REQUIREMENTS" value={availability.requirement ?? "Equipment requirements satisfied"} />}
      <div className="combat-ability-automation">
        <span className="tiny-label">AUTOMATION</span>
        <strong>{rules.length} rule{rules.length === 1 ? "" : "s"}</strong>
        <div className="hero-inline-actions">
          <button className="button button-ghost" onClick={() => onOpenAutomation(entry.actionId, false)}>VIEW RULES</button>
          <button className="button button-ghost" onClick={() => onOpenAutomation(entry.actionId, true)}>ADD RULE</button>
        </div>
      </div>
      <div className="combat-ability-equip-actions">
        <span className="tiny-label">{equippedSlot >= 0 ? `EQUIPPED SLOT ${equippedSlot + 1}` : `TARGET SLOT ${selectedActiveSlot + 1}`}</span>
        <button className="button button-primary" disabled={combatLocked || equippedSlot === selectedActiveSlot} onClick={() => onEquipActive(entry.actionId)}>{combatLocked ? "LOADOUT LOCKED" : "EQUIP TO SLOT"}</button>
        {equippedSlot >= 0 && <button className="button button-ghost" disabled={combatLocked} onClick={() => onUnequipActive(equippedSlot)}>UNEQUIP</button>}
      </div>
    </section>
  );
}

function DetailHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return <div className="combat-ability-detail-heading"><PlaceholderArt icon={icon} size="medium" variant="gold" /><div><h3>{title}</h3><p>{subtitle}</p></div></div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <span className="combat-ability-detail-row"><small>{label}</small><strong>{value}</strong></span>;
}

function DetailCopy({ label, value }: { label: string; value: string }) {
  return <div className="combat-ability-detail-copy"><span className="tiny-label">{label}</span><p>{value || "No additional modifiers."}</p></div>;
}
