import { useMemo } from "react";
import { enemyById } from "../../../../game/data/enemies";
import { spellDefinitions } from "../../../../game/data/spells";
import { buildCombatAbilityTooltip, buildSpellTooltip } from "../../../../game/presentation/tooltipBuilders";
import { buildEffectiveSpellContext, getSpellActionView, getActionById, reasonLabel, validatePlayerAction } from "../../../../game/combat/playerActions";
import { COMBAT_SPELL_SLOT_COUNT } from "../../../../game/spellbook/spellbookTypes";
import { COMBAT_ABILITY_SLOT_COUNT } from "../../../../game/combatAbilities/combatAbilityTypes";
import { getCombatAbilityAvailability, getKnownCombatAbilities } from "../../../../game/combatAbilities/combatAbilitySelectors";
import type { CombatContext, EnemyCombatInstance } from "../../../../game/combat/combatTypes";
import type { GameState } from "../../../../game/gameState";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { CombatActionButton } from "./CombatActionButton";
import { getSpellUiState } from "./combatUi";

export function CombatActionWorkspace({ game, stats, selectedEnemy, selectedDefinition, actionContext, onCastSpell, onUseAction, onUsePotion }: { game: GameState; stats: HunterCombatStats; selectedEnemy?: EnemyCombatInstance; selectedDefinition?: (typeof enemyById)[keyof typeof enemyById]; actionContext: CombatContext; onCastSpell: (spellId: string) => void; onUseAction: (actionId: string) => void; onUsePotion: () => void }) {
  const combat = game.combat;
  const selectedAction = useMemo(() => selectedEnemy?.currentAction ? selectedDefinition?.actions.find((action) => action.id === selectedEnemy.currentAction?.actionId) : undefined, [selectedDefinition, selectedEnemy]);
  const potionQuantity = game.inventory.stackables["item.healing-potion"] ?? 0;
  const potionReady = combat.phase === "active" && combat.potionCooldownRemaining <= 0 && potionQuantity > 0 && combat.playerHp < (stats.maxLife ?? 0);
  const potionStatus = combat.potionCooldownRemaining > 0 ? `COOLDOWN ${combat.potionCooldownRemaining.toFixed(1)}s` : potionQuantity <= 0 ? "OUT OF STOCK" : combat.playerHp >= (stats.maxLife ?? 0) ? "FULL HEALTH" : "READY";
  return <div className="spell-controls" data-debug-kind="combat-action-workspace">
    <div className="section-title"><span className="tiny-label">COMBAT ACTIONS</span><small>{selectedAction ? `${selectedAction.name} TELEGRAPHED` : combat.globalCooldownRemaining > 0 ? `GLOBAL COOLDOWN ${combat.globalCooldownRemaining.toFixed(1)}s` : "Spells, defenses and consumables"}</small></div>
    <div className="combat-action-sections">
      <section className="combat-action-section"><div className="section-title"><span className="tiny-label">MAGIC</span><small>{COMBAT_SPELL_SLOT_COUNT} loadout slots</small></div><div className="spell-grid">{Array.from({ length: COMBAT_SPELL_SLOT_COUNT }, (_, slot) => {
        const spellId = game.spellbook.equippedSpellSlots[slot] ?? null;
        const spell = spellDefinitions.find((candidate) => candidate.id === spellId);
        if (!spell) return <CombatActionButton key={`empty-spell-slot-${slot}`} icon={<PlaceholderArt icon="sparkles" size="small" variant="muted" />} title="Empty Spell Slot" detail="Configure in Hero" disabled className="is-invalid" debugKind="spell-empty-slot" debugId={`${slot}`} />;
        const runtime = combat.actionCooldowns[spell.id];
        const spellView = getSpellActionView(game, spell.id, stats, actionContext);
        const effectiveSpell = spellView.effectiveSpell!;
        const state = getSpellUiState(spell, runtime, combat, selectedAction, effectiveSpell);
        const button = <CombatActionButton icon={<PlaceholderArt icon={spell.icon} size="small" variant={state.enabled ? "gold" : "muted"} />} title={spell.name} detail={`${effectiveSpell.manaCost} MANA · ${state.status}`} disabled={!state.enabled} className={`is-${state.tone}`} onClick={() => onCastSpell(spell.id)} debugKind="spell" debugId={spell.id} debugLabel={spell.name} cooldown={runtime} cooldownTotal={spell.cooldownSeconds} />;
        return <GameTooltip key={spell.id} content={buildSpellTooltip(spell, game.progression, buildEffectiveSpellContext(game, spell))}>{state.enabled ? button : <span className="spell-tooltip-host">{button}</span>}</GameTooltip>;
      })}</div></section>
      <section className="combat-action-section"><div className="section-title"><span className="tiny-label">COMBAT ABILITIES</span><small>Stamina actions · {COMBAT_ABILITY_SLOT_COUNT} loadout slots</small></div><div className="spell-grid">{Array.from({ length: COMBAT_ABILITY_SLOT_COUNT }, (_, slot) => {
        const actionId = game.combatAbilities.activeSlots[slot];
        const action = actionId ? getActionById(game, actionId, actionContext) : undefined;
        if (!action) return <CombatActionButton key={`empty-ability-slot-${slot}`} icon={<PlaceholderArt icon="shield" size="small" variant="muted" />} title="Empty Ability Slot" detail="Configure in Hero" disabled className="is-invalid" debugKind="combat-ability-empty-slot" debugId={`${slot}`} />;
        const validation = validatePlayerAction(game, action.id, stats, actionContext);
        const enabled = validation.valid;
        const entry = getKnownCombatAbilities(game).find((candidate) => candidate.kind === "active-action" && candidate.actionId === action.id);
        const button = <CombatActionButton icon={<PlaceholderArt icon={action.icon ?? "shield"} size="small" variant={enabled ? "blue" : "muted"} />} title={action.name} detail={`${action.resourceCost?.stamina ?? 0} STAMINA · ${enabled ? "READY" : reasonLabel(validation.reason)}`} disabled={!enabled} className={`defense-button is-${enabled ? "ready" : "invalid"}`} onClick={() => onUseAction(action.id)} debugKind={action.kind === "weapon-skill" ? "weapon-skill" : "combat-ability"} debugId={action.id} debugLabel={action.name} />;
        return entry ? <GameTooltip key={action.id} content={buildCombatAbilityTooltip(entry, { action, availability: getCombatAbilityAvailability(game, action.id), equippedSlot: slot })}>{enabled ? button : <span className="spell-tooltip-host">{button}</span>}</GameTooltip> : button;
      })}</div></section>
      <section className="combat-action-section combat-consumable-section"><div className="section-title"><span className="tiny-label">CONSUMABLE</span><small>Combat items</small></div><div className="spell-grid"><GameTooltip content={{ id: "item.healing-potion", icon: "heart", title: "Healing Potion", subtitle: "Consumable", description: "Restores health during combat.", rows: [{ label: "Status", value: potionStatus, tone: potionReady ? "green" : "default" }] }}><span className="spell-tooltip-host"><CombatActionButton icon={<PlaceholderArt icon="heart" size="small" variant="gold" />} title={`Healing Potion ×${potionQuantity}`} detail={potionStatus} disabled={!potionReady} className={`potion-button ${potionReady ? "is-ready" : "is-invalid"}`} onClick={onUsePotion} debugKind="potion" debugId="item.healing-potion" /></span></GameTooltip></div></section>
    </div>
  </div>;
}
