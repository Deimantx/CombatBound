import { useMemo, useState } from "react";
import { COMBAT_SPELL_SLOT_COUNT } from "../../../../game/spellbook/spellbookTypes";
import { spellDefinitions, spellById } from "../../../../game/data/spells";
import { buildEffectiveSpellContext } from "../../../../game/combat/playerActions";
import { buildSpellTooltip } from "../../../../game/presentation/tooltipBuilders";
import { getMagicSchoolPresentation, magicSchoolOrder } from "../../../../game/presentation/magicSchool";
import { SearchField } from "../../../components/SearchField";
import { DebugButton } from "../components/DebugButton";
import { DebugCatalogueGroup } from "../components/DebugCatalogueGroup";
import { DebugCatalogueIdentity } from "../components/DebugCatalogueIdentity";
import { DebugFilterBar } from "../components/DebugFilterBar";
import { DebugSection } from "../components/DebugSection";
import type { DebugTabProps } from "../debugTypes";
import type { MagicProficiencyId } from "../../../../game/progression/progressionTypes";
import { useGameStore } from "../../../../state/gameStore";

type SchoolFilter = "all" | MagicProficiencyId;

export function DebugSpellbookTab({ run, debug }: DebugTabProps) {
  const game = useGameStore((state) => state.game);
  const equippedSchool = game.spellbook.equippedSpellSlots.map((id) => id ? spellById[id]?.magicProficiencyId : undefined).find((id): id is MagicProficiencyId => Boolean(id));
  const knownSchool = game.spellbook.knownSpellIds.map((id) => spellById[id]?.magicProficiencyId).find((id): id is MagicProficiencyId => Boolean(id));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SchoolFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([`debug.spells.${equippedSchool ?? knownSchool ?? "fire-magic"}`]));
  const normalized = search.trim().toLowerCase();
  const schools = useMemo(() => magicSchoolOrder.map((schoolId) => ({ schoolId, presentation: getMagicSchoolPresentation(schoolId), spells: spellDefinitions.filter((spell) => spell.magicProficiencyId === schoolId && (filter === "all" || filter === schoolId) && (!normalized || `${spell.id} ${spell.name} ${spell.description} ${getMagicSchoolPresentation(spell.magicProficiencyId).fullLabel} ${spell.damageType ?? ""} ${spell.baseDamageMin} ${spell.barrierAmount ?? ""} ${(spell.applyEffects ?? []).map(({ effectId }) => spellById[effectId]?.name ?? effectId).join(" ")}`.toLowerCase().includes(normalized))) })).filter((school) => school.spells.length), [filter, normalized]);
  return <div className="debug-tab-content debug-column"><DebugSection title="Spellbook" subtitle={`${game.spellbook.knownSpellIds.length}/${spellDefinitions.length} known - ${game.spellbook.equippedSpellSlots.filter(Boolean).length}/${COMBAT_SPELL_SLOT_COUNT} equipped`}><div className="debug-button-grid"><DebugButton action="learn-all-spells" onClick={() => run("Learned all spells.", debug.learnAllSpells)}>LEARN ALL SPELLS</DebugButton><DebugButton action="reset-spellbook" onClick={() => run("Reset Spellbook to the default prototype loadout.", debug.resetSpellbook)}>RESET TO DEFAULT</DebugButton><DebugButton action="fill-spell-loadout" onClick={() => run(`Filled the ${COMBAT_SPELL_SLOT_COUNT}-slot spell loadout.`, debug.fillSpellLoadout)}>FILL {COMBAT_SPELL_SLOT_COUNT}-SLOT LOADOUT</DebugButton><DebugButton action="reset-player-cooldowns" onClick={() => run("Reset all player cooldowns.", debug.resetPlayerCooldowns)}>RESET SPELL COOLDOWNS</DebugButton></div></DebugSection><DebugSection title="Known spells" subtitle="Grouped by canonical Magic School order." actions={<SearchField value={search} onChange={setSearch} placeholder="Search spells..." label="Search spells" debugKind="debug-spell-search" />}><DebugFilterBar values={["all", ...magicSchoolOrder] as const} value={filter} onChange={setFilter} labels={{ all: "ALL", ...Object.fromEntries(magicSchoolOrder.map((school) => [school, getMagicSchoolPresentation(school).label.toUpperCase()])) }} /><div className="debug-catalogue debug-catalogue-tree">{schools.map(({ schoolId, presentation, spells }) => { const id = `debug.spells.${schoolId}`; return <DebugCatalogueGroup key={id} id={id} label={presentation.fullLabel} count={spells.length} icon={presentation.icon} expanded={normalized ? true : expanded.has(id)} onToggle={() => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} debugGroupType="spellbook">{spells.map((spell) => <DebugSpellRow key={spell.id} spell={spell} game={game} />)}</DebugCatalogueGroup>; })}</div></DebugSection></div>;
}

function DebugSpellRow({ spell, game }: { spell: (typeof spellDefinitions)[number]; game: import("../../../../game/gameState").GameState }) {
  const equippedSlot = game.spellbook.equippedSpellSlots.findIndex((id) => id === spell.id);
  const known = game.spellbook.knownSpellIds.includes(spell.id);
  const school = getMagicSchoolPresentation(spell.magicProficiencyId);
  return <div className="debug-catalogue-row" data-debug-kind="debug-spell" data-debug-spell-id={spell.id}><DebugCatalogueIdentity tooltip={buildSpellTooltip(spell, game.progression, buildEffectiveSpellContext(game, spell))} icon={spell.icon} variant={school.accent === "fire" ? "red" : school.accent === "light" ? "gold" : "blue"} kind="debug-spell-identity" targetId={spell.id} label={spell.name}><strong>{spell.name}</strong><small>{school.fullLabel} - {spell.manaCost} Mana - {spell.cooldownSeconds}s cooldown</small></DebugCatalogueIdentity><span className={known ? "debug-badge is-green" : "debug-badge"}>{known ? "KNOWN" : "HIDDEN"}</span>{equippedSlot >= 0 && <span className="debug-badge is-green">EQUIPPED {equippedSlot + 1}</span>}</div>;
}
