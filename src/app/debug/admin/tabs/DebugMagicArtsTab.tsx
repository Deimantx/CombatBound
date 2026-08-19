import { useMemo, useState } from "react";
import { magicArtDefinitions } from "../../../../game/data/magicArts";
import { buildMagicArtTooltip } from "../../../../game/presentation/tooltipBuilders";
import { SearchField } from "../../../components/SearchField";
import { DebugButton } from "../components/DebugButton";
import { DebugCatalogueIdentity } from "../components/DebugCatalogueIdentity";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";
import { useGameStore } from "../../../../state/gameStore";

export function DebugMagicArtsTab({ run, debug }: DebugTabProps) {
  const game = useGameStore((state) => state.game);
  const [search, setSearch] = useState("");
  const normalized = search.trim().toLowerCase();
  const arts = useMemo(
    () => magicArtDefinitions.filter((art) => !normalized || `${art.id} ${art.name} ${art.description}`.toLowerCase().includes(normalized)),
    [normalized],
  );
  return <div className="debug-tab-content debug-column">
    <DebugSection title="Magic Arts" subtitle={`${game.magicArts.knownArtIds.length}/${magicArtDefinitions.length} authored Arts known`}>
      <div className="debug-button-grid">
        <DebugButton action="learn-all-magic-arts" onClick={() => run("Learned all authored Magic Arts.", debug.learnAllMagicArts)}>LEARN ALL AUTHORED MAGIC ARTS</DebugButton>
        <DebugButton action="reset-magic-arts" onClick={() => run("Reset Magic Arts knowledge.", debug.resetMagicArts)}>RESET MAGIC ARTS KNOWLEDGE</DebugButton>
        <DebugButton action="equip-earth-shield" onClick={() => run("Equipped Earth Shield in the shared ability loadout.", debug.equipEarthShield)}>EQUIP EARTH SHIELD</DebugButton>
        <DebugButton action="reset-player-cooldowns" onClick={() => run("Reset all player cooldowns.", debug.resetPlayerCooldowns)}>RESET PLAYER COOLDOWNS</DebugButton>
        <DebugButton action="reset-magic-arts-xp" onClick={() => run("Reset Magic Arts XP.", debug.resetMagicArtsXp)}>RESET MAGIC ARTS XP</DebugButton>
      </div>
    </DebugSection>
    <DebugSection title="Magic Arts proficiency" subtitle="The shared Magic Arts track uses the normal combat proficiency curve.">
      <div className="debug-button-grid">
        {[1, 10, 25, 50, 100].map((level) => <DebugButton key={level} action={`set-magic-arts-level-${level}`} onClick={() => run(`Set Magic Arts to level ${level}.`, () => debug.setProficiencyLevel("magic-arts", level))}>SET LEVEL {level}</DebugButton>)}
        <DebugButton action="add-magic-arts-xp" onClick={() => run("Added 100 Magic Arts XP.", () => debug.addMagicArtsXp(100))}>ADD 100 XP</DebugButton>
      </div>
    </DebugSection>
    <DebugSection title="Authored catalogue" subtitle="Placeholder specialization nodes have no debug actions." actions={<SearchField value={search} onChange={setSearch} placeholder="Search Magic Arts..." label="Search Magic Arts" debugKind="debug-magic-art-search" />}>
      <div className="debug-catalogue">
        {arts.map((art) => <div className="debug-catalogue-row" key={art.id} data-debug-kind="debug-magic-art" data-debug-magic-art-id={art.id}>
          <DebugCatalogueIdentity tooltip={buildMagicArtTooltip(art)} icon={art.icon} variant="blue" kind="debug-magic-art-identity" targetId={art.id} label={art.name}>
            <strong>{art.name}</strong><small>Magic Arts Â· {art.manaCost} Mana Â· {art.cooldownSeconds}s cooldown</small>
          </DebugCatalogueIdentity>
          <span className={game.magicArts.knownArtIds.includes(art.id) ? "debug-badge is-green" : "debug-badge"}>{game.magicArts.knownArtIds.includes(art.id) ? "KNOWN" : "HIDDEN"}</span>
        </div>)}
      </div>
    </DebugSection>
  </div>;
}
