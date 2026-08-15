import { Clock3 } from "lucide-react";
import { useEffect } from "react";
import { formatDuration } from "../../game/profiles/profileFormatting";
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
  return <div className="dialog-backdrop" role="presentation" data-debug-kind="offline-time-modal" data-debug-away-seconds={report.awaySeconds} data-debug-bank-before-seconds={report.bankBeforeSeconds} data-debug-bank-after-seconds={report.bankAfterSeconds}>
    <div className="confirm-dialog profile-offline-modal offline-time-modal" role="dialog" aria-modal="true" aria-labelledby="offline-time-title">
      <div className="profile-modal-icon"><Clock3 size={21} /></div>
      <span className="eyebrow">PROFILE SESSION</span>
      <h2 id="offline-time-title">Welcome back</h2>
      <p>Your offline time has been stored in this profile's time bank. No combat was simulated while you were away.</p>
      <div className="profile-offline-summary"><span>Time away</span><strong>{formatDuration(report.awaySeconds)}</strong><span>Offline time added</span><strong>+{formatDuration(report.awaySeconds)}</strong><span>Total banked time</span><strong>{formatDuration(report.bankAfterSeconds)}</strong></div>
      <div className="dialog-actions"><button autoFocus className="button button-primary" onClick={dismiss}>Continue</button></div>
    </div>
  </div>;
}
