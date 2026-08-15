import { itemById, itemDefinitions } from "../../../../game/data/items";
import { effectDefinitions } from "../../../../game/data/effects";
import { perkById } from "../../../../game/data/proficiencyPerks";
import { proficiencyDefinitions } from "../../../../game/data/proficiencies";
import { weaponSkillDefinitions } from "../../../../game/data/weaponSkills";
import { CURRENT_SAVE_VERSION } from "../../../../game/persistence/saveGame";
import { DebugSection } from "../components/DebugSection";
import { DebugSummaryCard } from "../components/DebugSummaryCard";
import type { DebugTabProps } from "../debugTypes";

export function DebugStateTab({ game }: DebugTabProps) {
  return <div className="debug-tab-content debug-column"><DebugSection title="Developer state" subtitle="Read-only architecture and canonical catalogue coverage."><div className="debug-state-grid"><DebugSummaryCard label="Save version" value={`V${CURRENT_SAVE_VERSION}`} detail="No debug schema fields" /><DebugSummaryCard label="Items" value={itemDefinitions.length} detail={`${Object.keys(itemById).length} indexed`} /><DebugSummaryCard label="Effects" value={effectDefinitions.length} /><DebugSummaryCard label="Proficiencies" value={proficiencyDefinitions.length} /><DebugSummaryCard label="Perks" value={Object.keys(perkById).length} /><DebugSummaryCard label="Weapon skills" value={weaponSkillDefinitions.length} /></div><p className="debug-note">Debug UI state lives only in this DEV panel. Permanent debug actions use the normal persistence path; live combat actions remain runtime-only.</p></DebugSection></div>;
}
