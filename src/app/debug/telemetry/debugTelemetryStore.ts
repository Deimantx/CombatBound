import { create } from "zustand";
import type { AutomationEvaluationTrace } from "../../../game/automation/automationTypes";
import type { CombatEvent } from "../../../game/combat/combatTypes";
import {
  appendRing,
  DEBUG_AUTOMATION_BUFFER_LIMIT,
  DEBUG_EVENT_BUFFER_LIMIT,
  DEBUG_TELEMETRY_FLUSH_MS,
} from "./debugTelemetryBuffer";
import type { DebugAutomationEvaluation, DebugTelemetryEvent } from "./debugTelemetryTypes";

interface PendingTelemetry {
  traces: AutomationEvaluationTrace[];
  events: DebugTelemetryEvent[];
}

interface DebugTelemetryState {
  automationEvaluations: DebugAutomationEvaluation[];
  events: DebugTelemetryEvent[];
  recordAutomationTrace: (trace: AutomationEvaluationTrace) => void;
  recordEvent: (event: CombatEvent & { sequence?: number }) => void;
  clearAutomationTrace: () => void;
  clearEvents: () => void;
}

let nextTelemetryId = 1;
let nextTelemetrySequence = 1;
let pending: PendingTelemetry = { traces: [], events: [] };
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer !== null || typeof setTimeout === "undefined") return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    const batch = pending;
    pending = { traces: [], events: [] };
    if (!batch.traces.length && !batch.events.length) return;
    useDebugTelemetryStore.setState((state) => {
      const grouped: DebugAutomationEvaluation[] = batch.traces.map((trace) => ({ id: nextTelemetryId++, sequence: nextTelemetrySequence++, traces: [trace], at: Date.now() }));
      return {
        automationEvaluations: appendRing(state.automationEvaluations, grouped, DEBUG_AUTOMATION_BUFFER_LIMIT),
        events: appendRing(state.events, batch.events, DEBUG_EVENT_BUFFER_LIMIT),
      };
    });
  }, DEBUG_TELEMETRY_FLUSH_MS);
}

function clearPending(kind: keyof PendingTelemetry) {
  pending[kind] = [];
}

export const useDebugTelemetryStore = create<DebugTelemetryState>(() => ({
  automationEvaluations: [],
  events: [],
  recordAutomationTrace: (trace) => {
    pending.traces.push(trace);
    scheduleFlush();
  },
  recordEvent: (event) => {
    pending.events.push({
      id: nextTelemetryId++,
      sequence: nextTelemetrySequence++,
      eventType: event.eventType ?? "actionResolved",
      source: event.source,
      target: event.target,
      data: event.data,
      text: event.eventType ?? "Combat event",
      at: Date.now(),
    });
    scheduleFlush();
  },
  clearAutomationTrace: () => {
    clearPending("traces");
    useDebugTelemetryStore.setState({ automationEvaluations: [] });
  },
  clearEvents: () => {
    clearPending("events");
    useDebugTelemetryStore.setState({ events: [] });
  },
}));

export function flushDebugTelemetryNow() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const batch = pending;
  pending = { traces: [], events: [] };
  if (!batch.traces.length && !batch.events.length) return;
  const grouped: DebugAutomationEvaluation[] = batch.traces.map((trace) => ({ id: nextTelemetryId++, sequence: nextTelemetrySequence++, traces: [trace], at: Date.now() }));
  useDebugTelemetryStore.setState((state) => ({
    automationEvaluations: appendRing(state.automationEvaluations, grouped, DEBUG_AUTOMATION_BUFFER_LIMIT),
    events: appendRing(state.events, batch.events, DEBUG_EVENT_BUFFER_LIMIT),
  }));
}
