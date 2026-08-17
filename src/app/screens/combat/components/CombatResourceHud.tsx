import { Heart, Sparkles, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { effectById } from "../../../../game/data/effects";
import { getBarrierAmount } from "../../../../game/combat/combatEffects";
import type { GameState } from "../../../../game/gameState";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import { buildStatTooltip } from "../../../../game/presentation/tooltipBuilders";
import { formatHealthWithBarrier } from "../../../../game/presentation/statFormatting";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { ProgressBar } from "../../../components/ProgressBar";
import { LayeredHealthBar } from "./LayeredHealthBar";
import { CombatMatchupReadout } from "./CombatMatchupReadout";
import { techniqueStaminaDrain } from "./combatUi";

export function CombatResourceHud({ game, stats, selectedEnemy }: { game: GameState; stats: HunterCombatStats; selectedEnemy?: GameState["combat"]["enemies"][number] }) {
  const combat = game.combat;
  const absorbShield = getBarrierAmount(combat.playerEffects, effectById);
  const netStamina = stats.staminaRegen - techniqueStaminaDrain(combat);
  return <div className="combat-resource-hud" data-debug-kind="combat-resource-hud" data-debug-layout="vertical">
    <div className="combat-resource-stack" data-debug-kind="combat-resource-stack">
      <Resource label="HP" value={combat.playerHp} max={stats.maxLife ?? 0} shield={absorbShield} icon={<Heart size={13} />} variant="health" resource="currentHealth" />
      <Resource label="Stamina" value={combat.stamina} max={combat.maxStamina} icon={<Zap size={13} />} variant="resource" resource="stamina" net={netStamina} />
      <Resource label="Mana" value={combat.mana} max={combat.maxMana} icon={<Sparkles size={13} />} variant="experience" resource="mana" />
    </div>
    <CombatMatchupReadout game={game} stats={stats} selectedEnemy={selectedEnemy} />
  </div>;
}

function Resource({ label, value, max, shield = 0, icon, variant, net, className = "", resource }: { label: string; value: number; max: number; shield?: number; icon: ReactNode; variant: "health" | "resource" | "experience"; net?: number; className?: string; resource: "currentHealth" | "stamina" | "mana" }) {
  const displayValue = resource === "currentHealth" ? formatHealthWithBarrier(value, max, shield) : `${Math.floor(value)} / ${Math.floor(max)}`;
  const ariaValue = `${Math.floor(value)} of ${Math.floor(max)}${resource === "currentHealth" && shield > 0 ? ` (+${Math.floor(shield)})` : ""}`;
  const staminaDeficit = resource === "stamina" && net !== undefined && net < 0 ? ` (${Math.round(net)})` : "";
  const valueLabel = resource === "currentHealth" ? displayValue : `${Math.floor(value)} / ${Math.floor(max)}${staminaDeficit}`;
  const bar = resource === "currentHealth" ? <LayeredHealthBar health={value} maxHealth={max} barrier={shield} className="resource-bar" ariaLabel={`HP ${Math.floor(value)} of ${Math.floor(max)}${shield > 0 ? `. Absorb Shield ${Math.floor(shield)}` : ""}`} /> : <ProgressBar value={(value / max) * 100} variant={variant} className="resource-bar" ariaLabel={`${label} ${ariaValue}`} />;
  return <GameTooltip content={{ ...buildStatTooltip(resource, value), rows: [{ label: "Current", value: displayValue, tone: resource === "currentHealth" ? "red" : "blue" }] }}>
    <div className={`resource-block resource-${resource === "currentHealth" ? "health" : resource} ${className}`} data-debug-kind="combat-resource" data-debug-resource={resource} data-debug-stat-key={resource}>
      <div className="resource-heading"><span>{icon} {label}</span><strong>{valueLabel}</strong></div>
      {bar}
    </div>
  </GameTooltip>;
}
