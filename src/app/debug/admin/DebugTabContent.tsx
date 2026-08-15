import { useGameStore } from "../../../state/gameStore";
import { DebugCollectionTab } from "./tabs/DebugCollectionTab";
import { DebugCombatTab } from "./tabs/DebugCombatTab";
import { DebugEncounterTab } from "./tabs/DebugEncounterTab";
import { DebugItemsTab } from "./tabs/DebugItemsTab";
import { DebugOverviewTab } from "./tabs/DebugOverviewTab";
import { DebugPlayerTab } from "./tabs/DebugPlayerTab";
import { DebugProgressionTab } from "./tabs/DebugProgressionTab";
import { DebugSaveToolsTab } from "./tabs/DebugSaveToolsTab";
import { DebugScenariosTab } from "./tabs/DebugScenariosTab";
import { DebugSpellbookTab } from "./tabs/DebugSpellbookTab";
import { DebugStateTab } from "./tabs/DebugStateTab";
import { DebugStatsTab } from "./tabs/DebugStatsTab";
import { DebugValidationTab } from "./tabs/DebugValidationTab";
import type { DebugRun, DebugTab } from "./debugTypes";

export function DebugTabContent({ tab, run, setTab, setConfirmCollection }: { tab: DebugTab; run: DebugRun; setTab: (tab: DebugTab) => void; setConfirmCollection: (open: boolean) => void }) {
  const game = useGameStore((state) => state.game);
  const debug = useGameStore((state) => state.debug);
  const selectedEnemy = game.combat.enemies.find((enemy) => enemy.instanceId === game.combat.selectedEnemyInstanceId)?.displayName;
  if (tab === "overview") return <DebugOverviewTab game={game} debug={debug} run={run} selectedEnemy={selectedEnemy} setTab={setTab} />;
  if (tab === "player") return <DebugPlayerTab game={game} debug={debug} run={run} />;
  if (tab === "progression") return <DebugProgressionTab game={game} debug={debug} run={run} />;
  if (tab === "items") return <DebugItemsTab game={game} debug={debug} run={run} />;
  if (tab === "collection") return <DebugCollectionTab game={game} debug={debug} run={run} onConfirm={() => setConfirmCollection(true)} />;
  if (tab === "combat") return <DebugCombatTab game={game} debug={debug} run={run} selectedEnemy={selectedEnemy} />;
  if (tab === "spellbook") return <DebugSpellbookTab game={game} debug={debug} run={run} />;
  if (tab === "state") return <DebugStateTab game={game} debug={debug} run={run} />;
  if (tab === "scenarios") return <DebugScenariosTab game={game} debug={debug} run={run} />;
  if (tab === "stats") return <DebugStatsTab game={game} debug={debug} run={run} />;
  if (tab === "validation") return <DebugValidationTab game={game} debug={debug} run={run} />;
  if (tab === "encounter") return <DebugEncounterTab game={game} debug={debug} run={run} />;
  return <DebugSaveToolsTab game={game} debug={debug} run={run} />;
}
