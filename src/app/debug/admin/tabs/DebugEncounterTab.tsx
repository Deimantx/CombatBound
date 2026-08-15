import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { areaById } from "../../../../game/data/world/areas";
import { continentDefinitions } from "../../../../game/data/world/continents";
import { combatLocationDefinitions } from "../../../../game/data/world/combatLocations";
import { regionById } from "../../../../game/data/world/regions";
import { buildEnemyDefinitionTooltip } from "../../../../game/presentation/tooltipBuilders";
import { buildWorldEnemyCatalogue, worldGroupLevel } from "../../../../game/presentation/worldEnemyCatalogue";
import { collectionNodeCount, collectionNodeMatchesSearch, type CollectionGroupNode } from "../../../../game/presentation/collectionGrouping";
import { useGameStore } from "../../../../state/gameStore";
import { DisclosureChevron } from "../../../components/DisclosureChevron";
import { DebugButton } from "../components/DebugButton";
import { DebugCatalogueIdentity } from "../components/DebugCatalogueIdentity";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

const ENCOUNTER_ENEMY_CAP = 12;

export function DebugEncounterTab({ debug, run }: DebugTabProps) {
  const nodes = useMemo(() => buildWorldEnemyCatalogue(), []);
  const selectedLocation = useGameStore((state) => state.selectedCombatLocationId);
  const [locationId, setLocationId] = useState(selectedLocation);
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [draftOpen, setDraftOpen] = useState(true);
  useEffect(() => { setLocationId(selectedLocation); }, [selectedLocation]);
  useEffect(() => { const path = findNodePath(nodes, locationId); if (path.length) setExpanded((current) => new Set([...current, ...path])); }, [locationId, nodes]);
  const query = search.trim().toLowerCase();
  const selected = Object.entries(quantities).filter(([, quantity]) => quantity > 0);
  const total = selected.reduce((sum, [, quantity]) => sum + quantity, 0);
  const setQuantity = (enemyId: string, next: number) => setQuantities((current) => { const currentTotal = Object.entries(current).reduce((sum, [id, value]) => sum + (id === enemyId ? 0 : value), 0); return { ...current, [enemyId]: Math.max(0, Math.min(ENCOUNTER_ENEMY_CAP - currentTotal, Math.floor(next))) }; });
  return <div className="debug-tab-content debug-column">
    <DebugSection title="Encounter Builder" subtitle="Build a temporary mixed group from the canonical Continent → Region → Area → Combat Location → Enemy hierarchy."><div className="debug-encounter-toolbar"><label>LOCATION <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>{buildLocationOptions()}</select></label><input className="debug-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search enemies, zones or family..." aria-label="Search encounter enemies" /><DebugButton action="start-encounter" onClick={() => run(`Started encounter with ${selected.length} enemy types.`, () => debug.startEncounter(locationId, selected.flatMap(([id, quantity]) => Array.from({ length: quantity }, () => id))))}>START ENCOUNTER</DebugButton></div><p className="debug-note">Draft: {total} / {ENCOUNTER_ENEMY_CAP} enemy instances. Source zones organize the catalogue only; mixed encounters remain allowed.</p></DebugSection>
    <DebugSection title="CURRENT DRAFT" collapsible open={draftOpen} onToggle={() => setDraftOpen((value) => !value)}><div className="debug-draft-list">{selected.length === 0 ? <span className="debug-note">No enemies selected.</span> : selected.map(([id, quantity]) => <div key={id}><span>{labelForEnemy(id)}</span><strong>×{quantity}</strong></div>)}<button type="button" onClick={() => setQuantities({})}>CLEAR</button></div></DebugSection>
    <DebugSection title="WORLD ENCOUNTERS"><div className="debug-catalogue debug-catalogue-tree">{nodes.filter((node) => collectionNodeMatchesSearch(node, query)).map((node) => <EncounterGroup key={node.id} node={node} depth={0} query={query} expanded={expanded} quantities={quantities} onToggle={(id) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} onQuantity={setQuantity} />)}</div></DebugSection>
  </div>;
}

function EncounterGroup({ node, depth, query, expanded, quantities, onToggle, onQuantity }: { node: CollectionGroupNode; depth: number; query: string; expanded: Set<string>; quantities: Record<string, number>; onToggle: (id: string) => void; onQuantity: (id: string, value: number) => void }) {
  const open = Boolean(query) || expanded.has(node.id);
  const level = worldGroupLevel(node);
  const bodyId = `${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}-encounter-body`;
  return <div className="debug-encounter-group" style={{ "--debug-depth": depth } as CSSProperties} data-debug-kind="debug-encounter-group" data-debug-group-level={level} data-debug-group-id={node.id} data-debug-count={collectionNodeCount(node)}><button type="button" className="debug-catalogue-group-header" onClick={() => onToggle(node.id)} aria-expanded={open} aria-controls={bodyId}><DisclosureChevron open={open} /><strong>{node.label}</strong><span className="debug-catalogue-group-count">{collectionNodeCount(node)}</span></button>{open && <div id={bodyId} className="debug-encounter-group-body">{node.children.filter((child) => collectionNodeMatchesSearch(child, query)).map((child) => <EncounterGroup key={child.id} node={child} depth={depth + 1} query={query} expanded={expanded} quantities={quantities} onToggle={onToggle} onQuantity={onQuantity} />)}{node.enemies.filter(({ enemy }) => !query || `${enemy.id} ${enemy.name} ${enemy.family} ${node.label}`.toLowerCase().includes(query)).map((entry) => <EncounterEnemy key={entry.id} entry={entry} quantity={quantities[entry.id] ?? 0} onQuantity={onQuantity} />)}</div>}</div>;
}

function EncounterEnemy({ entry, quantity, onQuantity }: { entry: CollectionGroupNode["enemies"][number]; quantity: number; onQuantity: (id: string, value: number) => void }) {
  return <div className="debug-encounter-row" data-debug-kind="debug-encounter-entry" data-debug-enemy-id={entry.id} data-debug-quantity={quantity}><DebugCatalogueIdentity tooltip={buildEnemyDefinitionTooltip(entry.enemy)} icon={entry.enemy.icon} kind="debug-encounter-identity" targetId={entry.enemy.id} label={entry.enemy.name}><strong>{entry.enemy.name}</strong><small>{entry.enemy.id} · {entry.enemy.family} · SOURCE: {entry.sourceLocations.join(", ") || "Unassigned"}</small></DebugCatalogueIdentity><div className="debug-quantity-stepper"><button type="button" onClick={() => onQuantity(entry.id, quantity - 1)} aria-label={`Decrease ${entry.enemy.name}`}>−</button><input type="number" min="0" max={ENCOUNTER_ENEMY_CAP} value={quantity} onChange={(event) => onQuantity(entry.id, Number(event.target.value) || 0)} aria-label={`${entry.enemy.name} quantity`} /><button type="button" onClick={() => onQuantity(entry.id, quantity + 1)} aria-label={`Increase ${entry.enemy.name}`}>+</button></div></div>;
}

function findNodePath(nodes: CollectionGroupNode[], locationId: string): string[] { for (const node of nodes) { if (node.id.endsWith(`.${locationId}`)) return [node.id]; const childPath = findNodePath(node.children, locationId); if (childPath.length) return [node.id, ...childPath]; } return []; }
function labelForEnemy(id: string) { return id.replace(/^enemy\./, "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function buildLocationOptions() { return continentDefinitions.flatMap((continent) => continent.regionIds.flatMap((regionId) => { const region = regionById[regionId]; return region.areaIds.flatMap((areaId) => { const area = areaById[areaId]; return area.combatLocationIds.map((locationId) => { const location = combatLocationDefinitions.find((entry) => entry.id === locationId); return location ? <option key={location.id} value={location.id}>{continent.name} / {region.name} / {area.name} / {location.name}</option> : null; }); }); })); }
