import { normalizeBankSeconds } from "./offlineTimeBank";
import { offlineTimePolicy, type OfflineTimePolicy } from "./offlineTimePolicy";

export type OfflineActivityStopReason =
  | "requested-time-complete"
  | "activity-ended"
  | "death"
  | "safety-stop"
  | "requirements-lost"
  | "invalid";

export interface OfflineActivityEligibility {
  eligible: boolean;
  reason?: string;
}

export interface OfflineActivityDisplayInfo {
  label: string;
  detail?: string;
}

export interface OfflineActivitySimulationRequest {
  requestedSeconds: number;
  /** A caller-supplied seed makes the same snapshot/request reproducible. */
  seed?: number;
}

export interface OfflineSimulationRng {
  next(): number;
  nextFor?(kind: string): number;
}

export interface OfflineActivitySimulationResult<TState, TSummary = unknown> {
  requestedSeconds: number;
  simulatedSeconds: number;
  stopReason: OfflineActivityStopReason;
  state: TState;
  summary: TSummary;
}

export interface OfflineActivityAdapter<TState, TSummary = unknown> {
  activityType: string;
  /** Returns true only when this adapter can actually simulate the activity. */
  getEligibility(state: TState): OfflineActivityEligibility;
  getDisplayInfo(state: TState): OfflineActivityDisplayInfo;
  /** Used by the registry to describe the currently active activity. */
  isActive?(state: TState): boolean;
  simulate(
    snapshot: TState,
    request: OfflineActivitySimulationRequest,
    rng: OfflineSimulationRng,
  ): OfflineActivitySimulationResult<TState, TSummary>;
}

export class OfflineActivityRegistry<TState> {
  private readonly adapters: readonly OfflineActivityAdapter<TState, unknown>[];

  constructor(adapters: readonly OfflineActivityAdapter<TState, unknown>[]) {
    this.adapters = adapters;
  }

  getCurrentActivity(state: TState): OfflineActivityAdapter<TState, unknown> | null {
    return this.adapters.find((adapter) => adapter.isActive ? adapter.isActive(state) : adapter.getEligibility(state).eligible) ?? null;
  }

  resolveEligibleActivity(state: TState): OfflineActivityAdapter<TState, unknown> | null {
    return this.adapters.find((adapter) => adapter.getEligibility(state).eligible) ?? null;
  }

  getAdapters(): readonly OfflineActivityAdapter<TState, unknown>[] {
    return this.adapters;
  }
}

export function createDeterministicOfflineRng(seed = 0x0ff11ce): OfflineSimulationRng {
  let state = seed >>> 0;
  return {
    next() {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 0x100000000;
    },
  };
}

export function cloneOfflineState<TState>(state: TState): TState {
  if (typeof structuredClone === "function") return structuredClone(state);
  return JSON.parse(JSON.stringify(state)) as TState;
}

export type OfflineActivityTransactionError =
  | "invalid-request"
  | "insufficient-bank"
  | "no-eligible-activity"
  | "already-running"
  | "lease-lost-before-simulation"
  | "lease-lost-before-commit"
  | "simulation-failed"
  | "invalid-result"
  | "commit-failed";

export interface OfflineActivityCommitInput<TState, TSummary> {
  adapter: OfflineActivityAdapter<TState, TSummary>;
  result: OfflineActivitySimulationResult<TState, TSummary>;
  requestedSeconds: number;
}

export interface OfflineActivityTransactionDependencies<TState, TSummary = unknown> {
  policy?: OfflineTimePolicy;
  requestedSeconds: number;
  availableBankSeconds: number;
  registry: OfflineActivityRegistry<TState>;
  snapshot: () => TState;
  verifyLease: () => boolean;
  isRunning: () => boolean;
  setRunning: (running: boolean) => void;
  rng?: OfflineSimulationRng;
  seed?: number;
  commit: (input: OfflineActivityCommitInput<TState, TSummary>) => boolean;
}

export interface OfflineActivityTransactionSuccess<TSummary> {
  ok: true;
  simulation: OfflineActivitySimulationResult<unknown, TSummary>;
  activityType: string;
}

export interface OfflineActivityTransactionFailure {
  ok: false;
  error: OfflineActivityTransactionError;
  message: string;
}

export type OfflineActivityTransactionResult<TSummary = unknown> =
  | OfflineActivityTransactionSuccess<TSummary>
  | OfflineActivityTransactionFailure;

function failure(error: OfflineActivityTransactionError, message: string): OfflineActivityTransactionFailure {
  return { ok: false, error, message };
}

function isValidStopReason(value: unknown): value is OfflineActivityStopReason {
  return value === "requested-time-complete" || value === "activity-ended" || value === "death" ||
    value === "safety-stop" || value === "requirements-lost" || value === "invalid";
}

function validateResult<TState, TSummary>(
  result: OfflineActivitySimulationResult<TState, TSummary>,
  requestedSeconds: number,
): boolean {
  return result.requestedSeconds === requestedSeconds &&
    Number.isInteger(result.simulatedSeconds) &&
    result.simulatedSeconds >= 0 &&
    result.simulatedSeconds <= requestedSeconds &&
    isValidStopReason(result.stopReason) &&
    result.state !== null && result.state !== undefined;
}

/** Coordinates the generic, all-or-nothing fast-forward transaction. */
export function runOfflineActivityTransaction<TState, TSummary = unknown>(
  dependencies: OfflineActivityTransactionDependencies<TState, TSummary>,
): OfflineActivityTransactionResult<TSummary> {
  const policy = dependencies.policy ?? offlineTimePolicy;
  if (dependencies.isRunning()) return failure("already-running", "A Time Bank simulation is already running.");
  if (!Number.isFinite(dependencies.requestedSeconds) || dependencies.requestedSeconds <= 0)
    return failure("invalid-request", "Choose a positive amount of time to skip.");

  const requestedSeconds = Math.floor(dependencies.requestedSeconds);
  if (requestedSeconds <= 0 || requestedSeconds > policy.bankCapSeconds)
    return failure("invalid-request", "The requested duration is outside the Time Bank limits.");

  const availableBankSeconds = normalizeBankSeconds(dependencies.availableBankSeconds, policy);
  if (requestedSeconds > availableBankSeconds)
    return failure("insufficient-bank", "The requested duration is greater than the available Time Bank.");
  if (!dependencies.verifyLease())
    return failure("lease-lost-before-simulation", "This profile is no longer owned by the current tab.");

  const currentState = dependencies.snapshot();
  const adapter = dependencies.registry.resolveEligibleActivity(currentState) as OfflineActivityAdapter<TState, TSummary> | null;
  if (!adapter) return failure("no-eligible-activity", "There is no eligible activity to simulate.");

  dependencies.setRunning(true);
  try {
    const snapshot = cloneOfflineState(currentState);
    let result: OfflineActivitySimulationResult<TState, TSummary>;
    try {
      result = adapter.simulate(
        snapshot,
        { requestedSeconds, seed: dependencies.seed },
        dependencies.rng ?? createDeterministicOfflineRng(),
      );
    } catch {
      return failure("simulation-failed", "The activity could not be simulated. No Time Bank time was spent.");
    }
    if (!validateResult(result, requestedSeconds) || result.stopReason === "invalid")
      return failure("invalid-result", "The activity returned an invalid simulation result. No Time Bank time was spent.");
    if (!dependencies.verifyLease())
      return failure("lease-lost-before-commit", "Profile ownership changed during simulation. No result was committed.");
    let committed = false;
    try {
      committed = dependencies.commit({ adapter, result, requestedSeconds });
    } catch {
      committed = false;
    }
    if (!committed) return failure("commit-failed", "The simulation could not be committed. No result was applied.");
    return { ok: true, simulation: result as OfflineActivitySimulationResult<unknown, TSummary>, activityType: adapter.activityType };
  } finally {
    dependencies.setRunning(false);
  }
}
