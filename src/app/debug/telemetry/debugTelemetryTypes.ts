import type { AutomationEvaluationTrace } from "../../../game/automation/automationTypes";
import type { CombatEvent } from "../../../game/combat/combatTypes";
import type { DebugRandomRoll } from "../devtools/devToolsTypes";

export interface DebugTelemetryEvent {
  id: number;
  sequence: number;
  eventType: string;
  source?: CombatEvent["source"];
  target?: CombatEvent["target"];
  data?: CombatEvent["data"];
  text: string;
  at: number;
}

export interface DebugAutomationEvaluation {
  id: number;
  traces: AutomationEvaluationTrace[];
  at: number;
}

export type DebugTelemetryRngRoll = DebugRandomRoll;

