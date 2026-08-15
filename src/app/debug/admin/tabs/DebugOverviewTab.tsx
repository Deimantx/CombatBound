import { Crosshair, Package } from "lucide-react";
import { itemDefinitions } from "../../../../game/data/items";
import { enemyDefinitions } from "../../../../game/data/enemies";
import { perkById } from "../../../../game/data/proficiencyPerks";
import { getMasteryLevelProgress, getPerkPointSummary, masteryLevelForXp } from "../../../../game/progression/masteryProgression";
import { DebugButton } from "../components/DebugButton";
import { DebugSection } from "../components/DebugSection";
import { DebugSummaryCard } from "../components/DebugSummaryCard";
import type { DebugTab, DebugTabProps } from "../debugTypes";
import { DebugSimulationControls } from "../../devtools/dock/DebugSimulationControls";
import { useGameStore } from "../../../../state/gameStore";

export function DebugOverviewTab({ debug, run, setTab }: DebugTabProps & { setTab: (tab: DebugTab) => void; selectedEnemy?: string }) {
  const game = useGameStore((state) => state.game);
  const selectedEnemy = game.combat.enemies.find((enemy) => enemy.instanceId === game.combat.selectedEnemyInstanceId)?.displayName;
  const masteryLevel = masteryLevelForXp(game.progression.masteryXp);
  const progress = getMasteryLevelProgress(game.progression.masteryXp);
  const perkPoints = getPerkPointSummary(game.progression, perkById);
  return <div className="debug-tab-content">
    <div className="debug-intro"><div><span className="eyebrow">COMBATBOUND DEVELOPMENT BUILD</span><h3>Set an exact state, test a mechanic, repeat.</h3><p>All controls are development-only. Core equipment, progression, collection, effect, reward, and defeat rules remain shared with normal gameplay.</p></div><span className="debug-build-chip">DEV ONLY</span></div>
    <div className="debug-summary-grid">
      <DebugSummaryCard label="Mastery" value={`Lv ${masteryLevel}`} detail={`${game.progression.masteryXp.toLocaleString()} XP`} />
      <DebugSummaryCard label="Perk points" value={perkPoints.available} detail={`${perkPoints.masteryEarned} mastery + ${perkPoints.bonus} bonus - ${perkPoints.spent} spent`} />
      <DebugSummaryCard label="Combat" value={game.combat.phase.toUpperCase()} detail={selectedEnemy ?? "No selected enemy"} />
      <DebugSummaryCard label="Collection" value={`${game.collection.discoveredItems.length}/${itemDefinitions.length}`} detail={`${Object.values(game.collection.targets).filter((entry) => entry.discovered).length}/${enemyDefinitions.length} targets`} />
      <DebugSummaryCard label="HP" value={`${Math.round(game.combat.playerHp)} / ${Math.round(game.combat.maxPlayerHp)}`} />
      <DebugSummaryCard label="Resources" value={`${Math.round(game.combat.stamina)} / ${Math.round(game.combat.mana)}`} detail="Stamina / Mana" />
    </div>
    <DebugSection title="Quick actions" subtitle="Frequently used test setups."><div className="debug-button-grid">
      <DebugButton action="fill-all-resources" onClick={() => run("Filled HP, Stamina, and Mana.", debug.fillAllResources)}>FILL ALL RESOURCES</DebugButton>
      <DebugButton action="reset-player-cooldowns" onClick={() => run("Reset all player cooldowns.", debug.resetPlayerCooldowns)}>RESET COOLDOWNS</DebugButton>
      <DebugButton action="grant-all-equipment" onClick={() => run("Granted all prototype equipment x1.", () => debug.grantAllEquipment(1))}>GRANT ALL TEST GEAR</DebugButton>
      <DebugButton action="set-mastery-level" onClick={() => run("Set Mastery to level 10.", () => debug.setMasteryLevel(10))}>SET MASTERY LV 10</DebugButton>
      <DebugButton action="discover-all-collection" onClick={() => run("Discovered all items and targets.", () => { debug.discoverAllItems(); debug.discoverAllTargets(); })}>DISCOVER ALL COLLECTION</DebugButton>
      <DebugButton action="kill-current-group" onClick={() => run("Resolved the current enemy group through canonical defeat handling.", debug.killCurrentGroup)}>KILL CURRENT GROUP</DebugButton>
    </div></DebugSection>
    <DebugSection title="Simulation" subtitle="Shared clock controls used by the in-game dock."><DebugSimulationControls /></DebugSection>
    <div className="debug-shortcuts"><button type="button" onClick={() => setTab("items")}><Package size={14} /> Items <span>Grant and normalize quantities</span></button><button type="button" onClick={() => setTab("progression")}>Progression <span>Mastery, proficiency, and perk setup</span></button><button type="button" onClick={() => setTab("combat")}><Crosshair size={14} /> Combat <span>Effects, resources, casts, and defeat</span></button></div>
    <p className="debug-note">Automation: <strong>{game.combatAutomation.enabled ? "ON" : "OFF"}</strong> · Location: <strong>{game.combat.combatLocationId ?? "none"}</strong> · Group: <strong>{game.combat.groupNumber}</strong> · XP to next Mastery: <strong>{progress.xpToNextLevel.toLocaleString()}</strong></p>
  </div>;
}
