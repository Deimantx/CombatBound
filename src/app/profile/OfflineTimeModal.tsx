import { Clock3 } from "lucide-react";
import { useEffect } from "react";
import { formatDuration } from "../../game/profiles/profileFormatting";
import { offlineTimePolicy } from "../../game/offline/offlineTimePolicy";
import { useProfileStore } from "../../state/profileStore";

export function OfflineTimeModal() {
  const report = useProfileStore((state) => state.pendingOfflineReport);
  const dismiss = useProfileStore((state) => state.dismissOfflineReport);
  useEffect(() => {
    if (!report) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dismiss, report]);
  if (!report) return null;
  const capped = report.discardReason !== "none";
  return <div className="dialog-backdrop" role="presentation" data-debug-kind="offline-time-modal" data-debug-away-seconds={report.rawAwaySeconds} data-debug-credited-seconds={report.creditedSeconds} data-debug-discarded-seconds={report.discardedSeconds} data-debug-bank-before-seconds={report.bankBeforeSeconds} data-debug-bank-after-seconds={report.bankAfterSeconds}>
    <div className="confirm-dialog profile-offline-modal offline-time-modal" role="dialog" aria-modal="true" aria-labelledby="offline-time-title">
      <div className="profile-modal-icon"><Clock3 size={21} /></div>
      <span className="eyebrow">PROFILE SESSION</span>
      <h2 id="offline-time-title">Welcome back</h2>
      <p>Your offline time has been stored in this profile's time bank. No combat was simulated while you were away.</p>
      <div className="profile-offline-summary"><span>Time away</span><strong>{formatDuration(report.rawAwaySeconds)}</strong><span>Offline time banked</span><strong>+{formatDuration(report.creditedSeconds)}</strong>{capped && <><span>Not banked</span><strong>{formatDuration(report.discardedSeconds)}</strong></>}<span>Total banked time</span><strong>{formatDuration(report.bankAfterSeconds)}</strong></div>
      {report.anomaly === "clock-rollback" && <p className="profile-offline-note">Offline time could not be credited because the device clock moved backward. Your existing bank was not changed.</p>}
      {report.discardReason === "single-credit-cap" || report.discardReason === "single-credit-cap-and-bank-cap" ? <p className="profile-offline-note">A maximum of {formatDuration(offlineTimePolicy.maxSingleCreditSeconds)} can be banked from one inactive period.</p> : null}
      {report.discardReason === "bank-cap" || report.discardReason === "single-credit-cap-and-bank-cap" ? <p className="profile-offline-note">Your Offline Time Bank reached its current capacity.</p> : null}
      <div className="dialog-actions"><button autoFocus className="button button-primary" onClick={dismiss}>Continue</button></div>
    </div>
  </div>;
}
