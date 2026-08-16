import { Bot, Shield, Sparkles, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { calculateHunterCombatStats } from "../../../game/equipment/derivedStats";
import { getActiveWeaponProficiency } from "../../../game/progression/progressionSelectors";
import { getProficiencyLevel } from "../../../game/progression/proficiencyProgression";
import { masteryLevelForXp } from "../../../game/progression/masteryProgression";
import { proficiencyById } from "../../../game/data/proficiencies";
import { useGameStore } from "../../../state/gameStore";
import type { HeroWindowRequest } from "../../../shared/types";
import { ScreenHeading } from "../../shell/ScreenHeading";
import { HeroBuildSystems } from "./components/HeroBuildSystems";
import { HeroCombatStatsPanel } from "./components/HeroCombatStatsPanel";
import { HeroEquipmentWorkspace, type HeroEquipmentPreview } from "./components/HeroEquipmentWorkspace";
import { HeroWindow, type HeroWindowId } from "./components/HeroWindow";
import { HeroWindowContent } from "./components/HeroWindowContent";

export function HeroScreen() {
  const equipment = useGameStore((state) => state.game.equipment);
  const inventory = useGameStore((state) => state.game.inventory);
  const progression = useGameStore((state) => state.game.progression);
  const stance = useGameStore((state) => state.game.combat.stance);
  const techniques = useGameStore((state) => state.game.combat.techniques);
  const windowRequest = useGameStore((state) => state.heroWindowRequest);
  const selectedEquipmentSlot = useGameStore((state) => state.selectedEquipmentSlot);
  const clearWindowRequest = useGameStore((state) => state.clearHeroWindowRequest);
  const [windowId, setWindowId] = useState<HeroWindowId>(null);
  const [automationRequest, setAutomationRequest] = useState<Omit<HeroWindowRequest, "window"> | null>(null);
  const [equipmentPreview, setEquipmentPreview] = useState<HeroEquipmentPreview | null>(null);
  const [hoveredEquipmentPreview, setHoveredEquipmentPreview] = useState<HeroEquipmentPreview | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const stats = calculateHunterCombatStats(equipment, inventory, progression, stance, techniques);
  const active = getActiveWeaponProficiency(progression, equipment, inventory);
  const activeDefinition = active ? proficiencyById[active.proficiencyId] : undefined;
  const activeLevel = active ? getProficiencyLevel(progression, active.proficiencyId) : 0;
  useEffect(() => {
    if (equipmentPreview && equipmentPreview.slotId !== selectedEquipmentSlot) setEquipmentPreview(null);
    if (hoveredEquipmentPreview && hoveredEquipmentPreview.slotId !== selectedEquipmentSlot) setHoveredEquipmentPreview(null);
  }, [equipmentPreview, hoveredEquipmentPreview, selectedEquipmentSlot]);

  const openWindow = useCallback((id: Exclude<HeroWindowId, null>, opener?: HTMLButtonElement, request?: Omit<HeroWindowRequest, "window">) => {
    if (opener) openerRef.current = opener;
    setAutomationRequest(id === "automation" ? request ?? null : null);
    setWindowId(id);
  }, []);
  const closeWindow = useCallback(() => {
    setWindowId(null);
    setAutomationRequest(null);
    openerRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!windowRequest) return;
    openWindow(windowRequest.window, undefined, { actionId: windowRequest.actionId, createRule: windowRequest.createRule });
    clearWindowRequest();
  }, [clearWindowRequest, openWindow, windowRequest]);

  return (
    <div className="screen hero-screen" data-debug-screen="hero" data-debug-kind="hero-build-workspace">
      <ScreenHeading screen="hero" />
      <section className="hero-identity" data-debug-kind="hero-identity">
        <div className="hero-avatar"><Shield size={30} /></div>
        <div><span className="tiny-label">HUNTER</span><h2>Vanguard</h2><p>{activeDefinition?.name ?? "No weapon proficiency"} · Lv {activeLevel} · Mastery Lv {masteryLevelForXp(progression.masteryXp)}</p></div>
        <div className="hero-resource-summary"><span>HP <strong>{Math.round(stats.maxLife ?? 0)}</strong></span><span>Stamina <strong>{Math.round(stats.maxStamina)}</strong></span><span>Mana <strong>{Math.round(stats.maxMana)}</strong></span></div>
      </section>
      <div className="hero-build-workspace-layout">
        <HeroEquipmentWorkspace preview={equipmentPreview} hoveredPreview={hoveredEquipmentPreview} onPreviewChange={setEquipmentPreview} onHoverPreview={setHoveredEquipmentPreview} onSlotChange={() => { setEquipmentPreview(null); setHoveredEquipmentPreview(null); }} onEquipCommitted={() => { setEquipmentPreview(null); setHoveredEquipmentPreview(null); }} />
        <HeroCombatStatsPanel preview={equipmentPreview} hoveredPreview={hoveredEquipmentPreview} />
      </div>
      <HeroBuildSystems onOpen={(system, opener) => openWindow(system, opener)} />
      {windowId && <HeroWindow windowId={windowId} title={windowTitle(windowId)} subtitle={windowSubtitle(windowId)} icon={windowIcon(windowId)} onClose={closeWindow}><HeroWindowContent windowId={windowId} automationRequest={automationRequest} onOpenAutomation={(actionId, createRule) => openWindow("automation", undefined, { actionId, createRule })} /></HeroWindow>}
    </div>
  );
}

function windowTitle(id: Exclude<HeroWindowId, null>) {
  return id === "spellbook" ? "SPELLBOOK & MAGIC LOADOUT" : id === "abilities" ? "COMBAT ABILITIES" : "COMBAT AUTOMATION";
}
function windowSubtitle(id: Exclude<HeroWindowId, null>) {
  return id === "spellbook" ? "Known spells and the five slots brought into Combat." : id === "abilities" ? "Choose the non-magic actions and techniques available in Combat." : "Define exactly how the Hunter fights automatically.";
}
function windowIcon(id: Exclude<HeroWindowId, null>) {
  return id === "spellbook" ? Sparkles : id === "abilities" ? Zap : Bot;
}
