export type AutomationFractionConditionType =
  | "player-hp-below"
  | "player-hp-above"
  | "mana-below"
  | "mana-above"
  | "stamina-below"
  | "stamina-above"
  | "target-hp-below"
  | "target-hp-above";

export type AutomationEffectConditionType =
  | "target-has-effect"
  | "target-missing-effect"
  | "player-has-effect"
  | "player-missing-effect";

export type AutomationCondition =
  | { type: "always" }
  | { type: AutomationFractionConditionType; fraction: number }
  | { type: AutomationEffectConditionType; effectId: string }
  | { type: "barrier-below"; fraction: number }
  | { type: "barrier-missing" }
  ;

export interface AutomationRule {
  id: string;
  actionId: string;
  priority: number;
  enabled: boolean;
  conditions: AutomationCondition[];
}

export interface CombatAutomationState {
  enabled: boolean;
  rules: AutomationRule[];
}

export interface AutomationConditionTrace {
  type: string;
  passed: boolean;
  actual?: string | number | boolean;
  expected?: string | number | boolean;
}

export interface AutomationEvaluationTrace {
  ruleId: string;
  priority: number;
  actionId: string;
  enabled: boolean;
  conditions: AutomationConditionTrace[];
  validationReason?: string;
  result: "executed" | "skipped" | "invalid";
}

export function createInitialCombatAutomation(): CombatAutomationState {
  return {
    enabled: true,
    rules: [
      {
        id: "rule.healing-potion-low-health",
        actionId: "consumable.healing-potion",
        priority: 10,
        enabled: true,
        conditions: [{ type: "player-hp-below", fraction: 0.35 }],
      },
    ],
  };
}
