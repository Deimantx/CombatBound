export type AutomationCondition =
  | { type: "always" }
  | {
      type:
        | "player-hp-below"
        | "player-hp-above"
        | "mana-below"
        | "mana-above"
        | "stamina-below"
        | "stamina-above"
        | "barrier-below"
        | "barrier-missing"
        | "target-has-effect"
        | "target-missing-effect"
        | "target-casting"
        | "target-interruptible"
        | "target-danger-at-least"
        | "alive-enemies-at-least";
      value?: number | string;
    };

export interface AutomationRule {
  id: string;
  actionId: string;
  priority: number;
  enabled: boolean;
  conditions: AutomationCondition[];
}

export type TargetPriorityCriterion =
  | "interruptible-casting"
  | "highest-danger-casting"
  | "elite"
  | "lowest-health-percent"
  | "lowest-health"
  | "lowest-evasion"
  | "first-living";

export interface CombatAutomationState {
  enabled: boolean;
  rules: AutomationRule[];
  targetPriorityRules: TargetPriorityCriterion[];
  overrideManualTarget: boolean;
  lastInvalidReason?: string;
}

export function createInitialCombatAutomation(): CombatAutomationState {
  return {
    enabled: true,
    rules: [
      {
        id: "rule.protective-sign-low-health",
        actionId: "spell.protective-sign",
        priority: 10,
        enabled: true,
        conditions: [
          { type: "player-hp-below", value: 0.7 },
          { type: "barrier-missing" },
        ],
      },
      {
        id: "rule.healing-potion-low-health",
        actionId: "consumable.healing-potion",
        priority: 20,
        enabled: true,
        conditions: [{ type: "player-hp-below", value: 0.35 }],
      },
    ],
    targetPriorityRules: [
      "interruptible-casting",
      "highest-danger-casting",
      "elite",
      "lowest-health-percent",
      "lowest-health",
      "lowest-evasion",
      "first-living",
    ],
    overrideManualTarget: false,
  };
}
