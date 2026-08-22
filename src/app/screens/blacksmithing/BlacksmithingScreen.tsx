import { Hammer, Sword } from "lucide-react"
import { useState } from "react"
import { ScreenHeading } from "../../shell/ScreenHeading"
import { ProgressBar } from "../../components/ProgressBar"
import { useGameStore } from "../../../state/gameStore"
import { getProfessionLevel, getProfessionLevelProgress, professionAvailablePoints, professionPointsFromLevels, professionPointsSpent } from "../../../game/professions/professionProgression"
import { blacksmithingPerks, blacksmithingPerkById, BLACKSMITHING_PERK_TREE_COST } from "../../../game/professions/blacksmithing/blacksmithingPerks"
import { blacksmithingRecipes, blacksmithingRecipeById } from "../../../game/professions/blacksmithing/blacksmithingRecipes"
import { getBlacksmithingStats } from "../../../game/professions/blacksmithing/blacksmithingStats"
import { estimateBlacksmithingOperationRates, estimateBlacksmithingRates } from "../../../game/professions/blacksmithing/blacksmithingRates"
import { getProfessionPerkPurchaseState } from "../../../game/professions/professionPerkValidation"
import { getStackableQuantity, getItemInstances } from "../../../game/items/itemOwnership"
import { itemById } from "../../../game/data/items"
import { getItemUpgradeSpecialization, getUpgradeNodeState, getUpgradeNodesForInstance } from "../../../game/items/itemUpgradeLogic"
import { itemUpgradeBranchById, itemUpgradeNodeById, itemUpgradeTreeById } from "../../../game/data/gear/itemUpgradeTrees"
import type { BlacksmithingRecipeDefinition } from "../../../game/professions/blacksmithing/blacksmithingTypes"
import { formatDuration } from "../../../game/profiles/profileFormatting"

type BlacksmithingTab = "smelting" | "smithing" | "upgrade" | "perks"
type SmithingFilter = "ALL" | "WEAPONS" | "ARMOR" | "TOOLS"
type UpgradeFilter = "ALL" | "WEAPONS" | "ARMOR" | "SHIELD"

export function BlacksmithingScreen() {
  const game = useGameStore((state) => state.game)
  const [tab, setTab] = useState<BlacksmithingTab>("smelting")
  const [selectedSmithingRecipeId, setSelectedSmithingRecipeId] = useState(game.blacksmithing.selectedSmithingRecipeId ?? blacksmithingRecipes.find((recipe) => recipe.kind === "smithing")?.id ?? "")
  const progress = getProfessionLevelProgress(game.professions, "blacksmithing")
  const stats = getBlacksmithingStats(game)
  const activeOperation = game.blacksmithing.activeOperation
  const smithingRecipe = blacksmithingRecipeById[selectedSmithingRecipeId] ?? blacksmithingRecipes.find((recipe) => recipe.kind === "smithing") ?? null
  const rates = activeOperation
    ? estimateBlacksmithingOperationRates(game, { kind: activeOperation.kind, durationSeconds: activeOperation.durationSeconds, staminaCost: activeOperation.staminaCost, xpReward: activeOperation.xpReward })
    : tab === "smelting"
      ? estimateBlacksmithingRates(game, blacksmithingRecipeById[game.blacksmithing.selectedSmeltingRecipeId] ?? null)
      : tab === "smithing"
        ? estimateBlacksmithingRates(game, smithingRecipe)
        : null
  const displayRates = rates ?? estimateBlacksmithingRates(game, null)
  return <div className="screen blacksmithing-screen" data-debug-screen="blacksmithing" data-debug-kind="blacksmithing-screen">
    <ScreenHeading screen="blacksmithing" />
    <section className="panel blacksmithing-profession-header" data-debug-kind="blacksmithing-header">
      <div className="panel-header"><div className="panel-heading"><span className="panel-icon"><Hammer size={16} /></span><div><div className="panel-title">Blacksmithing Level {progress.level}</div><div className="panel-subtitle">{Math.floor(progress.xpIntoLevel).toLocaleString()} / {Math.floor(progress.xpRequiredForLevel).toLocaleString()} XP</div></div></div><strong className="mining-points-badge">{professionAvailablePoints(game.professions, "blacksmithing")} POINTS</strong></div>
      <div className="panel-body"><ProgressBar value={progress.progressFraction * 100} variant="experience" ariaLabel="Blacksmithing experience" /><div className="blacksmithing-stat-grid"><Metric label="XP / hour" value={rates ? displayRates.blacksmithingXpPerHour.toFixed(0) : "-"} /><Metric label="XP to next" value={progress.isMaxLevel ? "MAX LEVEL" : Math.ceil(progress.xpToNextLevel).toLocaleString()} /><Metric label="ETA" value={rates && displayRates.etaSeconds !== null ? formatDuration(displayRates.etaSeconds) : "-"} /><Metric label="Forge Stamina" value={`${Math.ceil(game.blacksmithing.forgeStamina)} / ${Math.ceil(stats.maxForgeStamina)}`} /><Metric label="Rest" value={`${stats.restDurationSeconds.toFixed(1)}s`} /></div></div>
    </section>
    <div className="segmented-tabs blacksmithing-tabs" role="tablist" data-debug-kind="blacksmithing-tabs">
      {(["smelting", "smithing", "upgrade", "perks"] as BlacksmithingTab[]).map((entry) => <button key={entry} className={`tab-button ${tab === entry ? "is-active" : ""}`} onClick={() => setTab(entry)} role="tab" aria-selected={tab === entry}>{entry === "perks" ? "PERK TREE" : entry.toUpperCase()}</button>)}
    </div>
    {tab === "smelting" && <SmeltingPanel game={game} />}
    {tab === "smithing" && <SmithingPanel game={game} selectedId={selectedSmithingRecipeId} setSelectedId={setSelectedSmithingRecipeId} />}
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

function SmithingPanel({ game, selectedId, setSelectedId }: { game: ReturnType<typeof useGameStore.getState>["game"]; selectedId: string; setSelectedId: (id: string) => void }) {
  const [filter, setFilter] = useState<SmithingFilter>("ALL")
  const recipe = blacksmithingRecipeById[selectedId] ?? blacksmithingRecipes[1]
  const professionLevel = getProfessionLevel(game.professions, "blacksmithing")
  const recipes = blacksmithingRecipes.filter((entry) => entry.kind === "smithing" && (filter === "ALL" || filter === "WEAPONS" && entry.tags.includes("weapon") || filter === "ARMOR" && entry.tags.includes("defensive") || filter === "TOOLS" && entry.tags.includes("tool")))
  const start = useGameStore((state) => state.startBlacksmithing)
  const stop = useGameStore((state) => state.stopBlacksmithing)
  const clear = useGameStore((state) => state.clearBlacksmithingQueue)
  return <section className="blacksmithing-workspace"><div className="panel blacksmithing-recipe-list"><div className="panel-header"><div><div className="panel-title">Smithing Recipes</div><div className="panel-subtitle">14 exact Iron outputs, using canonical ItemDefinitions.</div></div></div><div className="blacksmithing-filter-row">{(["ALL", "WEAPONS", "ARMOR", "TOOLS"] as SmithingFilter[]).map((entry) => <button key={entry} className={`button button-ghost ${filter === entry ? "is-active" : ""}`} onClick={() => setFilter(entry)}>{entry}</button>)}</div><div className="blacksmithing-recipe-grid">{recipes.map((entry) => { const locked = professionLevel < entry.requiredBlacksmithingLevel; return <button key={entry.id} className={`blacksmithing-recipe-card ${entry.id === recipe.id ? "is-selected" : ""} ${locked ? "is-locked" : ""}`} onClick={() => setSelectedId(entry.id)} data-debug-recipe-id={entry.id}><strong>{entry.name}</strong><span>BS {entry.requiredBlacksmithingLevel} | {entry.costs[0].quantity} Iron Bars</span><small>{locked ? `LOCKED - Requires Blacksmithing ${entry.requiredBlacksmithingLevel}` : "UNLOCKED"} | {entry.baseDurationSeconds}s | {entry.baseBlacksmithingXp} XP</small></button> })}</div></div><ProductionPanel game={game} recipe={recipe} title={recipe.name} description={`${recipe.costs[0].quantity} Iron Bars -> 1 ${recipe.name}`} onStart={(count, mode) => start(recipe.id, count, mode)} onStop={stop} onClear={clear} icon={<Sword size={21} />} /></section>
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
  const levelLocked = !pending && getProfessionLevel(game.professions, "blacksmithing") < recipe.requiredBlacksmithingLevel
  return <section className="panel blacksmithing-production-panel" data-debug-kind="blacksmithing-production"><div className="panel-header"><div className="panel-heading"><span className="panel-icon">{icon}</span><div><div className="panel-title">{title}</div><div className="panel-subtitle">{description}</div></div></div><span className={`mining-status ${active ? "is-active" : ""}`}>{active ? game.blacksmithing.mode === "resting" ? "EXHAUSTED" : "ACTIVE" : pending ? "PAUSED" : levelLocked ? "LOCKED" : "READY"}</span></div><div className="panel-body"><div className="blacksmithing-detail-grid"><Metric label="Required BS" value={`${recipe.requiredBlacksmithingLevel}`} /><Metric label="Duration" value={`${recipe.baseDurationSeconds}s`} /><Metric label="Forge Stamina" value={`${recipe.baseForgeStaminaCost}`} /><Metric label="XP / cycle" value={`${recipe.baseBlacksmithingXp}`} /><Metric label="Owned material" value={`${owned}`} /><Metric label={recipe.kind === "smelting" ? "Owned Bars" : "Owned copies"} value={`${ownedOutput}`} /><Metric label="Output" value={`1 ${title}`} /></div><div className="blacksmithing-flow"><strong>{description}</strong><span>{levelLocked ? `LOCKED - Requires Blacksmithing ${recipe.requiredBlacksmithingLevel}.` : "Materials are reserved at start. Output and XP resolve on completion."}</span></div>{(active || pending) && <div className="blacksmithing-active-card"><strong>{game.blacksmithing.mode === "resting" ? "FORGE EXHAUSTED - RESTING" : active ? `Working: ${title}` : "PAUSED"}</strong><span>{game.blacksmithing.mode === "resting" ? `${game.blacksmithing.restTimerRemaining.toFixed(1)}s remaining` : `${game.blacksmithing.actionTimerRemaining.toFixed(1)}s remaining`}</span><ProgressBar value={operation ? Math.max(0, Math.min(100, (1 - game.blacksmithing.actionTimerRemaining / Math.max(0.001, operation.durationSeconds)) * 100)) : 0} variant="resource" ariaLabel="Blacksmithing operation progress" /></div>}<div className="blacksmithing-queue-controls"><button className={`button button-ghost ${queue === 1 ? "is-active" : ""}`} onClick={() => setQueue(1)}>1</button><button className={`button button-ghost ${queue === 5 ? "is-active" : ""}`} onClick={() => setQueue(5)}>5</button><button className={`button button-ghost ${queue === 10 ? "is-active" : ""}`} onClick={() => setQueue(10)}>10</button><button className={`button button-ghost ${queue === 0 ? "is-active" : ""}`} onClick={() => setQueue(0)}>MAX</button><button className="button button-primary" disabled={active || (!pending && (max <= 0 || levelLocked))} onClick={() => onStart(queue || 1, mode)}>{pending ? "RESUME" : queue === 0 ? "START MAX" : "START x" + queue}</button>{active && <button className="button button-secondary" onClick={onStop}>STOP / PAUSE</button>}<button className="button button-ghost" disabled={!active || game.blacksmithing.queuedOperationsRemaining <= 0} onClick={onClear}>CLEAR REMAINING QUEUE</button></div></div></section>
}

function UpgradePanel({ game }: { game: ReturnType<typeof useGameStore.getState>["game"] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<UpgradeFilter>("ALL")
  const [confirmation, setConfirmation] = useState<{ instanceId: string; nodeId: string } | null>(null)
  const purchase = useGameStore((state) => state.purchaseProfessionItemUpgrade)
  const instances = getItemInstances(game.inventory).filter((instance) => {
    if (itemById[instance.definitionId]?.upgradeProfessionId !== "blacksmithing") return false
    const definition = itemById[instance.definitionId]
    return filter === "ALL" || filter === "WEAPONS" && definition.category === "weapon" || filter === "SHIELD" && definition.equipmentSlotKind === "offhand" || filter === "ARMOR" && definition.category !== "weapon" && definition.equipmentSlotKind !== "offhand"
  })
  const selected = instances.find((instance) => instance.id === selectedId) ?? instances[0]
  const definition = selected ? itemById[selected.definitionId] : undefined
  const tree = definition?.upgradeTreeId ? itemUpgradeTreeById[definition.upgradeTreeId] : undefined
  const specialization = selected ? getItemUpgradeSpecialization(selected, tree) : null
  const confirmationItem = confirmation ? game.inventory.instances[confirmation.instanceId] : undefined
  const confirmationDefinition = confirmationItem ? itemById[confirmationItem.definitionId] : undefined
  const confirmationNode = confirmation ? itemUpgradeNodeById[confirmation.nodeId] : undefined
  const confirmationBranch = confirmationNode ? itemUpgradeBranchById[confirmationNode.branchId] : undefined
  const currentLevel = getProfessionLevel(game.professions, "blacksmithing")
  return <section className="blacksmithing-workspace"><div className="panel blacksmithing-instance-list"><div className="panel-header"><div><div className="panel-title">Exact ItemInstances</div><div className="panel-subtitle">Select the copy you want to permanently specialize.</div></div></div><div className="blacksmithing-filter-row">{(["ALL", "WEAPONS", "ARMOR", "SHIELD"] as UpgradeFilter[]).map((entry) => <button key={entry} className={`button button-ghost ${filter === entry ? "is-active" : ""}`} onClick={() => setFilter(entry)}>{entry}</button>)}</div>{instances.length === 0 ? <p className="muted-copy">No upgradeable ItemInstances owned.</p> : instances.map((instance) => { const item = itemById[instance.definitionId]; const instanceTree = item?.upgradeTreeId ? itemUpgradeTreeById[item.upgradeTreeId] : undefined; return <button key={instance.id} className={`blacksmithing-instance-row ${selected?.id === instance.id ? "is-selected" : ""}`} onClick={() => setSelectedId(instance.id)}><span><strong>{item?.name ?? instance.definitionId}</strong><small>#{instance.id.replace("item-instance-", "")}</small></span><span>{getItemUpgradeSpecialization(instance, instanceTree).state === "specialized" ? "SPECIALIZED" : "UNSPECIALIZED"} | {instance.unlockedUpgradeNodeIds.length}/4</span></button> })}</div><div className="panel blacksmithing-upgrade-tree"><div className="panel-header"><div><div className="panel-title">{definition?.name ?? "Upgrade"}</div><div className="panel-subtitle">{selected ? `${selected.id} | ${specialization?.state === "specialized" ? specialization.branchId : "No specialization"}` : "Choose an exact item"}</div></div></div>{selected && tree ? <div className="blacksmithing-node-grid">{getUpgradeNodesForInstance(game.inventory, selected.id).map((node) => { const state = getUpgradeNodeState(game.inventory, selected.id, node.id); const levelLocked = currentLevel < node.requiredProfessionLevel; const displayState = levelLocked && state !== "purchased" ? "blacksmithing-level-locked" : state; const effectSummary = node.effects.map((effect) => effect.type === "globalStat" ? effect.stat : effect.type === "localStat" ? effect.target : effect.modifier).join(", "); return <button key={node.id} className={`blacksmithing-node state-${displayState}`} disabled={state !== "available" || levelLocked} onClick={() => { if (specialization?.state === "unspecialized" && node.prerequisiteNodeIds.length === 0) setConfirmation({ instanceId: selected.id, nodeId: node.id }); else purchase(selected.id, node.id) }}><strong>{node.name}</strong><p>{node.description}</p><small>{displayState.toUpperCase()} | BS {node.requiredProfessionLevel}</small><span>{node.costs.map((cost) => `${cost.quantity} ${itemById[cost.itemId]?.name ?? cost.itemId}`).join(", ")}</span><span>Effects: {effectSummary || "-"}</span></button> })}</div> : <p className="muted-copy">No Blacksmithing-owned upgradeable ItemInstances owned.</p>}</div>{confirmation && confirmationItem && confirmationNode && <div className="blacksmithing-confirmation-backdrop" role="presentation"><div className="blacksmithing-confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="blacksmithing-specialization-title"><h3 id="blacksmithing-specialization-title">PERMANENT SPECIALIZATION</h3><p>This choice permanently specializes this exact item copy.</p><dl><dt>Item</dt><dd>{confirmationDefinition?.name ?? confirmationItem.definitionId} #{confirmationItem.id.replace("item-instance-", "")}</dd><dt>Branch</dt><dd>{confirmationBranch?.name ?? confirmationNode.branchId}</dd><dt>Node</dt><dd>{confirmationNode.name}</dd></dl><p>Other branches on this ItemInstance will be locked.</p><div className="blacksmithing-confirmation-actions"><button className="button button-ghost" onClick={() => setConfirmation(null)}>CANCEL</button><button className="button button-primary" disabled={currentLevel < confirmationNode.requiredProfessionLevel} onClick={() => { purchase(confirmation.instanceId, confirmation.nodeId); setConfirmation(null) }}>CONFIRM SPECIALIZATION</button></div></div></div>}</section>
}

function PerkPanel({ game }: { game: ReturnType<typeof useGameStore.getState>["game"] }) {
  const [selectedId, setSelectedId] = useState(blacksmithingPerks[0].id)
  const purchase = useGameStore((state) => state.purchaseBlacksmithingPerk)
  const perk = blacksmithingPerkById[selectedId] ?? blacksmithingPerks[0]
  const state = getProfessionPerkPurchaseState(game.professions, perk, blacksmithingPerkById)
  return <section className="panel blacksmithing-perk-panel"><div className="panel-header"><div><div className="panel-title">Blacksmithing Perk Tree</div><div className="panel-subtitle">{BLACKSMITHING_PERK_TREE_COST} total ranks; Level 100 grants 99 points. Choose a build.</div></div><div className="blacksmithing-perk-accounting"><span>Levels {professionPointsFromLevels(game.professions, "blacksmithing")}</span><span>Bonus {game.professions.skills.blacksmithing?.bonusSkillPoints ?? 0}</span><span>Spent {professionPointsSpent(game.professions, "blacksmithing")}</span><strong>Available {professionAvailablePoints(game.professions, "blacksmithing")}</strong></div></div><div className="blacksmithing-perk-layout"><div className="blacksmithing-perk-grid">{blacksmithingPerks.map((entry) => { const entryState = getProfessionPerkPurchaseState(game.professions, entry, blacksmithingPerkById); return <button key={entry.id} className={`blacksmithing-perk-node is-${entry.type} ${entry.id === selectedId ? "is-selected" : ""} ${entryState.currentRank > 0 ? "is-purchased" : ""}`} onClick={() => setSelectedId(entry.id)} data-debug-perk-id={entry.id}><strong>{entry.name}</strong><small>R {entryState.currentRank}/{entry.maxRank}</small></button> })}</div><aside className="blacksmithing-perk-details"><span className="tiny-label">{perk.branch}</span><h3>{perk.name}</h3><p>{perk.description}</p><div className="blacksmithing-detail-list"><span>Rank</span><strong>{state.currentRank} / {perk.maxRank}</strong><span>Required BS</span><strong>{perk.requiredSkillLevel}</strong><span>Status</span><strong>{state.status}</strong></div><button className="button button-primary full-button" disabled={state.status !== "available"} onClick={() => purchase(perk.id)}>{state.status === "available" ? `PURCHASE RANK ${state.currentRank + 1}` : state.status === "maxed" ? "MAX RANK" : state.status.replace("-", " ").toUpperCase()}</button></aside></div></section>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="blacksmithing-metric"><span>{label}</span><strong>{value}</strong></div> }
