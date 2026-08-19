import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createCombatPreviewContext } from "../../../../game/combat/combatEngine";
import { getActionById, getEffectivePlayerActionCost } from "../../../../game/combat/playerActions";
import { calculateHitChance } from "../../../../game/combat/combatMath";
import { getEnemyEffectiveCombatStats, getPlayerEffectiveCombatStats } from "../../../../game/combat/combatSelectors";
import { getCombatAbilityAvailability, getCombatAbilityEquippedSlot, getKnownCombatAbilities } from "../../../../game/combatAbilities/combatAbilitySelectors";
import { COMBAT_ABILITY_SLOT_COUNT, type CombatAbilityCatalogueEntry } from "../../../../game/combatAbilities/combatAbilityTypes";
import { getMagicArt } from "../../../../game/magicArts/magicArtLogic";
import { weaponSkillById } from "../../../../game/data/weaponSkills";
import { calculateHunterCombatStats } from "../../../../game/equipment/derivedStats";
import type { GameState } from "../../../../game/gameState";
import { useGameStore } from "../../../../state/gameStore";
import { CatalogueAccordionGroup } from "../../../components/CatalogueAccordionGroup";
import { PlaceholderArt } from "../../../components/PlaceholderArt";

type LibraryFilter = "all" | "core" | "active-defense" | "weapon-skills" | "magic";
type DragPayload = { actionId: string; sourceSlot?: number };
type DragState = { payload: DragPayload | null; target: string | null; state: "idle" | "valid" | "invalid" };

export function CombatAbilitiesWindow({ game, onOpenAutomation }: { game: GameState; onOpenAutomation: (actionId?: string, createRule?: boolean) => void }) {
  const equip = useGameStore((state) => state.equipCombatAbility);
  const move = useGameStore((state) => state.moveCombatAbility);
  const unequip = useGameStore((state) => state.unequipCombatAbility);
  const locked = game.combat.phase === "active" || game.combat.phase === "recovery";
  const context = useMemo(() => createCombatPreviewContext(), []);
  const stats = calculateHunterCombatStats(game.equipment, game.inventory, game.progression);
  const entries = getKnownCombatAbilities(game);
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(game.combatAbilities.slots.find(Boolean) ?? entries.find((entry) => entry.kind !== "core")?.actionId ?? "basic.weapon-attack");
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [drag, setDrag] = useState<DragState>({ payload: null, target: null, state: "idle" });
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["all.core", "all.active-defense", "all.weapon-skills", "all.magic"]));
  const normalized = query.trim().toLowerCase();
  const filtered = entries.filter((entry) => {
    if (filter === "core") return entry.kind === "core";
    if (filter === "active-defense") return entry.kind === "active-action" && entry.category === "active-defense";
    if (filter === "weapon-skills") return entry.kind === "active-action" && entry.category === "weapon-skill";
    if (filter === "magic") return entry.kind === "magic-art";
    return true;
  }).filter((entry) => !normalized || `${entry.kind} ${entry.name} ${entry.description} ${entry.kind === "active-action" ? entry.proficiencyId : entry.kind === "magic-art" ? entry.actionId : entry.id}`.toLowerCase().includes(normalized));
  const selected = entries.find((entry) => entryKey(entry) === selectedId);
  const setGroup = (id: string) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const validTarget = (target: string) => {
    if (!drag.payload || locked) return false;
    if (target === "library") return drag.payload.sourceSlot !== undefined;
    return target.startsWith("slot-") && drag.payload.sourceSlot !== Number(target.slice(5));
  };
  const onDragStart = (event: React.DragEvent, payload: DragPayload) => {
    if (locked) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", payload.actionId);
    setDrag({ payload, target: null, state: "idle" });
  };
  const onDragOver = (event: React.DragEvent, target: string) => {
    event.preventDefault();
    const valid = validTarget(target);
    event.dataTransfer.dropEffect = valid ? "move" : "none";
    setDrag((current) => ({ ...current, target, state: valid ? "valid" : "invalid" }));
  };
  const onDrop = (target: string) => {
    if (!validTarget(target) || !drag.payload) { setDrag({ payload: null, target: null, state: "idle" }); return; }
    if (target === "library") unequip(drag.payload.sourceSlot!);
    else if (drag.payload.sourceSlot === undefined) equip(drag.payload.actionId, Number(target.slice(5)));
    else move(drag.payload.sourceSlot, Number(target.slice(5)));
    setSelectedId(drag.payload.actionId);
    setDrag({ payload: null, target: null, state: "idle" });
  };
  const group = (id: string, label: string, icon: string, groupEntries: CombatAbilityCatalogueEntry[]) => groupEntries.length ? <CatalogueAccordionGroup key={id} id={`all.${id}`} label={label} icon={icon} count={groupEntries.length} expanded={normalized.length > 0 || expanded.has(`all.${id}`)} onToggle={() => setGroup(`all.${id}`)} debugGroupType="combat-ability">{groupEntries.map((entry) => <LibraryEntry key={entryKey(entry)} entry={entry} game={game} selected={entryKey(entry) === selectedId} locked={locked} drag={drag} onSelect={() => setSelectedId(entryKey(entry))} onDragStart={onDragStart} onDragEnd={() => setDrag({ payload: null, target: null, state: "idle" })} />)}</CatalogueAccordionGroup> : null;
  const renderLibrary = () => {
    const core = filtered.filter((entry) => entry.kind === "core");
    const defense = filtered.filter((entry) => entry.kind === "active-action" && entry.category === "active-defense");
    const weapons = filtered.filter((entry) => entry.kind === "active-action" && entry.category === "weapon-skill");
    const magic = filtered.filter((entry) => entry.kind === "magic-art");
    if (filter !== "all") return group(filter, filter === "active-defense" ? "ACTIVE DEFENSE" : filter === "weapon-skills" ? "WEAPON SKILLS" : filter === "magic" ? "MAGIC ARTS" : "CORE", filter === "magic" ? "sparkles" : filter === "weapon-skills" ? "sword" : filter === "active-defense" ? "shield" : "cross", filtered);
    return <>{group("core", "CORE", "cross", core)}{group("active-defense", "ACTIVE DEFENSE", "shield", defense)}{group("weapon-skills", "WEAPON SKILLS", "sword", weapons)}{group("magic", "MAGIC ARTS", "sparkles", magic)}</>;
  };
  return <div className="combat-abilities-window" data-debug-kind="combat-abilities-window">
    <div className="combat-abilities-lock-note">{locked ? "COMBAT ACTIVE · Loadout editing is locked until the Hunt stops." : "Drag any known Magic Art, weapon skill or active defense into the shared five-slot loadout."}</div>
    <div className="combat-abilities-callout"><strong>One Combat Ability loadout.</strong><span>Weapon skills, defenses and Magic Arts compete for the same five slots. Basic Attack and Consumables remain separate.</span></div>
    <section className="combat-ability-loadout" aria-label="Combat ability loadout"><div className="section-title"><span className="tiny-label">COMBAT ABILITIES</span><span>{game.combatAbilities.slots.filter(Boolean).length} / {COMBAT_ABILITY_SLOT_COUNT} equipped</span></div><p className="combat-ability-dnd-hint">Drag abilities into slots · drag slots to reorder</p><div className="combat-ability-slots">{Array.from({ length: COMBAT_ABILITY_SLOT_COUNT }, (_, slot) => <LoadoutSlot key={slot} slot={slot} actionId={game.combatAbilities.slots[slot]} entry={entries.find((entry) => entryKey(entry) === game.combatAbilities.slots[slot])} selected={selectedSlot === slot} locked={locked} drag={drag} onSelect={() => { setSelectedSlot(slot); if (game.combatAbilities.slots[slot]) setSelectedId(game.combatAbilities.slots[slot]!); }} onDragStart={(event) => { const actionId = game.combatAbilities.slots[slot]; if (actionId) onDragStart(event, { actionId, sourceSlot: slot }); }} onDragOver={(event) => onDragOver(event, `slot-${slot}`)} onDrop={() => onDrop(`slot-${slot}`)} onDragEnd={() => setDrag({ payload: null, target: null, state: "idle" })} />)}</div></section>
    <div className="combat-ability-filters" role="tablist" aria-label="Combat ability filters">{([["all", "ALL"], ["core", "CORE"], ["active-defense", "ACTIVE DEFENSE"], ["weapon-skills", "WEAPON SKILLS"], ["magic", "MAGIC ARTS"]] as Array<[LibraryFilter, string]>).map(([value, label]) => <button key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
    <div className={`combat-ability-browser ${drag.target === "library" ? "is-unequip-target" : ""}`} data-debug-kind="combat-ability-library-dropzone" data-debug-dragging={drag.payload ? "true" : "false"} data-debug-drop-state={drag.target === "library" ? drag.state : "idle"} onDragOver={(event) => onDragOver(event, "library")} onDrop={(event) => { event.preventDefault(); onDrop("library"); }}><section className="combat-ability-library combatbound-scroll" aria-label="Combat ability library"><div className="section-title"><span className="tiny-label">ABILITY LIBRARY</span><span>{filtered.length}{normalized ? " matches" : ""}</span></div><label className="catalogue-search combat-ability-search"><Search size={13} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search abilities..." aria-label="Search abilities" data-debug-kind="combat-ability-search" /></label>{filtered.length ? renderLibrary() : <p className="catalogue-no-results">No combat abilities match “{query}”.</p>}{drag.payload?.sourceSlot !== undefined && <div className="combat-ability-unequip-copy"><X size={13} /> DROP HERE TO UNEQUIP</div>}</section><CombatAbilityDetails game={game} entry={selected} stats={stats} context={context} selectedSlot={selectedSlot} locked={locked} onEquip={(actionId) => equip(actionId, selectedSlot)} onUnequip={unequip} onOpenAutomation={onOpenAutomation} /></div>
  </div>;
}

function entryKey(entry: CombatAbilityCatalogueEntry) { return entry.kind === "core" ? entry.id : entry.actionId; }

function LibraryEntry({ entry, game, selected, locked, drag, onSelect, onDragStart, onDragEnd }: { entry: CombatAbilityCatalogueEntry; game: GameState; selected: boolean; locked: boolean; drag: DragState; onSelect: () => void; onDragStart: (event: React.DragEvent, payload: DragPayload) => void; onDragEnd: () => void }) {
  const actionId = entryKey(entry);
  const equippedSlot = getCombatAbilityEquippedSlot(game, actionId);
  const availability = entry.kind === "core" ? undefined : getCombatAbilityAvailability(game, actionId);
  const dragging = drag.payload?.actionId === actionId;
  const subtitle = entry.kind === "core" ? "CORE COMBAT · ALWAYS AVAILABLE" : entry.kind === "magic-art" ? "MAGIC ARTS · 35 Mana" : `${entry.category === "active-defense" ? "ACTIVE DEFENSE" : "WEAPON SKILL"} · ${getActionById(game, actionId, createCombatPreviewContext())?.resourceCost?.stamina ?? 0} Stamina`;
  return <button className={`combat-ability-library-entry ${selected ? "is-selected" : ""} ${dragging ? "is-dragging" : ""}`} onClick={onSelect} draggable={entry.kind !== "core" && !locked} onDragStart={(event) => { if (entry.kind !== "core") onDragStart(event, { actionId }); }} onDragEnd={onDragEnd} data-debug-kind="combat-ability-library-entry" data-debug-ability-id={actionId} data-debug-ability-kind={entry.kind === "active-action" ? entry.category : entry.kind} data-debug-magic-art-id={entry.kind === "magic-art" ? actionId : undefined} data-debug-proficiency-id={entry.kind === "active-action" ? entry.proficiencyId : undefined}><PlaceholderArt icon={entry.icon} size="small" variant={entry.kind === "magic-art" ? "gold" : "blue"} /><span><strong>{entry.name}</strong><small>{subtitle}</small></span><em className={availability && !availability.usable ? "is-invalid" : equippedSlot >= 0 ? "is-equipped" : ""}>{entry.kind === "core" ? "ALWAYS AVAILABLE" : equippedSlot >= 0 ? `EQUIPPED ${equippedSlot + 1}` : availability && !availability.usable ? availability.label : "KNOWN"}</em></button>;
}

function LoadoutSlot({ slot, actionId, entry, selected, locked, drag, onSelect, onDragStart, onDragOver, onDrop, onDragEnd }: { slot: number; actionId: string | null; entry?: CombatAbilityCatalogueEntry; selected: boolean; locked: boolean; drag: DragState; onSelect: () => void; onDragStart: (event: React.DragEvent) => void; onDragOver: (event: React.DragEvent) => void; onDrop: () => void; onDragEnd: () => void }) {
  const target = drag.target === `slot-${slot}`;
  const category = entry?.kind === "magic-art" ? "MAGIC ARTS" : entry?.kind === "active-action" ? entry.category === "weapon-skill" ? "WEAPON SKILL" : "ACTIVE DEFENSE" : "CORE";
  return <button className={`combat-ability-slot ${selected ? "is-selected" : ""} ${target ? "is-drop-target" : ""} ${target && drag.state === "valid" ? "is-drop-valid" : ""} ${target && drag.state === "invalid" ? "is-drop-invalid" : ""}`} onClick={onSelect} draggable={Boolean(actionId) && !locked} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={(event) => { event.preventDefault(); onDrop(); }} onDragEnd={onDragEnd} data-debug-kind="combat-ability-slot" data-debug-slot={slot} data-debug-action-id={actionId ?? undefined} data-debug-drop-state={target ? drag.state : "idle"}><span className="combat-ability-slot-number">{slot + 1}</span><PlaceholderArt icon={entry?.icon ?? "shield"} size="small" variant={actionId ? "gold" : "muted"} /><strong>{entry?.name ?? "EMPTY ABILITY SLOT"}</strong><small>{actionId ? category : "Configure in Hero"}</small>{!actionId && drag.payload && <em>DROP HERE</em>}</button>;
}

function CombatAbilityDetails({ game, entry, stats, context, selectedSlot, locked, onEquip, onUnequip, onOpenAutomation }: { game: GameState; entry?: CombatAbilityCatalogueEntry; stats: ReturnType<typeof calculateHunterCombatStats>; context: ReturnType<typeof createCombatPreviewContext>; selectedSlot: number; locked: boolean; onEquip: (actionId: string) => void; onUnequip: (slot: number) => void; onOpenAutomation: (actionId?: string, createRule?: boolean) => void }) {
  if (!entry) return <section className="combat-ability-details"><span className="muted-copy">Select an ability to inspect it.</span></section>;
  if (entry.kind === "core") return <section className="combat-ability-details"><DetailHeading icon={entry.icon} title={entry.name} subtitle="Core Combat" /><DetailRow label="Loadout" value="Always available" /><DetailRow label="Attack interval" value={`${stats.attackInterval.toFixed(1)}s`} /><DetailCopy label="DESCRIPTION" value={entry.description} /></section>;
  const action = getActionById(game, entry.actionId, context);
  const magicArt = entry.kind === "magic-art" ? getMagicArt(entry.actionId) : undefined;
  const slot = getCombatAbilityEquippedSlot(game, entry.actionId);
  const availability = getCombatAbilityAvailability(game, entry.actionId);
  if (entry.kind === "magic-art") {
    return <section className="combat-ability-details" data-debug-kind="magic-art-details" data-debug-ability-id={entry.actionId}><DetailHeading icon={entry.icon} title={entry.name} subtitle="Magic Art" /><div className="combat-ability-detail-grid"><DetailRow label="Mana Cost" value={`${magicArt?.manaCost ?? action?.resourceCost?.mana ?? 0}`} /><DetailRow label="Cooldown" value={`${(magicArt?.cooldownSeconds ?? action?.cooldown ?? 0).toFixed(1)}s`} /><DetailRow label="Duration" value={`${magicArt?.durationSeconds ?? 0}s`} /><DetailRow label="Absorb" value={`${magicArt?.barrier?.absorbAmount ?? 0}`} /><DetailRow label="Target" value={magicArt?.targetMode === "selected-enemy" ? "Selected enemy" : "Self"} /></div><DetailCopy label="MAGIC ARTS XP" value={`Mana spent + effective HP damage. ${magicArt?.name ?? "This Art"} awards ${magicArt?.manaCost ?? 0} XP before damage XP per successful cast.`} /><div className="combat-ability-status is-ready"><strong>{slot >= 0 ? "READY WITH CURRENT BUILD" : "NOT EQUIPPED"}</strong><span>Magic Arts Proficiency</span></div><EquipActions locked={locked} slot={slot} selectedSlot={selectedSlot} actionId={entry.actionId} onEquip={onEquip} onUnequip={onUnequip} /></section>;
  }
  const skill = action?.sourceWeaponSkillId ? weaponSkillById[action.sourceWeaponSkillId] : undefined;
  const cost = action ? getEffectivePlayerActionCost(game, action, stats, context) : { stamina: 0, mana: 0 };
  const target = game.combat.enemies.find((enemy) => enemy.instanceId === game.combat.selectedEnemyInstanceId && !enemy.defeated);
  const effectivePlayer = getPlayerEffectiveCombatStats(game.combat, stats, game.progression);
  const effectiveTarget = target ? getEnemyEffectiveCombatStats(target) : undefined;
  const hitChance = skill && effectiveTarget ? calculateHitChance((effectivePlayer.accuracyRating ?? 0) + skill.accuracyModifier, effectiveTarget.evasionRating ?? 0) : undefined;
  return <section className="combat-ability-details" data-debug-kind={entry.category === "weapon-skill" ? "weapon-skill-details" : "combat-ability-details"} data-debug-ability-id={entry.actionId}><DetailHeading icon={entry.icon} title={entry.name} subtitle={entry.category === "active-defense" ? "Active Defense" : "Weapon Skill"} /><div className="combat-ability-detail-grid"><DetailRow label="Stamina Cost" value={`${cost.stamina}`} /><DetailRow label="Cooldown" value={`${action?.cooldown.toFixed(1) ?? "0.0"}s`} /><DetailRow label="Target" value={action?.targetMode === "self" ? "Self" : "Selected Enemy"} />{skill && <DetailRow label="Damage" value={`${Math.round(skill.damageMultiplier * 100)}% weapon damage`} />}{hitChance !== undefined && <DetailRow label="Current Hit Chance" value={`${Math.round(hitChance * 100)}%`} />}</div><div className={`combat-ability-status ${availability.usable ? "is-ready" : "is-invalid"}`}><strong>{slot >= 0 ? availability.label : "NOT EQUIPPED"}</strong>{availability.requirement && <span>{availability.requirement}</span>}</div><DetailCopy label="DESCRIPTION" value={entry.description} /><div className="combat-ability-automation"><span className="tiny-label">AUTOMATION</span><strong>{game.combatAutomation.rules.filter((rule) => rule.actionId === entry.actionId).length} rules</strong><div className="hero-inline-actions"><button className="button button-ghost" onClick={() => onOpenAutomation(entry.actionId, false)}>VIEW RULES</button><button className="button button-ghost" onClick={() => onOpenAutomation(entry.actionId, true)}>ADD RULE</button></div></div><EquipActions locked={locked} slot={slot} selectedSlot={selectedSlot} actionId={entry.actionId} onEquip={onEquip} onUnequip={onUnequip} /></section>;
}

function EquipActions({ locked, slot, selectedSlot, actionId, onEquip, onUnequip }: { locked: boolean; slot: number; selectedSlot: number; actionId: string; onEquip: (actionId: string) => void; onUnequip: (slot: number) => void }) { return <div className="combat-ability-equip-actions"><span className="tiny-label">{slot >= 0 ? `EQUIPPED SLOT ${slot + 1}` : `TARGET SLOT ${selectedSlot + 1}`}</span><button className="button button-primary" disabled={locked || slot === selectedSlot} onClick={() => onEquip(actionId)}>{locked ? "LOADOUT LOCKED" : `EQUIP TO SLOT ${selectedSlot + 1}`}</button>{slot >= 0 && <button className="button button-ghost" disabled={locked} onClick={() => onUnequip(slot)}>UNEQUIP</button>}</div>; }
function DetailHeading({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) { return <div className="combat-ability-detail-heading"><PlaceholderArt icon={icon} size="medium" variant="gold" /><div><h3>{title}</h3><p>{subtitle}</p></div></div>; }
function DetailRow({ label, value }: { label: string; value: string }) { return <span className="combat-ability-detail-row"><small>{label}</small><strong>{value}</strong></span>; }
function DetailCopy({ label, value }: { label: string; value: string }) { return <div className="combat-ability-detail-copy"><span className="tiny-label">{label}</span><p>{value || "No additional modifiers."}</p></div>; }
