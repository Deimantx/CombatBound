import { useEffect, useMemo, useState } from "react";
import type { PlayerActionDefinition } from "../../../../game/combat/combatTypes";
import { isCombatAbilityLoadoutAction } from "../../../../game/combat/playerActions";
import { getCombatAbilityAvailability } from "../../../../game/combatAbilities/combatAbilitySelectors";
import {
  automationPresetConfigEquals,
  snapshotAutomationConfig,
  type CombatAutomationPreset,
} from "../../../../game/automation/automationPresets";
import type { GameState } from "../../../../game/gameState";
import { useGameStore } from "../../../../state/gameStore";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

type PendingPresetAction =
  | { type: "load" | "overwrite" | "delete"; slot: number }
  | null;

export function AutomationPresetsPanel({
  game,
  actions,
  onLoaded,
}: {
  game: GameState;
  actions: PlayerActionDefinition[];
  onLoaded?: (slot: number) => void;
}) {
  const savePreset = useGameStore((state) => state.saveAutomationPreset);
  const loadPreset = useGameStore((state) => state.loadAutomationPreset);
  const renamePreset = useGameStore((state) => state.renameAutomationPreset);
  const clearPreset = useGameStore((state) => state.clearAutomationPreset);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(() =>
    game.combatAutomationPresets.slots.findIndex(Boolean) >= 0
      ? game.combatAutomationPresets.slots.findIndex(Boolean)
      : null,
  );
  const [pending, setPending] = useState<PendingPresetAction>(null);
  const [renamingSlot, setRenamingSlot] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const currentConfig = useMemo(
    () => snapshotAutomationConfig(game.combatAutomation),
    [game.combatAutomation],
  );
  const selectedPreset = selectedSlot === null
    ? undefined
    : game.combatAutomationPresets.slots[selectedSlot] ?? undefined;
  const savedCount = game.combatAutomationPresets.slots.filter(Boolean).length;

  useEffect(() => {
    if (selectedSlot !== null && game.combatAutomationPresets.slots[selectedSlot]) return;
    const first = game.combatAutomationPresets.slots.findIndex(Boolean);
    setSelectedSlot(first >= 0 ? first : null);
  }, [game.combatAutomationPresets.slots, selectedSlot]);

  const isCurrentMatch = (preset: CombatAutomationPreset | null) =>
    Boolean(preset && automationPresetConfigEquals(currentConfig, preset.config));

  const unavailableActionCount = (preset: CombatAutomationPreset) =>
    preset.config.rules.filter((rule) => {
      const action = actions.find((candidate) => candidate.id === rule.actionId);
      if (!action) return true;
      if (action.kind === "spell") return !game.spellbook.equippedSpellSlots.includes(action.id);
      if (isCombatAbilityLoadoutAction(action)) {
        const availability = getCombatAbilityAvailability(game, action.id);
        return !game.combatAbilities.activeSlots.includes(action.id) || !availability.usable;
      }
      return false;
    }).length;

  const requestPresetAction = (type: "load" | "overwrite" | "delete", slot: number) =>
    setPending({ type, slot });

  const confirmPresetAction = () => {
    if (!pending) return;
    if (pending.type === "load") {
      loadPreset(pending.slot);
      setSelectedSlot(pending.slot);
      onLoaded?.(pending.slot);
    } else if (pending.type === "overwrite") {
      savePreset(pending.slot);
      setSelectedSlot(pending.slot);
    } else {
      clearPreset(pending.slot);
      setSelectedSlot((current) => current === pending.slot ? null : current);
    }
    setPending(null);
  };

  const beginRename = (preset: CombatAutomationPreset, slot: number) => {
    setRenamingSlot(slot);
    setRenameValue(preset.name);
  };

  const commitRename = (slot: number) => {
    renamePreset(slot, renameValue);
    setRenamingSlot(null);
  };

  return (
    <section className="automation-presets" data-debug-kind="automation-presets" aria-label="Automation presets">
      <div className="section-title">
        <div>
          <span className="tiny-label">AUTOMATION PRESETS</span>
          <p className="muted-copy">Save and reuse rule and target-priority setups.</p>
        </div>
        <span className="automation-preset-count">{savedCount} / 10 SAVED</span>
      </div>
      <div className="automation-preset-grid">
        {game.combatAutomationPresets.slots.map((preset, slot) => {
          const currentMatch = isCurrentMatch(preset);
          return (
            <div
              key={slot}
              className={`automation-preset-slot ${preset ? "is-occupied" : "is-empty"} ${selectedSlot === slot ? "is-selected" : ""} ${currentMatch ? "is-current" : ""}`}
              data-debug-kind="automation-preset"
              data-debug-slot={slot}
              data-debug-preset-id={preset?.id ?? ""}
              data-debug-empty={!preset}
              data-debug-current-match={currentMatch}
            >
              {preset ? (
                <button
                  className="automation-preset-slot-button"
                  onClick={() => { setSelectedSlot(slot); setRenamingSlot(null); }}
                  aria-label={`Select preset ${slot + 1}: ${preset.name}`}
                >
                  <span className="tiny-label">SLOT {slot + 1}</span>
                  <strong>{preset.name}</strong>
                  <small>{preset.config.rules.length} rules · {preset.config.targetPriorityRules.length} target priorities</small>
                  <em>{currentMatch ? "CURRENT SETUP" : "SAVED SETUP"}</em>
                </button>
              ) : (
                <>
                  <span className="tiny-label">SLOT {slot + 1}</span>
                  <strong>EMPTY</strong>
                  <small>Save the current automation setup here.</small>
                  <button className="button button-ghost compact" onClick={() => { savePreset(slot); setSelectedSlot(slot); }} data-debug-action="save-preset">SAVE CURRENT</button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {selectedPreset && selectedSlot !== null && (
        <div className="automation-preset-detail" data-debug-kind="automation-preset-detail">
          <div className="automation-preset-detail-heading">
            <div>
              <span className="tiny-label">SELECTED PRESET · SLOT {selectedSlot + 1}</span>
              {renamingSlot === selectedSlot ? (
                <div className="automation-preset-rename">
                  <input value={renameValue} maxLength={32} autoFocus onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") commitRename(selectedSlot); if (event.key === "Escape") setRenamingSlot(null); }} aria-label="Preset name" />
                  <button className="button button-primary compact" onClick={() => commitRename(selectedSlot)} data-debug-action="rename-preset">SAVE NAME</button>
                  <button className="button button-ghost compact" onClick={() => setRenamingSlot(null)}>CANCEL</button>
                </div>
              ) : (
                <h3>{selectedPreset.name}</h3>
              )}
            </div>
            <div className="automation-preset-detail-meta">
              <span>{selectedPreset.config.rules.length} rules</span>
              <span>{selectedPreset.config.targetPriorityRules.filter((rule) => rule.enabled).length} active target priorities</span>
              <span>{selectedPreset.config.overrideManualTarget ? "Target override ON" : "Target override OFF"}</span>
            </div>
          </div>
          <div className="automation-preset-preview">
            <span className="tiny-label">TOP RULES</span>
            {selectedPreset.config.rules.length ? (
              <ol>
                {[...selectedPreset.config.rules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id)).slice(0, 4).map((rule) => (
                  <li key={rule.id}><strong>{rule.priority}</strong> {actions.find((action) => action.id === rule.actionId)?.name ?? rule.actionId}{!rule.enabled && " · disabled"}</li>
                ))}
              </ol>
            ) : <span className="muted-copy">No rules saved.</span>}
            {unavailableActionCount(selectedPreset) > 0 && <span className="automation-preset-warning">{unavailableActionCount(selectedPreset)} rule action{unavailableActionCount(selectedPreset) === 1 ? "" : "s"} currently unavailable; the saved rule remains intact.</span>}
          </div>
          <div className="automation-preset-actions">
            <button className="button button-primary" onClick={() => requestPresetAction("load", selectedSlot)} data-debug-action="load-preset">LOAD</button>
            <button className="button button-ghost" onClick={() => requestPresetAction("overwrite", selectedSlot)} data-debug-action="save-preset">OVERWRITE</button>
            <button className="button button-ghost" onClick={() => beginRename(selectedPreset, selectedSlot)} data-debug-action="rename-preset">RENAME</button>
            <button className="button button-danger" onClick={() => requestPresetAction("delete", selectedSlot)} data-debug-action="delete-preset">DELETE</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending?.type === "load" ? "Load automation preset?" : pending?.type === "overwrite" ? "Overwrite automation preset?" : "Delete automation preset?"}
        message={pending?.type === "load" ? "This replaces the current automation rules and target priorities. Combat runtime, resources, cooldowns, equipment, and the master switch are preserved." : pending?.type === "overwrite" ? "The selected preset will be replaced with the current automation configuration." : "This preset will be deleted. The current automation configuration will not change."}
        confirmLabel={pending?.type === "load" ? "Load preset" : pending?.type === "overwrite" ? "Overwrite" : "Delete preset"}
        onCancel={() => setPending(null)}
        onConfirm={confirmPresetAction}
      />
    </section>
  );
}
