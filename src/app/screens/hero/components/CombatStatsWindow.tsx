import { Sparkles, Swords } from "lucide-react";
import { statGroups, EquipmentStatGroup } from "../../equipment/EquipmentScreen";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import { calculateArmorMitigation } from "../../../../game/combat/combatMath";
import { formatCombatStatValue, formatPercent } from "../../../../game/presentation/statFormatting";
import type { GameState } from "../../../../game/gameState";
import { CollapsiblePanel } from "../../../components/CollapsiblePanel";

export function CombatStatsWindow({ game }: { game: GameState }) {
  const stats = calculateHunterCombatStats(
    game.equipment,
    game.progression,
    game.combat.stance,
    game.combat.techniques,
  );
  const resistance = (key: string) =>
    stats.resistances[
      key.replace("Resistance", "").toLowerCase() as keyof typeof stats.resistances
    ] ?? 0;
  const valueFor = (key: string) =>
    key.endsWith("Resistance")
      ? resistance(key)
      : (stats[key as keyof typeof stats] as number);
  const detailFor = (key: string) =>
    key === "armor"
      ? `${formatCombatStatValue(key, valueFor(key))} · ${formatPercent(calculateArmorMitigation(stats.armor))} Physical direct mitigation`
      : key === "attackInterval"
        ? `${formatCombatStatValue(key, valueFor(key))} · ${(1 / stats.attackInterval).toFixed(2)} attacks/sec`
        : undefined;
  return (
    <div className="hero-stats-window" data-debug-kind="combat-stats-window">
      <div className="hero-stat-summary">
        <span>Attack Power <strong>{stats.attackPower}</strong></span>
        <span>Armor <strong>{Math.round(stats.armor)}</strong></span>
        <span>Accuracy <strong>{Math.round(stats.accuracy)}</strong></span>
        <span>Max Health <strong>{Math.round(stats.maxHealth)}</strong></span>
      </div>
      <CollapsiblePanel
        title="Hunter Combat Stats"
        subtitle="All derived values used by live combat"
        icon={Swords}
        panelId="heroCombatStats"
        screen="hero"
        summary={<span>Build values and temporary combat modifiers</span>}
      >
        <div className="equipment-stat-groups">
          {statGroups.map((group) => (
            <EquipmentStatGroup
              key={group.id}
              group={group}
              valueFor={valueFor}
              detailFor={detailFor}
            />
          ))}
        </div>
        <div className="stat-tip">
          <Sparkles size={14} />
          <span>Preparation matters<br /><small>Temporary combat effects are shown on the Combat screen.</small></span>
        </div>
      </CollapsiblePanel>
    </div>
  );
}
