import type { DebugScenarioSlot } from "./debugScenarioTypes";

export const DEBUG_SCENARIO_STORAGE_KEY = "combatbound-debug-scenarios-v1";
export const DEBUG_SCENARIO_SLOT_COUNT = 10;

function readRaw(): unknown[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(DEBUG_SCENARIO_STORAGE_KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function readDebugScenarioSlots(): DebugScenarioSlot[] {
  return readRaw().filter((value): value is DebugScenarioSlot => {
    if (!value || typeof value !== "object") return false;
    const slot = value as Partial<DebugScenarioSlot>;
    return typeof slot.id === "string" && typeof slot.name === "string" && Boolean(slot.snapshot && typeof slot.snapshot === "object");
  }).slice(0, DEBUG_SCENARIO_SLOT_COUNT);
}

function write(slots: DebugScenarioSlot[]) {
  if (typeof localStorage !== "undefined") localStorage.setItem(DEBUG_SCENARIO_STORAGE_KEY, JSON.stringify(slots.slice(0, DEBUG_SCENARIO_SLOT_COUNT)));
}

export function saveDebugScenario(slot: DebugScenarioSlot) {
  const slots = readDebugScenarioSlots().filter((entry) => entry.id !== slot.id);
  write([...slots, { ...slot, name: slot.name.trim().slice(0, 48) || "Unnamed Scenario", updatedAt: Date.now() }].slice(-DEBUG_SCENARIO_SLOT_COUNT));
}

export function deleteDebugScenario(id: string) { write(readDebugScenarioSlots().filter((slot) => slot.id !== id)); }

export function renameDebugScenario(id: string, name: string) {
  const slots = readDebugScenarioSlots().map((slot) => slot.id === id ? { ...slot, name: name.trim().slice(0, 48) || slot.name, updatedAt: Date.now() } : slot);
  write(slots);
}
