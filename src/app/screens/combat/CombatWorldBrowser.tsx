import { Map, Play, Target } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { itemById } from '../../../game/data/items'
import { combatLocationById } from '../../../game/data/world/combatLocations'
import { enemyById } from '../../../game/data/enemies'
import { enemyFamilyById } from '../../../game/data/world/enemyFamilies'
import { masteryLevelForXp } from '../../../game/progression/masteryProgression'
import { isCombatLocationAvailable, locationBreadcrumb } from '../../../game/world/worldSelectors'
import type { CombatLocationDefinition } from '../../../game/world/worldTypes'
import { useGameStore } from '../../../state/gameStore'
import { Panel } from '../../components/Panel'
import { DisclosureChevron } from '../../components/DisclosureChevron'
import { GameTooltip } from '../../components/tooltip/GameTooltip'
import { CombatWorldMap } from './worldMap/CombatWorldMap'
import { combatMapViewFor, combatMapViewId, combatMapViewTitle, combatMapViewDescription } from './worldMap/combatWorldMapRegistry'
import type { CombatMapNodeLayout, CombatWorldMapLevel } from './worldMap/combatWorldMapTypes'

const activePhases = new Set(['active', 'recovery'])

export function CombatWorldBrowser() {
  const game = useGameStore((state) => state.game)
  const phase = game.combat.phase
  const selectedContinentId = useGameStore((state) => state.selectedContinentId)
  const selectedRegionId = useGameStore((state) => state.selectedRegionId)
  const selectedAreaId = useGameStore((state) => state.selectedAreaId)
  const selectedLocationId = useGameStore((state) => state.selectedCombatLocationId)
  const activeLocationId = useGameStore((state) => state.activeCombatLocationId)
  const selectContinent = useGameStore((state) => state.selectContinent)
  const selectRegion = useGameStore((state) => state.selectRegion)
  const selectArea = useGameStore((state) => state.selectArea)
  const selectLocation = useGameStore((state) => state.selectCombatLocation)
  const startHunt = useGameStore((state) => state.startHunt)
  const switchHunt = useGameStore((state) => state.switchHunt)
  const [level, setLevel] = useState<CombatWorldMapLevel>('world')
  const [open, setOpen] = useState(() => !activePhases.has(phase))
  const previousCombatRef = useRef({ active: activePhases.has(phase), locationId: activeLocationId })

  const masteryLevel = masteryLevelForXp(game.progression.masteryXp)
  const viewId = combatMapViewId(level, selectedContinentId, selectedRegionId, selectedAreaId)
  const view = combatMapViewFor(viewId)
  const viewTitle = combatMapViewTitle(view)
  const viewDescription = combatMapViewDescription(view)
  const location = combatLocationById[selectedLocationId]
  const activeLocation = activeLocationId ? combatLocationById[activeLocationId] : undefined
  const isCombatActive = activePhases.has(phase)
  const areaLevel = level === 'area'
  const sameLocation = Boolean(areaLevel && activeLocation && activeLocation.id === location?.id && isCombatActive)
  const canHunt = Boolean(areaLevel && location && isCombatLocationAvailable(location.id, masteryLevel))
  const selectedNodeId = level === 'world' ? selectedContinentId : level === 'continent' ? selectedRegionId : level === 'region' ? selectedAreaId : selectedLocationId

  useEffect(() => {
    const previous = previousCombatRef.current
    const becameActive = !previous.active && isCombatActive
    const changedActiveLocation = isCombatActive && Boolean(activeLocationId) && previous.locationId !== activeLocationId
    if (becameActive || changedActiveLocation) setOpen(false)
    previousCombatRef.current = { active: isCombatActive, locationId: activeLocationId }
  }, [activeLocationId, isCombatActive])

  const handleNodeSelect = (node: CombatMapNodeLayout) => {
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

  const handleBack = () => {
    if (level === 'area') setLevel('region')
    else if (level === 'region') setLevel('continent')
    else if (level === 'continent') setLevel('world')
  }
  const handleReturnToWorld = () => setLevel('world')
  const viewCurrentHunt = () => {
    if (!activeLocationId) return
    selectLocation(activeLocationId)
    setLevel('area')
  }
  const handleHuntAction = () => {
    if (!location || !canHunt || sameLocation) return
    setOpen(false)
    if (activeLocationId) switchHunt()
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
        <div className="combat-world-map-header">
          <div className="combat-world-map-title-row">
            <div><span className="tiny-label">{level === 'world' ? 'WORLD MAP' : `${level.toUpperCase()} MAP`}</span><h3>{viewTitle}</h3><p>{viewDescription}</p></div>
            {activeLocation && <div className="combat-world-active-context"><span className="tiny-label">CURRENT HUNT</span><strong>{activeLocation.name}</strong><small>{locationBreadcrumb(activeLocation.id)}</small><span>Hunt continues while browsing.</span><button type="button" className="text-button" onClick={viewCurrentHunt}>View current hunt</button></div>}
          </div>
        </div>
        {activeLocation && areaLevel && activeLocation.id !== location?.id && <HuntContext activeLocation={activeLocation} browsingLocation={location} />}
        <div className={`combat-world-map-workspace ${areaLevel ? 'is-area-level' : 'is-parent-level'}`}>
          <section className="combat-world-map-panel" data-debug-kind="combat-world-map-section" data-debug-label={`${viewTitle} map`}>
            <CombatWorldMap
              key={view.id}
              view={view}
              masteryLevel={masteryLevel}
              selectedNodeId={selectedNodeId}
              activeLocationId={activeLocationId}
              onNodeSelect={handleNodeSelect}
              onBack={handleBack}
              onReturnToWorld={handleReturnToWorld}
            />
          </section>
          {areaLevel && <LocationPreview location={location} active={sameLocation} activeLocation={activeLocation} available={canHunt} onStart={handleHuntAction} />}
        </div>
      </> : <CollapsedWorldSummary viewTitle={viewTitle} level={level} activeLocation={activeLocation} location={location} />}
    </div>
  </Panel>
}

function HuntContext({ activeLocation, browsingLocation }: { activeLocation: CombatLocationDefinition; browsingLocation?: CombatLocationDefinition }) {
  return <div className="combat-world-hunt-context has-browsing" data-debug-kind="hunt-context" data-debug-label="Current hunt context">
    <div><span className="tiny-label">CURRENT HUNT</span><strong>{activeLocation.name}</strong><small>{locationBreadcrumb(activeLocation.id)}</small></div>
    {browsingLocation && <div><span className="tiny-label">SELECTED ARENA</span><strong>{browsingLocation.name}</strong><small>{locationBreadcrumb(browsingLocation.id)}</small></div>}
  </div>
}

function CollapsedWorldSummary({ viewTitle, level, activeLocation, location }: { viewTitle: string; level: CombatWorldMapLevel; activeLocation?: CombatLocationDefinition; location?: CombatLocationDefinition }) {
  return <div className="combat-world-collapsed-summary" data-debug-kind="collapsed-world-summary">
    <div><span className="tiny-label">{activeLocation ? 'CURRENT HUNT' : 'VIEWING'}</span><strong>{activeLocation?.name ?? viewTitle}</strong><small>{activeLocation ? locationBreadcrumb(activeLocation.id) : `${level.toUpperCase()} MAP`}</small></div>
    {activeLocation && location && activeLocation.id !== location.id && <div><span className="tiny-label">BROWSING</span><strong>{location.name}</strong><small>{locationBreadcrumb(location.id)}</small></div>}
  </div>
}

function LocationPreview({ location, active, activeLocation, available, onStart }: { location?: CombatLocationDefinition; active: boolean; activeLocation?: CombatLocationDefinition; available: boolean; onStart: () => void }) {
  if (!location) return <div className="combat-location-preview empty-state" data-debug-kind="combat-location-preview" data-debug-label="No combat location"><Target size={20} /><strong>No combat arena</strong><p>Select an arena on the area map.</p></div>
  const family = enemyFamilyById[location.familyId]?.name ?? 'Unknown Family'
  const poolNames = location.enemyPool.map((entry) => enemyById[entry.enemyId]?.name).filter((name): name is string => Boolean(name))
  const lootNames = location.sharedLoot?.map((drop) => itemById[drop.itemId]?.name).filter((name): name is string => Boolean(name)) ?? []
  const browsingAnotherLocation = Boolean(activeLocation && activeLocation.id !== location.id)
  const buttonLabel = !available ? 'Locked' : active ? 'Hunt active' : browsingAnotherLocation ? 'Switch hunt' : 'Start hunt'
  return <section className="combat-location-preview" data-debug-kind="combat-location-preview" data-debug-location-id={location.id} data-debug-label={`Preview ${location.name}`}>
    <div className="location-preview-context"><span className="tiny-label">{browsingAnotherLocation ? 'SELECTED ARENA' : active ? 'CURRENT HUNT' : 'SELECTED ARENA'}</span>{browsingAnotherLocation && <small>Current hunt: <strong>{activeLocation?.name}</strong></small>}</div>
    <div className="location-preview-top"><div className={`location-preview-marker ${active ? 'is-active' : ''}`}><Target size={20} /></div><div className="location-preview-heading"><h3>{location.name}</h3><GameTooltip content={{ id: location.id, icon: 'target', title: location.name, subtitle: family, description: location.description }}><p>{location.description}</p></GameTooltip></div></div>
    <div className="location-meta-grid"><div><span>FAMILY</span><strong>{family}</strong></div><div><span>GROUP SIZE</span><strong>{location.groupGeneration.minGroupSize}-{location.groupGeneration.maxGroupSize}</strong></div><div><span>RECOMMENDED</span><strong>Mastery {location.recommendedMasteryLevel[0]}-{location.recommendedMasteryLevel[1]}</strong></div></div>
    <div className="location-pool"><span className="tiny-label">POSSIBLE ENEMIES</span><div>{poolNames.map((name) => <span key={name}>{name}</span>)}</div></div>
    <div className="location-preview-footer"><div className="location-shared-loot">{lootNames.length > 0 && <><span className="tiny-label">KNOWN SHARED LOOT</span><small>{lootNames.join(' · ')}</small></>}</div><div className="location-preview-action"><button aria-label={active ? 'Hunt active' : browsingAnotherLocation ? 'Switch hunt' : 'Start selected location hunt'} className="button button-primary" onClick={onStart} disabled={!available || active}>{buttonLabel}<Play size={14} /></button>{!available && <small className="locked-copy">{location.availability === 'coming-soon' ? 'Coming soon' : `Requires Mastery Level ${location.requiredMasteryLevel}`}</small>}</div></div>
  </section>
}
