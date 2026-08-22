import type { HeroWindowRequest } from "../../../../shared/types";
import { useMemo } from "react";
import { useGameStore } from "../../../../state/gameStore";
import { AutomationWindow } from "./AutomationWindow";
import { CombatAbilitiesWindow } from "./CombatAbilitiesWindow";

export function HeroWindowContent({ windowId, automationRequest, onOpenAutomation }: { windowId: "abilities" | "automation"; automationRequest: Omit<HeroWindowRequest, "window"> | null; onOpenAutomation: (actionId?: string, createRule?: boolean) => void }) {
  const combat = useGameStore((state) => state.game.combat);
  const progression = useGameStore((state) => state.game.progression);
  const inventory = useGameStore((state) => state.game.inventory);
  const equipment = useGameStore((state) => state.game.equipment);
  const collection = useGameStore((state) => state.game.collection);
  const gold = useGameStore((state) => state.game.gold);
  const spellbook = useGameStore((state) => state.game.spellbook);
  const magicArts = useGameStore((state) => state.game.magicArts);
  const combatAutomation = useGameStore((state) => state.game.combatAutomation);
  const combatAutomationPresets = useGameStore((state) => state.game.combatAutomationPresets);
  const combatAbilities = useGameStore((state) => state.game.combatAbilities);
  const professions = useGameStore((state) => state.game.professions);
  const mining = useGameStore((state) => state.game.mining);
  const game = useMemo(() => ({ combat, progression, inventory, equipment, collection, gold, spellbook, magicArts, combatAutomation, combatAutomationPresets, combatAbilities, professions, mining }), [combat, progression, inventory, equipment, collection, gold, spellbook, magicArts, combatAutomation, combatAutomationPresets, combatAbilities, professions, mining]);
  if (windowId === "abilities") return <CombatAbilitiesWindow game={game} onOpenAutomation={onOpenAutomation} />;
  return <AutomationWindow game={game} initialActionId={automationRequest?.actionId} createRule={automationRequest?.createRule} />;
}
