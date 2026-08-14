import { normalizeCombatAutomation } from "./automationLogic";
import type {
  AutomationCondition,
  AutomationRule,
  CombatAutomationState,
  TargetPriorityRule,
} from "./automationTypes";

export const AUTOMATION_PRESET_SLOT_COUNT = 10;
export const MAX_AUTOMATION_PRESET_NAME_LENGTH = 32;

export interface CombatAutomationPresetConfig {
  rules: AutomationRule[];
  targetPriorityRules: TargetPriorityRule[];
  overrideManualTarget: boolean;
}

export interface CombatAutomationPreset {
  id: string;
  name: string;
  config: CombatAutomationPresetConfig;
  createdAt: number;
  updatedAt: number;
}

export interface CombatAutomationPresetsState {
  slots: Array<CombatAutomationPreset | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneCondition(condition: AutomationCondition): AutomationCondition {
  return { ...condition };
}

function cloneRule(rule: AutomationRule): AutomationRule {
  return {
    ...rule,
    conditions: rule.conditions.map(cloneCondition),
  };
}

function cloneTargetPriorityRule(rule: TargetPriorityRule): TargetPriorityRule {
  return { ...rule };
}

export function cloneAutomationPresetConfig(config: CombatAutomationPresetConfig): CombatAutomationPresetConfig {
  return {
    rules: config.rules.map(cloneRule),
    targetPriorityRules: config.targetPriorityRules.map(cloneTargetPriorityRule),
    overrideManualTarget: config.overrideManualTarget,
  };
}

export function snapshotAutomationConfig(automation: CombatAutomationState): CombatAutomationPresetConfig {
  return {
    rules: automation.rules.map(cloneRule),
    targetPriorityRules: automation.targetPriorityRules.map(cloneTargetPriorityRule),
    overrideManualTarget: automation.overrideManualTarget,
  };
}

export function applyAutomationPresetConfig(
  current: CombatAutomationState,
  preset: CombatAutomationPresetConfig,
): CombatAutomationState {
  const cloned = cloneAutomationPresetConfig(preset);
  return {
    enabled: current.enabled,
    rules: cloned.rules,
    targetPriorityRules: cloned.targetPriorityRules,
    overrideManualTarget: cloned.overrideManualTarget,
  };
}

export function normalizeAutomationPresetConfig(value: unknown): CombatAutomationPresetConfig {
  const raw = isRecord(value) ? value : {};
  const normalized = normalizeCombatAutomation({
    enabled: true,
    rules: raw.rules,
    targetPriorityRules: raw.targetPriorityRules,
    overrideManualTarget: raw.overrideManualTarget,
  });
  return snapshotAutomationConfig(normalized);
}

export function normalizeAutomationPresetName(value: unknown, slot: number): string {
  const fallback = `Preset ${slot + 1}`;
  if (typeof value !== "string") return fallback;
  const name = value.trim().slice(0, MAX_AUTOMATION_PRESET_NAME_LENGTH);
  return name || fallback;
}

function safeTimestamp(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function presetId(value: unknown, index: number) {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : `automation-preset.imported-${index + 1}`;
}

export function normalizeAutomationPreset(value: unknown, slot: number): CombatAutomationPreset | null {
  if (!isRecord(value)) return null;
  const now = 0;
  const rawConfig = isRecord(value.config) ? value.config : value;
  return {
    id: presetId(value.id, slot),
    name: normalizeAutomationPresetName(value.name, slot),
    config: normalizeAutomationPresetConfig(rawConfig),
    createdAt: safeTimestamp(value.createdAt, now),
    updatedAt: safeTimestamp(value.updatedAt, now),
  };
}

export function normalizeCombatAutomationPresets(value: unknown): CombatAutomationPresetsState {
  const rawSlots = isRecord(value) && Array.isArray(value.slots) ? value.slots : [];
  return {
    slots: Array.from({ length: AUTOMATION_PRESET_SLOT_COUNT }, (_, slot) => normalizeAutomationPreset(rawSlots[slot], slot)),
  };
}

export function createInitialCombatAutomationPresets(): CombatAutomationPresetsState {
  return { slots: Array.from({ length: AUTOMATION_PRESET_SLOT_COUNT }, () => null) };
}

export function isAutomationPresetSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < AUTOMATION_PRESET_SLOT_COUNT;
}

function generatedPresetId(now: number) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${now.toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `automation-preset.${suffix}`;
}

function safeOperationTimestamp(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : Date.now();
}

export function saveCurrentAutomationToPreset(
  presets: CombatAutomationPresetsState,
  slot: number,
  automation: CombatAutomationState,
  name?: string,
  now = Date.now(),
): CombatAutomationPresetsState {
  if (!isAutomationPresetSlot(slot)) return presets;
  const timestamp = safeOperationTimestamp(now);
  const slots = Array.from({ length: AUTOMATION_PRESET_SLOT_COUNT }, (_, index) => presets.slots[index] ?? null);
  const existing = slots[slot];
  const nextPreset: CombatAutomationPreset = existing
    ? {
        ...existing,
        config: snapshotAutomationConfig(automation),
        updatedAt: timestamp,
      }
    : {
        id: generatedPresetId(timestamp),
        name: normalizeAutomationPresetName(name, slot),
        config: snapshotAutomationConfig(automation),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
  return { slots: slots.map((preset, index) => index === slot ? nextPreset : preset) };
}

export function loadAutomationPreset(
  presets: CombatAutomationPresetsState,
  slot: number,
  current: CombatAutomationState,
): CombatAutomationState {
  if (!isAutomationPresetSlot(slot)) return current;
  const preset = presets.slots[slot];
  return preset ? applyAutomationPresetConfig(current, preset.config) : current;
}

export function renameAutomationPreset(
  presets: CombatAutomationPresetsState,
  slot: number,
  name: string,
  now = Date.now(),
): CombatAutomationPresetsState {
  if (!isAutomationPresetSlot(slot)) return presets;
  const timestamp = safeOperationTimestamp(now);
  const slots = Array.from({ length: AUTOMATION_PRESET_SLOT_COUNT }, (_, index) => presets.slots[index] ?? null);
  const existing = slots[slot];
  if (!existing) return presets;
  return {
    slots: slots.map((preset, index) => index === slot && preset
      ? { ...preset, name: normalizeAutomationPresetName(name, slot), updatedAt: timestamp }
      : preset),
  };
}

export function clearAutomationPreset(
  presets: CombatAutomationPresetsState,
  slot: number,
): CombatAutomationPresetsState {
  if (!isAutomationPresetSlot(slot)) return presets;
  const slots = Array.from({ length: AUTOMATION_PRESET_SLOT_COUNT }, (_, index) => presets.slots[index] ?? null);
  return { slots: slots.map((preset, index) => index === slot ? null : preset) };
}

function comparableConfig(config: CombatAutomationPresetConfig) {
  return JSON.stringify({
    rules: config.rules.map(cloneRule),
    targetPriorityRules: config.targetPriorityRules.map(cloneTargetPriorityRule),
    overrideManualTarget: config.overrideManualTarget,
  });
}

export function automationPresetConfigEquals(
  left: CombatAutomationPresetConfig,
  right: CombatAutomationPresetConfig,
): boolean {
  return comparableConfig(left) === comparableConfig(right);
}
