import { Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { spellDefinitions } from "../../../../game/data/spells";
import { effectById } from "../../../../game/data/effects";
import { createCombatPreviewContext } from "../../../../game/combat/combatEngine";
import { getSpellActionView } from "../../../../game/combat/playerActions";
import { getProficiencyLevel } from "../../../../game/progression/proficiencyProgression";
import { proficiencyById } from "../../../../game/data/proficiencies";
import { getAutomationSummary } from "../../../../game/automation/automationLogic";
import { getMagicSchoolPresentation, magicSchoolOrder } from "../../../../game/presentation/magicSchool";
import { COMBAT_SPELL_SLOT_COUNT } from "../../../../game/spellbook/spellbookTypes";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import { damageTypeLabel, formatDamageRange } from "../../../../game/presentation/statFormatting";
import type { GameState } from "../../../../game/gameState";
import { useGameStore } from "../../../../state/gameStore";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { SearchField } from "../../../components/SearchField";
import { CatalogueAccordionGroup } from "../../../components/CatalogueAccordionGroup";

type SchoolFilter = "all" | (typeof magicSchoolOrder)[number];
type SpellDragPayload =
  | { kind: "known-spell"; spellId: string }
  | { kind: "loadout-spell"; spellId: string; sourceSlot: number };
type DragDropState = "idle" | "valid" | "invalid" | "over";
interface SpellDragState {
  payload: SpellDragPayload | null;
  overSlot: number | null;
  overKnownList: boolean;
  dropState: DragDropState;
}
const emptyDragState: SpellDragState = { payload: null, overSlot: null, overKnownList: false, dropState: "idle" };

export function SpellbookWindow({ game, onOpenAutomation }: { game: GameState; onOpenAutomation: (actionId?: string, createRule?: boolean) => void }) {
  const setSpellSlot = useGameStore((state) => state.setSpellSlot);
  const equipSpellToSlot = useGameStore((state) => state.equipSpellToSlot);
  const moveEquippedSpell = useGameStore((state) => state.moveEquippedSpell);
  const unequipSpellSlot = useGameStore((state) => state.unequipSpellSlot);
  const swapSpellSlots = useGameStore((state) => state.swapSpellSlots);
  const unequipSpell = useGameStore((state) => state.unequipSpell);
  const combatLocked = game.combat.phase === "active" || game.combat.phase === "recovery";
  const knownSpells = game.spellbook.knownSpellIds
    .map((id) => spellDefinitions.find((spell) => spell.id === id))
    .filter((spell): spell is (typeof spellDefinitions)[number] => Boolean(spell));
  const [filter, setFilter] = useState<SchoolFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedSpellId, setSelectedSpellId] = useState(game.spellbook.knownSpellIds[0] ?? "");
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [dragState, setDragState] = useState<SpellDragState>(emptyDragState);
  const defaultSchoolId = getDefaultSpellSchoolId(game, knownSpells, selectedSpellId);
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(() => {
    const knownSchoolIds = magicSchoolOrder.filter((schoolId) => knownSpells.some((spell) => spell.magicProficiencyId === schoolId));
    return new Set(defaultSchoolId ? [defaultSchoolId] : knownSchoolIds.slice(0, 1));
  });
  const context = useMemo(() => createCombatPreviewContext(), []);
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSpells = knownSpells
    .filter((spell) => filter === "all" || spell.magicProficiencyId === filter)
    .filter((spell) => spellMatchesQuery(spell, normalizedQuery));
  const selectedSpell = visibleSpells.find((spell) => spell.id === selectedSpellId) ?? visibleSpells[0];
  const isSchoolExpanded = (schoolId: string) => Boolean(normalizedQuery) || expandedSchools.has(schoolId);
  const toggleSchool = (schoolId: string) => setExpandedSchools((current) => {
    const next = new Set(current);
    if (next.has(schoolId)) next.delete(schoolId);
    else next.add(schoolId);
    return next;
  });
  const selectedView = selectedSpell
    ? getSpellActionView(game, selectedSpell.id, stats, context)
    : undefined;
  const actionIds = new Set(Object.keys(context.spells));
  const automationSummary = getAutomationSummary(game.combatAutomation, actionIds);
  const selectedRules = selectedSpell
    ? game.combatAutomation.rules.filter((rule) => rule.actionId === selectedSpell.id)
    : [];
  const dragging = Boolean(dragState.payload);
  const clearDrag = () => setDragState(emptyDragState);
  const startDrag = (event: React.DragEvent, payload: SpellDragPayload) => {
    if (combatLocked) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", payload.spellId);
    setDragState({ payload, overSlot: null, overKnownList: false, dropState: "idle" });
  };
  const slotDropIsValid = (slot: number) => {
    const payload = dragState.payload;
    if (!payload || combatLocked) return false;
    if (payload.kind === "known-spell") return game.spellbook.knownSpellIds.includes(payload.spellId);
    return payload.sourceSlot !== slot && game.spellbook.equippedSpellSlots[payload.sourceSlot] === payload.spellId;
  };
  const slotDropState = (slot: number): DragDropState =>
    dragState.overSlot !== slot ? "idle" : dragState.dropState;
  const handleSlotDrop = (slot: number) => {
    const payload = dragState.payload;
    if (!payload || !slotDropIsValid(slot)) {
      clearDrag();
      return;
    }
    if (payload.kind === "known-spell") {
      equipSpellToSlot(payload.spellId, slot);
    } else {
      moveEquippedSpell(payload.sourceSlot, slot);
    }
    setSelectedSpellId(payload.spellId);
    setSelectedSlot(slot);
    clearDrag();
  };
  const handleKnownListDrop = () => {
    const payload = dragState.payload;
    if (payload?.kind === "loadout-spell" && !combatLocked && game.spellbook.equippedSpellSlots[payload.sourceSlot] === payload.spellId)
      unequipSpellSlot(payload.sourceSlot);
    clearDrag();
  };
  const knownListDropIsValid = dragState.payload?.kind === "loadout-spell" && !combatLocked;
  const renderSpellCard = (spell: (typeof spellDefinitions)[number]) => {
    const school = getMagicSchoolPresentation(spell.magicProficiencyId);
    const view = getSpellActionView(game, spell.id, stats, context);
    const equippedSlot = game.spellbook.equippedSpellSlots.findIndex((id) => id === spell.id);
    return (
      <button
        key={spell.id}
        className={`known-spell-card ${selectedSpell?.id === spell.id ? "is-selected" : ""} ${dragState.payload?.kind === "known-spell" && dragState.payload.spellId === spell.id ? "is-dragging" : ""}`}
        onClick={() => setSelectedSpellId(spell.id)}
        draggable={!combatLocked}
        onDragStart={(event) => startDrag(event, { kind: "known-spell", spellId: spell.id })}
        onDragEnd={clearDrag}
        data-debug-kind="spellbook-spell"
        data-debug-spell-id={spell.id}
        data-debug-school={spell.magicProficiencyId}
        data-debug-equipped-slot={equippedSlot >= 0 ? equippedSlot : undefined}
        data-debug-draggable={!combatLocked}
        data-debug-dragging={dragState.payload?.kind === "known-spell" && dragState.payload.spellId === spell.id ? "true" : "false"}
      >
        <PlaceholderArt icon={spell.icon} size="small" variant={school.accent === "fire" ? "gold" : "blue"} />
        <span><strong>{spell.name}</strong><small>{school.fullLabel} · {view.effectiveManaCost} Mana · {view.effectiveSpell?.cooldownSeconds.toFixed(1)}s</small><em>{spell.baseDamageMin > 0 ? "Damage" : spell.barrierAmount ? "Barrier" : "Utility"}{spell.applyEffects?.length ? ` · ${spell.applyEffects.map((effect) => effectById[effect.effectId]?.name ?? effect.effectId).join(", ")}` : ""}</em></span>
        {equippedSlot >= 0 && <b>EQUIPPED {equippedSlot + 1}</b>}
      </button>
    );
  };
  const renderLibrary = () => {
    if (filter !== "all") return visibleSpells.map(renderSpellCard);
    return magicSchoolOrder.map((schoolId) => {
      const schoolSpells = visibleSpells.filter((spell) => spell.magicProficiencyId === schoolId);
      if (!schoolSpells.length) return null;
      const school = getMagicSchoolPresentation(schoolId);
      return (
        <CatalogueAccordionGroup
          key={schoolId}
          id={`spellbook.${schoolId}`}
          label={school.fullLabel}
          icon={school.icon}
          count={schoolSpells.length}
          expanded={isSchoolExpanded(schoolId)}
          onToggle={() => toggleSchool(schoolId)}
          className="spellbook-school-group"
          debugGroupType="spellbook"
          debugProficiencyId={schoolId}
        >
          {schoolSpells.map(renderSpellCard)}
        </CatalogueAccordionGroup>
      );
    });
  };

  return (
    <div className="spellbook-window" data-debug-kind="spellbook-window">
      <div className="spellbook-lock-note">
        {combatLocked ? "COMBAT ACTIVE · Known spells remain viewable; loadout editing is locked." : "Choose five known spells for the Combat action bar."}
      </div>
      <section className="spellbook-loadout" aria-label="Combat spell loadout">
        <div className="section-title"><span className="tiny-label">COMBAT LOADOUT</span><span>{game.spellbook.equippedSpellSlots.filter(Boolean).length} / {COMBAT_SPELL_SLOT_COUNT} equipped</span></div>
        <p className="spellbook-dnd-hint">Drag known Spells into slots · drag slots to reorder</p>
        <div className="hero-spell-loadout">
          {Array.from({ length: COMBAT_SPELL_SLOT_COUNT }, (_, slot) => {
            const spellId = game.spellbook.equippedSpellSlots[slot] ?? null;
            const spell = spellId ? spellDefinitions.find((candidate) => candidate.id === spellId) : undefined;
            const school = spell ? getMagicSchoolPresentation(spell.magicProficiencyId) : undefined;
            return (
              <button
                key={slot}
                className={`hero-spell-slot ${selectedSlot === slot ? "is-selected" : ""} ${dragState.payload?.kind === "loadout-spell" && dragState.payload.sourceSlot === slot ? "is-dragging" : ""} ${dragState.overSlot === slot ? "is-drop-target" : ""} ${dragState.overSlot === slot && dragState.dropState === "valid" ? "is-drop-valid" : ""} ${dragState.overSlot === slot && dragState.dropState === "invalid" ? "is-drop-invalid" : ""}`}
                onClick={() => setSelectedSlot(slot)}
                draggable={Boolean(spell) && !combatLocked}
                onDragStart={(event) => spell && startDrag(event, { kind: "loadout-spell", spellId: spell.id, sourceSlot: slot })}
                onDragEnter={(event) => { event.preventDefault(); if (dragState.payload) setDragState((current) => ({ ...current, overSlot: slot, dropState: "over" })); }}
                onDragOver={(event) => { event.preventDefault(); const valid = slotDropIsValid(slot); event.dataTransfer.dropEffect = valid ? "move" : "none"; setDragState((current) => ({ ...current, overSlot: slot, dropState: valid ? "valid" : "invalid" })); }}
                onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragState((current) => ({ ...current, overSlot: null, dropState: "idle" })); }}
                onDrop={(event) => { event.preventDefault(); handleSlotDrop(slot); }}
                onDragEnd={clearDrag}
                data-debug-kind="spell-loadout-slot"
                data-debug-slot={slot}
                data-debug-spell-id={spellId ?? undefined}
                data-debug-dragging={dragState.payload?.kind === "loadout-spell" && dragState.payload.sourceSlot === slot ? "true" : "false"}
                data-debug-drop-state={slotDropState(slot)}
              >
                <span className="hero-spell-slot-number">{slot + 1}</span>
                {spell ? <PlaceholderArt icon={spell.icon} size="small" variant="gold" /> : <span className="hero-spell-empty"><Sparkles size={16} /></span>}
                <strong>{spell?.name ?? "EMPTY"}</strong>
                {!spell && dragging && <span className="hero-spell-drop-copy">DROP SPELL HERE</span>}
                <small>{spell ? `${school?.label} · ${getSpellActionView(game, spell.id, stats, context).effectiveManaCost} Mana` : "Choose Spell"}</small>
                {spell && !combatLocked && <span className="hero-spell-slot-remove" onClick={(event) => { event.stopPropagation(); unequipSpell(slot); }}><X size={11} /></span>}
              </button>
            );
          })}
        </div>
      </section>
      <div className="spellbook-school-tabs" role="tablist" aria-label="Magic school filters">
        <button className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")} data-debug-kind="magic-school-filter" data-debug-school="all">ALL <small>{knownSpells.length}</small></button>
        {magicSchoolOrder.map((schoolId) => {
          const school = getMagicSchoolPresentation(schoolId);
          const count = knownSpells.filter((spell) => spell.magicProficiencyId === schoolId).length;
          return <button key={schoolId} className={filter === schoolId ? "is-active" : ""} onClick={() => setFilter(schoolId)} data-debug-kind="magic-school-filter" data-debug-school={schoolId}>{school.label.toUpperCase()} <small>{count}</small></button>;
        })}
      </div>
      <div className="spellbook-browser">
        <section
          className={`spellbook-list combatbound-scroll ${dragState.overKnownList ? "is-unequip-target" : ""}`}
          aria-label="Known spells"
          onDragEnter={(event) => { event.preventDefault(); if (dragState.payload) setDragState((current) => ({ ...current, overKnownList: true, dropState: "over" })); }}
          onDragOver={(event) => { event.preventDefault(); const valid = Boolean(knownListDropIsValid); event.dataTransfer.dropEffect = valid ? "move" : "none"; setDragState((current) => ({ ...current, overKnownList: true, dropState: valid ? "valid" : "invalid" })); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragState((current) => ({ ...current, overKnownList: false, dropState: "idle" })); }}
          onDrop={(event) => { event.preventDefault(); handleKnownListDrop(); }}
          data-debug-kind="spell-unequip-dropzone"
          data-debug-dragging={dragging ? "true" : "false"}
          data-debug-drop-state={dragState.overKnownList ? dragState.dropState : "idle"}
        >
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search spells..."
            label="Search spells"
            debugKind="spellbook-search"
          />
          <div className="section-title"><span className="tiny-label">KNOWN SPELLS</span><span>{knownListDropIsValid ? "DROP HERE TO UNEQUIP" : normalizedQuery ? `${visibleSpells.length} MATCHES` : visibleSpells.length}</span></div>
          {visibleSpells.length ? renderLibrary() : <p className="catalogue-no-results spellbook-no-results">No known Spells match "{query}".</p>}
        </section>
          <SpellDetails
          game={game}
          spell={selectedSpell}
          selectedView={selectedView}
          selectedSlot={selectedSlot}
          selectedRules={selectedRules}
          combatLocked={combatLocked}
          onEquip={() => selectedSpell && setSpellSlot(selectedSlot, selectedSpell.id)}
          onSwap={(slot) => swapSpellSlots(selectedSlot, slot)}
          automationSummary={automationSummary}
          onOpenAutomation={onOpenAutomation}
        />
      </div>
    </div>
  );
}

function spellMatchesQuery(spell: (typeof spellDefinitions)[number], normalizedQuery: string) {
  if (!normalizedQuery) return true;
  const school = getMagicSchoolPresentation(spell.magicProficiencyId);
  const effects = spell.applyEffects?.flatMap((effect) => {
    const definition = effectById[effect.effectId];
    return definition ? [definition.name, definition.description, ...definition.tags] : [effect.effectId];
  }) ?? [];
  const roleWords = spell.baseDamageMin > 0 ? "damage attack offensive" : spell.barrierAmount ? "barrier defense protective" : spell.interruptsAction ? "interrupt disruption control" : "utility support";
  return [spell.id, spell.name, spell.description, school.label, school.fullLabel, spell.damageType ?? "", roleWords, ...effects]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function getDefaultSpellSchoolId(game: GameState, knownSpells: Array<(typeof spellDefinitions)[number]>, selectedSpellId: string) {
  const selected = knownSpells.find((spell) => spell.id === selectedSpellId);
  if (selected) return selected.magicProficiencyId;
  const equipped = game.spellbook.equippedSpellSlots
    .map((id) => knownSpells.find((spell) => spell.id === id))
    .find((spell): spell is (typeof spellDefinitions)[number] => Boolean(spell));
  if (equipped) return equipped.magicProficiencyId;
  if (knownSpells.some((spell) => spell.magicProficiencyId === "fire-magic")) return "fire-magic";
  return knownSpells[0]?.magicProficiencyId;
}

function SpellDetails({ game, spell, selectedView, selectedSlot, selectedRules, combatLocked, onEquip, onSwap, automationSummary, onOpenAutomation }: { game: GameState; spell?: (typeof spellDefinitions)[number]; selectedView?: ReturnType<typeof getSpellActionView>; selectedSlot: number; selectedRules: GameState["combatAutomation"]["rules"]; combatLocked: boolean; onEquip: () => void; onSwap: (slot: number) => void; automationSummary: ReturnType<typeof getAutomationSummary>; onOpenAutomation: (actionId?: string, createRule?: boolean) => void }) {
  if (!spell || !selectedView?.effectiveSpell) return <section className="spellbook-details"><span className="muted-copy">Select a known spell to inspect it.</span></section>;
  const school = getMagicSchoolPresentation(spell.magicProficiencyId);
  const proficiency = proficiencyById[spell.magicProficiencyId];
  const level = getProficiencyLevel(game.progression, spell.magicProficiencyId);
  const equippedSlot = game.spellbook.equippedSpellSlots.findIndex((id) => id === spell.id);
  return (
    <section className="spellbook-details" aria-label={`${spell.name} details`}>
      <div className="spell-details-heading"><PlaceholderArt icon={spell.icon} size="medium" variant="gold" /><div><h3>{spell.name}</h3><p>{school.fullLabel} · Lv {level} / {proficiency?.maxLevel ?? 100}</p></div></div>
      <div className="spell-detail-grid"><span>Mana Cost<strong>{selectedView.effectiveSpell.manaCost}{selectedView.effectiveSpell.manaCost !== spell.manaCost && ` (${spell.manaCost} base)`}</strong></span><span>Cooldown<strong>{selectedView.effectiveSpell.cooldownSeconds.toFixed(1)}s</strong></span><span>Target<strong>{spell.targetMode === "self" ? "Self" : "Selected Enemy"}</strong></span>{spell.baseDamageMin > 0 && <span>{damageTypeLabel(spell.damageType ?? "physical")} Damage<strong>{formatDamageRange(selectedView.effectiveSpell.baseDamageMin, selectedView.effectiveSpell.baseDamageMax)}</strong></span>}{selectedView.effectiveSpell.healing && <span>Healing<strong>{Math.round(selectedView.effectiveSpell.healing.flatAmount)}</strong></span>}{selectedView.effectiveSpell.barrierAmount && <span>Barrier<strong>{Math.round(selectedView.effectiveSpell.barrierAmount)}</strong></span>}{spell.interruptsAction && <span>Interrupt<strong>Yes</strong></span>}</div>
      <div className="spell-detail-copy"><span className="tiny-label">DESCRIPTION</span><p>{spell.description}</p></div>
      {spell.applyEffects && spell.applyEffects.length > 0 && <div className="spell-detail-copy"><span className="tiny-label">EFFECTS</span><p>{spell.applyEffects.map((effect) => effectById[effect.effectId]?.name ?? effect.effectId).join(" · ")}</p></div>}
      <div className="spell-detail-copy"><span className="tiny-label">AUTOMATION</span><p>{selectedRules.length} rule{selectedRules.length === 1 ? "" : "s"} use this Spell · {automationSummary.enabledRuleCount} total active</p><div className="hero-inline-actions"><button className="button button-ghost" onClick={() => onOpenAutomation(spell.id, false)}>VIEW RULES</button><button className="button button-ghost" onClick={() => onOpenAutomation(spell.id, true)}>ADD RULE</button></div></div>
      <div className="spell-equip-actions"><span className="tiny-label">SLOT {selectedSlot + 1} {equippedSlot >= 0 ? `· EQUIPPED ${equippedSlot + 1}` : ""}</span><button className="button button-primary" disabled={combatLocked || equippedSlot === selectedSlot} onClick={onEquip}>{combatLocked ? "LOADOUT LOCKED" : "EQUIP TO SLOT"}</button>{equippedSlot >= 0 && equippedSlot !== selectedSlot && <button className="button button-ghost" disabled={combatLocked} onClick={() => onSwap(equippedSlot)}>SWAP WITH SLOT {equippedSlot + 1}</button>}</div>
    </section>
  );
}
