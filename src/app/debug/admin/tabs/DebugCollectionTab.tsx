import { useMemo, useState } from "react";
import { itemDefinitions } from "../../../../game/data/items";
import { enemyDefinitions } from "../../../../game/data/enemies";
import { buildCollectionGrouping, collectionNodeCount, collectionNodeMatchesSearch, type CollectionGroupNode } from "../../../../game/presentation/collectionGrouping";
import { buildEnemyDefinitionTooltip } from "../../../../game/presentation/tooltipBuilders";
import { SearchField } from "../../../components/SearchField";
import { DebugButton } from "../components/DebugButton";
import { DebugCatalogueGroup } from "../components/DebugCatalogueGroup";
import { DebugCatalogueIdentity } from "../components/DebugCatalogueIdentity";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

export function DebugCollectionTab({ game, run, debug, onConfirm }: DebugTabProps & { onConfirm: () => void }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["debug.collection.continent.continent.greenvale", "debug.collection.region.region.northwood"]));
  const normalized = query.trim().toLowerCase();
  const nodes = useMemo(() => buildCollectionGrouping(), []);
  const itemCount = game.collection.discoveredItems.length;
  const targetCount = Object.values(game.collection.targets).filter((target) => target.discovered).length;
  return <div className="debug-tab-content debug-column"><DebugSection title="Discovery" subtitle={`${itemCount}/${itemDefinitions.length} items - ${targetCount}/${enemyDefinitions.length} targets`}><div className="debug-button-grid"><DebugButton action="discover-all-items" onClick={() => run("Discovered all items without granting quantities.", debug.discoverAllItems)}>DISCOVER ALL ITEMS</DebugButton><DebugButton action="discover-all-targets" onClick={() => run("Discovered all enemy targets.", debug.discoverAllTargets)}>DISCOVER ALL TARGETS</DebugButton><DebugButton action="discover-everything" onClick={() => run("Discovered all items and targets.", () => { debug.discoverAllItems(); debug.discoverAllTargets(); })}>DISCOVER EVERYTHING</DebugButton><DebugButton action="set-target-defeats" onClick={() => run("Set all target defeat counts to 1.", debug.setAllTargetDefeatsToOne)}>SET TARGET DEFEATS TO 1</DebugButton><DebugButton action="reset-collection" danger onClick={onConfirm}>RESET COLLECTION</DebugButton></div></DebugSection><DebugSection title="Target progress" subtitle="Canonical Continent - Region - Area - Combat Location - Enemy hierarchy." actions={<SearchField value={query} onChange={setQuery} placeholder="Search enemies or world..." label="Search collection targets" debugKind="debug-collection-search" />}><div className="debug-catalogue debug-catalogue-tree">{nodes.filter((node) => collectionNodeMatchesSearch(node, normalized)).map((node) => <CollectionNode key={node.id} node={node} depth={0} query={normalized} expanded={expanded} onToggle={(id) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} game={game} />)}</div></DebugSection></div>;
}

function CollectionNode({ node, depth, query, expanded, onToggle, game }: { node: CollectionGroupNode; depth: number; query: string; expanded: Set<string>; onToggle: (id: string) => void; game: DebugTabProps["game"] }) {
  const open = query ? true : expanded.has(node.id);
  return <DebugCatalogueGroup id={node.id} label={node.label} count={collectionNodeCount(node)} icon={node.icon} depth={depth} expanded={open} onToggle={() => onToggle(node.id)} debugGroupType="collection">{node.children.filter((child) => collectionNodeMatchesSearch(child, query)).map((child) => <CollectionNode key={child.id} node={child} depth={depth + 1} query={query} expanded={expanded} onToggle={onToggle} game={game} />)}{node.enemies.filter(({ enemy }) => !query || `${enemy.id} ${enemy.name} ${enemy.family}`.toLowerCase().includes(query)).map(({ enemy, sourceLocations }) => <CollectionEnemyRow key={`${node.id}.${enemy.id}`} enemy={enemy} sourceLocations={sourceLocations} target={game.collection.targets[enemy.id]} />)}</DebugCatalogueGroup>;
}

function CollectionEnemyRow({ enemy, sourceLocations, target }: { enemy: (typeof enemyDefinitions)[number]; sourceLocations: string[]; target?: DebugTabProps["game"]["collection"]["targets"][string] }) {
  return <div className="debug-catalogue-row" data-debug-kind="debug-target" data-debug-target-id={enemy.id}><DebugCatalogueIdentity tooltip={buildEnemyDefinitionTooltip(enemy, { defeats: target?.defeats ?? 0, sourceLocations })} icon={enemy.icon} variant={enemy.accent} kind="debug-target-identity" targetId={enemy.id} label={enemy.name}><strong>{enemy.name}</strong><small>{enemy.id} - {enemy.family}</small></DebugCatalogueIdentity><span className={target?.discovered ? "debug-badge is-green" : "debug-badge"}>{target?.discovered ? "DISCOVERED" : "HIDDEN"}</span><span className="debug-count">{target?.defeats ?? 0} defeats</span></div>;
}
