import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { effectDefinitions } from "../../../../game/data/effects";
import { createCombatPreviewContext } from "../../../../game/combat/combatEngine";
import { getPlayerActionDefinitions } from "../../../../game/combat/playerActions";
import { getAutomationSummary } from "../../../../game/automation/automationLogic";
import type { AutomationCondition, AutomationRule } from "../../../../game/automation/automationTypes";
import { useGameStore } from "../../../../state/gameStore";
import type { GameState } from "../../../../game/gameState";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

const fractionTypes = new Set([
  "player-hp-below", "player-hp-above", "mana-below", "mana-above",
  "stamina-below", "stamina-above", "target-hp-below", "target-hp-above", "barrier-below",
]);
const conditionOptions: Array<{ value: AutomationCondition["type"]; label: string }> = [
  { value: "always", label: "Always" },
  { value: "player-hp-below", label: "Player HP below %" },
  { value: "player-hp-above", label: "Player HP above %" },
  { value: "mana-below", label: "Mana below %" },
  { value: "mana-above", label: "Mana above %" },
  { value: "stamina-below", label: "Stamina below %" },
  { value: "stamina-above", label: "Stamina above %" },
  { value: "target-hp-below", label: "Target HP below %" },
  { value: "target-hp-above", label: "Target HP above %" },
  { value: "player-has-effect", label: "Player has Effect" },
  { value: "player-missing-effect", label: "Player missing Effect" },
  { value: "target-has-effect", label: "Target has Effect" },
  { value: "target-missing-effect", label: "Target missing Effect" },
  { value: "barrier-missing", label: "Barrier missing" },
  { value: "barrier-below", label: "Barrier below %" },
  { value: "target-casting", label: "Target is casting" },
  { value: "target-interruptible", label: "Action interruptible" },
  { value: "target-danger-at-least", label: "Danger at least" },
  { value: "alive-enemies-at-least", label: "Alive enemies at least" },
];

export function AutomationWindow({ game, initialActionId, createRule = false }: { game: GameState; initialActionId?: string; createRule?: boolean }) {
  const context = useMemo(() => createCombatPreviewContext(), []);
  const actions = useMemo(() => getPlayerActionDefinitions(game, context).filter((action) => action.kind !== "basic-attack" && (action.kind !== "spell" || game.spellbook.knownSpellIds.includes(action.id))), [context, game.spellbook.knownSpellIds]);
  const setAutomationEnabled = useGameStore((state) => state.setAutomationEnabled);
  const setAutomationOverride = useGameStore((state) => state.setAutomationOverrideManualTarget);
  const addRule = useGameStore((state) => state.addAutomationRule);
  const deleteRule = useGameStore((state) => state.deleteAutomationRule);
  const setRuleEnabled = useGameStore((state) => state.setAutomationRuleEnabled);
  const moveRule = useGameStore((state) => state.moveAutomationRule);
  const updateRule = useGameStore((state) => state.updateAutomationRule);
  const setPriorityEnabled = useGameStore((state) => state.setTargetPriorityEnabled);
  const movePriority = useGameStore((state) => state.moveTargetPriority);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(game.combatAutomation.rules[0]?.id ?? null);
  const [draftRule, setDraftRule] = useState<AutomationRule | null>(null);
  const [pendingDeleteRuleId, setPendingDeleteRuleId] = useState<string | null>(null);
  useEffect(() => {
    if (createRule) {
      const actionId = initialActionId && actions.some((action) => action.id === initialActionId)
        ? initialActionId
        : game.spellbook.equippedSpellSlots.find(Boolean) ?? actions[0]?.id ?? "";
      setDraftRule({ id: `automation-rule.draft-${Date.now()}`, actionId, priority: (game.combatAutomation.rules.length + 1) * 10, enabled: true, conditions: [{ type: "always" }] });
      setSelectedRuleId(null);
    } else if (initialActionId) {
      setSelectedRuleId(game.combatAutomation.rules.find((rule) => rule.actionId === initialActionId)?.id ?? null);
    }
  }, [actions, createRule, initialActionId]);
  useEffect(() => {
    if (draftRule) return;
    if (!game.combatAutomation.rules.some((rule) => rule.id === selectedRuleId))
      setSelectedRuleId(initialActionId ? null : game.combatAutomation.rules[0]?.id ?? null);
  }, [draftRule, game.combatAutomation.rules, initialActionId, selectedRuleId]);
  const summary = getAutomationSummary(game.combatAutomation, new Set(actions.map((action) => action.id)));
  const selectedRule = game.combatAutomation.rules.find((rule) => rule.id === selectedRuleId);
  const addNewRule = () => {
    const actionId = game.spellbook.equippedSpellSlots.find(Boolean) ?? actions[0]?.id ?? "";
    if (!actionId) return;
    setDraftRule({ id: `automation-rule.draft-${Date.now()}`, actionId, priority: (game.combatAutomation.rules.length + 1) * 10, enabled: true, conditions: [{ type: "always" }] });
    setSelectedRuleId(null);
  };
  const saveDraft = (patch: Partial<Omit<AutomationRule, "id">>) => {
    if (!draftRule || !patch.actionId) return;
    addRule({ actionId: patch.actionId, priority: patch.priority, enabled: true, conditions: patch.conditions });
    const added = useGameStore.getState().game.combatAutomation.rules.at(-1);
    setDraftRule(null);
    setSelectedRuleId(added?.id ?? null);
  };
  const confirmDelete = () => {
    if (!pendingDeleteRuleId) return;
    deleteRule(pendingDeleteRuleId);
    setPendingDeleteRuleId(null);
    setSelectedRuleId(null);
  };
  return (
    <>
      <div className="automation-window" data-debug-kind="automation-window">
      <div className="automation-master-controls">
        <button className={`button ${game.combatAutomation.enabled ? "button-primary" : "button-ghost"}`} onClick={() => setAutomationEnabled(!game.combatAutomation.enabled)} data-debug-kind="automation-master-toggle">MASTER AUTOMATION · {game.combatAutomation.enabled ? "ENABLED" : "DISABLED"}</button>
        <button className={`button ${game.combatAutomation.overrideManualTarget ? "button-primary" : "button-ghost"}`} onClick={() => setAutomationOverride(!game.combatAutomation.overrideManualTarget)}>AUTO TARGET OVERRIDE · {game.combatAutomation.overrideManualTarget ? "ON" : "OFF"}</button>
        <span className="muted-copy">{summary.enabledRuleCount} / {summary.totalRuleCount} rules active · {summary.invalidRuleCount} need attention</span>
      </div>
      <p className="automation-explanation">Rules are checked from highest priority to lowest. The first rule whose conditions are true and whose action can currently be used executes. If an action cannot be used, lower-priority rules are still checked.</p>
      <div className="automation-editor-layout">
        <section className="automation-rule-list" aria-label="Automation rules">
          <div className="section-title"><span className="tiny-label">RULES</span><button className="button button-ghost" onClick={addNewRule}><Plus size={13} /> ADD RULE</button></div>
          {[...game.combatAutomation.rules].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id)).map((rule) => {
            const action = actions.find((candidate) => candidate.id === rule.actionId);
            const inactive = rule.actionId.startsWith("spell.") && !game.spellbook.equippedSpellSlots.includes(rule.actionId);
            return <button key={rule.id} className={`automation-rule-card ${selectedRuleId === rule.id && !draftRule ? "is-selected" : ""} ${rule.enabled ? "is-enabled" : "is-disabled"}`} onClick={() => { setDraftRule(null); setSelectedRuleId(rule.id); }} data-debug-kind="automation-rule" data-debug-rule-id={rule.id} data-debug-action-id={rule.actionId} data-debug-priority={rule.priority} data-debug-enabled={rule.enabled} data-debug-config-valid={Boolean(action)}>{(action?.name ?? rule.actionId) || "Missing action"}<small>{!action ? "INVALID CONFIG · MISSING ACTION" : inactive ? "INACTIVE · SPELL NOT EQUIPPED" : rule.enabled ? "READY" : "DISABLED"}</small></button>;
          })}
          <div className="target-priority-list"><div className="section-title"><span className="tiny-label">TARGET PRIORITY</span></div>{[...game.combatAutomation.targetPriorityRules].sort((a, b) => a.priority - b.priority).map((priority, index, list) => <div className="target-priority-row" key={priority.id}><span>{priority.priority} {targetCriterionLabel(priority.criterion)}</span><button className={`button button-ghost compact ${priority.enabled ? "is-active" : ""}`} onClick={() => setPriorityEnabled(priority.id, !priority.enabled)}>{priority.enabled ? "ON" : "OFF"}</button><button className="icon-button compact" aria-label="Move target priority up" disabled={index === 0} onClick={() => movePriority(priority.id, "up")}><ArrowUp size={12} /></button><button className="icon-button compact" aria-label="Move target priority down" disabled={index === list.length - 1} onClick={() => movePriority(priority.id, "down")}><ArrowDown size={12} /></button></div>)}</div>
        </section>
        <section className="automation-editor" aria-label="Automation rule editor">
          {draftRule ? <RuleEditor key={draftRule.id} rule={draftRule} actions={actions} isDraft onSave={saveDraft} onCancel={() => setDraftRule(null)} /> : selectedRule ? <RuleEditor key={selectedRule.id} rule={selectedRule} actions={actions} onSave={(patch) => updateRule(selectedRule.id, patch)} onDelete={() => setPendingDeleteRuleId(selectedRule.id)} onToggle={(enabled) => setRuleEnabled(selectedRule.id, enabled)} onMove={(direction) => moveRule(selectedRule.id, direction)} onCancel={() => undefined} /> : <span className="muted-copy">Select a rule or add one to begin.</span>}
        </section>
      </div>
    </div>
      <ConfirmDialog open={Boolean(pendingDeleteRuleId)} title="Delete automation rule?" message="This rule will stop running and be removed from the saved automation configuration." confirmLabel="Delete rule" onCancel={() => setPendingDeleteRuleId(null)} onConfirm={confirmDelete} />
    </>
  );
}

function RuleEditor({ rule, actions, isDraft = false, onSave, onDelete, onToggle, onMove, onCancel }: { rule: AutomationRule; actions: ReturnType<typeof getPlayerActionDefinitions>; isDraft?: boolean; onSave: (patch: Partial<Omit<AutomationRule, "id">>) => void; onDelete?: () => void; onToggle?: (enabled: boolean) => void; onMove?: (direction: "up" | "down") => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<AutomationRule>(rule);
  useEffect(() => setDraft(rule), [rule]);
  const updateCondition = (index: number, condition: AutomationCondition) => setDraft((current) => ({ ...current, conditions: current.conditions.map((entry, entryIndex) => entryIndex === index ? condition : entry) }));
  const addCondition = () => setDraft((current) => ({ ...current, conditions: [...current.conditions, { type: "always" }] }));
  const removeCondition = (index: number) => setDraft((current) => ({ ...current, conditions: current.conditions.filter((_, entryIndex) => entryIndex !== index) }));
  return <div className="automation-rule-editor-content" data-debug-kind="automation-rule-editor">
    <div className="editor-heading"><div><span className="tiny-label">RULE EDITOR</span><h3>{(actions.find((action) => action.id === draft.actionId)?.name ?? draft.actionId) || "Missing action"}</h3></div><span className={`automation-config-status ${actions.some((action) => action.id === draft.actionId) ? "is-ready" : "is-invalid"}`}>{actions.some((action) => action.id === draft.actionId) ? (draft.actionId.startsWith("spell.") ? "READY / LOADOUT STATUS SHOWN" : "READY") : "INVALID CONFIG · MISSING ACTION"}</span></div>
    <label className="hero-field"><span>Action</span><select value={draft.actionId} onChange={(event) => setDraft((current) => ({ ...current, actionId: event.target.value }))} data-hero-window-focus><option value="">Choose action</option><optgroup label="SPELLS">{actions.filter((action) => action.kind === "spell").map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}</optgroup><optgroup label="ACTIVE DEFENSE">{actions.filter((action) => action.kind === "defensive").map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}</optgroup><optgroup label="CONSUMABLES">{actions.filter((action) => action.kind === "consumable").map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}</optgroup></select></label>
    <label className="hero-field"><span>Priority</span><input type="number" min="1" value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: Number(event.target.value) }))} /></label>
    <div className="section-title"><span className="tiny-label">CONDITIONS · ALL MUST MATCH</span><button className="button button-ghost" onClick={addCondition}><Plus size={13} /> ADD CONDITION</button></div>
    {draft.conditions.map((condition, index) => <ConditionEditor key={index} condition={condition} onChange={(next) => updateCondition(index, next)} onRemove={() => removeCondition(index)} />)}
    <div className="automation-editor-actions"><button className="button button-primary" disabled={!draft.actionId} onClick={() => onSave({ actionId: draft.actionId, priority: draft.priority, conditions: draft.conditions })}>SAVE</button>{isDraft ? <button className="button button-ghost" onClick={onCancel}>CANCEL</button> : <><button className="button button-ghost" onClick={() => onToggle?.(!rule.enabled)}>{rule.enabled ? "DISABLE" : "ENABLE"}</button><button className="button button-ghost" onClick={() => onMove?.("up")}><ArrowUp size={13} /> UP</button><button className="button button-ghost" onClick={() => onMove?.("down")}><ArrowDown size={13} /> DOWN</button><button className="button button-danger" onClick={onDelete}><Trash2 size={13} /> DELETE</button><button className="button button-ghost" onClick={onCancel}>CANCEL</button></>}</div>
  </div>;
}

function ConditionEditor({ condition, onChange, onRemove }: { condition: AutomationCondition; onChange: (condition: AutomationCondition) => void; onRemove: () => void }) {
  const updateType = (type: AutomationCondition["type"]) => onChange(defaultCondition(type));
  return <div className="automation-condition-row" data-debug-kind="automation-condition" data-debug-condition-type={condition.type}><select value={condition.type} onChange={(event) => updateType(event.target.value as AutomationCondition["type"])}>{conditionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{fractionTypes.has(condition.type) && "fraction" in condition && <input type="number" min="0" max="100" step="1" value={Math.round(condition.fraction * 100)} onChange={(event) => onChange({ ...condition, fraction: Math.max(0, Math.min(1, Number(event.target.value) / 100)) })} />}{"effectId" in condition && <select value={condition.effectId} onChange={(event) => onChange({ ...condition, effectId: event.target.value })}>{effectDefinitions.map((effect) => <option key={effect.id} value={effect.id}>{effect.name}</option>)}</select>}{condition.type === "target-danger-at-least" && <select value={condition.danger} onChange={(event) => onChange({ ...condition, danger: event.target.value as typeof condition.danger })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>}{condition.type === "alive-enemies-at-least" && <input type="number" min="1" step="1" value={condition.count} onChange={(event) => onChange({ ...condition, count: Math.max(1, Math.floor(Number(event.target.value))) })} />}<button className="icon-button compact" onClick={onRemove} aria-label="Remove condition"><Trash2 size={12} /></button><span className="condition-readable">{conditionLabel(condition)}</span></div>;
}

function defaultCondition(type: AutomationCondition["type"]): AutomationCondition {
  if (fractionTypes.has(type)) return { type: type as never, fraction: 0.5 };
  if (type === "barrier-missing" || type === "target-casting" || type === "target-interruptible" || type === "always") return { type };
  if (type === "target-danger-at-least") return { type, danger: "high" };
  if (type === "alive-enemies-at-least") return { type, count: 1 };
  return { type: type as "player-has-effect", effectId: "effect.burn" };
}

function conditionLabel(condition: AutomationCondition) {
  if (condition.type === "always") return "Always";
  if ("fraction" in condition) return `${conditionOptions.find((option) => option.value === condition.type)?.label ?? condition.type} ${Math.round(condition.fraction * 100)}%`;
  if ("effectId" in condition) return `${conditionOptions.find((option) => option.value === condition.type)?.label ?? condition.type}: ${effectDefinitions.find((effect) => effect.id === condition.effectId)?.name ?? condition.effectId}`;
  if (condition.type === "target-danger-at-least") return `Target danger at least ${condition.danger}`;
  if (condition.type === "alive-enemies-at-least") return `Alive enemies at least ${condition.count}`;
  return conditionOptions.find((option) => option.value === condition.type)?.label ?? condition.type;
}

function targetCriterionLabel(criterion: string) {
  return criterion.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
