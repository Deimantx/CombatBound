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
  const executeAction = useGameStore((state) => state.executeAction);
  const usePotion = useGameStore((state) => state.usePotion);
  const overviewTab = useGameStore((state) => state.combatOverviewTab);
  const setOverviewTab = useGameStore((state) => state.setCombatOverviewTab);
  const combat = game.combat;
  const location = combat.combatLocationId
    ? combatLocationById[combat.combatLocationId]
    : undefined;
  const selectedEnemy = combat.enemy ?? undefined;
  const selectedDefinition = selectedEnemy
    ? enemyById[selectedEnemy.enemyId]
    : undefined;
  const stats = calculateHunterCombatStats(
    game.equipment,
    game.inventory,
    game.progression,
  );

  return (
    <div className="screen combat-screen" data-debug-screen="combat">
      <ScreenHeading screen="combat" />
      <CombatWorldBrowser />
      <div className="combat-main-grid">
        <HunterCombatPanel
          game={game}
          stats={stats}
        />
        <LiveHuntPanel
          game={game}
          stats={stats}
          location={location}
          selectedEnemy={selectedEnemy}
          selectedDefinition={selectedDefinition}
          onUseAction={executeAction}
          onUsePotion={usePotion}
          onStartHunt={startHunt}
          onStopHunt={stopHunt}
        />
        <SelectedEnemyPanel game={game} stats={stats} selectedEnemy={selectedEnemy} />
      </div>
      <HuntSessionOverview
        game={game}
        tab={overviewTab}
        onTabChange={setOverviewTab}
      />
    </div>
  );
}
