import { buildCollectionGrouping, type CollectionGroupNode } from "./collectionGrouping";

export interface WorldEnemyEntry {
  enemyId: string;
  enemy: CollectionGroupNode["enemies"][number]["enemy"];
  sourceLocationNames: string[];
}

/** Canonical world hierarchy shared by Collection and Debug Encounter. */
export function buildWorldEnemyCatalogue() {
  return buildCollectionGrouping();
}

export function worldGroupLevel(node: CollectionGroupNode) {
  if (node.id.includes(".continent.")) return "continent";
  if (node.id.includes(".region.")) return "region";
  if (node.id.includes(".area.")) return "area";
  if (node.id.includes(".location.")) return "combat-location";
  return "unassigned";
}

