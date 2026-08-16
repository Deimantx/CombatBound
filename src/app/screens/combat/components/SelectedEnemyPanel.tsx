import { Sparkles, Target } from "lucide-react";
import { enemyById } from "../../../../game/data/enemies";
import { itemById } from "../../../../game/data/items";
import type { EnemyCombatInstance } from "../../../../game/combat/combatTypes";
import type { GameState } from "../../../../game/gameState";
import { Panel } from "../../../components/Panel";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { ProgressBar } from "../../../components/ProgressBar";
import { formatPercent, combatProgress } from "./combatUi";
import { EffectChips } from "./EffectChips";
import { buildStatTooltip } from "../../../../game/presentation/tooltipBuilders";
import {
  formatResistance,
  formatDamageRange,
  labelForStatKey,
} from "../../../../game/presentation/statFormatting";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import {
  getEnemyEffectiveCombatStats,
  getSelectedTargetMatchup,
} from "../../../../game/combat/combatSelectors";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { MatchupSummary } from "./CombatMatchupReadout";

export function SelectedEnemyPanel({
  game,
  selectedEnemy,
}: {
  game: GameState;
  selectedEnemy?: EnemyCombatInstance;
}) {
  const combat = game.combat;
  const definition = selectedEnemy
    ? enemyById[selectedEnemy.enemyId]
    : undefined;
  const hunterStats = calculateHunterCombatStats(
    game.equipment,
    game.progression,
    combat.stance,
    combat.techniques,
  );
  const matchup = getSelectedTargetMatchup(
    combat,
    hunterStats,
    game.progression,
    selectedEnemy,
  );
  const enemyStats = selectedEnemy
    ? getEnemyEffectiveCombatStats(selectedEnemy)
    : undefined;
  const enemyDamageRange = {
    min: enemyStats?.attackDamageMin ?? definition?.baseAttackDamageMin ?? 0,
    max: enemyStats?.attackDamageMax ?? definition?.baseAttackDamageMax ?? 0,
  };

  return (
    <Panel
      title="Selected enemy"
      subtitle="Current runtime target"
      icon={Target}
      panelId="targetCombat"
      screen="combat"
      className={`target-combat-panel ${selectedEnemy ? "has-target" : ""} ${selectedEnemy?.currentAction ? "has-target-action" : ""}`}
    >
      {selectedEnemy && definition ? (
        <>
          <div className="target-card-top">
            <PlaceholderArt
              icon={definition.icon}
              label={selectedEnemy.displayName}
              size="medium"
              variant={definition.accent}
            />
            <div>
              <h3>{selectedEnemy.displayName}</h3>
              <p>
                {definition.family} · Group {combat.groupNumber}
              </p>
              <span className="level-badge">
                {selectedEnemy.defeated
                  ? "DEFEATED"
                  : `INSTANCE ${selectedEnemy.instanceId.split("#")[1]}`}
              </span>
            </div>
          </div>
          <GameTooltip
            content={{
              ...buildStatTooltip("currentHealth", selectedEnemy.currentHealth),
              rows: [
                {
                  label: "Current",
                  value: `${Math.floor(selectedEnemy.currentHealth)} / ${selectedEnemy.maxHealth}`,
                  tone: "red",
                },
              ],
            }}
          >
            <div className="target-health" data-debug-stat-key="currentHealth">
              <div className="target-health-heading">
                <span>HEALTH</span>
                <strong>
                  {Math.floor(selectedEnemy.currentHealth)} /{" "}
                  {selectedEnemy.maxHealth}
                </strong>
              </div>
              <ProgressBar
                value={
                  (selectedEnemy.currentHealth / selectedEnemy.maxHealth) * 100
                }
                variant="health"
                className="target-health-bar"
                ariaLabel={`Selected target ${selectedEnemy.displayName} health`}
              />
            </div>
          </GameTooltip>
          {matchup && <MatchupSummary matchup={matchup} />}
          <div className="target-stat-grid">
            <TargetStat
              label="Attack Damage"
              value={formatDamageRange(enemyDamageRange.min, enemyDamageRange.max)}
              statKey="attackDamage"
              statValue={enemyStats?.attackDamage ?? ((definition.baseAttackDamageMin + definition.baseAttackDamageMax) / 2)}
              statRange={enemyDamageRange}
            />
            <TargetStat
              label="Accuracy Rating"
              value={Math.round(enemyStats?.accuracyRating ?? definition.accuracyRating)}
              statKey="accuracyRating"
              statValue={enemyStats?.accuracyRating ?? definition.accuracyRating}
            />
            <TargetStat
              label="Armour"
              value={Math.round(enemyStats?.armour ?? definition.armour)}
              statKey="armour"
              statValue={enemyStats?.armour ?? definition.armour}
            />
            <TargetStat
              label="Evasion Rating"
              value={Math.round(enemyStats?.evasionRating ?? definition.evasionRating)}
              statKey="evasionRating"
              statValue={enemyStats?.evasionRating ?? definition.evasionRating}
            />
            <TargetStat
              label="Attack Interval"
              value={`${(enemyStats?.attackInterval ?? definition.baseAttackTime).toFixed(1)}s`}
              statKey="attackInterval"
              statValue={
                enemyStats?.attackInterval ?? definition.baseAttackTime
              }
            />
            <TargetStat
              label="Attack Block"
              value={formatPercent(enemyStats?.attackBlockChance ?? definition.attackBlockChance ?? 0)}
              statKey="attackBlockChance"
              statValue={enemyStats?.attackBlockChance ?? definition.attackBlockChance ?? 0}
            />
          </div>
          <div className="combat-effects-inspector">
            <div className="section-title">
              <span className="tiny-label">ACTIVE EFFECTS</span>
              <small>{selectedEnemy.effects.length}</small>
            </div>
            <EffectChips effects={selectedEnemy.effects} debugId="enemy" />
          </div>
          {(enemyStats?.spellBlockChance ?? definition.spellBlockChance ?? 0) > 0 || (enemyStats?.spellSuppressionChance ?? definition.spellSuppressionChance ?? 0) > 0 ? (
            <div className="target-defenses">
              <span>Spell Block {formatPercent(enemyStats?.spellBlockChance ?? definition.spellBlockChance ?? 0)}</span>
              <span>Suppression {formatPercent(enemyStats?.spellSuppressionChance ?? definition.spellSuppressionChance ?? 0)}</span>
            </div>
          ) : null}
          <div className="trait-section">
            <span className="tiny-label">TRAITS</span>
            {definition.traits.map((trait) => (
              <div className="trait-row" key={trait.id}>
                <strong>{trait.name}</strong>
                <small>{trait.description}</small>
              </div>
            ))}
          </div>
          {definition.actions.length > 0 && (
            <div className="enemy-actions-detail">
              <span className="tiny-label">SPECIAL ACTIONS</span>
              {definition.actions.map((action) => {
                const current =
                  selectedEnemy.currentAction?.actionId === action.id;
                return (
                  <div
                    className={`enemy-action-detail ${current ? `is-casting danger-${action.danger}` : ""}`}
                    key={action.id}
                  >
                    <strong>
                      {current ? "CASTING · " : ""}
                      {action.name}
                    </strong>
                    <small>
                      {action.danger.toUpperCase()} DANGER ·{" "}
                      {action.interruptible
                        ? "INTERRUPTIBLE"
                        : "UNINTERRUPTIBLE"}
                    </small>
                    {current && (
                      <ProgressBar
                        value={combatProgress(
                          selectedEnemy.currentAction!.remainingSeconds,
                          selectedEnemy.currentAction!.totalSeconds,
                        )}
                        variant="attack"
                        ariaLabel={`${action.name} progress`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <AffinityRow
            label="WEAKNESS"
            values={affinityValues(definition.resistances, "weakness")}
            tone="weakness"
          />
          <AffinityRow
            label="RESISTANCE"
            values={affinityValues(definition.resistances, "resistance")}
            tone="resistance"
          />
          <div className="reward-preview">
            <span className="tiny-label">KNOWN DROPS</span>
            <div className="drop-list">
              {definition.loot.map((drop) => (
                <span key={drop.itemId}>
                  <Sparkles size={11} />{" "}
                  <strong>{itemById[drop.itemId]?.name ?? drop.itemId}</strong>
                  <small>
                    {Math.round(drop.chance * 100)}%
                    {drop.maxQuantity > 1
                      ? ` · ×${drop.minQuantity}-${drop.maxQuantity}`
                      : ""}
                  </small>
                </span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Target size={24} />
          <strong>No active enemy group</strong>
          <p>Start a Combat Location Hunt to generate one.</p>
        </div>
      )}
    </Panel>
  );
}

function TargetStat({
  label,
  value,
  statKey,
  statValue,
  statRange,
}: {
  label: string;
  value: string | number;
  statKey?: string;
  statValue?: number;
  statRange?: { min: number; max: number };
}) {
  const content = (
    <div data-debug-stat-key={statKey}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
  return statKey && statValue !== undefined ? (
    <GameTooltip content={buildStatTooltip(statKey, statValue, undefined, statRange)}>
      {content}
    </GameTooltip>
  ) : (
    content
  );
}
function AffinityRow({
  label,
  values,
  tone,
}: {
  label: string;
  values: Array<{ type: string; value: number }>;
  tone: "weakness" | "resistance";
}) {
  if (values.length === 0) return null;
  return (
    <div className={`affinity-row ${tone}`}>
      <span className="tiny-label">{label}</span>
      <div>
        {values.map((entry) => (
          <GameTooltip
            key={entry.type}
            content={buildStatTooltip(`${entry.type}Resistance`, entry.value)}
          >
            <span
              data-debug-kind="tooltip-trigger"
              data-debug-stat-key={`${entry.type}Resistance`}
            >
              {labelForStatKey(`${entry.type}Resistance`)}{" "}
              {formatResistance(entry.value)}
            </span>
          </GameTooltip>
        ))}
      </div>
    </div>
  );
}
function affinityValues(
  resistances: Record<string, number>,
  tone: "weakness" | "resistance",
) {
  return Object.entries(resistances)
    .filter(([, value]) => (tone === "weakness" ? value < 0 : value > 0))
    .map(([type, value]) => ({ type, value }));
}
