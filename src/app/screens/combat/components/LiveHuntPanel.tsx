import { Pause, Play, Swords } from "lucide-react";
import { useMemo } from "react";
import { enemyById } from "../../../../game/data/enemies";
import { getSelectedTargetMatchup } from "../../../../game/combat/combatSelectors";
import { createCombatPreviewContext } from "../../../../game/combat/combatEngine";
import type { EnemyCombatInstance } from "../../../../game/combat/combatTypes";
import type { GameState } from "../../../../game/gameState";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import type { CombatLocationDefinition } from "../../../../game/world/worldTypes";
import { Panel } from "../../../components/Panel";
import { CombatActionWorkspace } from "./CombatActionWorkspace";
import { CombatEventStrip } from "./CombatEventStrip";
import { CombatLog } from "./CombatLog";
import { CombatResourceHud } from "./CombatResourceHud";
import { EnemyRoster } from "./EnemyRoster";
import { PlayerAttackTimeline } from "./PlayerAttackTimeline";

interface LiveHuntPanelProps {
  game: GameState;
  stats: HunterCombatStats;
  location?: CombatLocationDefinition;
  selectedEnemy?: EnemyCombatInstance;
  selectedDefinition?: (typeof enemyById)[keyof typeof enemyById];
  onSelectTarget: (instanceId: string) => void;
  onUseAction: (actionId: string) => void;
  onUsePotion: () => void;
  onStartHunt: () => void;
  onStopHunt: () => void;
}

export function LiveHuntPanel({ game, stats, location, selectedEnemy, selectedDefinition, onSelectTarget, onUseAction, onUsePotion, onStartHunt, onStopHunt }: LiveHuntPanelProps) {
  const combat = game.combat;
  const active = combat.phase === "active" || combat.phase === "recovery";
  const alive = combat.enemies.filter((enemy) => !enemy.defeated).length;
  const actionContext = useMemo(() => createCombatPreviewContext(), []);
  const matchup = getSelectedTargetMatchup(combat, stats, game.progression, selectedEnemy) ?? undefined;
  const statusLabel = combat.phase === "active" ? "LIVE HUNT" : combat.phase === "recovery" ? "GROUP RECOVERY" : combat.phase.toUpperCase();
  return <Panel title="Live hunt" subtitle={active ? `${location?.name ?? "Combat Location"} · Group ${combat.groupNumber} · ${alive} enemies alive` : combat.stopReason ? `Stopped: ${combat.stopReason}` : "Start a Combat Location Hunt to generate a group"} icon={Swords} panelId="liveCombat" screen="combat" className="live-combat-panel">
    <div className={`combat-status ${combat.phase === "active" ? "is-active" : ""}`}><span className="status-pulse" /><span>{statusLabel}</span>{location && <small>{location.name}</small>}<span className="combat-round">GROUP {combat.groupNumber || "—"}</span></div>
    <CombatResourceHud game={game} stats={stats} selectedEnemy={selectedEnemy} />
    <PlayerAttackTimeline phase={combat.phase} timer={combat.playerAttackTimer} interval={combat.playerAttackInterval} selectedEnemy={selectedEnemy} matchup={matchup} stats={stats} />
    {combat.phase === "recovery" && <div className="combat-recovery-banner"><strong>GROUP CLEARED</strong><span>Recovering · next group in {combat.recoveryRemaining.toFixed(1)}s</span></div>}
    <EnemyRoster enemies={combat.enemies} selectedId={combat.selectedEnemyInstanceId} onSelect={onSelectTarget} />
    <CombatActionWorkspace game={game} stats={stats} selectedEnemy={selectedEnemy} selectedDefinition={selectedDefinition} actionContext={actionContext} onUseAction={onUseAction} onUsePotion={onUsePotion} />
    <div className="hunt-control-row"><div><span className="tiny-label">HUNT CONTROL</span><small>{active ? "∞ New groups continue automatically" : "Ready to generate a random group"}</small></div><button type="button" aria-label={active ? "Stop hunt" : "Start hunt"} className="button button-primary fight-button" onClick={active ? onStopHunt : onStartHunt} data-debug-kind="combat-control" data-debug-label={active ? "Stop hunt" : "Start hunt"}>{active ? <><Pause size={15} /> Stop Hunt</> : <><Play size={15} /> Start Hunt</>}</button></div>
    <CombatEventStrip log={combat.log} />
    <CombatLog log={combat.log} />
  </Panel>;
}
