import {
  Crosshair,
  Heart,
  Pause,
  Play,
  Sparkles,
  Swords,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { enemyById } from "../../../../game/data/enemies";
import { effectById } from "../../../../game/data/effects";
import { spellDefinitions } from "../../../../game/data/spells";
import { getBarrierAmount } from "../../../../game/combat/combatEffects";
import {
  buildSpellTooltip,
  buildStatTooltip,
} from "../../../../game/presentation/tooltipBuilders";
import { formatHealthWithBarrier } from "../../../../game/presentation/statFormatting";
import { getSelectedTargetMatchup } from "../../../../game/combat/combatSelectors";
import { createCombatPreviewContext } from "../../../../game/combat/combatEngine";
import { buildEffectiveSpellContext, getSpellActionView } from "../../../../game/combat/playerActions";
import { COMBAT_SPELL_SLOT_COUNT } from "../../../../game/spellbook/spellbookTypes";
import {
  defensiveActionDefinitions,
  validatePlayerAction,
  reasonLabel,
} from "../../../../game/combat/playerActions";
import type {
  EnemyActionDefinition,
  EnemyCombatInstance,
  CombatState,
} from "../../../../game/combat/combatTypes";
import type { GameState } from "../../../../game/gameState";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import type { CombatLocationDefinition } from "../../../../game/world/worldTypes";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { Panel } from "../../../components/Panel";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { ProgressBar } from "../../../components/ProgressBar";
import { LayeredHealthBar } from "./LayeredHealthBar";
import { CombatMatchupReadout } from "./CombatMatchupReadout";
import {
  techniqueStaminaDrain,
  combatProgress,
  combatTimerLabel,
  formatPercent,
  getSpellUiState,
  useSmoothCombatProgress,
} from "./combatUi";

interface LiveHuntPanelProps {
  game: GameState;
  stats: HunterCombatStats;
  location?: CombatLocationDefinition;
  selectedEnemy?: EnemyCombatInstance;
  selectedDefinition: (typeof enemyById)[keyof typeof enemyById];
  onSelectTarget: (instanceId: string) => void;
  onCastSpell: (spellId: string) => void;
  onUseAction: (actionId: string) => void;
  onUsePotion: () => void;
  onToggleAutomation: () => void;
  onManageHero: () => void;
  onManageSpellbook: () => void;
  onStartHunt: () => void;
  onStopHunt: () => void;
}

export function LiveHuntPanel({
  game,
  stats,
  location,
  selectedEnemy,
  selectedDefinition,
  onSelectTarget,
  onCastSpell,
  onUseAction,
  onUsePotion,
  onToggleAutomation,
  onManageHero,
  onManageSpellbook,
  onStartHunt,
  onStopHunt,
}: LiveHuntPanelProps) {
  const combat = game.combat;
  const active = combat.phase === "active" || combat.phase === "recovery";
  const alive = combat.enemies.filter((enemy) => !enemy.defeated).length;
  const [logExpanded, setLogExpanded] = useState(false);
  const actionContext = useMemo(() => createCombatPreviewContext(), []);
  const selectedAction = selectedEnemy?.currentAction
    ? selectedDefinition.actions.find(
        (action) => action.id === selectedEnemy.currentAction?.actionId,
      )
    : undefined;
  const playerAttackProgress = useSmoothCombatProgress(
    combat.playerAttackTimer,
    combat.playerAttackInterval,
  );
  const netStamina = stats.staminaRegen - techniqueStaminaDrain(combat);
  const absorbShield = getBarrierAmount(combat.playerEffects, effectById);
  const selectedMatchup = getSelectedTargetMatchup(
    combat,
    stats,
    game.progression,
    selectedEnemy,
  );
  const statusLabel =
    combat.phase === "active"
      ? "LIVE HUNT"
      : combat.phase === "recovery"
        ? "GROUP RECOVERY"
        : combat.phase.toUpperCase();
  const potionQuantity = game.inventory.quantities["item.healing-potion"] ?? 0;
  const potionReady =
    combat.phase === "active" &&
    combat.potionCooldownRemaining <= 0 &&
    potionQuantity > 0 &&
    combat.playerHp < stats.maxHealth;
  const potionStatus =
    combat.potionCooldownRemaining > 0
      ? `COOLDOWN ${combat.potionCooldownRemaining.toFixed(1)}s`
      : potionQuantity <= 0
        ? "OUT OF STOCK"
        : combat.playerHp >= stats.maxHealth
          ? "FULL HEALTH"
          : "READY";

  return (
    <Panel
      title="Live hunt"
      subtitle={
        active
          ? `${location?.name ?? "Combat Location"} · Group ${combat.groupNumber} · ${alive} enemies alive`
          : combat.stopReason
            ? `Stopped: ${combat.stopReason}`
            : "Start a Combat Location Hunt to generate a group"
      }
      icon={Swords}
      panelId="liveCombat"
      screen="combat"
      className="live-combat-panel"
    >
      <div
        className={`combat-status ${combat.phase === "active" ? "is-active" : ""}`}
      >
        <span className="status-pulse" />
        <span>{statusLabel}</span>
        {location && <small>{location.name}</small>}
        <span className="combat-round">GROUP {combat.groupNumber || "—"}</span>
      </div>
      <div
        className="combat-resource-hud"
        data-debug-kind="combat-resource-hud"
        data-debug-layout="vertical"
      >
        <div
          className="combat-resource-stack"
          data-debug-kind="combat-resource-stack"
        >
          <Resource
            label="HP"
            value={combat.playerHp}
            max={stats.maxHealth}
            shield={absorbShield}
            icon={<Heart size={13} />}
            variant="health"
            resource="currentHealth"
          />
          <Resource
            label="Stamina"
            value={combat.stamina}
            max={combat.maxStamina}
            icon={<Zap size={13} />}
            variant="resource"
            resource="stamina"
            net={netStamina}
          />
          <Resource
            label="Mana"
            value={combat.mana}
            max={combat.maxMana}
            icon={<Sparkles size={13} />}
            variant="experience"
            resource="mana"
          />
        </div>
        <CombatMatchupReadout
          game={game}
          stats={stats}
          selectedEnemy={selectedEnemy}
        />
      </div>
      <div className="player-attack-progress" data-debug-kind="player-attack">
        <div className="player-attack-heading">
          <span>
            <Swords size={11} /> YOUR ATTACK
          </span>
          <strong>
            {combat.phase === "active"
              ? combatTimerLabel(
                  combat.playerAttackTimer,
                  combat.playerAttackInterval,
                )
              : combat.phase === "recovery"
                ? "Paused during recovery"
                : "Waiting for target"}
          </strong>
        </div>
        <ProgressBar
          value={combat.phase === "active" ? playerAttackProgress.value : 0}
          variant="attack"
          className={`player-attack-bar ${playerAttackProgress.isResetting ? "is-attack-resetting" : ""}`}
          ariaLabel="Player attack progress"
        />
        <small>
          {selectedEnemy && !selectedEnemy.defeated
            ? `Target: ${selectedEnemy.displayName} · Hit ${selectedMatchup ? formatPercent(selectedMatchup.playerHitChance) : "—"} · Crit ${selectedMatchup ? formatPercent(selectedMatchup.playerCritChance) : formatPercent(stats.critChance)}`
            : "Select an enemy target"}
        </small>
      </div>
      {combat.phase === "recovery" && (
        <div className="combat-recovery-banner">
          <strong>GROUP CLEARED</strong>
          <span>
            Recovering · next group in {combat.recoveryRemaining.toFixed(1)}s
          </span>
        </div>
      )}
      <div className="enemy-group-heading">
        <span className="tiny-label">ENEMY GROUP</span>
        <strong>{alive} ALIVE</strong>
      </div>
      <div className="enemy-roster" aria-label="Generated hunt group">
        {combat.enemies.length > 0 ? (
          combat.enemies.map((enemy) => (
            <EnemyCard
              key={enemy.instanceId}
              enemy={enemy}
              selected={enemy.instanceId === combat.selectedEnemyInstanceId}
              onSelect={onSelectTarget}
            />
          ))
        ) : (
          <div className="combat-empty-state">
            <Target size={20} />
            <strong>NO ACTIVE HUNT</strong>
            <span>
              Choose a Combat Location above to generate an enemy group.
            </span>
          </div>
        )}
      </div>
      <div className="spell-controls">
        <div className="section-title">
          <span className="tiny-label">COMBAT ACTIONS</span>
          <small>
            {selectedAction?.interruptible
              ? "INTERRUPT AVAILABLE"
              : combat.globalCooldownRemaining > 0
                ? "GLOBAL COOLDOWN " +
                  combat.globalCooldownRemaining.toFixed(1) +
                  "s"
                : "Spells, defenses and consumables"}
          </small>
        </div>
        {selectedAction?.interruptible && (
          <div className="interrupt-window">
            <Crosshair size={13} />
            <strong>INTERRUPT WINDOW OPEN</strong>
            <span>Disrupting Pulse can stop {selectedAction.name}.</span>
          </div>
        )}
        <div className="combat-action-sections">
          <section className="combat-action-section">
            <div className="section-title"><span className="tiny-label">MAGIC</span><small>{COMBAT_SPELL_SLOT_COUNT} loadout slots</small></div>
            <div className="spell-grid">
          {Array.from({ length: COMBAT_SPELL_SLOT_COUNT }, (_, slot) => {
            const spellId = game.spellbook.equippedSpellSlots[slot] ?? null;
            const spell = spellDefinitions.find(
              (candidate) => candidate.id === spellId,
            );
            if (!spell)
              return (
                <button
                  key={"empty-spell-slot-" + slot}
                  className="spell-button is-invalid"
                  disabled
                  data-debug-kind="spell-empty-slot"
                  data-debug-slot={slot}
                >
                  <PlaceholderArt
                    icon="sparkles"
                    size="small"
                    variant="muted"
                  />
                  <span>
                    <strong>Empty Spell Slot</strong>
                     <small>Configure in Hero</small>
                  </span>
                </button>
              );
            const runtime = combat.actionCooldowns[spell.id];
            const spellView = getSpellActionView(game, spell.id, stats, actionContext);
            const effectiveSpell = spellView.effectiveSpell!;
            const state = getSpellUiState(
              spell,
              runtime,
              combat,
              selectedAction,
              effectiveSpell,
            );
            const button = (
              <button
                className={`spell-button is-${state.tone} ${spell.id === "spell.disrupting-pulse" && state.enabled ? "is-interrupt-ready" : ""}`}
                onClick={() => onCastSpell(spell.id)}
                disabled={!state.enabled}
                data-debug-kind="spell"
                data-debug-spell-id={spell.id}
                data-debug-label={spell.name}
              >
                <PlaceholderArt
                  icon={spell.icon}
                  size="small"
                  variant={state.enabled ? "gold" : "muted"}
                />
                <span>
                  <strong>{spell.name}</strong>
                  <small>
                    {effectiveSpell.manaCost} MANA · {state.status}
                  </small>
                </span>
              </button>
            );
            return state.enabled ? (
              <GameTooltip
                key={spell.id}
                 content={buildSpellTooltip(spell, game.progression, buildEffectiveSpellContext(game, spell))}
              >
                {button}
              </GameTooltip>
            ) : (
              <GameTooltip
                key={spell.id}
                 content={buildSpellTooltip(spell, game.progression, buildEffectiveSpellContext(game, spell))}
              >
                <span className="spell-tooltip-host">{button}</span>
              </GameTooltip>
            );
          })}
            </div>
          </section>
          <section className="combat-action-section">
            <div className="section-title"><span className="tiny-label">ACTIVE DEFENSE</span><small>Stamina actions</small></div>
            <div className="spell-grid">
          {defensiveActionDefinitions.map((action) => {
            const validation = validatePlayerAction(game, action.id, stats, actionContext);
            const enabled = validation.valid;
            return (
              <button
                key={action.id}
                className={
                  "spell-button defense-button is-" +
                  (enabled ? "ready" : "invalid")
                }
                onClick={() => onUseAction(action.id)}
                disabled={!enabled}
                data-debug-kind="defensive-action"
                data-debug-action-id={action.id}
                data-debug-label={action.name}
              >
                <PlaceholderArt
                  icon={action.icon ?? "shield"}
                  size="small"
                  variant={enabled ? "blue" : "muted"}
                />
                <span>
                  <strong>{action.name}</strong>
                  <small>
                    {action.resourceCost?.stamina ?? 0} STAMINA ·{" "}
                    {enabled ? "READY" : reasonLabel(validation.reason)}
                  </small>
                </span>
              </button>
            );
          })}
            </div>
          </section>
          <section className="combat-action-section combat-consumable-section">
            <div className="section-title"><span className="tiny-label">CONSUMABLE</span><small>Combat items</small></div>
            <div className="spell-grid">
          <GameTooltip
            content={{
              id: "item.healing-potion",
              icon: "heart",
              title: "Healing Potion",
              subtitle: "Consumable",
              description: "Restores health during combat.",
              rows: [
                {
                  label: "Status",
                  value: potionStatus,
                  tone: potionReady ? "green" : "default",
                },
              ],
            }}
          >
            <span className="spell-tooltip-host">
              <button
                className={`spell-button potion-button ${potionReady ? "is-ready" : "is-invalid"}`}
                onClick={onUsePotion}
                disabled={!potionReady}
                data-debug-kind="potion"
                data-debug-item-id="item.healing-potion"
              >
                <PlaceholderArt icon="heart" size="small" variant="gold" />
                <span>
                  <strong>Healing Potion ×{potionQuantity}</strong>
                  <small>{potionStatus}</small>
                </span>
              </button>
            </span>
          </GameTooltip>
            </div>
          </section>
        </div>
      </div>
      <div className="automation-controls" data-debug-kind="combat-automation">
        <div className="section-title">
          <span className="tiny-label">AUTOMATION</span>
          <button
            className="button button-ghost"
            onClick={onToggleAutomation}
            data-debug-kind="automation-toggle"
          >
            {game.combatAutomation.enabled ? "ENABLED" : "DISABLED"}
          </button>
        </div>
        <div className="automation-summary-row"><span>{game.combatAutomation.rules.filter((rule) => rule.enabled).length} RULES ACTIVE</span><span>AUTO TARGET OVERRIDE {game.combatAutomation.overrideManualTarget ? "ON" : "OFF"}</span><span>{game.combat.lastAutomationAction ? `LAST AUTO ACTION · ${game.combat.lastAutomationAction.actionId}` : "NO AUTO ACTION YET"}</span></div>
        <div className="automation-summary-actions"><small className="muted-copy">Manage priorities, conditions and spell loadout from the Hero screen.</small><span className="hero-inline-actions"><button className="button button-ghost" onClick={onManageSpellbook}>SPELLBOOK</button><button className="button button-ghost" onClick={onManageHero}>MANAGE IN HERO</button></span></div>
        {game.combat.lastAutomationFailure && (
          <small className="automation-invalid">
            Last invalid: {game.combat.lastAutomationFailure}
          </small>
        )}
      </div>
      <div className="hunt-control-row">
        <div>
          <span className="tiny-label">HUNT CONTROL</span>
          <small>
            {active
              ? "∞ New groups continue automatically"
              : "Ready to generate a random group"}
          </small>
        </div>
        <button
          aria-label={active ? "Stop hunt" : "Start hunt"}
          className="button button-primary fight-button"
          onClick={active ? onStopHunt : onStartHunt}
          data-debug-kind="combat-control"
          data-debug-label={active ? "Stop hunt" : "Start hunt"}
        >
          {active ? (
            <>
              <Pause size={15} />
              Stop Hunt
            </>
          ) : (
            <>
              <Play size={15} />
              Start Hunt
            </>
          )}
        </button>
      </div>
      <div
        className={`combat-log ${logExpanded ? "is-expanded" : "is-collapsed"}`}
        data-debug-kind="combat-log"
      >
        <button
          className="combat-log-heading"
          onClick={() => setLogExpanded((value) => !value)}
          aria-expanded={logExpanded}
        >
          <span className="tiny-label">
            {logExpanded ? "▾" : "▸"} COMBAT LOG
          </span>
          <span>{combat.log.length} events</span>
        </button>
        {logExpanded && (
          <div className="combat-log-list">
            {combat.log.slice(0, 12).map((entry) => (
              <div
                className={`combat-log-entry log-${entry.type}`}
                key={entry.id}
              >
                <time>{entry.time}</time>
                <span>{entry.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function EnemyCard({
  enemy,
  selected,
  onSelect,
}: {
  enemy: EnemyCombatInstance;
  selected: boolean;
  onSelect: (instanceId: string) => void;
}) {
  const definition = enemyById[enemy.enemyId];
  const action = enemy.currentAction
    ? definition.actions.find(
        (candidate) => candidate.id === enemy.currentAction?.actionId,
      )
    : undefined;
  const normalAttackProgress = useSmoothCombatProgress(
    enemy.attackTimer,
    enemy.attackInterval,
  );
  const label = `${enemy.displayName}, ${Math.floor(enemy.currentHealth)} of ${enemy.maxHealth} HP, ${selected ? "targeted" : enemy.defeated ? "defeated" : "available"}`;
  return (
    <button
      className={`enemy-combat-card ${selected ? "is-targeted" : ""} ${enemy.defeated ? "is-defeated" : ""} ${action ? `has-special danger-${action.danger}` : ""}`}
      onClick={() => onSelect(enemy.instanceId)}
      aria-label={label}
      aria-pressed={selected}
      data-debug-kind="combat-enemy"
      data-debug-enemy-id={enemy.enemyId}
      data-debug-instance-id={enemy.instanceId}
      data-debug-label={enemy.displayName}
    >
      <div className="enemy-card-top">
        <PlaceholderArt
          icon={definition.icon}
          size="small"
          variant={definition.accent}
        />
        <span>
          <strong>
            {selected && <Crosshair size={11} />} {enemy.displayName}
          </strong>
          <small>
            {enemy.defeated
              ? "DEFEATED"
              : `${Math.floor(enemy.currentHealth)} / ${enemy.maxHealth} HP`}
          </small>
        </span>
        <em className={selected ? "target-tag" : ""}>
          {selected ? "TARGETED" : enemy.defeated ? "DEFEATED" : "SELECT"}
        </em>
      </div>
      {!enemy.defeated && (
        <>
          <ProgressBar
            value={(enemy.currentHealth / enemy.maxHealth) * 100}
            variant="health"
            className="enemy-health-bar"
            ariaLabel={`${enemy.displayName} health`}
          />
          <div className="enemy-card-timer">
            <span>
              <Timer size={11} /> NORMAL ATTACK
            </span>
            <strong>
              {combatTimerLabel(enemy.attackTimer, enemy.attackInterval)}
            </strong>
          </div>
          {!action && (
            <ProgressBar
              value={normalAttackProgress.value}
              variant="attack"
              className={`enemy-action-progress ${normalAttackProgress.isResetting ? "is-attack-resetting" : ""}`}
              ariaLabel={`${enemy.displayName} normal attack progress`}
            />
          )}
          {action && (
            <div className={`special-intent danger-${action.danger}`}>
              <div className="special-intent-heading">
                <span>⚠ {action.name}</span>
                <strong>
                  {combatTimerLabel(
                    enemy.currentAction!.remainingSeconds,
                    enemy.currentAction!.totalSeconds,
                  )}
                </strong>
              </div>
              <ProgressBar
                value={combatProgress(
                  enemy.currentAction!.remainingSeconds,
                  enemy.currentAction!.totalSeconds,
                )}
                variant="attack"
                className="enemy-action-progress"
                ariaLabel={`${action.name} progress`}
              />
              <small>
                <span>{action.danger.toUpperCase()} DANGER</span>
                <strong>
                  {action.interruptible ? "INTERRUPTIBLE" : "UNINTERRUPTIBLE"}
                </strong>
              </small>
            </div>
          )}
        </>
      )}
    </button>
  );
}

function Resource({
  label,
  value,
  max,
  shield = 0,
  icon,
  variant,
  net,
  className = "",
  resource,
}: {
  label: string;
  value: number;
  max: number;
  shield?: number;
  icon: ReactNode;
  variant: "health" | "resource" | "experience";
  net?: number;
  className?: string;
  resource: "currentHealth" | "stamina" | "mana";
}) {
  const displayValue =
    resource === "currentHealth"
      ? formatHealthWithBarrier(value, max, shield)
      : `${Math.floor(value)} / ${Math.floor(max)}`;
  const ariaValue = `${Math.floor(value)} of ${Math.floor(max)}${resource === "currentHealth" && shield > 0 ? ` (+${Math.floor(shield)})` : ""}`;
  const staminaDeficit =
    resource === "stamina" && net !== undefined && net < 0
      ? ` (${Math.round(net)})`
      : "";
  const valueLabel =
    resource === "currentHealth"
      ? displayValue
      : `${Math.floor(value)} / ${Math.floor(max)}${staminaDeficit}`;
  const bar =
    resource === "currentHealth" ? (
      <LayeredHealthBar
        health={value}
        maxHealth={max}
        barrier={shield}
        className="resource-bar"
        ariaLabel={`HP ${Math.floor(value)} of ${Math.floor(max)}${shield > 0 ? `. Absorb Shield ${Math.floor(shield)}` : ""}`}
      />
    ) : (
      <ProgressBar
        value={(value / max) * 100}
        variant={variant}
        className="resource-bar"
        ariaLabel={`${label} ${ariaValue}`}
      />
    );
  return (
    <GameTooltip
      content={{
        ...buildStatTooltip(resource, value),
        rows: [
          {
            label: "Current",
            value: displayValue,
            tone: resource === "currentHealth" ? "red" : "blue",
          },
        ],
      }}
    >
      <div
        className={`resource-block resource-${resource === "currentHealth" ? "health" : resource} ${className}`}
        data-debug-kind="combat-resource"
        data-debug-resource={resource}
        data-debug-stat-key={resource}
      >
        <div className="resource-heading">
          <span>
            {icon} {label}
          </span>
          <strong>{valueLabel}</strong>
        </div>
        {bar}
      </div>
    </GameTooltip>
  );
}
