import { Bot, Sparkles, Zap } from "lucide-react";
import { basicAttackAction, getActiveAbilityActionDefinitions } from "../../../../game/combat/playerActions";
import { getAutomationSummary } from "../../../../game/automation/automationLogic";
import { spellById } from "../../../../game/data/spells";
import { getMagicSchoolPresentation, magicSchoolOrder } from "../../../../game/presentation/magicSchool";
import { COMBAT_SPELL_SLOT_COUNT } from "../../../../game/spellbook/spellbookTypes";
import { useGameStore } from "../../../../state/gameStore";
import { HeroBuildPreviewSlots, HeroSystemCard } from "./HeroSystemCard";

export function HeroBuildSystems({ onOpen }: { onOpen: (system: "abilities" | "spellbook" | "automation", opener: HTMLButtonElement) => void }) {
  const activeSlots = useGameStore((state) => state.game.combatAbilities.activeSlots);
  const techniqueSlots = useGameStore((state) => state.game.combatAbilities.techniqueSlots);
  const knownSpellIds = useGameStore((state) => state.game.spellbook.knownSpellIds);
  const equippedSpellSlots = useGameStore((state) => state.game.spellbook.equippedSpellSlots);
  const automation = useGameStore((state) => state.game.combatAutomation);
  const actionIds = new Set([basicAttackAction.id, ...getActiveAbilityActionDefinitions().map((action) => action.id), ...knownSpellIds]);
  const automationSummary = getAutomationSummary(automation, actionIds);
  const schools = magicSchoolOrder.filter((schoolId) => knownSpellIds.some((id) => spellById[id]?.magicProficiencyId === schoolId));
  const knownAbilities = new Map(getActiveAbilityActionDefinitions().map((action) => [action.id, action]));
  const abilityPreview = activeSlots.map((actionId) => ({ actionId, icon: actionId ? knownAbilities.get(actionId)?.icon : undefined }));
  const spellPreview = Array.from({ length: COMBAT_SPELL_SLOT_COUNT }, (_, index) => {
    const actionId = equippedSpellSlots[index];
    return { actionId, icon: actionId ? spellById[actionId]?.icon : undefined };
  });
  const techniquePreview = techniqueSlots.map((techniqueId) => ({ actionId: techniqueId, icon: techniqueId ? "spark" : undefined }));

  return (
    <section className="hero-build-systems" data-debug-kind="hero-build-systems">
      <div className="hero-build-systems-heading"><span className="tiny-label">BUILD SYSTEMS</span><small>Open a full workspace when you need to tune a loadout.</small></div>
      <div className="hero-build-system-grid">
        <HeroSystemCard system="abilities" title="COMBAT ABILITIES" description="Active actions and sustained techniques" summary={<><strong>{activeSlots.filter(Boolean).length} / {activeSlots.length} active</strong><small>{techniqueSlots.filter(Boolean).length} / {techniqueSlots.length} techniques</small></>} preview={<HeroBuildPreviewSlots slots={[...abilityPreview, ...techniquePreview]} />} icon={Zap} onOpen={(opener) => onOpen("abilities", opener)} />
        <HeroSystemCard system="spellbook" title="SPELLBOOK" description="Known Magic and Combat loadout" summary={<><strong>{knownSpellIds.length} known · {equippedSpellSlots.filter(Boolean).length} / {equippedSpellSlots.length} equipped</strong><small>{schools.length ? schools.slice(0, 3).map((id) => getMagicSchoolPresentation(id).label).join(" · ") : "No schools discovered"}</small></>} preview={<HeroBuildPreviewSlots slots={spellPreview} />} icon={Sparkles} onOpen={(opener) => onOpen("spellbook", opener)} />
        <HeroSystemCard system="automation" title="COMBAT AUTOMATION" description="Rules, priorities and targeting" summary={<><strong>{automation.enabled ? "ENABLED" : "DISABLED"} · {automationSummary.enabledRuleCount} / {automationSummary.totalRuleCount} active</strong><small>{automation.overrideManualTarget ? "Manual target override on" : "Manual target override off"}{automationSummary.invalidRuleCount ? ` · ${automationSummary.invalidRuleCount} needs attention` : ""}</small></>} preview={<HeroBuildPreviewSlots slots={automation.rules.slice(0, 5).map((rule) => ({ actionId: rule.actionId, icon: rule.actionId ? spellById[rule.actionId]?.icon : undefined, label: rule.actionId ?? "Empty rule" }))} />} icon={Bot} onOpen={(opener) => onOpen("automation", opener)} />
      </div>
    </section>
  );
}
