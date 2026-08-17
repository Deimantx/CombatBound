import { useMemo, useState } from "react";
import { offlineTimePolicy } from "../../../../game/offline/offlineTimePolicy";
import { formatDuration } from "../../../../game/profiles/profileFormatting";
import { getProfileSessionOwnerId, releaseOwnedProfileSessionLease, renewProfileSessionLease } from "../../../../game/profiles/profileSessionLease";
import { useGameStore } from "../../../../state/gameStore";
import { getActiveProfileLease, useProfileStore } from "../../../../state/profileStore";
import { DebugButton } from "../components/DebugButton";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";

const simulationDurations = [
  [30, "SIMULATE 30S INACTIVE"],
  [5 * 60, "SIMULATE 5M INACTIVE"],
  [8 * 60 * 60, "SIMULATE 8H INACTIVE"],
  [10 * 24 * 60 * 60, "SIMULATE 10D INACTIVE"],
] as const;

export function DebugOfflineTimeTab({ run }: DebugTabProps) {
  const [leaseRevision, setLeaseRevision] = useState(0);
  const profileId = useGameStore((state) => state.activeProfileId);
  const metadata = useProfileStore((state) => profileId ? state.index.slots.find((entry) => entry?.id === profileId) ?? null : null);
  const setBank = useProfileStore((state) => state.setOfflineBankForDebug);
  const addBank = useProfileStore((state) => state.addOfflineBankForDebug);
  const settle = useProfileStore((state) => state.settleOfflineTime);
  const report = useProfileStore((state) => state.pendingOfflineReport);
  const lease = useMemo(() => profileId ? getActiveProfileLease(profileId) : null, [profileId, metadata?.lastActiveAt, metadata?.offlineBankSeconds, leaseRevision]);
  const ownerId = getProfileSessionOwnerId();
  if (!profileId || !metadata) return <div className="debug-tab-content"><p className="debug-note">Load a profile to inspect Offline Time Bank and session lease state.</p></div>;
  const simulate = (seconds: number) => run(`Settled ${formatDuration(seconds)} through the canonical Offline Time path.`, () => { settle(profileId, "debug", metadata.lastActiveAt + seconds * 1000); });
  return <div className="debug-tab-content debug-column">
    <DebugSection title="Offline Time Bank" subtitle="Profile metadata only; no combat or activity simulation is performed.">
      <div className="debug-summary-grid"><div><span>PROFILE ID</span><strong>{profileId}</strong></div><div><span>BANK BALANCE</span><strong>{formatDuration(metadata.offlineBankSeconds)}</strong></div><div><span>BANK CAP</span><strong>{formatDuration(offlineTimePolicy.bankCapSeconds)}</strong></div><div><span>LAST ACTIVE</span><strong>{new Date(metadata.lastActiveAt).toLocaleString()}</strong></div><div><span>LAST PLAYED</span><strong>{new Date(metadata.lastPlayedAt).toLocaleString()}</strong></div><div><span>VISIBILITY</span><strong>{document.visibilityState}</strong></div></div>
      <div className="debug-button-grid"><DebugButton action="offline-add-minute" onClick={() => run("Added 1 minute to the Offline Time Bank.", () => addBank(profileId, 60))}>+1 MINUTE BANK</DebugButton><DebugButton action="offline-add-hour" onClick={() => run("Added 1 hour to the Offline Time Bank.", () => addBank(profileId, 3600))}>+1 HOUR BANK</DebugButton><DebugButton action="offline-add-eight-hours" onClick={() => run("Added 8 hours to the Offline Time Bank.", () => addBank(profileId, 8 * 3600))}>+8 HOURS BANK</DebugButton><DebugButton action="offline-clear-bank" onClick={() => run("Cleared the Offline Time Bank.", () => setBank(profileId, 0))}>CLEAR BANK</DebugButton><DebugButton action="offline-set-cap" onClick={() => run("Set the Offline Time Bank to its cap.", () => setBank(profileId, offlineTimePolicy.bankCapSeconds))}>SET BANK TO CAP</DebugButton></div>
      <div className="debug-button-grid">{simulationDurations.map(([seconds, label]) => <DebugButton key={seconds} action={`offline-${seconds}-settlement`} onClick={() => simulate(seconds)}>{label}</DebugButton>)}</div>
    </DebugSection>
    <DebugSection title="Session lease" subtitle="Ownership prevents two tabs from writing the same profile."><div className="debug-validation-list"><div><strong>STATUS</strong><span>{lease?.ownerId === ownerId && lease.expiresAt > Date.now() ? "OWNED BY THIS TAB" : "NOT OWNED"}</span></div><div><strong>OWNER</strong><span>{lease?.ownerId ? `${lease.ownerId.slice(0, 12)}...` : "none"}</span></div><div><strong>HEARTBEAT</strong><span>{lease ? new Date(lease.heartbeatAt).toLocaleString() : "none"}</span></div><div><strong>EXPIRES</strong><span>{lease ? new Date(lease.expiresAt).toLocaleString() : "none"}</span></div></div><div className="debug-button-row"><DebugButton action="offline-force-lease-renewal" onClick={() => { run("Renewed the owned profile lease.", () => renewProfileSessionLease(profileId, ownerId, Date.now())); setLeaseRevision((value) => value + 1); }}>FORCE LEASE RENEWAL</DebugButton><DebugButton action="offline-release-lease" onClick={() => { run("Released the owned profile lease.", () => releaseOwnedProfileSessionLease(profileId, ownerId)); setLeaseRevision((value) => value + 1); }}>RELEASE OWNED LEASE</DebugButton></div></DebugSection>
    {report && <DebugSection title="Pending report"><div className="debug-validation-list"><div><strong>RAW AWAY</strong><span>{formatDuration(report.rawAwaySeconds)}</span></div><div><strong>CREDITED</strong><span>{formatDuration(report.creditedSeconds)}</span></div><div><strong>DISCARDED</strong><span>{formatDuration(report.discardedSeconds)}</span></div><div><strong>REASON</strong><span>{report.discardReason}</span></div></div></DebugSection>}
  </div>;
}
