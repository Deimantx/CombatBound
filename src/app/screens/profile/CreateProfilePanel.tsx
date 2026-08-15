import { ArrowLeft, Lock, ShieldPlus } from "lucide-react";
import { useState } from "react";
import type { Difficulty, GameType, ProfileSlot } from "../../../game/profiles/profileTypes";
import { createAndEnterProfile } from "../../profile/profileSessionController";

export function CreateProfilePanel({ slot, onBack }: { slot: ProfileSlot; onBack: () => void }) {
  const [gameType] = useState<GameType>("regular");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [error, setError] = useState<string | null>(null);
  const create = () => {
    const created = createAndEnterProfile(slot, gameType, difficulty);
    if (!created) setError("That profile slot is no longer available.");
  };
  return <section className="profile-create-panel" data-debug-kind="create-profile" data-debug-profile-slot={slot} data-debug-slot={slot}>
    <div className="profile-create-heading"><button className="button button-ghost button-small" onClick={onBack}><ArrowLeft size={14} />Back</button><div><span className="eyebrow">NEW PROFILE / SLOT {slot}</span><h2>Prepare a new hunter</h2><p>Choose the foundation for this save slot. More game types can be added later.</p></div></div>
    <div className="profile-option-section"><span className="profile-select-label">Game Type</span><div className="profile-choice-grid profile-choice-grid-single"><div className="profile-choice is-selected"><ShieldPlus size={20} /><div><strong>Regular</strong><small>Standard CombatBound progression and rules.</small></div><span className="profile-choice-check">SELECTED</span></div></div></div>
    <div className="profile-option-section"><span className="profile-select-label">Difficulty</span><div className="profile-choice-grid"><button type="button" className={`profile-choice ${difficulty === "normal" ? "is-selected" : ""}`} onClick={() => setDifficulty("normal")}><ShieldPlus size={18} /><div><strong>Normal</strong><small>Standard enemy scaling and progression.</small></div><span className="profile-choice-check">SELECTED</span></button><button type="button" className="profile-choice is-locked" disabled title="Not available yet."><Lock size={18} /><div><strong>Hard</strong><small>Locked for this foundation release.</small></div><span className="profile-choice-check">LOCKED</span></button><button type="button" className="profile-choice is-locked" disabled title="Not available yet."><Lock size={18} /><div><strong>Custom</strong><small>Locked for this foundation release.</small></div><span className="profile-choice-check">LOCKED</span></button></div></div>
    {error && <p className="profile-error">{error}</p>}
    <button className="button button-primary profile-create-action" onClick={create} data-debug-action="create-profile">Create &amp; Play</button>
  </section>;
}
