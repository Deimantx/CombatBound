import { ChevronRight, Globe2, Lock, Map, MapPin, Mountain, Play, Shield, Tent, Target, Trees } from 'lucide-react'
import { useEffect, useState } from 'react'
import { itemById } from '../../../game/data/items'
import { combatLocationById } from '../../../game/data/world/combatLocations'
import { continentDefinitions } from '../../../game/data/world/continents'
import { enemyFamilyById } from '../../../game/data/world/enemyFamilies'
import { enemyById } from '../../../game/data/enemies'
import { getAreasForRegion, getLocationsForArea, getRegionsForContinent, isCombatLocationAvailable, locationBreadcrumb, locationParentBreadcrumb } from '../../../game/world/worldSelectors'
import { useGameStore } from '../../../state/gameStore'
import type { AreaDefinition, CombatLocationDefinition, ContinentDefinition, RegionDefinition } from '../../../game/world/worldTypes'
import { Panel } from '../../components/Panel'
import { PlaceholderArt } from '../../components/PlaceholderArt'

const worldIcons = { globe: Globe2, map: Map, mountain: Mountain, trees: Trees, pin: MapPin, target: Target, tent: Tent, shield: Shield }
type WorldTier = 'continent' | 'region' | 'area'
type WorldNode = ContinentDefinition | RegionDefinition | AreaDefinition

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
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (phase === 'active' || phase === 'recovery') setOpen(false)
    else setOpen(true)
  }, [phase])

  const totalLevel = Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0)
  const continent = continentDefinitions.find((candidate) => candidate.id === selectedContinentId) ?? continentDefinitions[0]
  const regions = getRegionsForContinent(continent.id)
  const region = regions.find((candidate) => candidate.id === selectedRegionId) ?? regions[0]
  const areas = region ? getAreasForRegion(region.id) : []
  const area = areas.find((candidate) => candidate.id === selectedAreaId) ?? areas[0]
  const locations = area ? getLocationsForArea(area.id) : []
  const location = locations.find((candidate) => candidate.id === selectedLocationId) ?? locations[0]
  const activeLocation = activeLocationId ? combatLocationById[activeLocationId] : undefined
  const canHunt = Boolean(location && isCombatLocationAvailable(location.id, totalLevel))
  const selectedBreadcrumb = location ? locationBreadcrumb(location.id) : 'No combat location selected'
  const sameLocation = activeLocationId === location?.id && (phase === 'active' || phase === 'recovery')

  return <Panel title="Combat world" subtitle={open ? 'Choose a territory, then hunt its changing population.' : activeLocation ? `Current Hunt · ${activeLocation.name}` : `Selected · ${location?.name ?? 'No location'}`} icon={Map} panelId="combatWorldBrowser" screen="combat" className="combat-world-browser" actions={<button className="button button-ghost button-small" onClick={() => setOpen((value) => !value)}>{open ? 'Collapse' : 'Expand'}</button>}>
    {open ? <>
      {activeLocation && activeLocation.id !== location?.id && <HuntContext activeLocation={activeLocation} browsingLocation={location} />}
      <div className="world-hierarchy-stack">
        <WorldTierRow tier="continent" label="CONTINENT" nodes={continentDefinitions} selectedId={continent.id} onSelect={selectContinent} totalLevel={totalLevel} />
        <WorldTierRow tier="region" label="REGION" nodes={regions} selectedId={region?.id} onSelect={selectRegion} totalLevel={totalLevel} />
        <WorldTierRow tier="area" label="AREA" nodes={areas} selectedId={area?.id} onSelect={selectArea} totalLevel={totalLevel} />
      </div>
      <section className="world-location-section" data-debug-kind="combat-location-section" data-debug-label="Combat Locations">
        <div className="world-section-heading"><span className="tiny-label">COMBAT LOCATIONS</span><small>{locations.length} destination{locations.length === 1 ? '' : 's'}</small></div>
        {locations.length > 0 ? <div className="world-location-grid">{locations.map((candidate) => <LocationCard key={candidate.id} location={candidate} selected={candidate.id === location?.id} active={candidate.id === activeLocationId} available={isCombatLocationAvailable(candidate.id, totalLevel)} onSelect={() => selectLocation(candidate.id)} />)}</div> : <div className="world-location-empty"><Target size={20} /><strong>No combat locations</strong><small>Select another area to browse a hunting destination.</small></div>}
      </section>
      <LocationPreview location={location} active={sameLocation} available={canHunt} activeLocationId={activeLocationId} onStart={sameLocation ? undefined : activeLocationId ? switchHunt : startHunt} />
    </> : <div className="collapsed-world-summary"><div><span className="tiny-label">{activeLocation ? 'CURRENT HUNT' : 'SELECTED'}</span><strong>{activeLocation ? activeLocation.name : location?.name}</strong><small>{activeLocation ? locationBreadcrumb(activeLocation.id) : selectedBreadcrumb}</small></div>{activeLocation && activeLocation.id !== location?.id && <div><span className="tiny-label">SELECTED</span><strong>{location?.name}</strong><small>{selectedBreadcrumb}</small></div>}</div>}
  </Panel>
}

function HuntContext({ activeLocation, browsingLocation }: { activeLocation: CombatLocationDefinition; browsingLocation?: CombatLocationDefinition }) {
  return <div className="world-hunt-context has-browsing" data-debug-kind="hunt-context" data-debug-label="Current hunt context"><div><span className="tiny-label">CURRENT HUNT</span><strong>{activeLocation.name}</strong><small>{locationBreadcrumb(activeLocation.id)}</small></div>{browsingLocation && <div><span className="tiny-label">BROWSING</span><strong>{browsingLocation.name}</strong><small>{locationBreadcrumb(browsingLocation.id)}</small></div>}</div>
}

function WorldTierRow({ tier, label, nodes, selectedId, onSelect, totalLevel }: { tier: WorldTier; label: string; nodes: WorldNode[]; selectedId?: string; onSelect: (id: string) => void; totalLevel: number }) {
  const selected = nodes.find((node) => node.id === selectedId)
  return <section className="world-tier" data-debug-kind="world-tier" data-debug-tier={tier} data-debug-label={label}><div className="world-tier-heading"><span className="tiny-label">{label}</span><small>{nodes.length} option{nodes.length === 1 ? '' : 's'}</small></div><div className="world-tier-grid">{nodes.map((node) => { const requiredCombatLevel = 'requiredCombatLevel' in node ? node.requiredCombatLevel : undefined; const available = node.availability === 'available' && (requiredCombatLevel ?? 0) <= totalLevel; const Icon = worldIcons[node.presentation.iconKey] ?? MapPin; const lockText = node.availability === 'coming-soon' ? 'Coming soon' : requiredCombatLevel ? `Requires Combat Lv ${requiredCombatLevel}` : 'Locked'; return <button key={node.id} className={`world-node ${selectedId === node.id ? 'is-selected' : ''} ${!available ? 'is-locked' : ''}`} onClick={() => available && onSelect(node.id)} disabled={!available} aria-pressed={selectedId === node.id} title={node.description} data-debug-kind={`world-${tier}`} data-debug-world-id={node.id} data-debug-continent-id={tier === 'continent' ? node.id : undefined} data-debug-region-id={tier === 'region' ? node.id : undefined} data-debug-area-id={tier === 'area' ? node.id : undefined} data-debug-label={node.name}><Icon size={15} /><span><strong>{node.name}</strong>{!available && <small>{lockText}</small>}</span>{!available ? <Lock size={12} /> : <ChevronRight size={12} />}</button> })}</div>{selected && <div className="world-selection-description" data-debug-kind="world-selection-description" data-debug-tier={tier} data-debug-label={`${selected.name} description`}><strong>{selected.name}</strong><span>{selected.description}</span></div>}</section>
}

function LocationCard({ location, selected, active, available, onSelect }: { location: CombatLocationDefinition; selected: boolean; active: boolean; available: boolean; onSelect: () => void }) {
  const family = enemyFamilyById[location.familyId]?.name ?? location.familyId
  const stateLabel = active ? 'CURRENT HUNT' : available ? 'AVAILABLE' : location.availability === 'coming-soon' ? 'COMING SOON' : 'LOCKED'
  return <button className={`world-location-card ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${!available ? 'is-locked' : ''}`} onClick={onSelect} aria-pressed={selected} data-debug-kind="combat-location" data-debug-location-id={location.id} data-debug-label={location.name}><PlaceholderArt icon={location.presentation.iconKey === 'tent' ? 'shield' : 'target'} size="small" variant={active ? 'gold' : location.presentation.accent === 'blue' ? 'blue' : 'muted'} /><span className="world-location-card-copy"><span className="world-location-card-heading"><strong>{location.name}</strong>{!available ? <Lock size={12} /> : <ChevronRight size={13} />}</span><small>{family}</small><small>Lv {location.recommendedCombatLevel[0]}-{location.recommendedCombatLevel[1]} · {location.groupGeneration.minGroupSize}-{location.groupGeneration.maxGroupSize} enemies</small><em>{stateLabel}</em></span></button>
}

function LocationPreview({ location, active, available, activeLocationId, onStart }: { location?: CombatLocationDefinition; active: boolean; available: boolean; activeLocationId: string | null; onStart?: () => void }) {
  if (!location) return <div className="world-location-preview empty-state" data-debug-kind="combat-location-preview" data-debug-label="No combat location"><Target size={24} /><strong>No combat location</strong><p>Select an area with a hunting destination.</p></div>
  const family = enemyFamilyById[location.familyId]?.name ?? location.familyId
  const poolNames = location.enemyPool.map((entry) => enemyById[entry.enemyId]?.name).filter(Boolean)
  const lootNames = location.sharedLoot?.map((drop) => itemById[drop.itemId]?.name ?? drop.itemId) ?? []
  const buttonLabel = !available ? 'Locked' : active ? 'Hunt active' : activeLocationId ? 'Switch hunt' : 'Start hunt'
  return <div className="world-location-preview" data-debug-kind="combat-location-preview" data-debug-location-id={location.id} data-debug-label={`Preview ${location.name}`}><div className="location-preview-top"><PlaceholderArt icon={location.presentation.iconKey === 'tent' ? 'shield' : 'target'} size="medium" variant="gold" /><div><span className="tiny-label">{active ? 'CURRENT HUNT' : 'SELECTED LOCATION'}</span><h3>{location.name}</h3><p>{location.description}</p><small className="location-preview-breadcrumb">{locationParentBreadcrumb(location.id)}</small></div></div><div className="location-meta-grid"><div><span>FAMILY</span><strong>{family}</strong></div><div><span>GROUP SIZE</span><strong>{location.groupGeneration.minGroupSize}-{location.groupGeneration.maxGroupSize} enemies</strong></div><div><span>RECOMMENDED</span><strong>Lv {location.recommendedCombatLevel[0]}-{location.recommendedCombatLevel[1]}</strong></div></div><div className="location-pool"><span className="tiny-label">POSSIBLE ENEMIES</span><div>{poolNames.map((name) => <span key={name}>{name}</span>)}</div></div><div className="location-preview-footer"><div className="location-shared-loot">{lootNames.length > 0 && <><span className="tiny-label">KNOWN SHARED LOOT</span><small>{lootNames.join(' · ')}</small></>}</div><div className="location-preview-action"><button aria-label={active ? 'Hunt active' : activeLocationId ? 'Switch hunt' : 'Start selected location hunt'} className="button button-primary" onClick={onStart} disabled={!available || active}>{buttonLabel}<Play size={14} /></button>{!available && <small className="locked-copy">{location.availability === 'coming-soon' ? 'Coming soon' : `Requires Combat Level ${location.requiredCombatLevel}`}</small>}</div></div></div>
}
