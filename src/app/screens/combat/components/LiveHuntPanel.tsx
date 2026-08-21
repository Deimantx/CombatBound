import { Pause, Play, Swords, Timer } from "lucide-react";
import { useMemo } from "react";
import { enemyById } from "../../../../game/data/enemies";
import { enemyCombatAbilityById } from "../../../../game/data/enemyCombatAbilities";
import { getSelectedTargetMatchup } from "../../../../game/combat/combatSelectors";
import { createCombatPreviewContext } from "../../../../game/combat/combatEngine";
import type { EnemyCombatInstance } from "../../../../game/combat/combatTypes";
import type { GameState } from "../../../../game/gameState";
import type { HunterCombatStats } from "../../../../game/equipment/derivedStats";
import type { CombatLocationDefinition } from "../../../../game/world/worldTypes";
import { Panel } from "../../../components/Panel";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { ProgressBar } from "../../../components/ProgressBar";
import { CombatActionWorkspace } from "./CombatActionWorkspace";
import { CombatEventStrip } from "./CombatEventStrip";
import { CombatLog } from "./CombatLog";
import { CombatResourceHud } from "./CombatResourceHud";
import { PlayerAttackTimeline } from "./PlayerAttackTimeline";

interface LiveHuntPanelProps {
  game: GameState;
  stats: HunterCombatStats;
  location?: CombatLocationDefinition;
  selectedEnemy?: EnemyCombatInstance;
  selectedDefinition?: (typeof enemyById)[keyof typeof enemyById];
  onUseAction: (actionId: string) => void;
  onUsePotion: () => void;
  onStartHunt: () => void;
  onStopHunt: () => void;
}

export function LiveHuntPanel({ game, stats, location, selectedEnemy, selectedDefinition, onUseAction, onUsePotion, onStartHunt, onStopHunt }: LiveHuntPanelProps) {
  const combat = game.combat;
  const active = combat.phase === "active" || combat.phase === "recovery";
  const actionContext = useMemo(() => createCombatPreviewContext(), []);
  const matchup = getSelectedTargetMatchup(combat, stats, game.progression, selectedEnemy) ?? undefined;
  const statusLabel = combat.phase === "active" ? "LIVE COMBAT" : combat.phase === "recovery" ? "TARGET RECOVERY" : combat.phase.toUpperCase();
  return <Panel title="Live hunt" subtitle={active ? `${location?.name ?? "Combat Location"} - ${selectedEnemy?.displayName ?? "No target"}` : combat.stopReason ? `Stopped: ${combat.stopReason}` : "Select a target from the Combat world"} icon={Swords} panelId="liveCombat" screen="combat" className="live-combat-panel">
    <div className={`combat-status ${combat.phase === "active" ? "is-active" : ""}`}><span className="status-pulse" /><span>{statusLabel}</span>{location && <small>{location.name}</small>}<span className="combat-round">TARGET {selectedEnemy?.displayName ?? "-"}</span></div>
    <CombatResourceHud game={game} stats={stats} selectedEnemy={selectedEnemy} />
    <PlayerAttackTimeline phase={combat.phase} timer={combat.playerAttackTimer} interval={combat.playerAttackInterval} selectedEnemy={selectedEnemy} matchup={matchup} stats={stats} />
    {combat.phase === "recovery" && <div className="combat-recovery-banner"><strong>TARGET DEFEATED</strong><span>Recovering - next encounter in {combat.recoveryRemaining.toFixed(1)}s</span></div>}
    {selectedEnemy && selectedDefinition ? <LiveEnemyStatus enemy={selectedEnemy} definition={selectedDefinition} /> : <div className="combat-empty-state"><Swords size={20} /><strong>NO ACTIVE TARGET</strong><span>Select an available target in the Combat world.</span></div>}
    <CombatActionWorkspace game={game} stats={stats} selectedEnemy={selectedEnemy} selectedDefinition={selectedDefinition} actionContext={actionContext} onUseAction={onUseAction} onUsePotion={onUsePotion} />
    <div className="hunt-control-row"><div><span className="tiny-label">HUNT CONTROL</span><small>{active ? "The selected target respawns after recovery" : "Choose a target in the Combat world"}</small></div><button type="button" aria-label={active ? "Stop hunt" : "Start hunt"} className="button button-primary fight-button" onClick={active ? onStopHunt : onStartHunt} data-debug-kind="combat-control" data-debug-label={active ? "Stop hunt" : "Start hunt"}>{active ? <><Pause size={15} /> Stop Hunt</> : <><Play size={15} /> Fight Target</>}</button></div>
    <CombatEventStrip log={combat.log} />
    <CombatLog log={combat.log} />
  </Panel>;
}

function LiveEnemyStatus({ enemy, definition }: { enemy: EnemyCombatInstance; definition: NonNullable<(typeof enemyById)[keyof typeof enemyById]> }) {
  const preparedRuntime = enemy.preparedAbility;
  const prepared = preparedRuntime ? enemyCombatAbilityById[preparedRuntime.abilityId] : undefined;
  const cooldown = Object.values(enemy.abilityCooldowns).find((remaining) => remaining > 0);
  return <div className="single-enemy-status" data-debug-kind="live-enemy" data-debug-enemy-id={enemy.enemyId}>
    <div className="enemy-card-top"><PlaceholderArt icon={definition.icon} size="small" variant={definition.accent} /><span><strong>{enemy.displayName}</strong><small>{Math.floor(enemy.currentHealth)} / {enemy.maxHealth} HP</small></span><em className="target-tag">TARGETED</em></div>
    <ProgressBar value={enemy.currentHealth / enemy.maxHealth * 100} variant="health" className="enemy-health-bar" ariaLabel={`${enemy.displayName} health`} />
    {!enemy.defeated && <><div className="enemy-card-timer"><span><Timer size={11} /> NORMAL ATTACK</span><strong>{enemy.attackTimer.toFixed(1)}s</strong></div><ProgressBar value={Math.max(0, Math.min(1, 1 - enemy.attackTimer / enemy.attackInterval)) * 100} variant="attack" ariaLabel={`${enemy.displayName} normal attack progress`} />{prepared && preparedRuntime ? <div className="enemy-preparation"><span className="tiny-label">PREPARING {prepared.name.toUpperCase()}</span><ProgressBar value={(1 - preparedRuntime.remainingSeconds / Math.max(.001, preparedRuntime.totalSeconds)) * 100} variant="attack" ariaLabel={`${prepared.name} preparation progress`} /><small>Resolves in {preparedRuntime.remainingSeconds.toFixed(1)}s</small></div> : cooldown !== undefined && <small className="enemy-ability-cooldown">ABILITY COOLDOWN {cooldown.toFixed(1)}s</small>}</>}
  </div>;
}
