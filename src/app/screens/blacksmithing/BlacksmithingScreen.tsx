import { Hammer, Sword } from "lucide-react"
import { useState } from "react"
import { ScreenHeading } from "../../shell/ScreenHeading"
import { ProgressBar } from "../../components/ProgressBar"
import { useGameStore } from "../../../state/gameStore"
import { getProfessionLevelProgress, professionAvailablePoints, professionPointsFromLevels, professionPointsSpent } from "../../../game/professions/professionProgression"
import { blacksmithingPerks, blacksmithingPerkById, BLACKSMITHING_PERK_TREE_COST } from "../../../game/professions/blacksmithing/blacksmithingPerks"
import { blacksmithingRecipes, blacksmithingRecipeById } from "../../../game/professions/blacksmithing/blacksmithingRecipes"
import { getBlacksmithingStats } from "../../../game/professions/blacksmithing/blacksmithingStats"
import { getBlacksmithingUpgradeProfileForNode } from "../../../game/professions/blacksmithing/blacksmithingRuntime"
import { estimateBlacksmithingRates } from "../../../game/professions/blacksmithing/blacksmithingRates"
import { getProfessionPerkPurchaseState } from "../../../game/professions/professionPerkValidation"
import { getStackableQuantity, getItemInstances } from "../../../game/items/itemOwnership"
import { itemById } from "../../../game/data/items"
import { getItemUpgradeSpecialization, getUpgradeNodeState, getUpgradeNodesForInstance } from "../../../game/items/itemUpgradeLogic"
import { itemUpgradeTreeById } from "../../../game/data/gear/itemUpgradeTrees"
import type { BlacksmithingRecipeDefinition } from "../../../game/professions/blacksmithing/blacksmithingTypes"
import { formatDuration } from "../../../game/profiles/profileFormatting"

type BlacksmithingTab = "smelting" | "smithing" | "upgrade" | "perks"
type SmithingFilter = "ALL" | "WEAPONS" | "ARMOR" | "TOOLS"
type UpgradeFilter = "ALL" | "WEAPONS" | "ARMOR" | "SHIELD"

export function BlacksmithingScreen() {
  const game = useGameStore((state) => state.game)
  const [tab, setTab] = useState<BlacksmithingTab>("smelting")
  const progress = getProfessionLevelProgress(game.professions, "blacksmithing")
  const stats = getBlacksmithingStats(game)
  const rates = estimateBlacksmithingRates(game, blacksmithingRecipes[0])
  return <div className="screen blacksmithing-screen" data-debug-screen="blacksmithing" data-debug-kind="blacksmithing-screen">
    <ScreenHeading screen="blacksmithing" />
    <section className="panel blacksmithing-profession-header" data-debug-kind="blacksmithing-header">
      <div className="panel-header"><div className="panel-heading"><span className="panel-icon"><Hammer size={16} /></span><div><div className="panel-title">Blacksmithing Level {progress.level}</div><div className="panel-subtitle">{Math.floor(progress.xpIntoLevel).toLocaleString()} / {Math.floor(progress.xpRequiredForLevel).toLocaleString()} XP</div></div></div><strong className="mining-points-badge">{professionAvailablePoints(game.professions, "blacksmithing")} POINTS</strong></div>
      <div className="panel-body"><ProgressBar value={progress.progressFraction * 100} variant="experience" ariaLabel="Blacksmithing experience" /><div className="blacksmithing-stat-grid"><Metric label="XP / hour" value={rates.blacksmithingXpPerHour.toFixed(0)} /><Metric label="XP to next" value={progress.isMaxLevel ? "MAX LEVEL" : Math.ceil(progress.xpToNextLevel).toLocaleString()} /><Metric label="ETA" value={progress.isMaxLevel ? "MAX LEVEL" : rates.etaSeconds === null ? "-" : formatDuration(rates.etaSeconds)} /><Metric label="Forge Stamina" value={`${Math.ceil(game.blacksmithing.forgeStamina)} / ${Math.ceil(stats.maxForgeStamina)}`} /><Metric label="Rest" value={`${stats.restDurationSeconds.toFixed(1)}s`} /></div></div>
    </section>
    <div className="segmented-tabs blacksmithing-tabs" role="tablist" data-debug-kind="blacksmithing-tabs">
      {(["smelting", "smithing", "upgrade", "perks"] as BlacksmithingTab[]).map((entry) => <button key={entry} className={`tab-button ${tab === entry ? "is-active" : ""}`} onClick={() => setTab(entry)} role="tab" aria-selected={tab === entry}>{entry === "perks" ? "PERK TREE" : entry.toUpperCase()}</button>)}
    </div>
    {tab === "smelting" && <SmeltingPanel game={game} />}
    {tab === "smithing" && <SmithingPanel game={game} />}
    {tab === "upgrade" && <UpgradePanel game={game} />}
    {tab === "perks" && <PerkPanel game={game} />}
  </div>
}

function SmeltingPanel({ game }: { game: ReturnType<typeof useGameStore.getState>["game"] }) {
  const recipe = blacksmithingRecipeById[game.blacksmithing.selectedSmeltingRecipeId] ?? blacksmithingRecipes[0]
  const start = useGameStore((state) => state.startBlacksmithing)
  const stop = useGameStore((state) => state.stopBlacksmithing)
  const clear = useGameStore((state) => state.clearBlacksmithingQueue)
  return <ProductionPanel game={game} recipe={recipe} title="Iron Bar" description="5 Iron Ore -> 1 Iron Bar" onStart={(count, mode) => start(recipe.id, count, mode)} onStop={stop} onClear={clear} icon={<Hammer size={21} />} />
}

function SmithingPanel({ game }: { game: ReturnType<typeof useGameStore.getState>["game"] }) {
  const [filter, setFilter] = useState<SmithingFilter>("ALL")
  const [selectedId, setSelectedId] = useState(blacksmithingRecipes.find((recipe) => recipe.kind === "smithing")?.id ?? "")
  const recipe = blacksmithingRecipeById[selectedId] ?? blacksmithingRecipes[1]
  const recipes = blacksmithingRecipes.filter((entry) => entry.kind === "smithing" && (filter === "ALL" || filter === "WEAPONS" && entry.tags.includes("weapon") || filter === "ARMOR" && entry.tags.includes("defensive") || filter === "TOOLS" && entry.tags.includes("tool")))
  const start = useGameStore((state) => state.startBlacksmithing)
  const stop = useGameStore((state) => state.stopBlacksmithing)
  const clear = useGameStore((state) => state.clearBlacksmithingQueue)
  return <section className="blacksmithing-workspace"><div className="panel blacksmithing-recipe-list"><div className="panel-header"><div><div className="panel-title">Smithing Recipes</div><div className="panel-subtitle">14 exact Iron outputs, using canonical ItemDefinitions.</div></div></div><div className="blacksmithing-filter-row">{(["ALL", "WEAPONS", "ARMOR", "TOOLS"] as SmithingFilter[]).map((entry) => <button key={entry} className={`button button-ghost ${filter === entry ? "is-active" : ""}`} onClick={() => setFilter(entry)}>{entry}</button>)}</div><div className="blacksmithing-recipe-grid">{recipes.map((entry) => <button key={entry.id} className={`blacksmithing-recipe-card ${entry.id === recipe.id ? "is-selected" : ""}`} onClick={() => setSelectedId(entry.id)} data-debug-recipe-id={entry.id}><strong>{entry.name}</strong><span>BS {entry.requiredBlacksmithingLevel} | {entry.costs[0].quantity} Iron Bars</span><small>{entry.baseDurationSeconds}s | {entry.baseBlacksmithingXp} XP</small></button>)}</div></div><ProductionPanel game={game} recipe={recipe} title={recipe.name} description={`${recipe.costs[0].quantity} Iron Bars -> 1 ${recipe.name}`} onStart={(count, mode) => start(recipe.id, count, mode)} onStop={stop} onClear={clear} icon={<Sword size={21} />} /></section>
}

function ProductionPanel({ game, recipe, title, description, onStart, onStop, onClear, icon }: { game: ReturnType<typeof useGameStore.getState>["game"]; recipe: BlacksmithingRecipeDefinition; title: string; description: string; onStart: (count: number, mode: "fixed" | "max") => void; onStop: () => void; onClear: () => void; icon: React.ReactNode }) {
  const active = game.blacksmithing.active
  const operation = game.blacksmithing.activeOperation
  const owned = getStackableQuantity(game.inventory, recipe.costs[0].itemId)
  const ownedOutput = itemById[recipe.outputItemId]?.inventoryMode === "stackable"
    ? getStackableQuantity(game.inventory, recipe.outputItemId)
    : getItemInstances(game.inventory).filter((instance) => instance.definitionId === recipe.outputItemId).length
  const [queue, setQueue] = useState(1)
  const max = Math.floor(owned / recipe.costs[0].quantity)
  const mode = queue === 0 ? "max" : "fixed"
  const pending = Boolean(game.blacksmithing.activeOperation) || game.blacksmithing.mode === "resting"
  return <section className="panel blacksmithing-production-panel" data-debug-kind="blacksmithing-production"><div className="panel-header"><div className="panel-heading"><span className="panel-icon">{icon}</span><div><div className="panel-title">{title}</div><div className="panel-subtitle">{description}</div></div></div><span className={`mining-status ${active ? "is-active" : ""}`}>{active ? game.blacksmithing.mode === "resting" ? "EXHAUSTED" : "ACTIVE" : pending ? "PAUSED" : "READY"}</span></div><div className="panel-body"><div className="blacksmithing-detail-grid"><Metric label="Required BS" value={`${recipe.requiredBlacksmithingLevel}`} /><Metric label="Duration" value={`${recipe.baseDurationSeconds}s`} /><Metric label="Forge Stamina" value={`${recipe.baseForgeStaminaCost}`} /><Metric label="XP / cycle" value={`${recipe.baseBlacksmithingXp}`} /><Metric label="Owned material" value={`${owned}`} /><Metric label={recipe.kind === "smelting" ? "Owned Bars" : "Owned copies"} value={`${ownedOutput}`} /><Metric label="Output" value={`1 ${title}`} /></div><div className="blacksmithing-flow"><strong>{description}</strong><span>Materials are reserved at start. Output and XP resolve on completion.</span></div>{(active || pending) && <div className="blacksmithing-active-card"><strong>{game.blacksmithing.mode === "resting" ? "FORGE EXHAUSTED - RESTING" : active ? `Working: ${operation?.kind === "upgrade" ? "Upgrade" : title}` : "PAUSED"}</strong><span>{game.blacksmithing.mode === "resting" ? `${game.blacksmithing.restTimerRemaining.toFixed(1)}s remaining` : `${game.blacksmithing.actionTimerRemaining.toFixed(1)}s remaining`}</span><ProgressBar value={operation ? Math.max(0, Math.min(100, (1 - game.blacksmithing.actionTimerRemaining / Math.max(0.001, operation.durationSeconds)) * 100)) : 0} variant="resource" ariaLabel="Blacksmithing operation progress" /></div>}<div className="blacksmithing-queue-controls"><button className={`button button-ghost ${queue === 1 ? "is-active" : ""}`} onClick={() => setQueue(1)}>1</button><button className={`button button-ghost ${queue === 5 ? "is-active" : ""}`} onClick={() => setQueue(5)}>5</button><button className={`button button-ghost ${queue === 10 ? "is-active" : ""}`} onClick={() => setQueue(10)}>10</button><button className={`button button-ghost ${queue === 0 ? "is-active" : ""}`} onClick={() => setQueue(0)}>MAX</button><button className="button button-primary" disabled={active || (!pending && max <= 0)} onClick={() => onStart(queue || 1, mode)}>{pending ? "RESUME" : queue === 0 ? "START MAX" : "START x" + queue}</button>{active && <button className="button button-secondary" onClick={onStop}>STOP / PAUSE</button>}<button className="button button-ghost" disabled={!active || game.blacksmithing.queuedOperationsRemaining <= 0} onClick={onClear}>CLEAR REMAINING QUEUE</button></div></div></section>
}

function UpgradePanel({ game }: { game: ReturnType<typeof useGameStore.getState>["game"] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<UpgradeFilter>("ALL")
  const start = useGameStore((state) => state.startBlacksmithingUpgrade)
  const instances = getItemInstances(game.inventory).filter((instance) => {
    if (!itemById[instance.definitionId]?.upgradeTreeId) return false
    const definition = itemById[instance.definitionId]
    return filter === "ALL" || filter === "WEAPONS" && definition.category === "weapon" || filter === "SHIELD" && definition.equipmentSlotKind === "offhand" || filter === "ARMOR" && definition.category !== "weapon" && definition.equipmentSlotKind !== "offhand"
  })
  const selected = instances.find((instance) => instance.id === selectedId) ?? instances[0]
  const definition = selected ? itemById[selected.definitionId] : undefined
  const tree = definition?.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined
  const specialization = selected ? getItemUpgradeSpecialization(selected, tree) : null
  const pendingUpgradeOperation = game.blacksmithing.activeOperation?.kind === "upgrade" ? game.blacksmithing.activeOperation : null
  const pendingUpgrade = Boolean(pendingUpgradeOperation)
  return <section className="blacksmithing-workspace"><div className="panel blacksmithing-instance-list"><div className="panel-header"><div><div className="panel-title">Exact ItemInstances</div><div className="panel-subtitle">Select the copy you want to permanently specialize.</div></div></div><div className="blacksmithing-filter-row">{(["ALL", "WEAPONS", "ARMOR", "SHIELD"] as UpgradeFilter[]).map((entry) => <button key={entry} className={`button button-ghost ${filter === entry ? "is-active" : ""}`} onClick={() => setFilter(entry)}>{entry}</button>)}</div>{instances.length === 0 ? <p className="muted-copy">No upgradeable ItemInstances owned.</p> : instances.map((instance) => { const item = itemById[instance.definitionId]; const instanceTree = item?.upgradeTreeId ? itemUpgradeTreeById[item.upgradeTreeId] : undefined; const isPending = pendingUpgradeOperation?.instanceId === instance.id; return <button key={instance.id} className={`blacksmithing-instance-row ${selected?.id === instance.id ? "is-selected" : ""}`} onClick={() => setSelectedId(instance.id)}><span><strong>{item?.name ?? instance.definitionId}</strong><small>#{instance.id.replace("item-instance-", "")}</small></span><span>{isPending ? "PENDING" : getItemUpgradeSpecialization(instance, instanceTree).state === "specialized" ? "SPECIALIZED" : "UNSPECIALIZED"} | {instance.unlockedUpgradeNodeIds.length}/4</span></button> })}</div><div className="panel blacksmithing-upgrade-tree"><div className="panel-header"><div><div className="panel-title">{definition?.name ?? "Upgrade"}</div><div className="panel-subtitle">{selected ? `${selected.id} | ${pendingUpgradeOperation?.instanceId === selected.id ? "Pending Upgrade" : specialization?.state === "specialized" ? specialization.branchId : "No specialization"}` : "Choose an exact item"}</div></div></div>{selected && tree ? <div className="blacksmithing-node-grid">{getUpgradeNodesForInstance(game.inventory, selected.id).map((node) => { const state = getUpgradeNodeState(game.inventory, selected.id, node.id); const profile = getBlacksmithingUpgradeProfileForNode(node.id); return <button key={node.id} className={`blacksmithing-node state-${state}`} disabled={state !== "available" || game.blacksmithing.active || pendingUpgrade} onClick={() => start(selected.id, node.id)}><strong>{node.name}</strong><small>{state.toUpperCase()}</small><span>BS {profile?.requiredLevel ?? "-"} | {profile?.duration ?? "-"}s | Stamina {profile?.stamina ?? "-"} | XP {profile?.xp ?? "-"}</span><span>{node.costs.map((cost) => `${cost.quantity} ${itemById[cost.itemId]?.name ?? cost.itemId}`).join(", ")}</span></button> })}</div> : <p className="muted-copy">Iron Pickaxe and Worn Pickaxe have no Upgrade Tree in V1.</p>}</div></section>
}

function PerkPanel({ game }: { game: ReturnType<typeof useGameStore.getState>["game"] }) {
  const [selectedId, setSelectedId] = useState(blacksmithingPerks[0].id)
  const purchase = useGameStore((state) => state.purchaseBlacksmithingPerk)
  const perk = blacksmithingPerkById[selectedId] ?? blacksmithingPerks[0]
  const state = getProfessionPerkPurchaseState(game.professions, perk, blacksmithingPerkById)
  return <section className="panel blacksmithing-perk-panel"><div className="panel-header"><div><div className="panel-title">Blacksmithing Perk Tree</div><div className="panel-subtitle">{BLACKSMITHING_PERK_TREE_COST} total ranks; Level 100 grants 99 points. Choose a build.</div></div><div className="blacksmithing-perk-accounting"><span>Levels {professionPointsFromLevels(game.professions, "blacksmithing")}</span><span>Bonus {game.professions.skills.blacksmithing?.bonusSkillPoints ?? 0}</span><span>Spent {professionPointsSpent(game.professions, "blacksmithing")}</span><strong>Available {professionAvailablePoints(game.professions, "blacksmithing")}</strong></div></div><div className="blacksmithing-perk-layout"><div className="blacksmithing-perk-grid">{blacksmithingPerks.map((entry) => { const entryState = getProfessionPerkPurchaseState(game.professions, entry, blacksmithingPerkById); return <button key={entry.id} className={`blacksmithing-perk-node is-${entry.type} ${entry.id === selectedId ? "is-selected" : ""} ${entryState.currentRank > 0 ? "is-purchased" : ""}`} onClick={() => setSelectedId(entry.id)} data-debug-perk-id={entry.id}><strong>{entry.name}</strong><small>R {entryState.currentRank}/{entry.maxRank}</small></button> })}</div><aside className="blacksmithing-perk-details"><span className="tiny-label">{perk.branch}</span><h3>{perk.name}</h3><p>{perk.description}</p><div className="blacksmithing-detail-list"><span>Rank</span><strong>{state.currentRank} / {perk.maxRank}</strong><span>Required BS</span><strong>{perk.requiredSkillLevel}</strong><span>Status</span><strong>{state.status}</strong></div><button className="button button-primary full-button" disabled={state.status !== "available"} onClick={() => purchase(perk.id)}>{state.status === "available" ? `PURCHASE RANK ${state.currentRank + 1}` : state.status === "maxed" ? "MAX RANK" : state.status.replace("-", " ").toUpperCase()}</button></aside></div></section>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="blacksmithing-metric"><span>{label}</span><strong>{value}</strong></div> }
