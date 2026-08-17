import { Target } from "lucide-react";
import { enemyById } from "../../../../game/data/enemies";
import { itemById } from "../../../../game/data/items";
import type { EnemyCombatInstance } from "../../../../game/combat/combatTypes";
import type { GameState } from "../../../../game/gameState";
import { Panel } from "../../../components/Panel";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { formatPercent } from "./combatUi";
import { EffectChips } from "./EffectChips";
import { buildStatTooltip } from "../../../../game/presentation/tooltipBuilders";
import {
  formatResistance,
  formatDamageRange,
  labelForStatKey,
} from "../../../../game/presentation/statFormatting";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import { getEnemyEffectiveCombatStats } from "../../../../game/combat/combatSelectors";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";

export function SelectedEnemyPanel({
  game,
  stats,
  selectedEnemy,
}: {
  game: GameState;
  stats: HunterCombatStats;
  selectedEnemy?: EnemyCombatInstance;
}) {
  void stats;
  const combat = game.combat;
  const definition = selectedEnemy
    ? enemyById[selectedEnemy.enemyId]
    : undefined;
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
                {definition.family} Â· Group {combat.groupNumber}
              </p>
              <span className="level-badge">
                {selectedEnemy.defeated
                  ? "DEFEATED"
                  : "TARGETED"}
              </span>
            </div>
          </div>
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
                      {current ? "CASTING Â· " : ""}
                      {action.name}
                    </strong>
                    <small>
                      {action.danger.toUpperCase()} DANGER Â·{" "}
                      {action.interruptible
                        ? "INTERRUPTIBLE"
                        : "UNINTERRUPTIBLE"}
                    </small>
                    {current && <small className="casting-now-label">CASTING NOW Â· INTERRUPT IN LIVE HUNT</small>}
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
              {definition.loot.map((drop) => { const item = itemById[drop.itemId]; if (!item) return null; return <GameTooltip key={drop.itemId} content={{ id: item.id, icon: item.icon, title: item.name, subtitle: item.category, description: item.description, rows: [{ label: "Drop chance", value: `${Math.round(drop.chance * 100)}%`, tone: "gold" }] }}><span><PlaceholderArt icon={item.icon} size="small" variant="gold" /><strong>{item.name}</strong><small>{Math.round(drop.chance * 100)}%{drop.maxQuantity > 1 ? ` · x${drop.minQuantity}-${drop.maxQuantity}` : ""}</small></span></GameTooltip>; })}
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
