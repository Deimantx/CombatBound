import { Clock3, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DisclosureChevron } from "../components/DisclosureChevron";
import { formatCompactDuration } from "../../game/profiles/profileFormatting";
import { offlineTimePolicy } from "../../game/offline/offlineTimePolicy";
import { getOfflineActivityPanelState, requestOfflineSkip } from "../offline/offlineActivityCoordinator";
import { useGameStore } from "../../state/gameStore";
import { useProfileStore } from "../../state/profileStore";
import { useOfflineActivityRuntimeStore } from "../../state/offlineActivityRuntimeStore";
import type { CombatHuntOfflineSummary } from "../../game/offline/combatHuntActivity";

const quickSkips = [
  { label: "SKIP 5M", seconds: 5 * 60 },
  { label: "SKIP 15M", seconds: 15 * 60 },
  { label: "SKIP 1H", seconds: 60 * 60 },
] as const;

function stopReasonLabel(reason: string): string {
  return {
    "requested-time-complete": "Time complete",
    death: "Hunter defeated",
    "requirements-lost": "Requirements lost",
    "activity-ended": "Activity ended",
  }[reason] ?? "Simulation invalid";
}

export function TimeBankPopover() {
  const [open, setOpen] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("");
  const game = useGameStore((state) => state.game);
  const activeProfileId = useGameStore((state) => state.activeProfileId);
  const profileIndex = useProfileStore((state) => state.index);
  const transactionRunning = useOfflineActivityRuntimeStore((state) => state.transactionRunning);
  const storedLastResult = useOfflineActivityRuntimeStore((state) => state.lastResult);
  const lastResult = storedLastResult?.profileId === activeProfileId ? storedLastResult : null;
  const resultsOpen = useOfflineActivityRuntimeStore((state) => state.resultsOpen);
  const openResults = useOfflineActivityRuntimeStore((state) => state.openResults);
  const message = useOfflineActivityRuntimeStore((state) => state.message);
  const panel = getOfflineActivityPanelState(game);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const customValue = Number(customMinutes);
  const customValid = /^\d+$/.test(customMinutes.trim()) &&
    customValue >= 1 &&
    customValue * 60 <= panel.bankSeconds &&
    customValue * 60 <= offlineTimePolicy.bankCapSeconds;
  const customError = customMinutes.length > 0 && !customValid
    ? customValue > panel.bankSeconds / 60
      ? "Enter no more than the available bank."
      : "Use whole positive minutes."
    : null;

  const spend = (seconds: number) => {
    requestOfflineSkip(seconds);
  };
  const active = Boolean(activeProfileId && profileIndex.slots.some((profile) => profile?.id === activeProfileId) && panel.sessionOwned);
  const summary = lastResult?.activityType === "combat-hunt"
    ? lastResult.simulation.summary as CombatHuntOfflineSummary
    : null;
  useEffect(() => {
    if (resultsOpen) setOpen(false);
  }, [resultsOpen]);

  return (
    <div className="time-bank-control" data-debug-kind="offline-time-bank-control">
      <button
        type="button"
        className="time-bank-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="offline-time-bank-panel"
        data-debug-kind="offline-time-bank-toggle"
        data-debug-bank-seconds={panel.bankSeconds}
      >
        <Clock3 size={15} />
        <span>TIME BANK</span>
        <strong>{formatCompactDuration(panel.bankSeconds)}</strong>
        <DisclosureChevron open={open} size={13} />
      </button>
      {open && (
        <section
          id="offline-time-bank-panel"
          className="time-bank-panel"
          aria-label="Time Bank"
          data-debug-kind="offline-time-bank-panel"
          data-debug-bank-seconds={panel.bankSeconds}
          data-debug-bank-cap-seconds={panel.bankCapSeconds}
        >
          <div className="time-bank-panel-header">
            <div>
              <span className="eyebrow">TIME BANK</span>
              <strong>Spend stored time</strong>
            </div>
            <button type="button" className="icon-button" aria-label="Close Time Bank" onClick={() => setOpen(false)}>
              <X size={15} />
            </button>
          </div>

          <div className="time-bank-status">
            <div><span>Available</span><strong>{formatCompactDuration(panel.bankSeconds)}</strong></div>
            <div><span>Maximum</span><strong>{formatCompactDuration(panel.bankCapSeconds)}</strong></div>
          </div>
          <div className="time-bank-progress" aria-label={`${formatCompactDuration(panel.bankSeconds)} of ${formatCompactDuration(panel.bankCapSeconds)} available`}>
            <span style={{ width: `${Math.min(100, (panel.bankSeconds / Math.max(1, panel.bankCapSeconds)) * 100)}%` }} />
          </div>

          <div className="time-bank-activity">
            <span className="eyebrow">CURRENT ACTIVITY</span>
            {panel.currentActivity ? <strong>{panel.currentActivity.label} — {panel.currentActivity.detail}</strong> : <strong>No eligible activity</strong>}
            {!panel.currentActivity && <small>Start an activity before spending Time Bank.</small>}
            {panel.currentActivity && !panel.eligibility.eligible && <small>{panel.eligibility.reason ?? "This activity cannot receive skipped time."}</small>}
          </div>

          <div className="time-bank-quick-actions" data-debug-kind="offline-time-bank-quick-actions">
            {quickSkips.map((skip) => (
              <button
                type="button"
                className="button button-secondary button-small"
                key={skip.seconds}
                disabled={!active || transactionRunning || !panel.eligibility.eligible || skip.seconds > panel.bankSeconds}
                onClick={() => spend(skip.seconds)}
                data-debug-kind="offline-time-bank-skip"
                data-debug-seconds={skip.seconds}
              >
                {skip.label}
              </button>
            ))}
          </div>

          <div className="time-bank-custom">
            <label htmlFor="offline-time-bank-custom">Custom minutes</label>
            <div>
              <input
                id="offline-time-bank-custom"
                value={customMinutes}
                onChange={(event) => setCustomMinutes(event.target.value)}
                inputMode="numeric"
                placeholder="120"
                aria-invalid={Boolean(customError)}
                data-debug-kind="offline-time-bank-custom-input"
              />
              <button
                type="button"
                className="button button-primary button-small"
                disabled={!active || transactionRunning || !panel.eligibility.eligible || !customValid}
                onClick={() => spend(customValue * 60)}
                data-debug-kind="offline-time-bank-custom-skip"
              >
                SKIP
              </button>
            </div>
            {customError && <small className="time-bank-error">{customError}</small>}
          </div>

          {transactionRunning && <p className="time-bank-message">SIMULATING…</p>}
          {!transactionRunning && message && <p className="time-bank-message">{message}</p>}
          {lastResult && !message && (
            <div className="time-bank-last-result" data-debug-kind="offline-time-bank-last-result">
              <span className="eyebrow">LAST SKIP</span>
              <strong>{formatCompactDuration(lastResult.simulation.requestedSeconds)} — {stopReasonLabel(lastResult.simulation.stopReason)}</strong>
              <small>Active {formatCompactDuration(lastResult.simulation.activitySeconds)} · Wasted {formatCompactDuration(lastResult.simulation.wastedSeconds)}</small>
              {summary && <small>{summary.enemiesDefeated ?? 0} enemies · {summary.groupClears ?? 0} groups</small>}
              <button type="button" className="button button-ghost button-small" onClick={openResults}>VIEW LAST RESULTS</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
