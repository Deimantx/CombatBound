import type { DebugScenarioSlot } from "./debugScenarioTypes";
import { normalizeDebugScenarioSnapshot } from "./debugScenarioValidation";

export const DEBUG_SCENARIO_STORAGE_KEY = "combatbound-debug-scenarios-v1";
export const DEBUG_SCENARIO_SLOT_COUNT = 10;
export type DebugScenarioSlotIndex = DebugScenarioSlot["slot"];

function isSlot(value: unknown): value is Partial<DebugScenarioSlot> & Pick<DebugScenarioSlot, "id" | "name" | "snapshot"> {
  if (!value || typeof value !== "object") return false;
  const slot = value as Partial<DebugScenarioSlot>;
  return typeof slot.id === "string" && typeof slot.name === "string" && Boolean(normalizeDebugScenarioSnapshot(slot.snapshot)) && (slot.slot === undefined || (Number.isInteger(slot.slot) && slot.slot >= 1 && slot.slot <= DEBUG_SCENARIO_SLOT_COUNT));
}

function readRaw(): unknown[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(DEBUG_SCENARIO_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function readDebugScenarioSlots(): DebugScenarioSlot[] {
  const raw = readRaw();
  const valid = raw.filter((entry) => isSlot(entry));
  return valid.map((entry, index) => ({ ...entry, snapshot: normalizeDebugScenarioSnapshot(entry.snapshot)!, slot: entry.slot ?? (index + 1) as DebugScenarioSlotIndex })).sort((a, b) => a.slot! - b.slot!).slice(0, DEBUG_SCENARIO_SLOT_COUNT) as DebugScenarioSlot[];
}

function write(slots: DebugScenarioSlot[]) {
  if (typeof localStorage === "undefined") return;
  const fixed = Array.from({ length: DEBUG_SCENARIO_SLOT_COUNT }, (_, index) => slots.find((slot) => slot.slot === index + 1) ?? null);
  localStorage.setItem(DEBUG_SCENARIO_STORAGE_KEY, JSON.stringify(fixed));
}

export function firstEmptyDebugScenarioSlot(slots = readDebugScenarioSlots()): DebugScenarioSlotIndex | null {
  for (let slot = 1; slot <= DEBUG_SCENARIO_SLOT_COUNT; slot += 1) if (!slots.some((entry) => entry.slot === slot)) return slot as DebugScenarioSlotIndex;
  return null;
}

export function saveDebugScenario(slot: DebugScenarioSlot) {
  const slots = readDebugScenarioSlots().filter((entry) => entry.slot !== slot.slot);
  write([...slots, { ...slot, id: `scenario-${slot.slot}`, name: slot.name.trim().slice(0, 48) || "Unnamed Scenario", updatedAt: Date.now() }]);
}

export function deleteDebugScenario(slot: DebugScenarioSlotIndex | string) {
  write(readDebugScenarioSlots().filter((entry) => entry.slot !== Number(slot) && entry.id !== slot));
}

export function renameDebugScenario(slot: DebugScenarioSlotIndex | string, name: string) {
  write(readDebugScenarioSlots().map((entry) => entry.slot === Number(slot) || entry.id === slot ? { ...entry, name: name.trim().slice(0, 48) || entry.name, updatedAt: Date.now() } : entry));
}
