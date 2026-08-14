import { useGameStore } from "../../../state/gameStore";
import { calculateHunterCombatStats } from "../../../game/equipment/derivedStats";
import { combatLocationById } from "../../../game/data/world/combatLocations";
import { enemyById } from "../../../game/data/enemies";
import { ScreenHeading } from "../../shell/ScreenHeading";
import { CombatWorldBrowser } from "./CombatWorldBrowser";
import { HunterCombatPanel } from "./components/HunterCombatPanel";
import { HuntSessionOverview } from "./components/HuntSessionOverview";
import { LiveHuntPanel } from "./components/LiveHuntPanel";
import { SelectedEnemyPanel } from "./components/SelectedEnemyPanel";

export function CombatScreen() {
  const game = useGameStore((state) => state.game);
  const startHunt = useGameStore((state) => state.startHunt);
  const stopHunt = useGameStore((state) => state.stopHunt);
  const selectTarget = useGameStore((state) => state.selectTarget);
  const setStance = useGameStore((state) => state.setStance);
  const toggleTechnique = useGameStore((state) => state.toggleTechnique);
  const castSpell = useGameStore((state) => state.castSpell);
  const executeAction = useGameStore((state) => state.executeAction);
  const toggleAutomation = useGameStore((state) => state.toggleAutomation);
  const toggleAutomationRule = useGameStore(
    (state) => state.toggleAutomationRule,
  );
  const usePotion = useGameStore((state) => state.usePotion);
  const overviewTab = useGameStore((state) => state.combatOverviewTab);
  const setOverviewTab = useGameStore((state) => state.setCombatOverviewTab);
  const combat = game.combat;
  const location = combat.combatLocationId
    ? combatLocationById[combat.combatLocationId]
    : undefined;
  const selectedEnemy =
    combat.enemies.find(
      (enemy) => enemy.instanceId === combat.selectedEnemyInstanceId,
    ) ?? combat.enemies.find((enemy) => !enemy.defeated);
  const selectedDefinition = selectedEnemy
    ? enemyById[selectedEnemy.enemyId]
    : enemyById["enemy.grey-wolf"];
  const stats = calculateHunterCombatStats(
    game.equipment,
    game.progression,
    combat.stance,
    combat.techniques,
  );

  return (
    <div className="screen combat-screen" data-debug-screen="combat">
      <ScreenHeading screen="combat" />
      <CombatWorldBrowser />
      <div className="combat-main-grid">
        <HunterCombatPanel
          game={game}
          stats={stats}
          onSetStance={setStance}
          onToggleTechnique={toggleTechnique}
        />
        <LiveHuntPanel
          game={game}
          stats={stats}
          location={location}
          selectedEnemy={selectedEnemy}
          selectedDefinition={selectedDefinition}
          onSelectTarget={selectTarget}
          onCastSpell={castSpell}
          onUseAction={executeAction}
          onUsePotion={usePotion}
          onToggleAutomation={toggleAutomation}
          onToggleAutomationRule={toggleAutomationRule}
          onStartHunt={startHunt}
          onStopHunt={stopHunt}
        />
        <SelectedEnemyPanel game={game} selectedEnemy={selectedEnemy} />
      </div>
      <HuntSessionOverview
        game={game}
        tab={overviewTab}
        onTabChange={setOverviewTab}
      />
    </div>
  );
}
