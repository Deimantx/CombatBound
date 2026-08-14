import { Bot, Shield, Sparkles, Swords } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { calculateHunterCombatStats } from "../../../game/equipment/derivedStats";
import { getActiveWeaponProficiency } from "../../../game/progression/progressionSelectors";
import { getProficiencyLevel } from "../../../game/progression/proficiencyProgression";
import { masteryLevelForXp } from "../../../game/progression/masteryProgression";
import { proficiencyById } from "../../../game/data/proficiencies";
import { getPlayerActionDefinitions } from "../../../game/combat/playerActions";
import { createCombatPreviewContext } from "../../../game/combat/combatEngine";
import { getAutomationSummary } from "../../../game/automation/automationLogic";
import { getMagicSchoolPresentation, magicSchoolOrder } from "../../../game/presentation/magicSchool";
import { useGameStore } from "../../../state/gameStore";
import { ScreenHeading } from "../../shell/ScreenHeading";
import { HeroSystemCard } from "./components/HeroSystemCard";
import { HeroWindow, type HeroWindowId } from "./components/HeroWindow";
import { EquipmentWindow } from "./components/EquipmentWindow";
import { SpellbookWindow } from "./components/SpellbookWindow";
import { AutomationWindow } from "./components/AutomationWindow";
import { CombatStatsWindow } from "./components/CombatStatsWindow";
import type { HeroWindowRequest } from "../../../shared/types";

export function HeroScreen() {
  const game = useGameStore((state) => state.game);
  const windowRequest = useGameStore((state) => state.heroWindowRequest);
  const clearWindowRequest = useGameStore((state) => state.clearHeroWindowRequest);
  const [windowId, setWindowId] = useState<HeroWindowId>(null);
  const [automationRequest, setAutomationRequest] = useState<Omit<HeroWindowRequest, "window"> | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const openWindow = useCallback((id: Exclude<HeroWindowId, null>, opener?: HTMLButtonElement, request?: Omit<HeroWindowRequest, "window">) => {
    if (opener) openerRef.current = opener;
    setAutomationRequest(id === "automation" ? request ?? null : null);
    setWindowId(id);
  }, []);
  const closeWindow = useCallback(() => {
    setWindowId(null);
    setAutomationRequest(null);
  }, []);
  useEffect(() => {
    if (!windowRequest) return;
    openWindow(windowRequest.window, undefined, {
      actionId: windowRequest.actionId,
      createRule: windowRequest.createRule,
    });
    clearWindowRequest();
  }, [clearWindowRequest, openWindow, windowRequest]);
  const stats = calculateHunterCombatStats(game.equipment, game.progression, game.combat.stance, game.combat.techniques);
  const active = getActiveWeaponProficiency(game.progression, game.equipment);
  const activeDefinition = active ? proficiencyById[active.proficiencyId] : undefined;
  const activeLevel = active ? getProficiencyLevel(game.progression, active.proficiencyId) : 0;
  const context = createCombatPreviewContext();
  const actions = getPlayerActionDefinitions(game, context);
  const automationSummary = getAutomationSummary(game.combatAutomation, new Set(actions.map((action) => action.id)));
  const equipmentContextSummary = `${Object.values(game.equipment.slots).filter(Boolean).length} equipped items`;
  const schools = Array.from(new Set(game.spellbook.knownSpellIds.map((id) => context.spells[id]?.magicProficiencyId).filter(Boolean)));

  return (
    <div className="screen hero-screen" data-debug-screen="hero">
      <ScreenHeading screen="hero" />
      <section className="hero-overview" data-debug-kind="hero-overview">
        <div className="hero-overview-header">
          <div className="hero-avatar"><Shield size={30} /></div>
          <div><span className="tiny-label">HUNTER</span><h2>Vanguard</h2><p>{activeDefinition?.name ?? "No weapon proficiency"} · Lv {activeLevel} · Mastery Lv {masteryLevelForXp(game.progression.masteryXp)}</p></div>
          <div className="hero-resource-summary"><span>HP <strong>{Math.round(stats.maxHealth)}</strong></span><span>Stamina <strong>{Math.round(stats.maxStamina)}</strong></span><span>Mana <strong>{Math.round(stats.maxMana)}</strong></span></div>
        </div>
        <div className="hero-system-grid">
          <HeroSystemCard system="equipment" title="EQUIPMENT" description="Weapon, armor and defensive training" summary={<><strong>{equipmentContextSummary}</strong><small>View compatible owned items and armor rates</small></>} icon={Shield} onOpen={(opener) => openWindow("equipment", opener)} />
          <HeroSystemCard system="spellbook" title="SPELLBOOK" description="Known Magic and five-slot Combat loadout" summary={<><strong>{game.spellbook.knownSpellIds.length} Known · {game.spellbook.equippedSpellSlots.filter(Boolean).length} / 5 Equipped</strong><small>{schools.length ? schools.map((id) => getMagicSchoolPresentation(id!).label).join(" · ") : "No schools discovered"}</small></>} icon={Sparkles} onOpen={(opener) => openWindow("spellbook", opener)} />
          <HeroSystemCard system="automation" title="COMBAT AUTOMATION" description="Rules, priorities and targeting" summary={<><strong>{game.combatAutomation.enabled ? "ENABLED" : "DISABLED"} · {automationSummary.enabledRuleCount} / {automationSummary.totalRuleCount} active</strong><small>Auto Target Override: {game.combatAutomation.overrideManualTarget ? "ON" : "OFF"}{automationSummary.invalidRuleCount ? ` · ${automationSummary.invalidRuleCount} needs attention` : ""}</small></>} icon={Bot} onOpen={(opener) => openWindow("automation", opener)} />
          <HeroSystemCard system="stats" title="COMBAT STATS" description="All derived values used by combat" summary={<><strong>Attack {stats.attackPower} · Armor {Math.round(stats.armor)}</strong><small>Accuracy {Math.round(stats.accuracy)} · Max HP {Math.round(stats.maxHealth)}</small></>} icon={Swords} onOpen={(opener) => openWindow("stats", opener)} />
        </div>
      </section>
      {windowId && <HeroWindow windowId={windowId} title={windowTitle(windowId)} subtitle={windowSubtitle(windowId)} icon={windowIcon(windowId)} onClose={closeWindow}>{windowId === "equipment" && <EquipmentWindow />}{windowId === "spellbook" && <SpellbookWindow game={game} onOpenAutomation={(actionId, createRule) => openWindow("automation", undefined, { actionId, createRule })} />}{windowId === "automation" && <AutomationWindow game={game} initialActionId={automationRequest?.actionId} createRule={automationRequest?.createRule} />}{windowId === "stats" && <CombatStatsWindow game={game} />}</HeroWindow>}
    </div>
  );
}

function windowTitle(id: Exclude<HeroWindowId, null>) {
  return id === "equipment" ? "EQUIPMENT" : id === "spellbook" ? "SPELLBOOK & MAGIC LOADOUT" : id === "automation" ? "COMBAT AUTOMATION" : "COMBAT STATS";
}
function windowSubtitle(id: Exclude<HeroWindowId, null>) {
  return id === "equipment" ? "Manage your current equipment and defensive training." : id === "spellbook" ? "Known spells and the five slots brought into Combat." : id === "automation" ? "Define exactly how the Hunter fights automatically." : "Every derived combat value from the current build.";
}
function windowIcon(id: Exclude<HeroWindowId, null>) {
  return id === "equipment" ? Shield : id === "spellbook" ? Sparkles : id === "automation" ? Bot : Swords;
}
