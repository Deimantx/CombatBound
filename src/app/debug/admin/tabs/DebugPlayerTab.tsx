import { Coins } from "lucide-react";
import { useState } from "react";
import { DebugButton } from "../components/DebugButton";
import { DebugResourceControl } from "../components/DebugResourceControl";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";
import { useGameStore } from "../../../../state/gameStore";

export function DebugPlayerTab({ debug, run }: DebugTabProps) {
  const game = useGameStore((state) => state.game);
  const [goldInput, setGoldInput] = useState(String(game.gold));
  return <div className="debug-tab-content debug-column">
    <DebugSection title="Player resources" subtitle="Values clamp to the current effective combat maxima."><div className="debug-resource-grid"><DebugResourceControl label="HP" value={game.combat.playerHp} maximum={game.combat.maxPlayerHp} resource="health" run={run} debug={debug} /><DebugResourceControl label="Stamina" value={game.combat.stamina} maximum={game.combat.maxStamina} resource="stamina" run={run} debug={debug} /><DebugResourceControl label="Mana" value={game.combat.mana} maximum={game.combat.maxMana} resource="mana" run={run} debug={debug} /></div><div className="debug-button-row"><DebugButton action="fill-all-resources" onClick={() => run("Filled all player resources.", debug.fillAllResources)}>FILL ALL</DebugButton><DebugButton action="fill-health" onClick={() => run("Filled HP.", debug.fillHealth)}>FULL HEAL</DebugButton><DebugButton action="fill-stamina" onClick={() => run("Filled Stamina.", debug.fillStamina)}>FILL STAMINA</DebugButton><DebugButton action="fill-mana" onClick={() => run("Filled Mana.", debug.fillMana)}>FILL MANA</DebugButton></div></DebugSection>
    <DebugSection title="Gold" subtitle="Persistent debug mutation; values are finite, integer, and non-negative."><div className="debug-inline-control"><Coins size={15} /><strong>{game.gold.toLocaleString()}</strong><input value={goldInput} onChange={(event) => setGoldInput(event.target.value)} inputMode="numeric" aria-label="Gold amount" /><DebugButton action="set-gold" onClick={() => run(`Set gold to ${goldInput}.`, () => debug.setGold(Number(goldInput)))}>SET</DebugButton><DebugButton action="add-gold" onClick={() => run("Added 1,000 gold.", () => debug.addGold(1000))}>+1,000</DebugButton></div></DebugSection>
    <DebugSection title="Loadout shortcuts"><div className="debug-button-grid"><DebugButton action="equip-sword-skills" onClick={() => run("Equipped the five One-Handed Sword skills.", debug.equipSwordSkills)}>EQUIP SWORD SKILLS</DebugButton></div></DebugSection>
  </div>;
}
