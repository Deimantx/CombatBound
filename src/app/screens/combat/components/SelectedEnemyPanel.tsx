import { Target } from "lucide-react";
import { enemyById } from "../../../../game/data/enemies";
import { enemyCombatAbilityById } from "../../../../game/data/enemyCombatAbilities";
import { combatLocationById } from "../../../../game/data/world/combatLocations";
import { itemById } from "../../../../game/data/items";
import type { EnemyCombatInstance } from "../../../../game/combat/combatTypes";
import type { GameState } from "../../../../game/gameState";
import { Panel } from "../../../components/Panel";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { formatPercent } from "./combatUi";
import { EffectChips } from "./EffectChips";
import { buildStatTooltip } from "../../../../game/presentation/tooltipBuilders";
import { formatResistance, formatDamageRange, labelForStatKey } from "../../../../game/presentation/statFormatting";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import { getEnemyEffectiveCombatStats } from "../../../../game/combat/combatSelectors";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { getEnemyResolvedTraits } from "../../../../game/enemyTraits/enemyTraitSelectors";
import { getCombatTargetLootPreview } from "../../../../game/combat/combatRewards";
import { formatSeconds } from "../../../../game/presentation/statFormatting";
import { instantiateCombatTarget } from "../../../../game/combat/combatState";

export function SelectedEnemyPanel({ game, stats, selectedEnemy: selectedEnemyRuntime, selectedEnemyId, previewLocationId }: { game: GameState; stats: HunterCombatStats; selectedEnemy?: EnemyCombatInstance; selectedEnemyId?: string; previewLocationId?: string }) {
  void stats;
  const combat = game.combat;
  const selectedEnemy = selectedEnemyRuntime ?? (selectedEnemyId ? instantiateCombatTarget(selectedEnemyId, 0) ?? undefined : undefined);
  const definition = selectedEnemy ? enemyById[selectedEnemy.enemyId] : undefined;
  const locationId = combat.combatLocationId ?? previewLocationId;
  const location = locationId ? combatLocationById[locationId] : undefined;
  const lootPreview = definition && location ? getCombatTargetLootPreview(location, definition) : undefined;
  const enemyStats = selectedEnemy ? getEnemyEffectiveCombatStats(selectedEnemy) : undefined;
  const enemyDamageRange = { min: enemyStats?.attackDamageMin ?? definition?.baseAttackDamageMin ?? 0, max: enemyStats?.attackDamageMax ?? definition?.baseAttackDamageMax ?? 0 };

  return (
    <Panel title="Selected enemy" subtitle="Current runtime target" icon={Target} panelId="targetCombat" screen="combat" className={`target-combat-panel ${selectedEnemy ? "has-target" : ""}`}>
      {selectedEnemy && definition ? (
        <>
          <div className="target-card-top">
            <PlaceholderArt icon={definition.icon} label={selectedEnemy.displayName} size="medium" variant={definition.accent} />
            <div><h3>{selectedEnemy.displayName}</h3><p>{definition.family} · {combat.combatLocationId ? "Current location target" : "Target preview"}</p><span className="level-badge">{selectedEnemy.defeated ? "DEFEATED" : "TARGETED"}</span></div>
          </div>
          <div className="target-stat-grid">
            <TargetStat label="Attack Damage" value={formatDamageRange(enemyDamageRange.min, enemyDamageRange.max)} statKey="attackDamage" statValue={enemyStats?.attackDamage ?? ((definition.baseAttackDamageMin + definition.baseAttackDamageMax) / 2)} statRange={enemyDamageRange} />
            <TargetStat label="Accuracy Rating" value={Math.round(enemyStats?.accuracyRating ?? definition.accuracyRating)} statKey="accuracyRating" statValue={enemyStats?.accuracyRating ?? definition.accuracyRating} />
            <TargetStat label="Armour" value={Math.round(enemyStats?.armour ?? definition.armour)} statKey="armour" statValue={enemyStats?.armour ?? definition.armour} />
            <TargetStat label="Evasion Rating" value={Math.round(enemyStats?.evasionRating ?? definition.evasionRating)} statKey="evasionRating" statValue={enemyStats?.evasionRating ?? definition.evasionRating} />
            <TargetStat label="Attack Interval" value={`${(enemyStats?.attackInterval ?? definition.baseAttackTime).toFixed(1)}s`} statKey="attackInterval" statValue={enemyStats?.attackInterval ?? definition.baseAttackTime} />
            <TargetStat label="Block Chance" value={formatPercent(enemyStats?.blockChance ?? definition.blockChance ?? 0)} statKey="blockChance" statValue={enemyStats?.blockChance ?? definition.blockChance ?? 0} />
          </div>
          <div className="combat-effects-inspector"><div className="section-title"><span className="tiny-label">ACTIVE EFFECTS</span><small>{selectedEnemy.effects.length}</small></div><EffectChips effects={selectedEnemy.effects} debugId="enemy" /></div>
          {(enemyStats?.blockEffect ?? definition.blockEffect ?? 0) > 0 ? <div className="target-defenses"><span>Block Effect {formatPercent(enemyStats?.blockEffect ?? definition.blockEffect ?? 0)}</span></div> : null}
          <div className="trait-section"><span className="tiny-label">TRAITS</span>{getEnemyResolvedTraits(definition).map((trait) => <div className="trait-row" key={trait.assignment.traitId}><strong>{trait.definition.name} - Rank {trait.assignment.rank}</strong><small>{trait.rank.description}</small></div>)}</div>
          <div className="enemy-ability-list"><span className="tiny-label">ENEMY COMBAT ABILITIES</span>{definition.combatAbilityIds.map((abilityId) => { const ability = enemyCombatAbilityById[abilityId]; return ability ? <div className="trait-row" key={ability.id}><strong>{ability.name}</strong><small>{ability.description} · Preparation {formatSeconds(ability.preparationSeconds)} · Cooldown {formatSeconds(ability.cooldownSeconds)}</small></div> : null; })}</div>
          <AffinityRow label="WEAKNESS" values={affinityValues(definition.resistances, "weakness")} tone="weakness" />
          <AffinityRow label="RESISTANCE" values={affinityValues(definition.resistances, "resistance")} tone="resistance" />
          {lootPreview && <div className="reward-preview"><span className="tiny-label">ZONE SHARED LOOT · EACH KILL</span><div className="drop-list">{lootPreview.sharedLoot.map((drop) => { const item = itemById[drop.itemId]; return item ? <span key={`shared-${drop.itemId}`}><PlaceholderArt icon={item.icon} size="small" variant="gold" /><strong>{item.name}</strong><small>{Math.round(drop.chance * 100)}%{drop.maxQuantity > 1 ? ` · x${drop.minQuantity}-${drop.maxQuantity}` : ""}</small></span> : null; })}</div></div>}
          <div className="reward-preview"><span className="tiny-label">TARGET LOOT</span><div className="drop-list">{definition.loot.map((drop) => { const item = itemById[drop.itemId]; if (!item) return null; return <GameTooltip key={drop.itemId} content={{ id: item.id, icon: item.icon, title: item.name, subtitle: item.category, description: item.description, rows: [{ label: "Drop chance", value: `${Math.round(drop.chance * 100)}%`, tone: "gold" }] }}><span><PlaceholderArt icon={item.icon} size="small" variant="gold" /><strong>{item.name}</strong><small>{Math.round(drop.chance * 100)}%{drop.maxQuantity > 1 ? ` - x${drop.minQuantity}-${drop.maxQuantity}` : ""}</small></span></GameTooltip>; })}</div></div>
        </>
      ) : <div className="empty-state"><Target size={24} /><strong>No active target</strong><p>Select a target in the Combat world to inspect it.</p></div>}
    </Panel>
  );
}

function TargetStat({ label, value, statKey, statValue, statRange }: { label: string; value: string | number; statKey?: string; statValue?: number; statRange?: { min: number; max: number } }) {
  const content = <div data-debug-stat-key={statKey}><span>{label}</span><strong>{value}</strong></div>;
  return statKey && statValue !== undefined ? <GameTooltip content={buildStatTooltip(statKey, statValue, undefined, statRange)}>{content}</GameTooltip> : content;
}

function AffinityRow({ label, values, tone }: { label: string; values: Array<{ type: string; value: number }>; tone: "weakness" | "resistance" }) {
  if (values.length === 0) return null;
  return <div className={`affinity-row ${tone}`}><span className="tiny-label">{label}</span><div>{values.map((entry) => <GameTooltip key={entry.type} content={buildStatTooltip(`${entry.type}Resistance`, entry.value)}><span data-debug-kind="tooltip-trigger" data-debug-stat-key={`${entry.type}Resistance`}>{labelForStatKey(`${entry.type}Resistance`)} {formatResistance(entry.value)}</span></GameTooltip>)}</div></div>;
}

function affinityValues(resistances: Record<string, number>, tone: "weakness" | "resistance") {
  return Object.entries(resistances).filter(([, value]) => tone === "weakness" ? value < 0 : value > 0).map(([type, value]) => ({ type, value }));
}
