import { useState } from "react";
import { DebugSection } from "../components/DebugSection";
import { DebugMiningTab } from "./DebugMiningTab";
import { DebugBlacksmithingTab } from "./DebugBlacksmithingTab";
import type { DebugTabProps } from "../debugTypes";

export function DebugProfessionsTab({ debug, run }: DebugTabProps) {
  const [miningOpen, setMiningOpen] = useState(false);
  const [blacksmithingOpen, setBlacksmithingOpen] = useState(false);
  return <div className="debug-tab-content debug-column" data-debug-kind="debug-professions-tab">
    <DebugSection title="Mining" subtitle="Mining progression, tool ownership, and the canonical mining runtime." collapsible open={miningOpen} onToggle={() => setMiningOpen((open) => !open)} id="professions-mining">
      <DebugMiningTab debug={debug} run={run} />
    </DebugSection>
    <DebugSection title="Blacksmithing" subtitle="Blacksmithing progression, production, and the canonical forge runtime." collapsible open={blacksmithingOpen} onToggle={() => setBlacksmithingOpen((open) => !open)} id="professions-blacksmithing">
      <DebugBlacksmithingTab debug={debug} run={run} />
    </DebugSection>
  </div>;
}
