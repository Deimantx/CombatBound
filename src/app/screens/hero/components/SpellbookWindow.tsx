import { Check, ChevronDown, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { spellDefinitions } from "../../../../game/data/spells";
import { effectById } from "../../../../game/data/effects";
import { combatInteractionDefinitions } from "../../../../game/combat/combatInteractions";
import { createCombatPreviewContext } from "../../../../game/combat/combatEngine";
import { getSpellActionView } from "../../../../game/combat/playerActions";
import { getProficiencyLevel } from "../../../../game/progression/proficiencyProgression";
import { proficiencyById } from "../../../../game/data/proficiencies";
import { getAutomationSummary } from "../../../../game/automation/automationLogic";
import { getMagicSchoolPresentation, magicSchoolOrder } from "../../../../game/presentation/magicSchool";
import { COMBAT_SPELL_SLOT_COUNT } from "../../../../game/spellbook/spellbookTypes";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import type { GameState } from "../../../../game/gameState";
import { useGameStore } from "../../../../state/gameStore";
import { PlaceholderArt } from "../../../components/PlaceholderArt";

type SchoolFilter = "all" | (typeof magicSchoolOrder)[number];

export function SpellbookWindow({ game, onOpenAutomation }: { game: GameState; onOpenAutomation: (actionId?: string, createRule?: boolean) => void }) {
  const setSpellSlot = useGameStore((state) => state.setSpellSlot);
  const swapSpellSlots = useGameStore((state) => state.swapSpellSlots);
  const unequipSpell = useGameStore((state) => state.unequipSpell);
  const combatLocked = game.combat.phase === "active" || game.combat.phase === "recovery";
  const [filter, setFilter] = useState<SchoolFilter>("all");
  const [selectedSpellId, setSelectedSpellId] = useState(game.spellbook.knownSpellIds[0] ?? "");
  const [selectedSlot, setSelectedSlot] = useState(0);
  const context = useMemo(() => createCombatPreviewContext(), []);
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques);
  const knownSpells = game.spellbook.knownSpellIds
    .map((id) => spellDefinitions.find((spell) => spell.id === id))
    .filter((spell): spell is (typeof spellDefinitions)[number] => Boolean(spell));
  const visibleSpells = filter === "all"
    ? knownSpells
    : knownSpells.filter((spell) => spell.magicProficiencyId === filter);
  const selectedSpell = spellDefinitions.find((spell) => spell.id === selectedSpellId) ?? visibleSpells[0];
  const selectedView = selectedSpell
    ? getSpellActionView(game, selectedSpell.id, stats, context)
    : undefined;
  const actionIds = new Set(Object.keys(context.spells));
  const automationSummary = getAutomationSummary(game.combatAutomation, actionIds);
  const selectedRules = selectedSpell
    ? game.combatAutomation.rules.filter((rule) => rule.actionId === selectedSpell.id)
    : [];

  return (
    <div className="spellbook-window" data-debug-kind="spellbook-window">
      <div className="spellbook-lock-note">
        {combatLocked ? "COMBAT ACTIVE · Known spells remain viewable; loadout editing is locked." : "Choose five known spells for the Combat action bar."}
      </div>
      <section className="spellbook-loadout" aria-label="Combat spell loadout">
        <div className="section-title"><span className="tiny-label">COMBAT LOADOUT</span><span>{game.spellbook.equippedSpellSlots.filter(Boolean).length} / {COMBAT_SPELL_SLOT_COUNT} equipped</span></div>
        <div className="hero-spell-loadout">
          {Array.from({ length: COMBAT_SPELL_SLOT_COUNT }, (_, slot) => {
            const spellId = game.spellbook.equippedSpellSlots[slot] ?? null;
            const spell = spellId ? spellDefinitions.find((candidate) => candidate.id === spellId) : undefined;
            const school = spell ? getMagicSchoolPresentation(spell.magicProficiencyId) : undefined;
            return (
              <button
                key={slot}
                className={`hero-spell-slot ${selectedSlot === slot ? "is-selected" : ""}`}
                onClick={() => setSelectedSlot(slot)}
                disabled={false}
                data-debug-kind="spell-loadout-slot"
                data-debug-slot={slot}
                data-debug-spell-id={spellId ?? undefined}
              >
                <span className="hero-spell-slot-number">{slot + 1}</span>
                {spell ? <PlaceholderArt icon={spell.icon} size="small" variant="gold" /> : <span className="hero-spell-empty"><Sparkles size={16} /></span>}
                <strong>{spell?.name ?? "EMPTY"}</strong>
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
        <section className="spellbook-list" aria-label="Known spells">
          <div className="section-title"><span className="tiny-label">KNOWN SPELLS</span><span>{visibleSpells.length}</span></div>
          {visibleSpells.map((spell) => {
            const school = getMagicSchoolPresentation(spell.magicProficiencyId);
            const view = getSpellActionView(game, spell.id, stats, context);
            const equippedSlot = game.spellbook.equippedSpellSlots.findIndex((id) => id === spell.id);
            return (
              <button key={spell.id} className={`known-spell-card ${selectedSpell?.id === spell.id ? "is-selected" : ""}`} onClick={() => setSelectedSpellId(spell.id)} data-debug-kind="spellbook-spell" data-debug-spell-id={spell.id} data-debug-school={spell.magicProficiencyId} data-debug-equipped-slot={equippedSlot >= 0 ? equippedSlot : undefined}>
                <PlaceholderArt icon={spell.icon} size="small" variant={school.accent === "fire" ? "gold" : "blue"} />
                <span><strong>{spell.name}</strong><small>{school.fullLabel} · {view.effectiveManaCost} Mana · {view.effectiveSpell?.cooldownSeconds.toFixed(1)}s</small><em>{spell.damage > 0 ? "Damage" : spell.barrierAmount ? "Barrier" : "Utility"}{spell.applyEffects?.length ? ` · ${spell.applyEffects.map((effect) => effectById[effect.effectId]?.name ?? effect.effectId).join(", ")}` : ""}</em></span>
                {equippedSlot >= 0 && <b>EQUIPPED {equippedSlot + 1}</b>}
              </button>
            );
          })}
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

function SpellDetails({ game, spell, selectedView, selectedSlot, selectedRules, combatLocked, onEquip, onSwap, automationSummary, onOpenAutomation }: { game: GameState; spell?: (typeof spellDefinitions)[number]; selectedView?: ReturnType<typeof getSpellActionView>; selectedSlot: number; selectedRules: GameState["combatAutomation"]["rules"]; combatLocked: boolean; onEquip: () => void; onSwap: (slot: number) => void; automationSummary: ReturnType<typeof getAutomationSummary>; onOpenAutomation: (actionId?: string, createRule?: boolean) => void }) {
  if (!spell || !selectedView?.effectiveSpell) return <section className="spellbook-details"><span className="muted-copy">Select a known spell to inspect it.</span></section>;
  const school = getMagicSchoolPresentation(spell.magicProficiencyId);
  const proficiency = proficiencyById[spell.magicProficiencyId];
  const level = getProficiencyLevel(game.progression, spell.magicProficiencyId);
  const equippedSlot = game.spellbook.equippedSpellSlots.findIndex((id) => id === spell.id);
  const interactions = combatInteractionDefinitions.filter((interaction) => interaction.trigger.sourceActionId === spell.id || (interaction.trigger.sourceKind === "spell" && interaction.trigger.damageType === spell.damageType));
  return (
    <section className="spellbook-details" aria-label={`${spell.name} details`}>
      <div className="spell-details-heading"><PlaceholderArt icon={spell.icon} size="medium" variant="gold" /><div><h3>{spell.name}</h3><p>{school.fullLabel} · Lv {level} / {proficiency?.maxLevel ?? 100}</p></div></div>
      <div className="spell-detail-grid"><span>Mana Cost<strong>{selectedView.effectiveSpell.manaCost}{selectedView.effectiveSpell.manaCost !== spell.manaCost && ` (${spell.manaCost} base)`}</strong></span><span>Cooldown<strong>{selectedView.effectiveSpell.cooldownSeconds.toFixed(1)}s</strong></span><span>Target<strong>{spell.targetMode === "self" ? "Self" : "Selected Enemy"}</strong></span>{spell.damage > 0 && <span>Direct Damage<strong>{Math.round(selectedView.effectiveSpell.damage)} {spell.damageType}</strong></span>}{selectedView.effectiveSpell.healing && <span>Healing<strong>{Math.round(selectedView.effectiveSpell.healing.flatAmount)}</strong></span>}{selectedView.effectiveSpell.barrierAmount && <span>Barrier<strong>{Math.round(selectedView.effectiveSpell.barrierAmount)}</strong></span>}{spell.interruptsAction && <span>Interrupt<strong>Yes</strong></span>}</div>
      <div className="spell-detail-copy"><span className="tiny-label">DESCRIPTION</span><p>{spell.description}</p></div>
      {spell.applyEffects && spell.applyEffects.length > 0 && <div className="spell-detail-copy"><span className="tiny-label">EFFECTS</span><p>{spell.applyEffects.map((effect) => effectById[effect.effectId]?.name ?? effect.effectId).join(" · ")}</p></div>}
      {interactions.length > 0 && <div className="spell-detail-copy"><span className="tiny-label">INTERACTIONS</span>{interactions.map((interaction) => <p key={interaction.id}><strong>{interaction.name}</strong> · {interaction.description}</p>)}</div>}
      <div className="spell-detail-copy"><span className="tiny-label">AUTOMATION</span><p>{selectedRules.length} rule{selectedRules.length === 1 ? "" : "s"} use this Spell · {automationSummary.enabledRuleCount} total active</p><div className="hero-inline-actions"><button className="button button-ghost" onClick={() => onOpenAutomation(spell.id, false)}>VIEW RULES</button><button className="button button-ghost" onClick={() => onOpenAutomation(spell.id, true)}>ADD RULE</button></div></div>
      <div className="spell-equip-actions"><span className="tiny-label">SLOT {selectedSlot + 1} {equippedSlot >= 0 ? `· EQUIPPED ${equippedSlot + 1}` : ""}</span><button className="button button-primary" disabled={combatLocked || equippedSlot === selectedSlot} onClick={onEquip}>{combatLocked ? "LOADOUT LOCKED" : "EQUIP TO SLOT"}</button>{equippedSlot >= 0 && equippedSlot !== selectedSlot && <button className="button button-ghost" disabled={combatLocked} onClick={() => onSwap(equippedSlot)}>SWAP WITH SLOT {equippedSlot + 1}</button>}</div>
    </section>
  );
}
