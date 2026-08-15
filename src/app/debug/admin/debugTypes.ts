import type { DebugStoreApi } from "../../../state/gameStore";
import type { GameState } from "../../../game/gameState";
import type { DebugTab } from "./debugTabs";

export type DebugRun = (label: string, action: () => void) => void;
export interface DebugTabProps { debug: DebugStoreApi; run: DebugRun }
export type { DebugTab } from "./debugTabs";
export type DebugGameState = GameState;
