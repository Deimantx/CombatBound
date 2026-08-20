import { Crosshair, Target, Timer } from "lucide-react";
import { enemyById } from "../../../../game/data/enemies";
import type { EnemyCombatInstance } from "../../../../game/combat/combatTypes";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { ProgressBar } from "../../../components/ProgressBar";
import { combatTimerLabel, useSmoothCombatProgress } from "./combatUi";

export function EnemyRoster({ enemies, selectedId, onSelect }: { enemies: EnemyCombatInstance[]; selectedId: string | null; onSelect: (instanceId: string) => void }) {
  const alive = enemies.filter((enemy) => !enemy.defeated).length;
  return <><div className="enemy-group-heading"><span className="tiny-label">ENEMY GROUP</span><strong>{alive} ALIVE</strong></div><div className="enemy-roster combatbound-scroll" aria-label="Generated hunt group" data-debug-kind="enemy-roster">{enemies.length > 0 ? enemies.map((enemy) => <EnemyCombatCard key={enemy.instanceId} enemy={enemy} selected={enemy.instanceId === selectedId} onSelect={onSelect} />) : <div className="combat-empty-state"><Target size={20} /><strong>NO ACTIVE HUNT</strong><span>Choose a Combat Location above to generate an enemy group.</span></div>}</div></>;
}

export function EnemyCombatCard({ enemy, selected, onSelect }: { enemy: EnemyCombatInstance; selected: boolean; onSelect: (instanceId: string) => void }) {
  const definition = enemyById[enemy.enemyId];
  const normalAttackProgress = useSmoothCombatProgress(enemy.attackTimer, enemy.attackInterval);
  if (!definition) return null;
  const abilityCooldown = Object.values(enemy.abilityCooldowns ?? {}).find((remaining) => remaining > 0);
  const label = `${enemy.displayName}, ${Math.floor(enemy.currentHealth)} of ${enemy.maxHealth} HP, ${selected ? "targeted" : enemy.defeated ? "defeated" : "available"}`;
  return <button className={`enemy-combat-card ${selected ? "is-targeted" : ""} ${enemy.defeated ? "is-defeated" : ""}`} onClick={() => onSelect(enemy.instanceId)} aria-label={label} aria-pressed={selected} data-debug-kind="combat-enemy" data-debug-enemy-id={enemy.enemyId} data-debug-instance-id={enemy.instanceId} data-debug-label={enemy.displayName}>
    <div className="enemy-card-top"><PlaceholderArt icon={definition.icon} size="small" variant={definition.accent} /><span><strong>{selected && <Crosshair size={11} />} {enemy.displayName}</strong><small>{enemy.defeated ? "DEFEATED" : `${Math.floor(enemy.currentHealth)} / ${enemy.maxHealth} HP`}</small></span>{(selected || enemy.defeated) && <em className={selected ? "target-tag" : ""}>{selected ? "TARGETED" : "DEFEATED"}</em>}</div>
    {!enemy.defeated && <><ProgressBar value={(enemy.currentHealth / enemy.maxHealth) * 100} variant="health" className="enemy-health-bar" ariaLabel={`${enemy.displayName} health`} /><div className="enemy-card-timer"><span><Timer size={11} /> NORMAL ATTACK</span><strong>{combatTimerLabel(enemy.attackTimer, enemy.attackInterval)}</strong></div><ProgressBar value={normalAttackProgress.value} variant="attack" className={`enemy-action-progress ${normalAttackProgress.isResetting ? "is-attack-resetting" : ""}`} ariaLabel={`${enemy.displayName} normal attack progress`} />{abilityCooldown !== undefined && <small className="enemy-ability-cooldown">ABILITY COOLDOWN {abilityCooldown.toFixed(1)}s</small>}</>}
  </button>;
}
