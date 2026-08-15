import { areaById } from "../data/world/areas";
import { combatLocationDefinitions } from "../data/world/combatLocations";
import { continentDefinitions } from "../data/world/continents";
import { enemyById, enemyDefinitions } from "../data/enemies";
import { regionById } from "../data/world/regions";
import type { EnemyDefinition } from "../combat/combatTypes";

export interface CollectionEnemyEntry { id: string; enemy: EnemyDefinition; sourceLocations: string[] }
export interface CollectionGroupNode { id: string; label: string; icon: string; children: CollectionGroupNode[]; enemies: CollectionEnemyEntry[] }

function enemyEntries(locationIds: string[], allSourceLocations: Map<string, string[]>): CollectionEnemyEntry[] {
  const sourceLocations = new Map<string, string[]>();
  for (const locationId of locationIds) {
    const location = combatLocationDefinitions.find((entry) => entry.id === locationId);
    if (!location) continue;
    for (const poolEntry of location.enemyPool) {
      const enemy = enemyById[poolEntry.enemyId];
      if (!enemy) continue;
      sourceLocations.set(enemy.id, [...(sourceLocations.get(enemy.id) ?? []), location.name]);
    }
  }
  return [...sourceLocations.entries()].map(([id]) => ({ id, enemy: enemyById[id], sourceLocations: allSourceLocations.get(id) ?? [] }));
}

export function buildCollectionGrouping(): CollectionGroupNode[] {
  const usedEnemyIds = new Set<string>();
  const allSourceLocations = new Map<string, string[]>();
  for (const location of combatLocationDefinitions) for (const poolEntry of location.enemyPool) if (enemyById[poolEntry.enemyId]) allSourceLocations.set(poolEntry.enemyId, [...new Set([...(allSourceLocations.get(poolEntry.enemyId) ?? []), location.name])]);
  const continents: CollectionGroupNode[] = [];
  for (const continent of continentDefinitions) {
    const regions: CollectionGroupNode[] = [];
    for (const regionId of continent.regionIds) {
      const region = regionById[regionId];
      if (!region) continue;
      const areas: CollectionGroupNode[] = [];
      for (const areaId of region.areaIds) {
        const area = areaById[areaId];
        if (!area) continue;
        const locations: CollectionGroupNode[] = [];
        for (const locationId of area.combatLocationIds) {
          const location = combatLocationDefinitions.find((entry) => entry.id === locationId);
          if (!location) continue;
          const enemies = enemyEntries([location.id], allSourceLocations);
          if (enemies.length) {
            enemies.forEach((entry) => usedEnemyIds.add(entry.id));
            locations.push({ id: `debug.collection.location.${location.id}`, label: location.name, icon: location.presentation.iconKey, children: [], enemies });
          }
        }
        if (locations.length) areas.push({ id: `debug.collection.area.${area.id}`, label: area.name, icon: area.presentation.iconKey, children: locations, enemies: [] });
      }
      if (areas.length) regions.push({ id: `debug.collection.region.${region.id}`, label: region.name, icon: region.presentation.iconKey, children: areas, enemies: [] });
    }
    if (regions.length) continents.push({ id: `debug.collection.continent.${continent.id}`, label: continent.name, icon: continent.presentation.iconKey, children: regions, enemies: [] });
  }
  const unassigned = enemyDefinitions.filter((enemy) => !usedEnemyIds.has(enemy.id)).map((enemy) => ({ id: enemy.id, enemy, sourceLocations: [] }));
  if (unassigned.length) continents.push({ id: "debug.collection.unassigned", label: "Unassigned World Content", icon: "target", children: [], enemies: unassigned });
  return continents;
}

export function collectionNodeCount(node: CollectionGroupNode): number {
  return node.enemies.length + node.children.reduce((sum, child) => sum + collectionNodeCount(child), 0);
}

export function collectionNodeMatchesSearch(node: CollectionGroupNode, query: string): boolean {
  if (!query) return true;
  const self = node.label.toLowerCase().includes(query) || node.id.toLowerCase().includes(query);
  return self || node.enemies.some(({ enemy }) => `${enemy.id} ${enemy.name} ${enemy.family}`.toLowerCase().includes(query)) || node.children.some((child) => collectionNodeMatchesSearch(child, query));
}
