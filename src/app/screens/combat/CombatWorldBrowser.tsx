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

export function CombatWorldBrowser() {
  const game = useGameStore((state) => state.game)
  const phase = game.combat.phase
  const selectedLocationId = useGameStore((state) => state.selectedCombatLocationId)
  const activeLocationId = useGameStore((state) => state.activeCombatLocationId)
  const selectLocation = useGameStore((state) => state.selectCombatLocation)
  const startHunt = useGameStore((state) => state.startHunt)
  const switchHunt = useGameStore((state) => state.switchHunt)
  const [open, setOpen] = useState(() => phase !== 'active' && phase !== 'recovery')
  const previousCombatRef = useRef({ active: phase === 'active' || phase === 'recovery', locationId: activeLocationId })

  const masteryLevel = masteryLevelForXp(game.progression.masteryXp)
  const location = combatLocationById[selectedLocationId] ?? undefined
  const activeLocation = activeLocationId ? combatLocationById[activeLocationId] : undefined
  const isCombatActive = phase === 'active' || phase === 'recovery'
  const sameLocation = Boolean(activeLocation && activeLocation.id === location?.id && isCombatActive)
  const canHunt = Boolean(location && isCombatLocationAvailable(location.id, masteryLevel))

  useEffect(() => {
    const previous = previousCombatRef.current
    const becameActive = !previous.active && isCombatActive
    const changedActiveLocation = isCombatActive && Boolean(activeLocationId) && previous.locationId !== activeLocationId
    if (becameActive || changedActiveLocation) setOpen(false)
    previousCombatRef.current = { active: isCombatActive, locationId: activeLocationId }
  }, [activeLocationId, isCombatActive])

  const handleHuntAction = () => {
    if (!location || !canHunt || sameLocation) return
    setOpen(false)
    if (activeLocationId) switchHunt()
    else startHunt()
  }

  const subtitle = open
    ? 'Browse combat arenas across the world.'
    : activeLocation
      ? `Current Hunt · ${activeLocation.name}`
      : `Selected · ${location?.name ?? 'No location'}`

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
        {activeLocation && activeLocation.id !== location?.id && <HuntContext activeLocation={activeLocation} browsingLocation={location} />}
        <div className="combat-world-map-workspace">
          <section className="combat-world-map-panel" data-debug-kind="combat-world-map-section" data-debug-label="World map">
            <div className="combat-world-map-heading">
              <div><span className="tiny-label">WORLD MAP</span><p>Named territories and combat arenas</p></div>
              <span className="map-availability-note">{activeLocation ? 'Hunt continues while you browse' : 'Select an arena to inspect it'}</span>
            </div>
            <CombatWorldMap
              masteryLevel={masteryLevel}
              selectedLocationId={location?.id ?? ''}
              activeLocationId={activeLocationId}
              onSelectLocation={selectLocation}
            />
          </section>
          <LocationPreview
            location={location}
            active={sameLocation}
            activeLocation={activeLocation}
            available={canHunt}
            onStart={handleHuntAction}
          />
        </div>
      </> : <CollapsedWorldSummary location={location} activeLocation={activeLocation} />}
    </div>
  </Panel>
}

function HuntContext({ activeLocation, browsingLocation }: { activeLocation: CombatLocationDefinition; browsingLocation?: CombatLocationDefinition }) {
  return <div className="combat-world-hunt-context has-browsing" data-debug-kind="hunt-context" data-debug-label="Current hunt context">
    <div><span className="tiny-label">CURRENT HUNT</span><strong>{activeLocation.name}</strong><small>{locationBreadcrumb(activeLocation.id)}</small></div>
    {browsingLocation && <div><span className="tiny-label">BROWSING</span><strong>{browsingLocation.name}</strong><small>{locationBreadcrumb(browsingLocation.id)}</small></div>}
  </div>
}

function CollapsedWorldSummary({ location, activeLocation }: { location?: CombatLocationDefinition; activeLocation?: CombatLocationDefinition }) {
  if (activeLocation && activeLocation.id !== location?.id) return <div className="combat-world-collapsed-summary" data-debug-kind="collapsed-world-summary">
    <div><span className="tiny-label">CURRENT HUNT</span><strong>{activeLocation.name}</strong><small>{locationBreadcrumb(activeLocation.id)}</small></div>
    <div><span className="tiny-label">BROWSING</span><strong>{location?.name ?? 'No location'}</strong><small>{location ? locationBreadcrumb(location.id) : 'Select an arena from the map'}</small></div>
  </div>
  return <div className="combat-world-collapsed-summary" data-debug-kind="collapsed-world-summary">
    <div><span className="tiny-label">{activeLocation ? 'CURRENT HUNT' : 'SELECTED'}</span><strong>{activeLocation?.name ?? location?.name ?? 'No location'}</strong><small>{locationBreadcrumb(activeLocation?.id ?? location?.id ?? '')}</small></div>
  </div>
}

function LocationPreview({ location, active, activeLocation, available, onStart }: { location?: CombatLocationDefinition; active: boolean; activeLocation?: CombatLocationDefinition; available: boolean; onStart: () => void }) {
  if (!location) return <div className="combat-location-preview empty-state" data-debug-kind="combat-location-preview" data-debug-label="No combat location"><Target size={20} /><strong>No combat location</strong><p>Select an arena on the world map.</p></div>
  const family = enemyFamilyById[location.familyId]?.name ?? 'Unknown Family'
  const poolNames = location.enemyPool.map((entry) => enemyById[entry.enemyId]?.name).filter((name): name is string => Boolean(name))
  const lootNames = location.sharedLoot?.map((drop) => itemById[drop.itemId]?.name).filter((name): name is string => Boolean(name)) ?? []
  const browsingAnotherLocation = Boolean(activeLocation && activeLocation.id !== location.id)
  const buttonLabel = !available ? 'Locked' : active ? 'Hunt active' : browsingAnotherLocation ? 'Switch hunt' : 'Start hunt'
  return <section className="combat-location-preview" data-debug-kind="combat-location-preview" data-debug-location-id={location.id} data-debug-label={`Preview ${location.name}`}>
    <div className="location-preview-context">
      <span className="tiny-label">{browsingAnotherLocation ? 'SELECTED ARENA' : active ? 'CURRENT HUNT' : 'SELECTED ARENA'}</span>
      {browsingAnotherLocation && <small>Current hunt: <strong>{activeLocation?.name}</strong></small>}
    </div>
    <div className="location-preview-top">
      <div className={`location-preview-marker ${active ? 'is-active' : ''}`}><Target size={20} /></div>
      <div className="location-preview-heading">
        <h3>{location.name}</h3>
        <GameTooltip content={{ id: location.id, icon: 'target', title: location.name, subtitle: family, description: location.description }}><p>{location.description}</p></GameTooltip>
      </div>
    </div>
    <div className="location-meta-grid"><div><span>FAMILY</span><strong>{family}</strong></div><div><span>GROUP SIZE</span><strong>{location.groupGeneration.minGroupSize}-{location.groupGeneration.maxGroupSize}</strong></div><div><span>RECOMMENDED</span><strong>Mastery {location.recommendedMasteryLevel[0]}-{location.recommendedMasteryLevel[1]}</strong></div></div>
    <div className="location-pool"><span className="tiny-label">POSSIBLE ENEMIES</span><div>{poolNames.map((name) => <span key={name}>{name}</span>)}</div></div>
    <div className="location-preview-footer">
      <div className="location-shared-loot">{lootNames.length > 0 && <><span className="tiny-label">KNOWN SHARED LOOT</span><small>{lootNames.join(' · ')}</small></>}</div>
      <div className="location-preview-action"><button aria-label={active ? 'Hunt active' : browsingAnotherLocation ? 'Switch hunt' : 'Start selected location hunt'} className="button button-primary" onClick={onStart} disabled={!available || active}>{buttonLabel}<Play size={14} /></button>{!available && <small className="locked-copy">{location.availability === 'coming-soon' ? 'Coming soon' : `Requires Mastery Level ${location.requiredMasteryLevel}`}</small>}</div>
    </div>
  </section>
}
