import { Map, Play, Swords, Target } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { combatLocationById } from '../../../game/data/world/combatLocations'
import { hunterRankForPoints } from '../../../game/progression/hunterRankProgression'
import { isCombatLocationAvailable, locationBreadcrumb, selectionForLocation } from '../../../game/world/worldSelectors'
import type { CombatLocationDefinition } from '../../../game/world/worldTypes'
import { useGameStore } from '../../../state/gameStore'
import { Panel } from '../../components/Panel'
import { DisclosureChevron } from '../../components/DisclosureChevron'
import { GameTooltip } from '../../components/tooltip/GameTooltip'
import { CombatAtlasStage } from './atlas/CombatAtlasStage'
import { atlasAccentRgb } from './atlas/combatAtlasLayout'
import { combatAtlasViewFor, combatAtlasViewId, combatAtlasViewTitle, combatAtlasViewDescription } from './atlas/combatAtlasRegistry'
import { combatLocationPresentation } from './combatLocationPresentation'
import { enemyTooltipModel } from './enemyPresentation'
import { EnemyPreviewIcon } from './components/EnemyPreviewIcon'
import type { CombatAtlasLevel, CombatAtlasNodeLayout } from './atlas/combatAtlasTypes'
import type { CombatAtlasTransitionOrigin, CombatAtlasTransitionPhase } from './atlas/CombatAtlasStage'

const activePhases = new Set(['active', 'recovery'])

export function CombatWorldBrowser() {
  const game = useGameStore((state) => state.game)
  const phase = game.combat.phase
  const selectedContinentId = useGameStore((state) => state.selectedContinentId)
  const selectedRegionId = useGameStore((state) => state.selectedRegionId)
  const selectedAreaId = useGameStore((state) => state.selectedAreaId)
  const selectedLocationId = useGameStore((state) => state.selectedCombatLocationId)
  const activeLocationId = useGameStore((state) => state.activeCombatLocationId)
  const selectedTargetId = useGameStore((state) => state.selectedTargetId)
  const selectTargetPreview = useGameStore((state) => state.selectCombatTargetPreview)
  const selectContinent = useGameStore((state) => state.selectContinent)
  const selectRegion = useGameStore((state) => state.selectRegion)
  const selectArea = useGameStore((state) => state.selectArea)
  const selectLocation = useGameStore((state) => state.selectCombatLocation)
  const startHunt = useGameStore((state) => state.startHunt)
  const switchHunt = useGameStore((state) => state.switchHunt)
  const [level, setLevel] = useState<CombatAtlasLevel>('world')
  const [open, setOpen] = useState(() => !activePhases.has(phase))
  const [transitionOrigin, setTransitionOrigin] = useState<CombatAtlasTransitionOrigin>()
  const [transitionPhase, setTransitionPhase] = useState<CombatAtlasTransitionPhase>('idle')
  const [activatingNodeId, setActivatingNodeId] = useState<string>()
  const transitionTimerRef = useRef<number | undefined>(undefined)
  const parentNavigationTimerRef = useRef<number | undefined>(undefined)
  const transitionPhaseTimerRef = useRef<number | undefined>(undefined)
  const pendingNavigationRef = useRef<CombatAtlasNodeLayout | undefined>(undefined)
  const lastTransitionNodeRef = useRef<{ id: string; at: number } | undefined>(undefined)
  const previousCombatRef = useRef({ active: activePhases.has(phase), locationId: activeLocationId })

  const hunterRank = hunterRankForPoints(game.progression.hunterRankPoints)
  const viewId = combatAtlasViewId(level, selectedContinentId, selectedRegionId, selectedAreaId)
  const view = combatAtlasViewFor(viewId)
  const viewTitle = combatAtlasViewTitle(view)
  const viewDescription = combatAtlasViewDescription(view)
  const location = combatLocationById[selectedLocationId]
  const activeLocation = activeLocationId ? combatLocationById[activeLocationId] : undefined
  const isCombatActive = activePhases.has(phase)
  const areaLevel = level === 'area'
  const sameLocation = Boolean(areaLevel && activeLocation && activeLocation.id === location?.id && isCombatActive)
  const activeTargetId = game.combat.targetEnemyId
  const canHunt = Boolean(areaLevel && location && isCombatLocationAvailable(location.id, hunterRank))
  const selectedNodeId = level === 'world' ? selectedContinentId : level === 'continent' ? selectedRegionId : level === 'region' ? selectedAreaId : selectedLocationId
  const activeHuntSelection = activeLocationId ? selectionForLocation(activeLocationId) : undefined
  const activeHuntPathNodeId = level === 'world'
    ? activeHuntSelection?.continentId
    : level === 'continent'
      ? activeHuntSelection?.regionId
      : level === 'region'
        ? activeHuntSelection?.areaId
        : activeHuntSelection?.combatLocationId

  useEffect(() => {
    const previous = previousCombatRef.current
    const becameActive = !previous.active && isCombatActive
    const changedActiveLocation = isCombatActive && Boolean(activeLocationId) && previous.locationId !== activeLocationId
    if (becameActive || changedActiveLocation) setOpen(false)
    previousCombatRef.current = { active: isCombatActive, locationId: activeLocationId }
  }, [activeLocationId, isCombatActive])

  useEffect(() => () => {
    if (transitionTimerRef.current !== undefined) window.clearTimeout(transitionTimerRef.current)
    if (parentNavigationTimerRef.current !== undefined) window.clearTimeout(parentNavigationTimerRef.current)
    if (transitionPhaseTimerRef.current !== undefined) window.clearTimeout(transitionPhaseTimerRef.current)
  }, [])

  const clearTransitionTimers = () => {
    if (transitionTimerRef.current !== undefined) window.clearTimeout(transitionTimerRef.current)
    if (transitionPhaseTimerRef.current !== undefined) window.clearTimeout(transitionPhaseTimerRef.current)
  }

  const applyNodeSelection = (node: CombatAtlasNodeLayout) => {
    if (node.kind === 'continent') {
      selectContinent(node.sourceId)
      setLevel('continent')
    } else if (node.kind === 'region') {
      selectRegion(node.sourceId)
      setLevel('region')
    } else if (node.kind === 'area') {
      selectArea(node.sourceId)
      setLevel('area')
    } else {
      selectLocation(node.sourceId)
    }
  }

  const beginSimpleTransition = (origin?: CombatAtlasTransitionOrigin, duration = 320) => {
    clearTransitionTimers()
    setTransitionOrigin(origin)
    setTransitionPhase('enter')
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionOrigin(undefined)
      setTransitionPhase('idle')
    }, duration)
  }

  const handleNodeSelect = (node: CombatAtlasNodeLayout) => {
    if (node.kind === 'arena') {
      applyNodeSelection(node)
      return
    }
    if (pendingNavigationRef.current) return
    const now = Date.now()
    const last = lastTransitionNodeRef.current
    if (last?.id === node.sourceId && now - last.at < 350) return
    lastTransitionNodeRef.current = { id: node.sourceId, at: now }
    pendingNavigationRef.current = node
    clearTransitionTimers()
    setActivatingNodeId(node.sourceId)
    setTransitionOrigin({ x: node.x, y: node.y, rgb: atlasAccentRgb[node.accent] })
    setTransitionPhase('exit')
    parentNavigationTimerRef.current = window.setTimeout(() => {
      if (pendingNavigationRef.current !== node) return
      pendingNavigationRef.current = undefined
      applyNodeSelection(node)
      setActivatingNodeId(undefined)
      setTransitionOrigin(undefined)
      setTransitionPhase('enter')
      transitionPhaseTimerRef.current = window.setTimeout(() => setTransitionPhase('idle'), 220)
    }, 170)
  }

  const handleBack = () => {
    if (pendingNavigationRef.current) return
    beginSimpleTransition()
    if (level === 'area') setLevel('region')
    else if (level === 'region') setLevel('continent')
    else if (level === 'continent') setLevel('world')
  }
  const handleReturnToWorld = () => {
    if (pendingNavigationRef.current) return
    beginSimpleTransition()
    setLevel('world')
  }
  const viewCurrentHunt = () => {
    if (!activeLocationId) return
    if (pendingNavigationRef.current) return
    beginSimpleTransition({ x: 50, y: 50, rgb: atlasAccentRgb.gold }, 340)
    selectLocation(activeLocationId)
    setLevel('area')
  }
  const handleHuntAction = () => {
    if (!location || !canHunt || !selectedTargetId) return
    setOpen(false)
    if (activeLocationId && (activeLocationId !== location.id || activeTargetId !== selectedTargetId)) switchHunt()
    else startHunt()
  }

  const subtitle = open ? `${viewTitle} · Browse combat destinations by depth.` : activeLocation ? `Current Hunt · ${activeLocation.name}` : `Viewing · ${viewTitle}`

  return <Panel
    title="Combat world"
    subtitle={subtitle}
    icon={Map}
    panelId="combatWorldBrowser"
    screen="combat"
    className="combat-world-browser"
    actions={<button
      type="button"
      className="button button-ghost button-small combat-world-browser-toggle"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      aria-controls="combat-world-browser-content"
      aria-label={open ? 'Collapse' : 'Expand'}
    ><DisclosureChevron open={open} size={13} /></button>}
  >
    <div id="combat-world-browser-content">
      {open ? <>
        <div className="combat-atlas-header">
          <div className="combat-atlas-title-row">
            <div><span className="tiny-label">{level === 'world' ? 'WORLD MAP' : `${level.toUpperCase()} MAP`}</span><h3>{viewTitle}</h3><p>{viewDescription}</p></div>
            {activeLocation && <div className="combat-world-active-context"><span className="tiny-label">CURRENT HUNT</span><strong>{activeLocation.name}</strong><small>{locationBreadcrumb(activeLocation.id)}</small><span>Hunt continues while browsing.</span><button type="button" className="text-button" onClick={viewCurrentHunt}>View current hunt</button></div>}
          </div>
        </div>
        {activeLocation && areaLevel && activeLocation.id !== location?.id && <HuntContext activeLocation={activeLocation} browsingLocation={location} />}
        <div className={`combat-atlas-workspace ${areaLevel ? 'is-area-level' : 'is-parent-level'}`}>
          <section className="combat-atlas-panel" data-debug-kind="combat-atlas-section" data-debug-label={`${viewTitle} atlas`}>
            <CombatAtlasStage
              key={view.id}
              view={view}
              hunterRank={hunterRank}
              selectedNodeId={selectedNodeId}
              activeLocationId={activeLocationId}
              activeHuntPathNodeId={activeHuntPathNodeId}
              activatingNodeId={activatingNodeId}
              transitionPhase={transitionPhase}
              transitionOrigin={transitionOrigin}
              onNodeSelect={handleNodeSelect}
              onBack={handleBack}
              onReturnToWorld={handleReturnToWorld}
            />
          </section>
          {areaLevel && <LocationPreview location={location} active={sameLocation && activeTargetId === selectedTargetId} activeLocation={activeLocation} available={canHunt} hunterRank={hunterRank} selectedTargetId={selectedTargetId} onSelectTarget={selectTargetPreview} onStart={handleHuntAction} />}
        </div>
      </> : <CollapsedWorldSummary viewTitle={viewTitle} level={level} activeLocation={activeLocation} location={location} targetName={game.combat.enemy?.displayName ?? game.combat.targetEnemyId ?? 'No target'} />}
    </div>
  </Panel>
}

function HuntContext({ activeLocation, browsingLocation }: { activeLocation: CombatLocationDefinition; browsingLocation?: CombatLocationDefinition }) {
  return <div className="combat-world-hunt-context has-browsing" data-debug-kind="hunt-context" data-debug-label="Current hunt context">
    <div><span className="tiny-label">CURRENT HUNT</span><strong>{activeLocation.name}</strong><small>{locationBreadcrumb(activeLocation.id)}</small></div>
    {browsingLocation && <div><span className="tiny-label">SELECTED ARENA</span><strong>{browsingLocation.name}</strong><small>{locationBreadcrumb(browsingLocation.id)}</small></div>}
  </div>
}

function CollapsedWorldSummary({ viewTitle, level, activeLocation, location, targetName }: { viewTitle: string; level: CombatAtlasLevel; activeLocation?: CombatLocationDefinition; location?: CombatLocationDefinition; targetName: string }) {
  return <div className="combat-world-collapsed-summary" data-debug-kind="collapsed-world-summary">
    <div><span className="tiny-label">{activeLocation ? 'CURRENT COMBAT' : 'VIEWING'}</span><strong>{activeLocation?.name ?? viewTitle}</strong><small>{activeLocation ? locationBreadcrumb(activeLocation.id) : `${level.toUpperCase()} MAP`}</small>{activeLocation && <small>Target: {targetName}</small>}</div>
    {activeLocation && location && activeLocation.id !== location.id && <div><span className="tiny-label">BROWSING</span><strong>{location.name}</strong><small>{locationBreadcrumb(location.id)}</small></div>}
  </div>
}

function LocationPreview({ location, active, activeLocation, available, hunterRank, selectedTargetId, onSelectTarget, onStart }: { location?: CombatLocationDefinition; active: boolean; activeLocation?: CombatLocationDefinition; available: boolean; hunterRank: number; selectedTargetId: string; onSelectTarget: (enemyId: string) => void; onStart: () => void }) {
  if (!location) return <div className="combat-location-preview empty-state" data-debug-kind="combat-location-preview" data-debug-label="No combat location"><Target size={20} /><strong>No combat arena</strong><p>Select an arena on the area map.</p></div>
  const presentation = combatLocationPresentation(location)
  const lootNames = presentation.sharedLootNames
  const browsingAnotherLocation = Boolean(activeLocation && activeLocation.id !== location.id)
  const buttonLabel = !available ? 'Locked' : active ? 'Fighting' : activeLocation ? 'Switch target' : 'Fight target'
  return <section className="combat-location-preview" data-debug-kind="combat-location-preview" data-debug-location-id={location.id} data-debug-label={`Preview ${location.name}`}>
    <div className="location-preview-context"><span className="tiny-label">{browsingAnotherLocation ? 'SELECTED ARENA' : active ? 'CURRENT HUNT' : 'SELECTED ARENA'}</span>{browsingAnotherLocation && <small>Current hunt: <strong>{activeLocation?.name}</strong></small>}</div>
    <div className="location-preview-top"><div className={`location-preview-marker ${active ? 'is-active' : ''}`}><Swords size={20} /></div><div className="location-preview-heading"><h3>{location.name}</h3><span className="location-preview-family">{presentation.familyName}</span><GameTooltip content={{ id: location.id, icon: 'target', title: location.name, subtitle: presentation.familyName, description: location.description }}><p>{location.description}</p></GameTooltip></div></div>
    <div className="location-meta-grid"><div><span>TARGETS</span><strong>{presentation.targetCountLabel}</strong></div><div><span>RECOMMENDED</span><strong>{presentation.recommendedHunterRankLabel}</strong></div></div>
    <div className="location-pool" data-debug-kind="combat-target-list"><span className="tiny-label">SELECT A TARGET</span><div className="location-target-list">{presentation.enemies.map((enemy) => { const target = location.targets.find((entry) => entry.enemyId === enemy.enemyId); const locked = !available || (target?.minHunterRank ?? 0) > hunterRank; return <GameTooltip key={enemy.enemyId} content={enemyTooltipModel(enemy.enemyId)}><button type="button" className={`location-target-card ${selectedTargetId === enemy.enemyId ? 'is-selected' : ''}`} onClick={() => onSelectTarget(enemy.enemyId)} disabled={locked} aria-pressed={selectedTargetId === enemy.enemyId} data-debug-kind="combat-target-preview" data-debug-enemy-id={enemy.enemyId}><EnemyPreviewIcon enemy={enemy.enemy} /><span><strong>{enemy.name}</strong><small>{target?.minHunterRank ? `Hunter Rank ${target.minHunterRank}+` : 'Available'}</small><small>{enemy.enemy.loot.length ? `${enemy.enemy.loot.length} individual drops` : 'No individual drops'}</small></span></button></GameTooltip> })}</div></div>
    <div className="location-preview-footer"><div className="location-shared-loot">{lootNames.length > 0 && <><span className="tiny-label">SHARED LOCATION LOOT · EACH KILL</span><div className="location-loot-list">{lootNames.map((name) => <span key={name}>{name}</span>)}</div></>}</div><div className="location-preview-action"><button aria-label={active ? 'Fighting selected target' : activeLocation ? 'Switch to selected target' : 'Fight selected target'} className="button button-primary" onClick={onStart} disabled={!available || active}>{buttonLabel}<Play size={14} /></button>{!available && <small className="locked-copy">{location.availability === 'coming-soon' ? 'Coming soon' : `Requires Hunter Rank ${location.requiredHunterRank}`}</small>}</div></div>
  </section>
}
