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
  const debug = useGameStore((state) => state.debug);
  if (tab === "overview") return <DebugOverviewTab debug={debug} run={run} selectedEnemy={undefined} setTab={setTab} />;
  if (tab === "player") return <DebugPlayerTab debug={debug} run={run} />;
  if (tab === "progression") return <DebugProgressionTab debug={debug} run={run} />;
  if (tab === "items") return <DebugItemsTab debug={debug} run={run} />;
  if (tab === "collection") return <DebugCollectionTab debug={debug} run={run} onConfirm={() => setConfirmCollection(true)} />;
  if (tab === "combat") return <DebugCombatTab debug={debug} run={run} />;
  if (tab === "spellbook") return <DebugSpellbookTab debug={debug} run={run} />;
  if (tab === "state") return <DebugStateTab debug={debug} run={run} />;
  if (tab === "scenarios") return <DebugScenariosTab debug={debug} run={run} />;
  if (tab === "stats") return <DebugStatsTab debug={debug} run={run} />;
  if (tab === "validation") return <DebugValidationTab debug={debug} run={run} />;
  if (tab === "encounter") return <DebugEncounterTab debug={debug} run={run} />;
  return <DebugSaveToolsTab debug={debug} run={run} />;
}
