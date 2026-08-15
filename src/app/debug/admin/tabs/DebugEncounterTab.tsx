import { useMemo, useState } from "react";
import { enemyDefinitions } from "../../../../game/data/enemies";
import { combatLocationDefinitions } from "../../../../game/data/world/combatLocations";
import { buildEnemyDefinitionTooltip } from "../../../../game/presentation/tooltipBuilders";
import { DebugButton } from "../components/DebugButton";
import { DebugCatalogueIdentity } from "../components/DebugCatalogueIdentity";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

export function DebugEncounterTab({ debug, run }: DebugTabProps) {
  const [locationId, setLocationId] = useState(combatLocationDefinitions[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const filtered = useMemo(() => enemyDefinitions.filter((enemy) => `${enemy.id} ${enemy.name}`.toLowerCase().includes(search.trim().toLowerCase())), [search]);
  const selected = Object.entries(quantities).filter(([, quantity]) => quantity > 0);
  return <div className="debug-tab-content debug-column"><DebugSection title="Encounter Builder" subtitle="Build a temporary mixed group from canonical enemy definitions; static world data is never mutated."><div className="debug-inline-control"><label>LOCATION <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>{combatLocationDefinitions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search enemies..." aria-label="Search encounter enemies" /><DebugButton action="start-encounter" onClick={() => run(`Started encounter with ${selected.length} enemy types.`, () => debug.startEncounter(locationId, selected.flatMap(([id, quantity]) => Array.from({ length: quantity }, () => id))))}>START ENCOUNTER</DebugButton></div><p className="debug-note">Draft: {selected.reduce((sum, [, quantity]) => sum + quantity, 0)} enemy instances. Combat starts immediately in the selected location.</p></DebugSection><DebugSection title="Enemy Entries"><div className="debug-encounter-list">{filtered.map((enemy) => <div key={enemy.id} className="debug-encounter-row" data-debug-kind="debug-encounter-entry" data-debug-enemy-id={enemy.id} data-debug-quantity={quantities[enemy.id] ?? 0}><DebugCatalogueIdentity tooltip={buildEnemyDefinitionTooltip(enemy)} icon={enemy.icon} kind="debug-encounter-identity" targetId={enemy.id} label={enemy.name}><strong>{enemy.name}</strong><small>{enemy.id}</small></DebugCatalogueIdentity><input type="number" min="0" max="12" value={quantities[enemy.id] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [enemy.id]: Math.max(0, Math.min(12, Math.floor(Number(event.target.value) || 0))) }))} aria-label={`${enemy.name} quantity`} /></div>)}</div></DebugSection></div>;
}
