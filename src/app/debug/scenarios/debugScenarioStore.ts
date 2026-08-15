import { create } from "zustand";
import { firstEmptyDebugScenarioSlot, readDebugScenarioSlots, saveDebugScenario, deleteDebugScenario, renameDebugScenario } from "./debugScenarioStorage";
import type { DebugScenarioSlot, DebugScenarioSnapshotV1 } from "./debugScenarioTypes";

interface DebugScenarioState {
  slots: Array<DebugScenarioSlot | null>;
  refresh: () => void;
  saveNew: (name: string, snapshot: DebugScenarioSnapshotV1) => DebugScenarioSlot | null;
  overwrite: (slot: DebugScenarioSlot, name: string, snapshot: DebugScenarioSnapshotV1) => void;
  rename: (slot: DebugScenarioSlot, name: string) => void;
  remove: (slot: DebugScenarioSlot) => void;
}

function toFixedSlots() {
  const entries = readDebugScenarioSlots();
  return Array.from({ length: 10 }, (_, index) => entries.find((entry) => entry.slot === index + 1) ?? null);
}

export const useDebugScenarioStore = create<DebugScenarioState>((set) => ({
  slots: toFixedSlots(),
  refresh: () => set({ slots: toFixedSlots() }),
  saveNew: (name, snapshot) => {
    const slotIndex = firstEmptyDebugScenarioSlot();
    if (!slotIndex) return null;
    const now = Date.now();
    const slot: DebugScenarioSlot = { slot: slotIndex, id: `scenario-${slotIndex}`, name, createdAt: now, updatedAt: now, snapshot };
    saveDebugScenario(slot);
    set({ slots: toFixedSlots() });
    return slot;
  },
  overwrite: (slot, name, snapshot) => { saveDebugScenario({ ...slot, name, snapshot, updatedAt: Date.now() }); set({ slots: toFixedSlots() }); },
  rename: (slot, name) => { renameDebugScenario(slot.slot, name); set({ slots: toFixedSlots() }); },
  remove: (slot) => { deleteDebugScenario(slot.slot); set({ slots: toFixedSlots() }); },
}));

