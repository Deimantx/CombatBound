import { describe, expect, it } from "vitest";
import {
  OfflineActivityRegistry,
  runOfflineActivityTransaction,
  type OfflineActivityAdapter,
  type OfflineActivitySimulationResult,
} from "../game/offline/offlineActivityContract";
import { offlineTimePolicy } from "../game/offline/offlineTimePolicy";

interface FakeState {
  active: boolean;
  value: number;
}

interface FakeSummary {
  note: string;
}

const makeAdapter = (simulate: OfflineActivityAdapter<FakeState, FakeSummary>["simulate"]): OfflineActivityAdapter<FakeState, FakeSummary> => ({
  activityType: "fake-activity",
  isActive: (state) => state.active,
  getEligibility: (state) => state.active ? { eligible: true } : { eligible: false, reason: "No active fake activity." },
  getDisplayInfo: () => ({ label: "Fake Activity", detail: "Test Area" }),
  simulate,
});

function harness(adapter: OfflineActivityAdapter<FakeState, FakeSummary>, overrides: Partial<Parameters<typeof runOfflineActivityTransaction<FakeState, FakeSummary>>[0]> = {}) {
  let running = false;
  let lease = true;
  let committed: { result: OfflineActivitySimulationResult<FakeState, FakeSummary>; requestedSeconds: number } | null = null;
  const result = (requestedSeconds: number, simulatedSeconds = requestedSeconds): OfflineActivitySimulationResult<FakeState, FakeSummary> => ({
    requestedSeconds,
    simulatedSeconds,
    stopReason: simulatedSeconds === requestedSeconds ? "requested-time-complete" : "activity-ended",
    state: { active: true, value: simulatedSeconds },
    summary: { note: "fake" },
  });
  const options = {
    requestedSeconds: 900,
    availableBankSeconds: 3600,
    registry: new OfflineActivityRegistry<FakeState>([adapter]),
    snapshot: () => ({ active: true, value: 0 }),
    verifyLease: () => lease,
    isRunning: () => running,
    setRunning: (value: boolean) => { running = value; },
    commit: ({ result: simulation, requestedSeconds }: { result: OfflineActivitySimulationResult<FakeState, FakeSummary>; requestedSeconds: number }) => {
      committed = { result: simulation, requestedSeconds };
      return true;
    },
    ...overrides,
  };
  return { run: () => runOfflineActivityTransaction(options), result, setLease: (value: boolean) => { lease = value; }, setRunning: (value: boolean) => { running = value; }, getCommitted: () => committed };
}

describe("Offline Activity Simulation Contract 1.0", () => {
  it("rejects no activity and insufficient bank without committing", () => {
    const inactive = runOfflineActivityTransaction({
      requestedSeconds: 900,
      availableBankSeconds: 3600,
      registry: new OfflineActivityRegistry<FakeState>([makeAdapter((_state, request) => ({ ...request, simulatedSeconds: request.requestedSeconds, stopReason: "requested-time-complete", state: { active: true, value: 1 }, summary: { note: "fake" } }))]),
      snapshot: () => ({ active: false, value: 0 }),
      verifyLease: () => true,
      isRunning: () => false,
      setRunning: () => undefined,
      commit: () => true,
    });
    expect(inactive).toMatchObject({ ok: false, error: "no-eligible-activity" });
    const result = runOfflineActivityTransaction({
      requestedSeconds: 3601,
      availableBankSeconds: 3600,
      registry: new OfflineActivityRegistry<FakeState>([makeAdapter((_state, request) => ({ ...request, simulatedSeconds: request.requestedSeconds, stopReason: "requested-time-complete", state: { active: true, value: 1 }, summary: { note: "fake" } }))]),
      snapshot: () => ({ active: true, value: 0 }),
      verifyLease: () => true,
      isRunning: () => false,
      setRunning: () => undefined,
      commit: () => true,
    });
    expect(result).toMatchObject({ ok: false, error: "insufficient-bank" });
  });

  it("commits exact simulated time and supports partial consumption", () => {
    const exact = harness(makeAdapter((_state, request) => ({ ...request, simulatedSeconds: request.requestedSeconds, stopReason: "requested-time-complete", state: { active: true, value: request.requestedSeconds }, summary: { note: "exact" } })));
    expect(exact.run()).toMatchObject({ ok: true, activityType: "fake-activity" });
    expect(exact.getCommitted()?.result.simulatedSeconds).toBe(900);

    const partial = harness(makeAdapter((_state, request) => ({ ...request, simulatedSeconds: 600, stopReason: "death", state: { active: false, value: 600 }, summary: { note: "stopped" } })));
    const result = partial.run();
    expect(result).toMatchObject({ ok: true });
    expect(partial.getCommitted()?.result.simulatedSeconds).toBe(600);
    expect(partial.getCommitted()?.requestedSeconds).toBe(900);
  });

  it("keeps zero-time completions valid but spends no time in the commit plan", () => {
    const zero = harness(makeAdapter((_state, request) => ({ ...request, simulatedSeconds: 0, stopReason: "activity-ended", state: { active: false, value: 0 }, summary: { note: "empty" } })));
    expect(zero.run()).toMatchObject({ ok: true });
    expect(zero.getCommitted()?.result.simulatedSeconds).toBe(0);
  });

  it("does not commit thrown or invalid simulations", () => {
    const thrown = harness(makeAdapter(() => { throw new Error("boom"); }));
    expect(thrown.run()).toMatchObject({ ok: false, error: "simulation-failed" });
    expect(thrown.getCommitted()).toBeNull();
    const invalid = harness(makeAdapter((_state, request) => ({ ...request, simulatedSeconds: request.requestedSeconds + 1, stopReason: "requested-time-complete", state: { active: true, value: 1 }, summary: { note: "bad" } })));
    expect(invalid.run()).toMatchObject({ ok: false, error: "invalid-result" });
    expect(invalid.getCommitted()).toBeNull();
    const commitThrows = harness(makeAdapter((_state, request) => ({ ...request, simulatedSeconds: request.requestedSeconds, stopReason: "requested-time-complete", state: { active: true, value: 1 }, summary: { note: "fake" } })), {
      commit: () => { throw new Error("commit failed"); },
    });
    expect(commitThrows.run()).toMatchObject({ ok: false, error: "commit-failed" });
    expect(commitThrows.getCommitted()).toBeNull();
  });

  it("checks lease ownership before and after simulation", () => {
    const before = harness(makeAdapter((_state, request) => ({ ...request, simulatedSeconds: request.requestedSeconds, stopReason: "requested-time-complete", state: { active: true, value: 1 }, summary: { note: "fake" } })));
    before.setLease(false);
    expect(before.run()).toMatchObject({ ok: false, error: "lease-lost-before-simulation" });

    let after: ReturnType<typeof harness>;
    after = harness(makeAdapter((_state, request) => {
      after.setLease(false);
      return { ...request, simulatedSeconds: request.requestedSeconds, stopReason: "requested-time-complete", state: { active: true, value: 1 }, summary: { note: "fake" } };
    }));
    expect(after.run()).toMatchObject({ ok: false, error: "lease-lost-before-commit" });
    expect(after.getCommitted()).toBeNull();
  });

  it("prevents concurrent requests and uses the seven-day policy boundary", () => {
    const running = harness(makeAdapter((_state, request) => ({ ...request, simulatedSeconds: request.requestedSeconds, stopReason: "requested-time-complete", state: { active: true, value: 1 }, summary: { note: "fake" } })));
    running.setRunning(true);
    expect(running.run()).toMatchObject({ ok: false, error: "already-running" });
    expect(offlineTimePolicy.bankCapSeconds).toBe(7 * 24 * 60 * 60);
    expect(offlineTimePolicy.maxSingleCreditSeconds).toBe(7 * 24 * 60 * 60);
  });
});
