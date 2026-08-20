import { Bot, Zap } from "lucide-react";
import { basicAttackAction, getActiveAbilityActionDefinitions } from "../../../../game/combat/playerActions";
import { getAutomationSummary } from "../../../../game/automation/automationLogic";
import { getKnownCombatAbilities } from "../../../../game/combatAbilities/combatAbilitySelectors";
import { useGameStore } from "../../../../state/gameStore";
import { HeroBuildPreviewSlots, HeroSystemCard } from "./HeroSystemCard";

export function HeroBuildSystems({ onOpen }: { onOpen: (system: "abilities" | "automation", opener: HTMLButtonElement) => void }) {
  const slots = useGameStore((state) => state.game.combatAbilities.slots);
  const magicArts = useGameStore((state) => state.game.magicArts);
  const game = useGameStore((state) => state.game);
  const automation = useGameStore((state) => state.game.combatAutomation);
  const actionIds = new Set([basicAttackAction.id, ...getActiveAbilityActionDefinitions().map((action) => action.id), ...magicArts.knownArtIds]);
  const automationSummary = getAutomationSummary(automation, actionIds);
  const knownActions = new Map(getKnownCombatAbilities(game).map((action) => [action.kind === "core" ? action.id : action.actionId, action]));
  const abilityPreview = Array.from({ length: 5 }, (_, index) => { const actionId = slots[index] ?? null; return { actionId, icon: actionId ? knownActions.get(actionId)?.icon : undefined }; });
  return <section className="hero-build-systems" data-debug-kind="hero-build-systems">
    <div className="hero-build-systems-heading"><span className="tiny-label">BUILD SYSTEMS</span><small>Open a full workspace when you need to tune a loadout.</small></div>
    <div className="hero-build-system-grid">
      <HeroSystemCard system="abilities" title="COMBAT ABILITIES" description="Five shared slots for weapons, defenses and Magic Arts" summary={<><strong>{slots.filter(Boolean).length} / 5 equipped</strong><small>{magicArts.knownArtIds.length} authored Magic Art{magicArts.knownArtIds.length === 1 ? "" : "s"}</small></>} preview={<HeroBuildPreviewSlots slots={abilityPreview} />} icon={Zap} onOpen={(opener) => onOpen("abilities", opener)} />
      <HeroSystemCard system="automation" title="COMBAT AUTOMATION" description="Rules for the selected target" summary={<><strong>{automation.enabled ? "ENABLED" : "DISABLED"} · {automationSummary.enabledRuleCount} / {automationSummary.totalRuleCount} active</strong><small>{automationSummary.invalidRuleCount ? `${automationSummary.invalidRuleCount} need attention` : "Manual target remains authoritative"}</small></>} preview={<HeroBuildPreviewSlots slots={automation.rules.slice(0, 5).map((rule) => ({ actionId: rule.actionId, icon: rule.actionId ? knownActions.get(rule.actionId)?.icon : undefined, label: rule.actionId ?? "Empty rule" }))} />} icon={Bot} onOpen={(opener) => onOpen("automation", opener)} />
    </div>
  </section>;
}
