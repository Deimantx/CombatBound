import { enemyById } from "../../../../game/data/enemies";
import { buildCombatAbilityTooltip, buildMagicArtTooltip } from "../../../../game/presentation/tooltipBuilders";
import { getActionById, reasonLabel, validatePlayerAction } from "../../../../game/combat/playerActions";
import { COMBAT_ABILITY_SLOT_COUNT } from "../../../../game/combatAbilities/combatAbilityTypes";
import { getCombatAbilityAvailability, getKnownCombatAbilities } from "../../../../game/combatAbilities/combatAbilitySelectors";
import type { CombatContext, EnemyCombatInstance } from "../../../../game/combat/combatTypes";
import type { GameState } from "../../../../game/gameState";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { CombatActionButton } from "./CombatActionButton";
import { getMagicArt } from "../../../../game/magicArts/magicArtLogic";
import { equippedWeaponMechanic } from "../../../../game/weapons/weaponMechanicRuntime";
import { RHYTHM_COUNTER_KEY, RIPOSTE_TIMER_KEY } from "../../../../game/weapons/weaponMechanicTypes";

export function CombatActionWorkspace({ game, stats, selectedEnemy, selectedDefinition, actionContext, onUseAction, onUsePotion }: { game: GameState; stats: HunterCombatStats; selectedEnemy?: EnemyCombatInstance; selectedDefinition?: (typeof enemyById)[keyof typeof enemyById]; actionContext: CombatContext; onUseAction: (actionId: string) => void; onUsePotion: () => void }) {
  const combat = game.combat;
  const potionQuantity = game.inventory.stackables["item.healing-potion"] ?? 0;
  const potionReady = combat.phase === "active" && combat.potionCooldownRemaining <= 0 && potionQuantity > 0 && combat.playerHp < (stats.maxLife ?? 0);
  const potionStatus = combat.potionCooldownRemaining > 0 ? `COOLDOWN ${combat.potionCooldownRemaining.toFixed(1)}s` : potionQuantity <= 0 ? "OUT OF STOCK" : combat.playerHp >= (stats.maxLife ?? 0) ? "FULL HEALTH" : "READY";
  const abilityIds = game.combatAbilities.slots;
  const catalogue = getKnownCombatAbilities(game);
  const weaponMechanic = equippedWeaponMechanic(game);
  const rhythmStacks = weaponMechanic?.parameters.rhythm ? Math.min(weaponMechanic.parameters.rhythm.maxStacks, game.combat.weaponRuntime.counters[RHYTHM_COUNTER_KEY] ?? 0) : 0;
  const riposteRemaining = game.combat.weaponRuntime.timers[RIPOSTE_TIMER_KEY] ?? 0;
  return <div className="spell-controls" data-debug-kind="combat-action-workspace">
    <div className="section-title"><span className="tiny-label">COMBAT ACTIONS</span><small>{combat.globalCooldownRemaining > 0 ? `GLOBAL COOLDOWN ${combat.globalCooldownRemaining.toFixed(1)}s` : "Five equipped Combat Abilities plus Consumables"}</small></div>
    {weaponMechanic && <section className="combat-weapon-mechanics" data-debug-kind="combat-weapon-mechanics" data-debug-instance-id={weaponMechanic.instanceId}><div><span className="tiny-label">DUELIST RHYTHM</span><strong>{rhythmStacks} / {weaponMechanic.parameters.rhythm?.maxStacks ?? 0} STACKS</strong><small>Hit builds. Miss resets.</small></div><div><span className="tiny-label">RIPOSTE</span><strong>{riposteRemaining > 0 ? `READY - ${riposteRemaining.toFixed(1)}s` : "NOT READY"}</strong><small>Successful Block prepares the next Basic attack.</small></div></section>}
    <div className="combat-action-sections">
      <section className="combat-action-section"><div className="section-title"><span className="tiny-label">COMBAT ABILITIES</span><small>{COMBAT_ABILITY_SLOT_COUNT} shared loadout slots</small></div><div className="spell-grid combat-ability-grid">{Array.from({ length: COMBAT_ABILITY_SLOT_COUNT }, (_, slot) => {
        const actionId = abilityIds[slot];
        const action = actionId ? getActionById(game, actionId, actionContext) : undefined;
        if (!action) return <CombatActionButton key={`empty-ability-slot-${slot}`} icon={<PlaceholderArt icon="shield" size="small" variant="muted" />} title="Empty Ability Slot" detail="Configure in Hero" disabled className="is-invalid" debugKind="combat-ability-empty-slot" debugId={`${slot}`} />;
        const validation = validatePlayerAction(game, action.id, stats, actionContext);
        const enabled = validation.valid;
        if (action.kind === "magic-art") {
          const art = getMagicArt(action.id);
          const runtime = combat.actionCooldowns[action.id] ?? 0;
          const ready = enabled && runtime <= 0;
          const tooltip = art ? buildMagicArtTooltip(art) : { id: action.id, title: action.name, subtitle: "Magic Art", description: action.description, rows: [] };
          return <GameTooltip key={action.id} content={tooltip}><CombatActionButton icon={<PlaceholderArt icon={action.icon ?? "shield"} size="small" variant={ready ? "gold" : "muted"} />} title={action.name} detail={`${action.resourceCost?.mana ?? 35} MANA - ${ready ? "READY" : runtime > 0 ? `COOLDOWN ${runtime.toFixed(1)}s` : reasonLabel(validation.reason)}`} disabled={!ready} className="magic-art-button" onClick={() => onUseAction(action.id)} debugKind="magic-art" debugId={action.id} debugLabel={action.name} cooldown={runtime} cooldownTotal={action.cooldown} /></GameTooltip>;
        }
        const entry = catalogue.find((candidate) => candidate.kind === "active-action" && candidate.actionId === action.id);
        const button = <CombatActionButton icon={<PlaceholderArt icon={action.icon ?? "shield"} size="small" variant={enabled ? "blue" : "muted"} />} title={action.name} detail={`${action.resourceCost?.stamina ?? 0} STAMINA - ${enabled ? "READY" : reasonLabel(validation.reason)}`} disabled={!enabled} className={`defense-button is-${enabled ? "ready" : "invalid"}`} onClick={() => onUseAction(action.id)} debugKind={action.kind === "weapon-skill" ? "weapon-skill" : "combat-ability"} debugId={action.id} debugLabel={action.name} cooldown={combat.actionCooldowns[action.id]} cooldownTotal={action.cooldown} />;
        return entry ? <GameTooltip key={action.id} content={buildCombatAbilityTooltip(entry, { action, availability: getCombatAbilityAvailability(game, action.id), equippedSlot: slot })}>{enabled ? button : <span className="spell-tooltip-host">{button}</span>}</GameTooltip> : button;
      })}</div></section>
      <section className="combat-action-section combat-consumable-section"><div className="section-title"><span className="tiny-label">CONSUMABLE</span><small>Combat items</small></div><div className="spell-grid"><GameTooltip content={{ id: "item.healing-potion", icon: "heart", title: "Healing Potion", subtitle: "Consumable", description: "Restores health during combat.", rows: [{ label: "Status", value: potionStatus, tone: potionReady ? "green" : "default" }] }}><span className="spell-tooltip-host"><CombatActionButton icon={<PlaceholderArt icon="heart" size="small" variant="gold" />} title={`Healing Potion x${potionQuantity}`} detail={potionStatus} disabled={!potionReady} className={`potion-button ${potionReady ? "is-ready" : "is-invalid"}`} onClick={onUsePotion} debugKind="potion" debugId="item.healing-potion" /></span></GameTooltip></div></section>
    </div>
  </div>;
}
