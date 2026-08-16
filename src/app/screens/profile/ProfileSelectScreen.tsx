import { Database, Lock, Plus, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
import { masteryLevelForXp } from "../../../game/progression/masteryProgression";
import { formatDuration, formatProfileAge } from "../../../game/profiles/profileFormatting";
import { getProfileSave, useProfileStore } from "../../../state/profileStore";
import type { ProfileMetadata, ProfileSlot } from "../../../game/profiles/profileTypes";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { CreateProfilePanel } from "./CreateProfilePanel";
import { loadAndEnterProfile } from "../../profile/profileSessionController";

function ProfileCard({ slot, metadata, onCreate, onError }: { slot: ProfileSlot; metadata: ProfileMetadata | null; onCreate: (slot: ProfileSlot) => void; onError: (message: string) => void }) {
  const deleteProfile = useProfileStore((state) => state.deleteProfile);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const save = metadata ? getProfileSave(metadata.id) : null;
  const corrupt = Boolean(metadata && !save);
  const load = () => {
    if (!metadata) return onCreate(slot);
    const result = loadAndEnterProfile(metadata.id);
    if (!result.ok) onError(result.error ?? "Unable to load profile.");
  };
  return <article className={`profile-card profile-slot-card ${metadata ? "is-occupied is-ready" : "is-empty"} ${corrupt ? "is-corrupt is-error" : ""}`} data-debug-kind="profile-slot" data-debug-profile-slot={slot} data-debug-slot={slot} data-debug-profile-id={metadata?.id ?? `profile-${slot}`} data-debug-empty={metadata ? "false" : "true"}>
    <div className="profile-card-top"><span className="profile-slot-label">PROFILE {slot}</span>{metadata ? <span className="profile-card-status"><span className="status-dot" />READY</span> : <span className="profile-card-status is-empty">EMPTY</span>}</div>
    {metadata && !corrupt ? <><div className="profile-card-hero"><div className="profile-avatar"><Shield size={25} /></div><div><h2>Profile {slot}</h2><p>Regular · Normal</p></div></div><div className="profile-stats"><div><span>MASTERY</span><strong>{masteryLevelForXp(save?.progression.masteryXp ?? 0)}</strong></div><div><span>LAST PLAYED</span><strong>{formatProfileAge(metadata.lastPlayedAt)}</strong></div><div><span>TIME BANK</span><strong>{formatDuration(metadata.offlineBankSeconds)}</strong></div></div><button className="button button-primary full-button" onClick={load} data-debug-action="load-profile">Load Game</button><button className="profile-delete-button" onClick={() => setDeleteOpen(true)} data-debug-action="delete-profile"><Trash2 size={13} />Delete Profile</button></> : corrupt ? <><div className="profile-empty-content"><Database size={27} /><h2>Save error</h2><p>This profile metadata exists, but its GameSaveV9 data cannot be read.</p></div><button className="button button-danger full-button" onClick={() => setDeleteOpen(true)}>Delete Corrupt Profile</button></> : <div className="profile-empty-content"><Plus size={28} /><h2>Empty Slot</h2><p>Create a separate profile with isolated progress, inventory, and combat state.</p><button className="button button-secondary full-button" onClick={load} data-debug-action="new-profile">New Profile</button></div>}
    {metadata && <ConfirmDialog open={deleteOpen} title={`Delete Profile ${slot}?`} message="This permanently removes the profile save and its offline time bank. This cannot be undone." confirmLabel="Delete profile" onCancel={() => setDeleteOpen(false)} onConfirm={() => { deleteProfile(metadata.id); setDeleteOpen(false); }} />}
  </article>;
}

export function ProfileSelectScreen() {
  const slots = useProfileStore((state) => state.index.slots);
  const [createSlot, setCreateSlot] = useState<ProfileSlot | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (createSlot) return <main className="profile-screen profile-select-screen" data-debug-screen="profile-select"><div className="profile-brand"><Shield size={20} /><span>COMBATBOUND IDLE</span></div><CreateProfilePanel slot={createSlot} onBack={() => setCreateSlot(null)} /></main>;
  return <main className="profile-screen profile-select-screen" data-debug-screen="profile-select"><div className="profile-brand"><Shield size={20} /><span>COMBATBOUND IDLE</span><small>PROFILE SELECT</small></div><div className="profile-heading"><span className="eyebrow">SAVE MANAGEMENT / 3 SLOTS</span><h1>Choose your profile</h1><p>Each profile has independent progression, inventory, equipment, collection, and offline time.</p></div>{error && <div className="profile-error profile-error-banner">{error}</div>}<div className="profile-grid profile-slot-grid">{slots.map((metadata, index) => <ProfileCard key={index + 1} slot={(index + 1) as ProfileSlot} metadata={metadata} onCreate={setCreateSlot} onError={setError} />)}</div><div className="profile-footer"><Lock size={13} /> Hard and Custom difficulties are reserved for a future update.</div></main>;
}
