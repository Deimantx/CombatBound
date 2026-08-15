import type { GameState } from "../../../game/gameState";

export interface DebugScenarioSnapshotV1 {
  version: 1;
  game: Pick<GameState, "progression" | "inventory" | "equipment" | "gold" | "spellbook" | "combatAutomation" | "combatAbilities"> & { combat: GameState["combat"] };
  world: { continentId: string; regionId: string; areaId: string; combatLocationId: string };
}

export interface DebugScenarioSnapshotV2 extends Omit<DebugScenarioSnapshotV1, "version"> {
  version: 2;
}

export type DebugScenarioSnapshot = DebugScenarioSnapshotV1 | DebugScenarioSnapshotV2;

export interface DebugScenarioSlot {
  slot: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  /** Stable identifier for DOM inspection while slots remain numbered. */
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: DebugScenarioSnapshot;
}
