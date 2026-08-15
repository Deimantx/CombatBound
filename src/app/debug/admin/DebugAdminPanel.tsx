import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Bug, Check, Coins, Crosshair, Heart, Package, Search, Shield, Sparkles, Swords, WandSparkles, X, Zap } from "lucide-react";
import { itemDefinitions, itemById } from "../../../game/data/items";
import { effectDefinitions, effectById } from "../../../game/data/effects";
import { proficiencyDefinitions } from "../../../game/data/proficiencies";
import { perkById } from "../../../game/data/proficiencyPerks";
import { enemyDefinitions } from "../../../game/data/enemies";
import { spellDefinitions } from "../../../game/data/spells";
import { weaponSkillDefinitions } from "../../../game/data/weaponSkills";
import { masteryLevelForXp, getMasteryLevelProgress, calculateEarnedPerkPoints, calculateAvailablePerkPoints, calculateSpentPerkPoints } from "../../../game/progression/masteryProgression";
import { getProficiencyLevelProgress } from "../../../game/progression/proficiencyProgression";
import { MAX_MASTERY_LEVEL, MAX_PROFICIENCY_LEVEL } from "../../../game/progression/progressionBalance";
import { CURRENT_SAVE_VERSION } from "../../../game/persistence/saveGame";
import { COMBAT_SPELL_SLOT_COUNT } from "../../../game/spellbook/spellbookTypes";
import { useGameStore } from "../../../state/gameStore";
import type { CombatProficiencyId, ProficiencyPerkDefinition } from "../../../game/progression/progressionTypes";
import type { DebugEffectTarget, DebugResource } from "../../../game/debug/debugTypes";
import { PlaceholderArt } from "../../components/PlaceholderArt";
import { SearchField } from "../../components/SearchField";
import { ConfirmDialog } from "../../components/ConfirmDialog";

type DebugTab = "overview" | "player" | "progression" | "items" | "collection" | "combat" | "spellbook" | "state";

const tabs: Array<{ id: DebugTab; label: string; icon: typeof Bug }> = [
  { id: "overview", label: "Overview", icon: Bug },
  { id: "player", label: "Player", icon: Heart },
  { id: "progression", label: "Progression", icon: Sparkles },
  { id: "items", label: "Items", icon: Package },
  { id: "collection", label: "Collection", icon: Crosshair },
  { id: "combat", label: "Combat", icon: Swords },
  { id: "spellbook", label: "Spellbook", icon: WandSparkles },
  { id: "state", label: "State", icon: Shield },
];

function normalizeSearch(value: string) { return value.trim().toLowerCase(); }
function matchesSearch(value: string, query: string) { return !query || value.toLowerCase().includes(query); }

export function DebugAdminPanel({ onClose }: { onClose: () => void }) {
  const game = useGameStore((state) => state.game);
  const debug = useGameStore((state) => state.debug);
  const [tab, setTab] = useState<DebugTab>("overview");
  const [lastAction, setLastAction] = useState("Ready for a debug action.");
  const [confirm, setConfirm] = useState<"perks" | "collection" | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const run = (label: string, action: () => void) => {
    action();
    setLastAction(label);
  };
  const masteryLevel = masteryLevelForXp(game.progression.masteryXp);
  const progress = getMasteryLevelProgress(game.progression.masteryXp);
  const selectedEnemy = game.combat.enemies.find((enemy) => enemy.instanceId === game.combat.selectedEnemyInstanceId);
  const discoveredItems = game.collection.discoveredItems.length;
  const discoveredTargets = Object.values(game.collection.targets).filter((entry) => entry.discovered).length;

  return (
    <div className="debug-backdrop" data-debug-kind="debug-admin-backdrop">
      <section className="debug-admin-panel" role="dialog" aria-modal="true" aria-label="Developer Debug Console" data-debug-kind="debug-admin-panel">
        <header className="debug-admin-header">
          <div className="debug-admin-title"><span className="debug-admin-mark"><Bug size={18} /></span><div><span className="eyebrow">DEV TOOLKIT Â· SAVE V{CURRENT_SAVE_VERSION}</span><h2>Developer Debug Console</h2></div></div>
          <button className="debug-close" onClick={onClose} aria-label="Close Developer Debug Console" data-debug-kind="debug-action" data-debug-action="close"><X size={18} /></button>
        </header>
        <nav className="debug-tabs" aria-label="Debug sections">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)} data-debug-kind="debug-tab" data-debug-tab={id}><Icon size={14} />{label}</button>)}
        </nav>
        <div className="debug-action-feedback" data-debug-kind="debug-feedback"><Check size={13} />{lastAction}</div>
        <div className="debug-admin-content combatbound-scroll">
          {tab === "overview" && <OverviewTab game={game} masteryLevel={masteryLevel} discoveredItems={discoveredItems} discoveredTargets={discoveredTargets} selectedEnemy={selectedEnemy?.displayName} run={run} debug={debug} setTab={setTab} />}
          {tab === "player" && <PlayerTab game={game} run={run} debug={debug} />}
          {tab === "progression" && <ProgressionTab game={game} run={run} debug={debug} onConfirm={setConfirm} />}
          {tab === "items" && <ItemsTab game={game} run={run} debug={debug} />}
          {tab === "collection" && <CollectionTab game={game} run={run} debug={debug} onConfirm={setConfirm} />}
          {tab === "combat" && <CombatTab game={game} run={run} debug={debug} selectedEnemy={selectedEnemy?.displayName} />}
          {tab === "spellbook" && <SpellbookTab game={game} run={run} debug={debug} />}
          {tab === "state" && <StateTab game={game} />}
        </div>
      </section>
      <ConfirmDialog open={confirm === "perks"} title="Reset all perks?" message="This clears every purchased perk rank. It is a DEV-only mutation and cannot be undone through the game UI." confirmLabel="Reset all perks" onCancel={() => setConfirm(null)} onConfirm={() => { run("Reset all perk ranks.", debug.resetAllPerks); setConfirm(null); }} />
      <ConfirmDialog open={confirm === "collection"} title="Reset collection?" message="This removes every discovered item and target entry while preserving no collection progress." confirmLabel="Reset collection" onCancel={() => setConfirm(null)} onConfirm={() => { run("Reset collection.", debug.resetCollection); setConfirm(null); }} />
    </div>
  );
}

function DebugSection({ title, subtitle, children, actions, collapsible = false }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode; collapsible?: boolean }) {
  const [open, setOpen] = useState(true);
  return <section className={`debug-section ${collapsible && !open ? "is-collapsed" : ""}`}><header><div><span className="tiny-label">{title}</span>{subtitle && <p>{subtitle}</p>}</div><div className="debug-section-actions">{actions}{collapsible && <button className="debug-collapse-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open} data-debug-kind="debug-collapse" data-debug-label={title}>{open ? "COLLAPSE" : "EXPAND"}</button>}</div></header>{(!collapsible || open) && children}</section>;
}

function DebugButton({ children, onClick, action, danger = false }: { children: ReactNode; onClick: () => void; action: string; danger?: boolean }) {
  return <button className={`button ${danger ? "button-danger" : "button-ghost"}`} onClick={onClick} data-debug-kind="debug-action" data-debug-action={action}>{children}</button>;
}

function SummaryCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return <div className="debug-summary-card"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

function OverviewTab({ game, masteryLevel, discoveredItems, discoveredTargets, selectedEnemy, run, debug, setTab }: { game: ReturnType<typeof useGameStore.getState>["game"]; masteryLevel: number; discoveredItems: number; discoveredTargets: number; selectedEnemy?: string; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"]; setTab: (tab: DebugTab) => void }) {
  const progress = getMasteryLevelProgress(game.progression.masteryXp);
  const availablePoints = calculateAvailablePerkPoints(game.progression, perkById);
  return <div className="debug-tab-content">
    <div className="debug-intro"><div><span className="eyebrow">COMBATBOUND DEVELOPMENT BUILD</span><h3>Set an exact state, test a mechanic, repeat.</h3><p>All controls are development-only. Core equipment, progression, collection, effect, reward, and defeat rules remain shared with normal gameplay.</p></div><span className="debug-build-chip">DEV ONLY</span></div>
    <div className="debug-summary-grid">
      <SummaryCard label="Mastery" value={`Lv ${masteryLevel}`} detail={`${game.progression.masteryXp.toLocaleString()} XP`} />
      <SummaryCard label="Perk points" value={availablePoints} detail={`${calculateEarnedPerkPoints(game.progression.masteryXp)} earned Â· ${calculateSpentPerkPoints(game.progression, perkById)} spent`} />
      <SummaryCard label="Combat" value={game.combat.phase.toUpperCase()} detail={selectedEnemy ?? "No selected enemy"} />
      <SummaryCard label="Collection" value={`${discoveredItems}/${itemDefinitions.length}`} detail={`${discoveredTargets}/${enemyDefinitions.length} targets`} />
      <SummaryCard label="HP" value={`${Math.round(game.combat.playerHp)} / ${Math.round(game.combat.maxPlayerHp)}`} />
      <SummaryCard label="Resources" value={`${Math.round(game.combat.stamina)} / ${Math.round(game.combat.mana)}`} detail={`Stamina / Mana`} />
    </div>
    <DebugSection title="Quick actions" subtitle="Frequently used test setups."><div className="debug-button-grid">
      <DebugButton action="fill-all-resources" onClick={() => run("Filled HP, Stamina, and Mana.", debug.fillAllResources)}>FILL ALL RESOURCES</DebugButton>
      <DebugButton action="reset-player-cooldowns" onClick={() => run("Reset all player cooldowns.", debug.resetPlayerCooldowns)}>RESET COOLDOWNS</DebugButton>
      <DebugButton action="grant-all-equipment" onClick={() => run("Granted all prototype equipment Ã—1.", () => debug.grantAllEquipment(1))}>GRANT ALL TEST GEAR</DebugButton>
      <DebugButton action="set-mastery-level" onClick={() => run("Set Mastery to level 10.", () => debug.setMasteryLevel(10))}>SET MASTERY LV 10</DebugButton>
      <DebugButton action="discover-all-collection" onClick={() => run("Discovered all items and targets.", () => { debug.discoverAllItems(); debug.discoverAllTargets(); })}>DISCOVER ALL COLLECTION</DebugButton>
      <DebugButton action="kill-current-group" onClick={() => run("Resolved the current enemy group through canonical defeat handling.", debug.killCurrentGroup)}>KILL CURRENT GROUP</DebugButton>
    </div></DebugSection>
    <div className="debug-shortcuts"><button onClick={() => setTab("items")}>Items <span>Grant and normalize quantities</span></button><button onClick={() => setTab("progression")}>Progression <span>Mastery, proficiency, and perk setup</span></button><button onClick={() => setTab("combat")}>Combat <span>Effects, resources, casts, and defeat</span></button></div>
    <p className="debug-note">Automation: <strong>{game.combatAutomation.enabled ? "ON" : "OFF"}</strong> Â· Location: <strong>{game.combat.combatLocationId ?? "none"}</strong> Â· Group: <strong>{game.combat.groupNumber}</strong> Â· XP to next Mastery: <strong>{progress.xpToNextLevel.toLocaleString()}</strong></p>
  </div>;
}

function PlayerTab({ game, run, debug }: { game: ReturnType<typeof useGameStore.getState>["game"]; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"] }) {
  const [goldInput, setGoldInput] = useState(String(game.gold));
  return <div className="debug-tab-content debug-column">
    <DebugSection title="Player resources" subtitle="Values clamp to the current effective combat maxima."><div className="debug-resource-grid"><ResourceControl label="HP" value={game.combat.playerHp} maximum={game.combat.maxPlayerHp} resource="health" run={run} debug={debug} /><ResourceControl label="Stamina" value={game.combat.stamina} maximum={game.combat.maxStamina} resource="stamina" run={run} debug={debug} /><ResourceControl label="Mana" value={game.combat.mana} maximum={game.combat.maxMana} resource="mana" run={run} debug={debug} /></div><div className="debug-button-row"><DebugButton action="fill-all-resources" onClick={() => run("Filled all player resources.", debug.fillAllResources)}>FILL ALL</DebugButton><DebugButton action="fill-health" onClick={() => run("Filled HP.", debug.fillHealth)}>FULL HEAL</DebugButton><DebugButton action="fill-stamina" onClick={() => run("Filled Stamina.", debug.fillStamina)}>FILL STAMINA</DebugButton><DebugButton action="fill-mana" onClick={() => run("Filled Mana.", debug.fillMana)}>FILL MANA</DebugButton></div></DebugSection>
    <DebugSection title="Gold" subtitle="Persistent debug mutation; values are finite, integer, and non-negative."><div className="debug-inline-control"><Coins size={15} /><strong>{game.gold.toLocaleString()}</strong><input value={goldInput} onChange={(event) => setGoldInput(event.target.value)} inputMode="numeric" aria-label="Gold amount" /><DebugButton action="set-gold" onClick={() => run(`Set gold to ${goldInput}.`, () => debug.setGold(Number(goldInput)))}>SET</DebugButton><DebugButton action="add-gold" onClick={() => run("Added 1,000 gold.", () => debug.addGold(1000))}>+1,000</DebugButton></div></DebugSection>
    <DebugSection title="Loadout shortcuts"><div className="debug-button-grid"><DebugButton action="equip-sword-skills" onClick={() => run("Equipped the five One-Handed Sword skills.", debug.equipSwordSkills)}>EQUIP SWORD SKILLS</DebugButton><DebugButton action="equip-both-techniques" onClick={() => run("Equipped both prototype techniques.", debug.equipBothTechniques)}>EQUIP BOTH TECHNIQUES</DebugButton></div></DebugSection>
  </div>;
}

function ResourceControl({ label, value, maximum, resource, run, debug }: { label: string; value: number; maximum: number; resource: DebugResource; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"] }) {
  const [amount, setAmount] = useState(String(Math.round(value)));
  return <div className="debug-resource-control"><div><strong>{label}</strong><span>{Math.round(value)} / {Math.round(maximum)}</span></div><div className="debug-resource-track"><i style={{ width: `${maximum > 0 ? Math.max(0, Math.min(100, value / maximum * 100)) : 0}%` }} /></div><div className="debug-resource-actions">{[0, 25, 50, 100].map((percent) => <button key={percent} onClick={() => run(`Set ${label} to ${percent}%.`, () => debug.setResourcePercent(resource, percent))} data-debug-kind="debug-action" data-debug-action="set-resource-percent" data-debug-resource={resource}>{percent}%</button>)}<input value={amount} onChange={(event) => setAmount(event.target.value)} aria-label={`Set ${label}`} inputMode="decimal" /><button onClick={() => run(`Set ${label}.`, () => debug.setPlayerResource(resource, Number(amount)))} data-debug-kind="debug-action" data-debug-action="set-resource">SET</button></div></div>;
}

function ProgressionTab({ game, run, debug, onConfirm }: { game: ReturnType<typeof useGameStore.getState>["game"]; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"]; onConfirm: (value: "perks" | "collection" | null) => void }) {
  const [proficiencySearch, setProficiencySearch] = useState("");
  const [perkSearch, setPerkSearch] = useState("");
  const progress = getMasteryLevelProgress(game.progression.masteryXp);
  const proficiencies = proficiencyDefinitions.filter((definition) => matchesSearch(`${definition.id} ${definition.name} ${definition.category}`, normalizeSearch(proficiencySearch)));
  const perks = Object.values(perkById).filter((perk) => matchesSearch(`${perk.id} ${perk.name} ${perk.proficiencyId}`, normalizeSearch(perkSearch)));
  return <div className="debug-tab-content debug-column">
    <DebugSection title="Mastery" subtitle={`Level ${progress.level} Â· ${game.progression.masteryXp.toLocaleString()} XP Â· ${progress.xpToNextLevel.toLocaleString()} XP to next`}><div className="debug-button-grid"><DebugButton action="mastery-lv-1" onClick={() => run("Set Mastery to level 1.", () => debug.setMasteryLevel(1))}>LV 1</DebugButton><DebugButton action="mastery-lv-5" onClick={() => run("Set Mastery to level 5.", () => debug.setMasteryLevel(5))}>LV 5</DebugButton><DebugButton action="mastery-lv-10" onClick={() => run("Set Mastery to level 10.", () => debug.setMasteryLevel(10))}>LV 10</DebugButton><DebugButton action="mastery-lv-25" onClick={() => run("Set Mastery to level 25.", () => debug.setMasteryLevel(25))}>LV 25</DebugButton><DebugButton action="mastery-lv-50" onClick={() => run("Set Mastery to level 50.", () => debug.setMasteryLevel(50))}>LV 50</DebugButton><DebugButton action="mastery-max" onClick={() => run(`Set Mastery to level ${MAX_MASTERY_LEVEL}.`, () => debug.setMasteryLevel(MAX_MASTERY_LEVEL))}>MAX</DebugButton></div><div className="debug-button-row"><DebugButton action="add-mastery-xp" onClick={() => run("Added 100 Mastery XP.", () => debug.addMasteryXp(100))}>+100 XP</DebugButton><DebugButton action="add-mastery-xp" onClick={() => run("Added 1,000 Mastery XP.", () => debug.addMasteryXp(1000))}>+1,000 XP</DebugButton><DebugButton action="add-mastery-xp" onClick={() => run("Added 10,000 Mastery XP.", () => debug.addMasteryXp(10000))}>+10,000 XP</DebugButton><DebugButton action="grant-perk-points" onClick={() => run("Granted 5 derived perk points.", () => debug.grantPerkPoints(5))}>GRANT +5 PERK POINTS</DebugButton></div></DebugSection>
    <DebugSection title="Proficiencies" subtitle="Direct debug setters change only the selected proficiency XP; Mastery XP stays isolated." actions={<SearchField value={proficiencySearch} onChange={setProficiencySearch} placeholder="Search proficiencies..." label="Search proficiencies" debugKind="debug-proficiency-search" />} collapsible><div className="debug-button-row"><DebugButton action="set-all-proficiencies-lv-1" onClick={() => run("Set all proficiencies to level 1.", () => debug.setAllProficiencyLevels(1))}>ALL LV 1</DebugButton><DebugButton action="set-all-proficiencies-lv-10" onClick={() => run("Set all proficiencies to level 10.", () => debug.setAllProficiencyLevels(10))}>ALL LV 10</DebugButton><DebugButton action="set-all-proficiencies-max" onClick={() => run(`Set all proficiencies to level ${MAX_PROFICIENCY_LEVEL}.`, () => debug.setAllProficiencyLevels(MAX_PROFICIENCY_LEVEL))}>ALL MAX</DebugButton><DebugButton action="reset-all-proficiencies" onClick={() => run("Reset all proficiencies to level 0.", () => debug.setAllProficiencyLevels(0))}>RESET ALL</DebugButton><DebugButton action="discover-all-proficiencies" onClick={() => run("Discovered all proficiencies.", debug.discoverAllProficiencies)}>DISCOVER ALL</DebugButton></div><div className="debug-catalogue">{proficiencies.map((definition) => <DebugProficiencyRow key={definition.id} definition={definition} game={game} run={run} debug={debug} />)}</div></DebugSection>
    <DebugSection title="Perks" subtitle="Perk rank controls are marked DEBUG BYPASS and may ignore normal costs/prerequisites." actions={<SearchField value={perkSearch} onChange={setPerkSearch} placeholder="Search perks..." label="Search perks" debugKind="debug-perk-search" />} collapsible><div className="debug-button-row"><DebugButton action="max-all-perks" onClick={() => run("Maxed all perks.", debug.maxAllPerks)}>MAX ALL PERKS</DebugButton><DebugButton action="grant-enough-perk-mastery" onClick={() => run("Granted enough derived Mastery XP for purchased perk ranks.", debug.grantEnoughMasteryForPurchasedPerks)}>FUND PURCHASED RANKS</DebugButton><DebugButton action="reset-all-perks" danger onClick={() => onConfirm("perks")}>RESET ALL PERKS</DebugButton></div><div className="debug-catalogue">{perks.slice(0, 80).map((perk) => <DebugPerkRow key={perk.id} perk={perk} game={game} run={run} debug={debug} />)}{perks.length > 80 && <p className="debug-note">Showing the first 80 matches. Search to narrow the catalogue.</p>}</div></DebugSection>
  </div>;
}

function DebugProficiencyRow({ definition, game, run, debug }: { definition: (typeof proficiencyDefinitions)[number]; game: ReturnType<typeof useGameStore.getState>["game"]; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"] }) {
  const [level, setLevel] = useState(String(getProficiencyLevelProgress(game.progression.proficiencies[definition.id]?.totalXp ?? 0, definition.maxLevel).level));
  const current = getProficiencyLevelProgress(game.progression.proficiencies[definition.id]?.totalXp ?? 0, definition.maxLevel);
  return <div className="debug-catalogue-row" data-debug-kind="debug-proficiency" data-debug-proficiency-id={definition.id}><PlaceholderArt icon={definition.icon} size="small" variant="muted" /><div className="debug-row-main"><strong>{definition.name}</strong><small>{definition.category} Â· Lv {current.level} Â· {(game.progression.proficiencies[definition.id]?.totalXp ?? 0).toLocaleString()} XP</small></div><input value={level} onChange={(event) => setLevel(event.target.value)} aria-label={`Set ${definition.name} level`} inputMode="numeric" /><button onClick={() => run(`Set ${definition.name} to level ${level}.`, () => debug.setProficiencyLevel(definition.id as CombatProficiencyId, Number(level)))} data-debug-kind="debug-action" data-debug-action="set-proficiency-level" data-debug-proficiency-id={definition.id}>SET</button><button onClick={() => run(`Increased ${definition.name} by one level.`, () => debug.setProficiencyLevel(definition.id as CombatProficiencyId, current.level + 1))} data-debug-kind="debug-action" data-debug-action="increment-proficiency" data-debug-proficiency-id={definition.id}>+1</button></div>;
}

function DebugPerkRow({ perk, game, run, debug }: { perk: ProficiencyPerkDefinition; game: ReturnType<typeof useGameStore.getState>["game"]; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"] }) {
  const rank = game.progression.purchasedPerks[perk.id] ?? 0;
  return <div className="debug-catalogue-row" data-debug-kind="debug-perk" data-debug-perk-id={perk.id}><Sparkles size={15} /><div className="debug-row-main"><strong>{perk.name}</strong><small>{perk.proficiencyId} Â· Rank {rank}/{perk.maxRank} Â· DEBUG BYPASS</small></div><button onClick={() => run(`Increased ${perk.name} to rank ${Math.min(perk.maxRank, rank + 1)}.`, () => debug.setPerkRank(perk.id, rank + 1))} data-debug-kind="debug-action" data-debug-action="set-perk-rank" data-debug-perk-id={perk.id}>+1</button><button onClick={() => run(`Maxed ${perk.name}.`, () => debug.setPerkRank(perk.id, perk.maxRank))} data-debug-kind="debug-action" data-debug-action="max-perk" data-debug-perk-id={perk.id}>MAX</button><button onClick={() => run(`Reset ${perk.name}.`, () => debug.setPerkRank(perk.id, 0))} data-debug-kind="debug-action" data-debug-action="reset-perk" data-debug-perk-id={perk.id}>RESET</button></div>;
}

function ItemsTab({ game, run, debug }: { game: ReturnType<typeof useGameStore.getState>["game"]; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "equipment" | "consumables" | "materials" | "currency">("all");
  const normalized = normalizeSearch(query);
  const items = itemDefinitions.filter((item) => (filter === "all" || (filter === "equipment" ? Boolean(item.equipmentSlotKind) : item.category === filter.slice(0, -1) || item.category === filter)) && matchesSearch(`${item.id} ${item.name} ${item.category} ${item.equipmentSlotKind ?? ""} ${item.rarity} ${item.requiredMasteryLevel ?? ""} ${Object.keys(item.stats ?? {}).join(" ")}`, normalized));
  return <div className="debug-tab-content debug-column"><DebugSection title="Item browser" subtitle={`${items.length} matching canonical definitions`} actions={<SearchField value={query} onChange={setQuery} placeholder="Search items..." label="Search items" debugKind="debug-item-search" />}><div className="debug-filter-row">{(["all", "equipment", "consumables", "materials", "currency"] as const).map((value) => <button key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)} data-debug-kind="debug-item-filter" data-debug-filter={value}>{value.toUpperCase()}</button>)}</div><div className="debug-catalogue">{items.map((item) => <DebugItemRow key={item.id} item={item} quantity={game.inventory.quantities[item.id] ?? 0} run={run} debug={debug} />)}</div></DebugSection><DebugSection title="Prototype gear shortcuts" subtitle="Tier grants use two copies for shared Ring and Earring slots."><div className="debug-button-grid"><DebugButton action="grant-all-equipment-1" onClick={() => run("Granted all equipment Ã—1.", () => debug.grantAllEquipment(1))}>GRANT ALL EQUIPMENT Ã—1</DebugButton><DebugButton action="grant-all-equipment-2" onClick={() => run("Granted all equipment Ã—2.", () => debug.grantAllEquipment(2))}>GRANT ALL EQUIPMENT Ã—2</DebugButton><DebugButton action="grant-tier-1" onClick={() => run("Granted all level 1 gear.", () => debug.grantEquipmentTier(1))}>GRANT ALL LV 1 GEAR</DebugButton><DebugButton action="grant-tier-5" onClick={() => run("Granted all level 5 gear.", () => debug.grantEquipmentTier(5))}>GRANT ALL LV 5 GEAR</DebugButton><DebugButton action="grant-tier-10" onClick={() => run("Granted all level 10 gear.", () => debug.grantEquipmentTier(10))}>GRANT ALL LV 10 GEAR</DebugButton></div></DebugSection></div>;
}

function DebugItemRow({ item, quantity, run, debug }: { item: (typeof itemDefinitions)[number]; quantity: number; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"] }) {
  const [amount, setAmount] = useState(String(quantity));
  return <div className="debug-catalogue-row debug-item-row" data-debug-kind="debug-item" data-debug-item-id={item.id}><PlaceholderArt icon={item.icon} size="small" variant={item.rarity === "rare" ? "gold" : item.rarity === "uncommon" ? "blue" : "muted"} /><div className="debug-row-main"><strong>{item.name}</strong><small>{item.id} Â· {item.equipmentSlotKind ?? item.category} Â· {item.rarity}{item.requiredMasteryLevel ? ` Â· Requires Lv ${item.requiredMasteryLevel}` : ""}</small><em>{quantity} owned Â· {Object.entries(item.stats ?? {}).map(([key, value]) => `${key} ${value}`).join(" Â· ") || item.description}</em></div><button onClick={() => run(`Granted 1 Ã— ${item.name}.`, () => debug.grantItem(item.id, 1))} data-debug-kind="debug-action" data-debug-action="grant-item" data-debug-item-id={item.id}>+1</button><button onClick={() => run(`Granted 10 Ã— ${item.name}.`, () => debug.grantItem(item.id, 10))} data-debug-kind="debug-action" data-debug-action="grant-item" data-debug-item-id={item.id}>+10</button><input value={amount} onChange={(event) => setAmount(event.target.value)} aria-label={`Set ${item.name} quantity`} inputMode="numeric" /><button onClick={() => run(`Set ${item.name} quantity to ${amount}.`, () => debug.setItemQuantity(item.id, Number(amount)))} data-debug-kind="debug-action" data-debug-action="set-item-quantity" data-debug-item-id={item.id}>SET</button></div>;
}

function CollectionTab({ game, run, debug, onConfirm }: { game: ReturnType<typeof useGameStore.getState>["game"]; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"]; onConfirm: (value: "perks" | "collection" | null) => void }) {
  const itemCount = game.collection.discoveredItems.length;
  const targetCount = Object.values(game.collection.targets).filter((target) => target.discovered).length;
  return <div className="debug-tab-content debug-column"><DebugSection title="Discovery" subtitle={`${itemCount}/${itemDefinitions.length} items Â· ${targetCount}/${enemyDefinitions.length} targets`}><div className="debug-button-grid"><DebugButton action="discover-all-items" onClick={() => run("Discovered all items without granting quantities.", debug.discoverAllItems)}>DISCOVER ALL ITEMS</DebugButton><DebugButton action="discover-all-targets" onClick={() => run("Discovered all enemy targets.", debug.discoverAllTargets)}>DISCOVER ALL TARGETS</DebugButton><DebugButton action="discover-everything" onClick={() => run("Discovered all items and targets.", () => { debug.discoverAllItems(); debug.discoverAllTargets(); })}>DISCOVER EVERYTHING</DebugButton><DebugButton action="set-target-defeats" onClick={() => run("Set all target defeat counts to 1.", debug.setAllTargetDefeatsToOne)}>SET TARGET DEFEATS TO 1</DebugButton><DebugButton action="reset-collection" danger onClick={() => onConfirm("collection")}>RESET COLLECTION</DebugButton></div></DebugSection><DebugSection title="Target progress"><div className="debug-catalogue">{enemyDefinitions.map((enemy) => { const target = game.collection.targets[enemy.id]; return <div className="debug-catalogue-row" key={enemy.id} data-debug-kind="debug-target" data-debug-target-id={enemy.id}><PlaceholderArt icon={enemy.icon} size="small" variant="muted" /><div className="debug-row-main"><strong>{enemy.name}</strong><small>{enemy.id}</small></div><span className={target?.discovered ? "debug-badge is-green" : "debug-badge"}>{target?.discovered ? "DISCOVERED" : "HIDDEN"}</span><span className="debug-count">{target?.defeats ?? 0} defeats</span></div> })}</div></DebugSection></div>;
}

function CombatTab({ game, run, debug, selectedEnemy }: { game: ReturnType<typeof useGameStore.getState>["game"]; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"]; selectedEnemy?: string }) {
  const [effectSearch, setEffectSearch] = useState("");
  const [effectId, setEffectId] = useState(effectDefinitions[0]?.id ?? "");
  const [target, setTarget] = useState<DebugEffectTarget>("selected-enemy");
  const effects = effectDefinitions.filter((effect) => matchesSearch(`${effect.id} ${effect.name} ${effect.description} ${effect.kind} ${effect.tags.join(" ")}`, normalizeSearch(effectSearch)));
  return <div className="debug-tab-content debug-column"><DebugSection title="Live combat state" subtitle={`${game.combat.phase.toUpperCase()} Â· ${game.combat.combatLocationId ?? "no location"} Â· Group ${game.combat.groupNumber}`}><div className="debug-summary-grid"><SummaryCard label="Selected enemy" value={selectedEnemy ?? "None"} detail={`${game.combat.enemies.filter((enemy) => !enemy.defeated).length}/${game.combat.enemies.length} alive`} /><SummaryCard label="GCD" value={`${game.combat.globalCooldownRemaining.toFixed(2)}s`} detail={`${Object.keys(game.combat.actionCooldowns).length} player cooldowns`} /><SummaryCard label="Effects" value={game.combat.playerEffects.length} detail={`${game.combat.enemies.reduce((sum, enemy) => sum + enemy.effects.length, 0)} enemy effects`} /></div></DebugSection><DebugSection title="Cooldowns and casts"><div className="debug-button-row"><DebugButton action="reset-player-cooldowns" onClick={() => run("Reset all player cooldowns.", debug.resetPlayerCooldowns)}>RESET PLAYER COOLDOWNS</DebugButton><DebugButton action="reset-enemy-cooldowns" onClick={() => run("Reset all enemy cooldowns.", debug.resetEnemyCooldowns)}>RESET ENEMY COOLDOWNS</DebugButton><DebugButton action="cancel-enemy-actions" onClick={() => run("Cancelled all enemy casts.", debug.cancelEnemyActions)}>CANCEL ENEMY ACTIONS</DebugButton></div></DebugSection><DebugSection title="Effects" subtitle="Application routes through the canonical stacking, duration, resistance, and barrier engine." actions={<SearchField value={effectSearch} onChange={setEffectSearch} placeholder="Search effects..." label="Search effects" debugKind="debug-effect-search" />}><div className="debug-effect-tool"><select value={effectId} onChange={(event) => setEffectId(event.target.value)} aria-label="Effect to apply" data-debug-kind="debug-effect-select">{effects.map((effect) => <option key={effect.id} value={effect.id}>{effect.name} Â· {effect.kind}</option>)}</select><select value={target} onChange={(event) => setTarget(event.target.value as DebugEffectTarget)} aria-label="Effect target"><option value="player">PLAYER</option><option value="selected-enemy">SELECTED ENEMY</option></select><DebugButton action="apply-effect" onClick={() => run(`Applied ${effectById[effectId]?.name ?? effectId} to ${target}.`, () => debug.applyEffect(effectId, target))}>APPLY</DebugButton></div><div className="debug-catalogue">{effects.slice(0, 45).map((effect) => <div className="debug-catalogue-row" key={effect.id} data-debug-kind="debug-effect" data-debug-effect-id={effect.id}><PlaceholderArt icon={effect.icon} size="small" variant={effect.kind === "barrier" ? "blue" : effect.kind === "buff" ? "gold" : "red"} /><div className="debug-row-main"><strong>{effect.name}</strong><small>{effect.id} Â· {effect.kind} Â· {effect.tags.join(" Â· ")}</small></div><button onClick={() => run(`Applied ${effect.name} to ${target}.`, () => debug.applyEffect(effect.id, target))} data-debug-kind="debug-action" data-debug-action="apply-effect" data-debug-effect-id={effect.id}>APPLY</button></div>)}</div></DebugSection><DebugSection title="Defeat and recovery"><div className="debug-button-grid"><DebugButton action="kill-selected-enemy" onClick={() => run("Resolved selected enemy defeat through canonical rewards.", debug.killSelectedEnemy)}>KILL SELECTED ENEMY</DebugButton><DebugButton action="kill-current-group" onClick={() => run("Resolved current group through canonical rewards and clear handling.", debug.killCurrentGroup)}>KILL CURRENT GROUP</DebugButton><DebugButton action="revive" onClick={() => run("Revived player to full resources and stopped combat.", debug.revive)}>REVIVE</DebugButton><DebugButton action="suicide" danger onClick={() => run("Forced player defeat.", debug.suicide)}>SUICIDE</DebugButton></div><div className="debug-button-row"><DebugButton action="clear-player-effects" onClick={() => run("Cleared player effects.", debug.clearPlayerEffects)}>CLEAR PLAYER EFFECTS</DebugButton><DebugButton action="clear-selected-enemy-effects" onClick={() => run("Cleared selected enemy effects.", debug.clearSelectedEnemyEffects)}>CLEAR SELECTED ENEMY EFFECTS</DebugButton><DebugButton action="clear-all-enemy-effects" onClick={() => run("Cleared all enemy effects.", debug.clearAllEnemyEffects)}>CLEAR ALL ENEMY EFFECTS</DebugButton><DebugButton action="reset-session-metrics" onClick={() => run("Reset session metrics.", debug.resetSessionMetrics)}>RESET SESSION METRICS</DebugButton></div></DebugSection></div>;
}


function SpellbookTab({ game, run, debug }: { game: ReturnType<typeof useGameStore.getState>["game"]; run: (label: string, action: () => void) => void; debug: ReturnType<typeof useGameStore.getState>["debug"] }) {
  return <div className="debug-tab-content debug-column"><DebugSection title="Spellbook" subtitle={`${game.spellbook.knownSpellIds.length}/${spellDefinitions.length} known Â· ${game.spellbook.equippedSpellSlots.filter(Boolean).length}/${COMBAT_SPELL_SLOT_COUNT} equipped`}><div className="debug-button-grid"><DebugButton action="learn-all-spells" onClick={() => run("Learned all spells.", debug.learnAllSpells)}>LEARN ALL SPELLS</DebugButton><DebugButton action="reset-spellbook" onClick={() => run("Reset Spellbook to the default prototype loadout.", debug.resetSpellbook)}>RESET TO DEFAULT</DebugButton><DebugButton action="fill-spell-loadout" onClick={() => run(`Filled the ${COMBAT_SPELL_SLOT_COUNT}-slot spell loadout.`, debug.fillSpellLoadout)}>FILL {COMBAT_SPELL_SLOT_COUNT}-SLOT LOADOUT</DebugButton><DebugButton action="reset-player-cooldowns" onClick={() => run("Reset all player cooldowns.", debug.resetPlayerCooldowns)}>RESET SPELL COOLDOWNS</DebugButton></div></DebugSection><DebugSection title="Known spells"><div className="debug-catalogue">{spellDefinitions.map((spell) => <div className="debug-catalogue-row" key={spell.id} data-debug-kind="debug-spell" data-debug-spell-id={spell.id}><PlaceholderArt icon={spell.icon} size="small" variant="muted" /><div className="debug-row-main"><strong>{spell.name}</strong><small>{spell.id} Â· {spell.magicProficiencyId} Â· {spell.damage > 0 ? spell.damageType : spell.barrierAmount ? "barrier" : "utility"}</small></div><span className={game.spellbook.knownSpellIds.includes(spell.id) ? "debug-badge is-green" : "debug-badge"}>{game.spellbook.knownSpellIds.includes(spell.id) ? "KNOWN" : "HIDDEN"}</span></div>)}</div></DebugSection></div>;
}

function StateTab({ game }: { game: ReturnType<typeof useGameStore.getState>["game"] }) {
  return <div className="debug-tab-content debug-column"><DebugSection title="Developer state" subtitle="Read-only architecture and canonical catalogue coverage."><div className="debug-state-grid"><SummaryCard label="Save version" value={`V${CURRENT_SAVE_VERSION}`} detail="No debug schema fields" /><SummaryCard label="Items" value={itemDefinitions.length} detail={`${Object.keys(itemById).length} indexed`} /><SummaryCard label="Effects" value={effectDefinitions.length} /><SummaryCard label="Proficiencies" value={proficiencyDefinitions.length} /><SummaryCard label="Perks" value={Object.keys(perkById).length} /><SummaryCard label="Weapon skills" value={weaponSkillDefinitions.length} /></div><p className="debug-note">Debug UI state lives only in this DEV panel. Permanent debug actions use the normal persistence path; live combat actions remain runtime-only.</p></DebugSection></div>;
}
