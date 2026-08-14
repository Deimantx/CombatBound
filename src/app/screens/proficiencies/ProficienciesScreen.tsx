import { useEffect, useMemo, useRef, useState } from 'react'
import { Award, Check, Lock, MousePointer2, Sparkles, Swords } from 'lucide-react'
import { proficiencyDefinitions, proficiencyById } from '../../../game/data/proficiencies'
import { perkById } from '../../../game/data/proficiencyPerks'
import { itemById } from '../../../game/data/items'
import { getEquippedWeaponProficiency } from '../../../game/progression/progressionSelectors'
import { calculateEarnedPerkPoints, calculateAvailablePerkPoints, calculateSpentPerkPoints, masteryLevelForXp, masteryXpForLevel, masteryXpToNextLevel } from '../../../game/progression/masteryProgression'
import { getPerkPurchaseState } from '../../../game/progression/perkProgression'
import { getProficiencyLevelProgress, getProficiencyProgress, getProficiencyXpToNextLevel } from '../../../game/progression/proficiencyProgression'
import { useGameStore } from '../../../state/gameStore'
import { getDefensiveEquipmentContext } from '../../../game/equipment/defensiveEquipment'
import type { CombatProficiencyId, PerkPurchaseState, ProficiencyPerkDefinition } from '../../../game/progression/progressionTypes'
import { GameTooltip } from '../../components/tooltip/GameTooltip'
import { useTooltip } from '../../components/tooltip/TooltipProvider'
import { Panel } from '../../components/Panel'
import { PlaceholderArt } from '../../components/PlaceholderArt'
import { ProgressBar } from '../../components/ProgressBar'
import { ScreenHeading } from '../../shell/ScreenHeading'

const GRAPH_COLUMNS = 9
const GRAPH_ROWS = 11
const GRAPH_WIDTH = 1000
const GRAPH_HEIGHT = 1100
const GRAPH_SIDE_PADDING = 55
const GRAPH_TOP_PADDING = 50
const GRAPH_BOTTOM_PADDING = 50

const statusLabel: Record<string, string> = {
  available: 'AVAILABLE',
  'level-locked': 'LOCKED_LEVEL',
  'prerequisite-locked': 'LOCKED_PREREQUISITE',
  'points-locked': 'LOCKED_POINTS',
  maxed: 'MAXED',
  'purchased-partial': 'PURCHASED_PARTIAL',
  unknown: 'UNKNOWN',
}

type Progression = ReturnType<typeof useGameStore.getState>['game']['progression']
type TreePan = { x: number; y: number }

const PAN_PADDING = 60
const PAN_THRESHOLD = 4
const DEFENSIVE_PROFICIENCY_IDS: CombatProficiencyId[] = ['light-armor', 'medium-armor', 'heavy-armor', 'shield']

function graphPoint(perk: ProficiencyPerkDefinition) {
  const x = GRAPH_SIDE_PADDING + (perk.presentation.column / (GRAPH_COLUMNS - 1)) * (GRAPH_WIDTH - GRAPH_SIDE_PADDING * 2)
  const y = GRAPH_TOP_PADDING + ((GRAPH_ROWS - 1 - perk.presentation.row) / (GRAPH_ROWS - 1)) * (GRAPH_HEIGHT - GRAPH_TOP_PADDING - GRAPH_BOTTOM_PADDING)
  return { x, y }
}

export function ProficienciesScreen() {
  const game = useGameStore((state) => state.game)
  const purchasePerk = useGameStore((state) => state.purchaseProficiencyPerk)
  const equippedProficiency = getEquippedWeaponProficiency(game.equipment)
  const defensiveContext = getDefensiveEquipmentContext(game.equipment)
  const [selectedId, setSelectedId] = useState<CombatProficiencyId>(equippedProficiency ?? 'one-handed-sword')
  const [selectedPerkId, setSelectedPerkId] = useState('')
  const [treePanByProficiency, setTreePanByProficiency] = useState<Partial<Record<CombatProficiencyId, TreePan>>>({})
  const selected = proficiencyById[selectedId] ?? proficiencyDefinitions[0]
  const earned = calculateEarnedPerkPoints(game.progression.masteryXp)
  const spent = calculateSpentPerkPoints(game.progression, perkById)
  const available = calculateAvailablePerkPoints(game.progression, perkById)
  const masteryLevel = masteryLevelForXp(game.progression.masteryXp)
  const masteryCurrent = masteryXpForLevel(masteryLevel)
  const masteryNext = masteryLevel >= 100 ? masteryCurrent : masteryXpForLevel(masteryLevel + 1)
  const masteryPercent = masteryNext === masteryCurrent ? 100 : ((game.progression.masteryXp - masteryCurrent) / (masteryNext - masteryCurrent)) * 100
  const activeWeapon = game.equipment.slots.weapon ? itemById[game.equipment.slots.weapon]?.name : undefined
  const defensiveDefinitions = DEFENSIVE_PROFICIENCY_IDS.map((id) => proficiencyById[id]).filter((definition): definition is typeof proficiencyDefinitions[number] => Boolean(definition))
  const selectedPerks = selected.perkIds.map((perkId) => perkById[perkId]).filter((perk): perk is ProficiencyPerkDefinition => Boolean(perk))
  const selectedPerk = selectedPerks.find((perk) => perk.id === selectedPerkId) ?? selectedPerks[0]

  return <div className="screen proficiencies-screen" data-debug-screen="proficiencies">
    <ScreenHeading screen="proficiencies" />
    <Panel title="Combat Mastery" subtitle="Global lifetime weapon and magic progression" icon={Sparkles} panelId="masterySummary" screen="proficiencies" className="mastery-summary-panel">
      <div className="mastery-summary-grid">
        <ProgressionMetric label="Mastery Level" value={`Lv ${masteryLevel}`} detail={`${Math.floor(game.progression.masteryXp).toLocaleString()} XP`} progress={masteryPercent} tooltip={{ id: 'progression.mastery-level', title: 'Mastery Level', subtitle: 'Global combat progression', description: 'Mastery Level is derived from lifetime Mastery XP and gates world content. It does not automatically grant combat stats.' }} />
        <ProgressionMetric label="Mastery XP" value={Math.floor(game.progression.masteryXp).toLocaleString()} detail={masteryLevel >= 100 ? 'Maximum level reached' : `${masteryXpToNextLevel(game.progression).toLocaleString()} XP to next level`} progress={masteryPercent} tooltip={{ id: 'progression.mastery-xp', title: 'Mastery XP', subtitle: 'Global lifetime progression', description: 'Global lifetime combat progression earned whenever eligible weapon or magic Proficiency XP is gained.' }} />
        <ProgressionMetric label="Available Perk Points" value={`${available}`} detail={`Earned ${earned} · Spent ${spent}`} progress={earned > 0 ? (available / earned) * 100 : 0} tooltip={{ id: 'progression.perk-points', title: 'Perk Points', subtitle: 'Global spendable progression', description: 'Perk Points are earned at increasing Mastery XP thresholds and spent in unlocked Proficiency trees.' }} />
      </div>
    </Panel>
    <div className="proficiencies-layout">
      <Panel title="Proficiencies" subtitle="Select a combat path" icon={Swords} panelId="proficiencyList" screen="proficiencies" className="proficiency-list-panel proficiencies-selector">
        <ProficiencyGroup label="DEFENSE" definitions={defensiveDefinitions} selectedId={selected.id} equippedId={null} progression={game.progression} defensiveContext={defensiveContext} onSelect={setSelectedId} />
        <ProficiencyGroup label="MELEE" definitions={proficiencyDefinitions.filter((definition) => definition.category === 'melee')} selectedId={selected.id} equippedId={equippedProficiency} progression={game.progression} onSelect={setSelectedId} />
        <ProficiencyGroup label="RANGED" definitions={proficiencyDefinitions.filter((definition) => definition.category === 'ranged')} selectedId={selected.id} equippedId={equippedProficiency} progression={game.progression} onSelect={setSelectedId} />
        <ProficiencyGroup label="MAGIC" definitions={proficiencyDefinitions.filter((definition) => definition.category === 'magic')} selectedId={selected.id} equippedId={null} progression={game.progression} onSelect={setSelectedId} />
      </Panel>
      <Panel title={`${selected.name} Proficiency`} subtitle={selected.description} icon={Sparkles} panelId="selectedProficiency" screen="proficiencies" className="selected-proficiency-panel">
        <SelectedHeader definition={selected} progression={game.progression} equipped={selected.category === 'defense' ? defensivePiecesFor(selected.id, defensiveContext) > 0 : selected.category !== 'magic' && selected.id === equippedProficiency} activeWeapon={activeWeapon} defensiveContext={defensiveContext} />
        {selected.category === 'defense' && <DefensiveProgressionContext proficiencyId={selected.id} context={defensiveContext} />}
        <div className="perk-tree-heading"><span className="tiny-label">PERK TREE</span><small>{available} available point{available === 1 ? '' : 's'} · grows from root to apex</small></div>
        {selectedPerks.length > 0 ? <PerkTree definition={selected} perks={selectedPerks} progression={game.progression} selectedPerkId={selectedPerk?.id ?? ''} onSelectPerk={setSelectedPerkId} pan={treePanByProficiency[selected.id]} onPanChange={(next) => setTreePanByProficiency((current) => ({ ...current, [selected.id]: next }))} /> : <div className="proficiency-empty"><Sparkles size={18} /><strong>Tree not authored yet</strong><span>Future perks for this proficiency will appear here.</span></div>}
      </Panel>
      {selectedPerk ? <PerkDetailsPanel perk={selectedPerk} progression={game.progression} availablePoints={available} onPurchase={purchasePerk} /> : <div className="perk-tree-details perk-details-empty"><MousePointer2 size={16} /><span>Select an authored Proficiency to view Perk details.</span></div>}
    </div>
  </div>
}

function ProgressionMetric({ label, value, detail, progress, tooltip }: { label: string; value: string; detail: string; progress: number; tooltip: { id: string; title: string; subtitle: string; description: string } }) {
  const content = <div className="mastery-metric" data-debug-kind="progression-metric" data-debug-label={label}><span className="tiny-label">{label}</span><strong>{value}</strong><small>{detail}</small><ProgressBar value={Math.max(0, Math.min(100, progress))} variant="experience" ariaLabel={`${label} progress`} /></div>
  return <GameTooltip content={tooltip}>{content}</GameTooltip>
}

function defensivePiecesFor(id: CombatProficiencyId, context: ReturnType<typeof getDefensiveEquipmentContext>) {
  return id === 'light-armor' ? context.lightArmorPieces : id === 'medium-armor' ? context.mediumArmorPieces : id === 'heavy-armor' ? context.heavyArmorPieces : id === 'shield' ? (context.shieldEquipped ? 1 : 0) : 0
}

function DefensiveProgressionContext({ proficiencyId, context }: { proficiencyId: CombatProficiencyId; context: ReturnType<typeof getDefensiveEquipmentContext> }) {
  const pieces = defensivePiecesFor(proficiencyId, context)
  const shield = proficiencyId === 'shield'
  return <div className="defensive-proficiency-context" data-debug-defensive-proficiency={proficiencyId} data-debug-armor-piece-count={pieces} data-debug-shield-equipped={shield && pieces > 0} data-debug-training-rate={shield ? pieces : pieces / 4}><span className="tiny-label">CURRENT TRAINING</span><strong>{shield ? (pieces > 0 ? 'Shield equipped' : 'No Shield equipped') : `${pieces} / 4 matching armor pieces`}</strong><small>Training rate: {(shield ? pieces : pieces / 4).toFixed(2)}× per defensive combat event</small></div>
}

function ProficiencyGroup({ label, definitions, selectedId, equippedId, progression, defensiveContext, onSelect }: { label: string; definitions: typeof proficiencyDefinitions; selectedId: CombatProficiencyId; equippedId: CombatProficiencyId | null; progression: Progression; defensiveContext?: ReturnType<typeof getDefensiveEquipmentContext>; onSelect: (id: CombatProficiencyId) => void }) {
  return <div className="proficiency-group" data-debug-kind="proficiency-group" data-debug-category={definitions[0]?.category ?? label.toLowerCase()} data-debug-label={label}><span className="tiny-label">{label}</span><div className="proficiency-grid">{definitions.map((definition) => <ProficiencyTile key={definition.id} definition={definition} selected={selectedId === definition.id} active={definition.category === 'defense' ? defensivePiecesFor(definition.id, defensiveContext ?? { lightArmorPieces: 0, mediumArmorPieces: 0, heavyArmorPieces: 0, shieldEquipped: false }) > 0 : definition.category !== 'magic' && equippedId === definition.id} progression={progression} onSelect={onSelect} />)}</div></div>
}

function ProficiencyTile({ definition, selected, active, progression, onSelect }: { definition: typeof proficiencyDefinitions[number]; selected: boolean; active: boolean; progression: Progression; onSelect: (id: CombatProficiencyId) => void }) {
  const storedProgress = getProficiencyProgress(progression, definition.id)
  const xp = storedProgress?.totalXp ?? 0
  const levelProgress = getProficiencyLevelProgress(xp, definition.maxLevel)
  const percent = levelProgress.progressFraction * 100
  const levelLabel = levelProgress.level > 0 ? `Lv ${levelProgress.level} / ${definition.maxLevel}` : 'UNTRAINED'
  const tooltipXp = levelProgress.isMaxLevel ? `${Math.floor(xp).toLocaleString()} XP` : levelProgress.level === 0 ? `${Math.floor(xp).toLocaleString()} XP` : `${Math.floor(xp).toLocaleString()} / ${levelProgress.nextLevelXp.toLocaleString()} XP`
  const tooltip = { id: `proficiency.${definition.id}`, title: definition.name, subtitle: `${definition.category === 'magic' ? 'Magic' : definition.category === 'melee' ? 'Melee' : definition.category === 'ranged' ? 'Ranged' : 'Defense'} proficiency`, description: definition.description, rows: [{ label: 'Level', value: levelLabel, tone: levelProgress.level > 0 ? 'blue' as const : 'default' as const }, { label: 'XP', value: tooltipXp, tone: 'gold' as const }], notes: [active ? definition.category === 'defense' ? 'Active defensive equipment training' : 'Active Weapon Proficiency' : '', definition.category === 'magic' ? 'Spell Available' : ''].filter(Boolean) }
  const content = <button type="button" className={`proficiency-tile ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''}`} onClick={() => onSelect(definition.id)} aria-pressed={selected} data-debug-kind="proficiency-tile" data-debug-legacy-kind="proficiency-row" data-debug-proficiency-id={definition.id} data-debug-label={definition.name}><span className="proficiency-tile-top"><PlaceholderArt icon={definition.icon} size="small" variant={active ? 'gold' : selected ? 'blue' : 'muted'} />{(active || definition.category === 'magic') && <span className={`proficiency-tile-indicator ${active ? 'is-active' : 'is-spell'}`} aria-label={active ? definition.category === 'defense' ? 'Active defensive proficiency' : 'Active weapon proficiency' : 'Spell available'}>{active ? 'A' : '✦'}</span>}</span><strong className="proficiency-tile-name">{definition.name}</strong><small>{levelLabel}</small><ProgressBar value={Math.max(0, Math.min(100, percent))} variant="experience" ariaLabel={`${definition.name} XP progress`} /></button>
  return <GameTooltip content={tooltip}>{content}</GameTooltip>
}

function SelectedHeaderLegacy({ definition, progression, equipped, activeWeapon }: { definition: typeof proficiencyDefinitions[number]; progression: Progression; equipped: boolean; activeWeapon?: string }) {
  const storedProgress = getProficiencyProgress(progression, definition.id)
  const xp = storedProgress?.totalXp ?? 0
  const levelProgress = getProficiencyLevelProgress(xp, definition.maxLevel)
  const levelLabel = levelProgress.level > 0 ? `Lv ${levelProgress.level} / ${definition.maxLevel}` : 'UNTRAINED'
  const nextLevelLabel = levelProgress.isMaxLevel ? 'MAX LEVEL' : `${levelProgress.xpToNextLevel.toLocaleString()} XP to next level`
  const level = levelProgress.level
  const percent = levelProgress.progressFraction * 100
  return <div className="selected-proficiency-header" data-debug-kind="selected-proficiency" data-debug-proficiency-id={definition.id}><div className="selected-proficiency-heading"><div><span className="tiny-label">{equipped ? 'ACTIVE WEAPON PROFICIENCY' : definition.category === 'magic' ? 'MAGIC PROFICIENCY' : 'WEAPON PROFICIENCY'}</span><h3>{level > 0 ? `Lv ${level} / ${definition.maxLevel}` : 'UNTRAINED'}</h3></div>{equipped && <span className="proficiency-active-badge"><Check size={12} /> ACTIVE</span>}</div>{level > 0 ? <><div className="selected-xp-line"><span>Current XP {Math.floor(xp).toLocaleString()}</span><strong>{getProficiencyXpToNextLevel(progression, definition.id).toLocaleString()} XP to next level</strong></div><ProgressBar value={Math.max(0, Math.min(100, percent))} variant="experience" showValue ariaLabel={`${definition.name} selected XP progress`} /><small className="selected-lifetime-xp">Lifetime Proficiency XP: {Math.floor(xp).toLocaleString()}{activeWeapon && equipped ? ` · Equipped item: ${activeWeapon}` : ''}</small></> : <p className="untrained-copy">Use a {definition.category === 'magic' ? 'spell from' : ''} {definition.name} to begin gaining Proficiency XP.</p>}</div>
}

function SelectedHeader({ definition, progression, equipped, activeWeapon }: { definition: typeof proficiencyDefinitions[number]; progression: Progression; equipped: boolean; activeWeapon?: string; defensiveContext?: ReturnType<typeof getDefensiveEquipmentContext> }) {
  const storedProgress = getProficiencyProgress(progression, definition.id)
  const xp = storedProgress?.totalXp ?? 0
  const levelProgress = getProficiencyLevelProgress(xp, definition.maxLevel)
  const levelLabel = levelProgress.level > 0 ? `Lv ${levelProgress.level} / ${definition.maxLevel}` : 'UNTRAINED'
  const nextLevelLabel = levelProgress.isMaxLevel ? 'MAX LEVEL' : `${levelProgress.xpToNextLevel.toLocaleString()} XP to next level`
  return <div className="selected-proficiency-header" data-debug-kind="selected-proficiency" data-debug-proficiency-id={definition.id} data-debug-progress={levelProgress.progressFraction} data-debug-total-xp={xp} data-debug-level={levelProgress.level}><div className="selected-proficiency-heading"><div><span className="tiny-label">{equipped ? definition.category === 'defense' ? 'ACTIVE DEFENSIVE PROFICIENCY' : 'ACTIVE WEAPON PROFICIENCY' : definition.category === 'magic' ? 'MAGIC PROFICIENCY' : definition.category === 'defense' ? 'DEFENSIVE PROFICIENCY' : 'WEAPON PROFICIENCY'}</span><h3 className="proficiency-active-level">{levelLabel}</h3></div>{equipped && <span className="proficiency-active-badge"><Check size={12} /> ACTIVE</span>}</div><div className="selected-xp-line"><span>Current XP {Math.floor(xp).toLocaleString()}</span><strong>{nextLevelLabel}</strong></div><ProgressBar value={levelProgress.progressFraction * 100} variant="experience" showValue ariaLabel={`${definition.name} selected XP progress`} /><small className="selected-lifetime-xp">Lifetime Proficiency XP: {Math.floor(xp).toLocaleString()}{activeWeapon && equipped ? ` / Equipped item: ${activeWeapon}` : ''}</small>{levelProgress.level === 0 && <p className="untrained-copy">Use a {definition.category === 'magic' ? 'spell from' : ''} {definition.name} to begin gaining Proficiency XP.</p>}</div>
}

function PerkTree({ definition, perks, progression, selectedPerkId, onSelectPerk, pan, onPanChange }: { definition: typeof proficiencyDefinitions[number]; perks: ProficiencyPerkDefinition[]; progression: Progression; selectedPerkId: string; onSelectPerk: (id: string) => void; pan?: TreePan; onPanChange: (pan: TreePan) => void }) {
  const selectedPerk = perks.find((perk) => perk.id === selectedPerkId) ?? perks[0]
  const byId = useMemo(() => Object.fromEntries(perks.map((perk) => [perk.id, perk])), [perks])
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const cameraRef = useRef<HTMLDivElement | null>(null)
  const interactionRef = useRef<{ pointerId: number; startPointerX: number; startPointerY: number; startPanX: number; startPanY: number; didPan: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const [isPanning, setIsPanning] = useState(false)
  const { hideTooltip } = useTooltip()
  const currentPan = pan ?? { x: 0, y: 0 }

  const clampPan = (next: TreePan) => {
    const viewport = viewportRef.current
    const camera = cameraRef.current
    if (!viewport || !camera) return next
    const minX = viewport.clientWidth - camera.offsetWidth - PAN_PADDING
    const maxX = PAN_PADDING
    const minY = viewport.clientHeight - camera.offsetHeight - PAN_PADDING
    const maxY = PAN_PADDING
    return { x: Math.max(minX, Math.min(maxX, next.x)), y: Math.max(minY, Math.min(maxY, next.y)) }
  }

  const rootPosition = () => {
    const root = perks.find((perk) => perk.prerequisiteRules.length === 0) ?? perks.reduce((lowest, perk) => perk.presentation.row < lowest.presentation.row ? perk : lowest, perks[0])
    return graphPoint(root)
  }

  const centerTree = () => {
    const viewport = viewportRef.current
    if (!viewport) return
    const root = rootPosition()
    onPanChange(clampPan({ x: viewport.clientWidth / 2 - root.x, y: viewport.clientHeight * .72 - root.y }))
  }

  useEffect(() => {
    if (pan) return
    const frame = window.requestAnimationFrame(() => centerTree())
    return () => window.cancelAnimationFrame(frame)
  }, [definition.id])

  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    const deltaX = event.clientX - interaction.startPointerX
    const deltaY = event.clientY - interaction.startPointerY
    if (!interaction.didPan && Math.hypot(deltaX, deltaY) < PAN_THRESHOLD) return
    if (!interaction.didPan) {
      interaction.didPan = true
      suppressClickRef.current = true
      setIsPanning(true)
      hideTooltip()
    }
    event.preventDefault()
    onPanChange(clampPan({ x: interaction.startPanX + deltaX, y: interaction.startPanY + deltaY }))
  }

  const stopPointerPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) return
    const viewport = viewportRef.current
    if (viewport?.hasPointerCapture?.(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
    interactionRef.current = null
    setIsPanning(false)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('[data-perk-node]')) return
    if (event.button !== 0 && event.pointerType === 'mouse') return
    suppressClickRef.current = false
    const point = pan ?? clampPan({ x: 0, y: 0 })
    interactionRef.current = { pointerId: event.pointerId, startPointerX: event.clientX, startPointerY: event.clientY, startPanX: point.x, startPanY: point.y, didPan: false }
    const viewport = viewportRef.current
    if (viewport?.setPointerCapture) viewport.setPointerCapture(event.pointerId)
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const horizontal = event.shiftKey ? event.deltaX || event.deltaY : event.deltaX
    const vertical = event.shiftKey ? 0 : event.deltaY
    onPanChange(clampPan({ x: currentPan.x - horizontal, y: currentPan.y - vertical }))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const deltas: Record<string, TreePan> = { ArrowLeft: { x: 40, y: 0 }, ArrowRight: { x: -40, y: 0 }, ArrowUp: { x: 0, y: 40 }, ArrowDown: { x: 0, y: -40 } }
    const delta = deltas[event.key]
    if (!delta) return
    event.preventDefault()
    onPanChange(clampPan({ x: currentPan.x + delta.x, y: currentPan.y + delta.y }))
  }

  const handleClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return
    suppressClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return <div className="perk-tree-region" data-debug-kind="perk-tree" data-debug-proficiency-id={definition.id}>
    <div className="perk-tree-camera-header"><span className="tiny-label">MAP VIEW</span><small>Drag empty space to explore</small><GameTooltip content={{ id: `perk-tree-center.${definition.id}`, title: 'Center Perk Tree', description: 'Return the camera to the root area.' }}><button type="button" className="perk-tree-center" onClick={centerTree} data-debug-action="center-perk-tree" aria-label="Center Perk Tree">CENTER</button></GameTooltip></div>
    <div ref={viewportRef} className={`perk-tree-viewport ${isPanning ? 'is-panning' : ''}`} data-debug-kind="perk-tree-viewport" data-debug-pan-x={Math.round(currentPan.x)} data-debug-pan-y={Math.round(currentPan.y)} aria-label={`${definition.name} perk graph`} tabIndex={0} onPointerDown={handlePointerDown} onPointerMove={updateFromPointer} onPointerUp={stopPointerPan} onPointerCancel={stopPointerPan} onWheel={handleWheel} onKeyDown={handleKeyDown} onClickCapture={handleClickCapture}>
      <div ref={cameraRef} className="perk-tree-camera" style={{ transform: `translate3d(${currentPan.x}px, ${currentPan.y}px, 0)` }} data-debug-kind="perk-tree-camera" data-debug-pan-x={Math.round(currentPan.x)} data-debug-pan-y={Math.round(currentPan.y)} data-perk-tree-pan-surface>
      <div className="perk-tree-canvas" style={{ height: GRAPH_HEIGHT }} data-debug-kind="perk-tree-canvas">
        <svg className="perk-tree-connectors" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
          {perks.flatMap((perk) => perk.prerequisiteRules.flatMap((rule, ruleIndex) => rule.requirements.map((requirement, requirementIndex) => {
            const parent = byId[requirement.perkId]
            if (!parent) return null
            const start = graphPoint(parent)
            const end = graphPoint(perk)
            const parentState = getPerkPurchaseState(progression, parent.id, perkById)
            const childState = getPerkPurchaseState(progression, perk.id, perkById)
            const active = childState.status === 'available' || childState.currentRank > 0
            return <line key={`${perk.id}-${ruleIndex}-${requirementIndex}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className={`perk-tree-edge ${active && parentState.currentRank >= requirement.requiredRank ? 'is-active' : ''}`} data-debug-prerequisite-edge={`${parent.id}->${perk.id}`} />
          }))).filter(Boolean)}
        </svg>
        {perks.map((perk) => <PerkNode key={perk.id} perk={perk} progression={progression} selected={perk.id === selectedPerk?.id} onSelect={onSelectPerk} />)}
      </div>
      </div>
    </div>
  </div>
}

function PerkNodeLegacy({ perk, progression, selected, onSelect }: { perk: ProficiencyPerkDefinition; progression: Progression; selected: boolean; onSelect: (id: string) => void }) {
  const state = getPerkPurchaseState(progression, perk.id, perkById)
  const rank = state.currentRank
  const visualStatus = rank > 0 && state.status !== 'maxed' ? 'purchased-partial' : state.status
  const point = graphPoint(perk)
  const positionStyle = { left: `${(point.x / GRAPH_WIDTH) * 100}%`, top: `${(point.y / GRAPH_HEIGHT) * 100}%` }
  const content = <button type="button" className={`perk-tree-node is-${visualStatus} ${selected ? 'is-selected' : ''}`} style={positionStyle} onClick={() => onSelect(perk.id)} data-perk-node data-debug-kind="perk-node" data-debug-legacy-kind="proficiency-perk" data-debug-perk-id={perk.id} data-debug-state={statusLabel[visualStatus]} data-debug-label={perk.name} aria-label={`${perk.name}, ${statusLabel[visualStatus]}`}><strong className="perk-node-name">{perk.name}</strong><small className="perk-node-rank">R {rank}/{perk.maxRank}</small></button>
  return <GameTooltip content={{ id: `perk-node.${perk.id}`, title: perk.name, subtitle: `${perk.branch} · ${statusLabel[visualStatus]}`, description: perk.description, rows: [{ label: 'Rank', value: `${rank} / ${perk.maxRank}`, tone: rank > 0 ? 'green' : 'default' }, { label: 'Level', value: `Proficiency Lv ${perk.requiredProficiencyLevel}`, tone: state.status === 'level-locked' ? 'red' : 'blue' }, { label: 'Cost', value: state.status === 'maxed' ? 'Complete' : `${perk.costPerRank} point / rank`, tone: 'gold' }] }}>{content}</GameTooltip>
}

function PerkNode({ perk, progression, selected, onSelect }: { perk: ProficiencyPerkDefinition; progression: Progression; selected: boolean; onSelect: (id: string) => void }) {
  const state = getPerkPurchaseState(progression, perk.id, perkById)
  const rank = state.currentRank
  const visualStatus = rank > 0 && state.status !== 'maxed' ? 'purchased-partial' : state.status
  const point = graphPoint(perk)
  const positionStyle = { left: `${(point.x / GRAPH_WIDTH) * 100}%`, top: `${(point.y / GRAPH_HEIGHT) * 100}%` }
  const content = <button type="button" className={`perk-tree-node is-${visualStatus} ${selected ? 'is-selected' : ''}`} style={positionStyle} onClick={() => onSelect(perk.id)} data-perk-node data-debug-kind="perk-node" data-debug-legacy-kind="proficiency-perk" data-debug-perk-id={perk.id} data-debug-state={statusLabel[visualStatus]} data-debug-label={perk.name} aria-label={`${perk.name}, ${statusLabel[visualStatus]}`}><strong className="perk-node-name">{perk.name}</strong><small className="perk-node-rank">R {rank}/{perk.maxRank}</small></button>
  return <GameTooltip content={{ id: `perk-node.${perk.id}`, title: perk.name, subtitle: `${perk.branch} / ${statusLabel[visualStatus]}`, description: perk.description, rows: [{ label: 'Rank', value: `${rank} / ${perk.maxRank}`, tone: rank > 0 ? 'green' : 'default' }, { label: 'Level', value: `Proficiency Lv ${perk.requiredProficiencyLevel}`, tone: state.status === 'level-locked' ? 'red' : 'blue' }, { label: 'Cost', value: state.status === 'maxed' ? 'Complete' : `${perk.costPerRank} point / rank`, tone: 'gold' }] }}>{content}</GameTooltip>
}

function PerkDetailsPanel({ perk, progression, availablePoints, onPurchase }: { perk: ProficiencyPerkDefinition; progression: Progression; availablePoints: number; onPurchase: (perkId: string) => void }) {
  const state = getPerkPurchaseState(progression, perk.id, perkById)
  const nextRank = Math.min(perk.maxRank, state.currentRank + 1)
  const lockedReason = state.status === 'level-locked' ? `Requires ${perk.requiredProficiencyLevel} Proficiency level.` : state.status === 'prerequisite-locked' ? 'Required prerequisite ranks are not complete.' : state.status === 'points-locked' ? `Needs ${state.missingPoints} more Perk Point${state.missingPoints === 1 ? '' : 's'}.` : state.status === 'maxed' ? 'Maximum rank reached.' : 'Ready to purchase.'
  const prerequisiteText = perk.prerequisiteRules.length === 0 ? 'Root node — no prerequisites.' : perk.prerequisiteRules.map((rule) => `${rule.mode === 'all' ? 'All' : `Any ${rule.minimumSatisfied ?? 1}`} of ${rule.requirements.map((requirement) => `${perkById[requirement.perkId]?.name ?? requirement.perkId} R${requirement.requiredRank}`).join(', ')}`).join(' · ')
  return <aside className="perk-tree-details perk-details-panel" data-debug-kind="perk-details" data-debug-perk-id={perk.id}><div className="perk-details-panel-heading"><span className="tiny-label">PERK DETAILS</span><span className={`perk-details-status is-${state.status}`}>{state.status === 'available' ? <Award size={13} /> : <Lock size={13} />}{statusLabel[state.status]}</span></div><div className="perk-details-heading"><div><span className="tiny-label">{perk.branch}</span><h3>{perk.name}</h3></div></div><p>{perk.description}</p><div className="perk-details-grid"><span>Proficiency</span><strong>{proficiencyById[perk.proficiencyId]?.name ?? perk.proficiencyId}</strong><span>Rank</span><strong>{state.currentRank} / {perk.maxRank}</strong><span>Current effect</span><strong>{state.currentRank > 0 ? `Active at rank ${state.currentRank}` : 'Not active'}</strong><span>Next effect</span><strong>{nextRank > state.currentRank ? `Rank ${nextRank} upgrade` : 'Complete'}</strong><span>Cost</span><strong>{state.status === 'maxed' ? 'Complete' : `${perk.costPerRank} Perk Point${perk.costPerRank === 1 ? '' : 's'}`}</strong><span>Requirement</span><strong>Level {perk.requiredProficiencyLevel}</strong></div><div className="perk-details-prerequisites"><span className="tiny-label">PREREQUISITES</span><small>{prerequisiteText}</small></div><div className={`perk-details-lock is-${state.status}`}>{lockedReason}</div><button type="button" className="button primary full-button" disabled={state.status !== 'available'} onClick={() => onPurchase(perk.id)} data-debug-action="purchase-perk" data-debug-perk-id={perk.id}>{state.status === 'available' ? `Purchase Rank ${nextRank} · ${perk.costPerRank} Point${perk.costPerRank === 1 ? '' : 's'}` : state.status === 'maxed' ? 'Max Rank Reached' : `Need ${availablePoints} Available Point${availablePoints === 1 ? '' : 's'}`}</button></aside>
}
