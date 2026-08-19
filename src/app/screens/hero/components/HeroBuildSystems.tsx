import { Bot, Zap } from "lucide-react";
import { basicAttackAction, getActiveAbilityActionDefinitions } from "../../../../game/combat/playerActions";
import { getAutomationSummary } from "../../../../game/automation/automationLogic";
import { spellById } from "../../../../game/data/spells";
import { useGameStore } from "../../../../state/gameStore";
import { HeroBuildPreviewSlots, HeroSystemCard } from "./HeroSystemCard";

export function HeroBuildSystems({ onOpen }: { onOpen: (system: "abilities" | "automation", opener: HTMLButtonElement) => void }) {
  const slots = useGameStore((state) => state.game.combatAbilities.slots);
  const knownSpellIds = useGameStore((state) => state.game.spellbook.knownSpellIds);
  const automation = useGameStore((state) => state.game.combatAutomation);
  const actionIds = new Set([basicAttackAction.id, ...getActiveAbilityActionDefinitions().map((action) => action.id), ...knownSpellIds]);
  const automationSummary = getAutomationSummary(automation, actionIds);
  const knownActions = new Map([...getActiveAbilityActionDefinitions(), ...knownSpellIds.map((id) => spellById[id]).filter((spell): spell is NonNullable<typeof spell> => Boolean(spell))].map((action) => [action.id, action]));
  const abilityPreview = Array.from({ length: 5 }, (_, index) => {
    const actionId = slots[index] ?? null;
    return { actionId, icon: actionId ? knownActions.get(actionId)?.icon : undefined };
  });
  return <section className="hero-build-systems" data-debug-kind="hero-build-systems">
    <div className="hero-build-systems-heading"><span className="tiny-label">BUILD SYSTEMS</span><small>Open a full workspace when you need to tune a loadout.</small></div>
    <div className="hero-build-system-grid">
      <HeroSystemCard system="abilities" title="COMBAT ABILITIES" description="Five shared slots for weapons, defenses and Magic" summary={<><strong>{slots.filter(Boolean).length} / 5 equipped</strong><small>{knownSpellIds.length} known spells</small></>} preview={<HeroBuildPreviewSlots slots={abilityPreview} />} icon={Zap} onOpen={(opener) => onOpen("abilities", opener)} />
      <HeroSystemCard system="automation" title="COMBAT AUTOMATION" description="Rules, priorities and targeting" summary={<><strong>{automation.enabled ? "ENABLED" : "DISABLED"} · {automationSummary.enabledRuleCount} / {automationSummary.totalRuleCount} active</strong><small>{automation.overrideManualTarget ? "Manual target override on" : "Manual target override off"}{automationSummary.invalidRuleCount ? ` · ${automationSummary.invalidRuleCount} needs attention` : ""}</small></>} preview={<HeroBuildPreviewSlots slots={automation.rules.slice(0, 5).map((rule) => ({ actionId: rule.actionId, icon: rule.actionId ? knownActions.get(rule.actionId)?.icon : undefined, label: rule.actionId ?? "Empty rule" }))} />} icon={Bot} onOpen={(opener) => onOpen("automation", opener)} />
    </div>
  </section>;
}
