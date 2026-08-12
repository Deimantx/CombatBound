export interface TargetCollectionProgress { enemyId: string; discovered: boolean; defeats: number; firstDefeatedAt?: number }
export interface CollectionState { discoveredItems: string[]; targets: Record<string, TargetCollectionProgress> }
export function createInitialCollection(enemyIds: string[]): CollectionState { return { discoveredItems: [], targets: Object.fromEntries(enemyIds.map((enemyId) => [enemyId, { enemyId, discovered: false, defeats: 0 }])) } }
