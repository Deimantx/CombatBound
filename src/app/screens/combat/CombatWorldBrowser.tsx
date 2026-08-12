import { ChevronRight, Globe2, Lock, Map, MapPin, Mountain, Play, Shield, Tent, Target, Trees } from 'lucide-react'
import { useEffect, useState } from 'react'
import { combatLocationById } from '../../../game/data/world/combatLocations'
import { continentDefinitions } from '../../../game/data/world/continents'
import { enemyFamilyById } from '../../../game/data/world/enemyFamilies'
import { enemyById } from '../../../game/data/enemies'
import { getAreasForRegion, getLocationsForSubArea, getRegionsForContinent, getSubAreasForArea, isCombatLocationAvailable, locationBreadcrumb } from '../../../game/world/worldSelectors'
import { useGameStore } from '../../../state/gameStore'
import type { CombatLocationDefinition } from '../../../game/world/worldTypes'
import { Panel } from '../../components/Panel'
import { PlaceholderArt } from '../../components/PlaceholderArt'

const worldIcons = { globe: Globe2, map: Map, mountain: Mountain, trees: Trees, pin: MapPin, target: Target, tent: Tent, shield: Shield }

export function CombatWorldBrowser() {
  const game = useGameStore((state) => state.game)
  const phase = game.combat.phase
  const selectedContinentId = useGameStore((state) => state.selectedContinentId)
  const selectedRegionId = useGameStore((state) => state.selectedRegionId)
  const selectedAreaId = useGameStore((state) => state.selectedAreaId)
  const selectedSubAreaId = useGameStore((state) => state.selectedSubAreaId)
  const selectedLocationId = useGameStore((state) => state.selectedCombatLocationId)
  const activeLocationId = useGameStore((state) => state.activeCombatLocationId)
  const selectContinent = useGameStore((state) => state.selectContinent)
  const selectRegion = useGameStore((state) => state.selectRegion)
  const selectArea = useGameStore((state) => state.selectArea)
  const selectSubArea = useGameStore((state) => state.selectSubArea)
  const selectLocation = useGameStore((state) => state.selectCombatLocation)
  const startHunt = useGameStore((state) => state.startHunt)
  const switchHunt = useGameStore((state) => state.switchHunt)
  const [open, setOpen] = useState(true)
  useEffect(() => { if (phase === 'active' || phase === 'recovery') setOpen(false); else setOpen(true) }, [phase])

  const totalLevel = Object.values(game.progression.skills).reduce((sum, skill) => sum + skill.level, 0)
  const continent = continentDefinitions.find((candidate) => candidate.id === selectedContinentId) ?? continentDefinitions[0]
  const regions = getRegionsForContinent(continent.id)
  const region = regions.find((candidate) => candidate.id === selectedRegionId) ?? regions[0]
  const areas = region ? getAreasForRegion(region.id) : []
  const area = areas.find((candidate) => candidate.id === selectedAreaId) ?? areas[0]
  const subAreas = area ? getSubAreasForArea(area.id) : []
  const subArea = subAreas.find((candidate) => candidate.id === selectedSubAreaId) ?? subAreas[0]
  const locations = subArea ? getLocationsForSubArea(subArea.id) : []
  const location = combatLocationById[selectedLocationId] ?? locations[0]
  const activeLocation = activeLocationId ? combatLocationById[activeLocationId] : undefined
  const canHunt = Boolean(location && isCombatLocationAvailable(location.id, totalLevel))
  const currentSelection = location ? locationBreadcrumb(location.id) : 'No combat location selected'
  const currentHunt = activeLocation ? locationBreadcrumb(activeLocation.id) : undefined
  const sameLocation = activeLocationId === location?.id && (phase === 'active' || phase === 'recovery')

  return <Panel title="Combat world" subtitle={open ? 'Choose a territory, then hunt its changing population.' : activeLocation ? `Current Hunt · ${activeLocation.name}` : `Selected · ${location?.name ?? 'No location'}`} icon={Map} panelId="combatWorldBrowser" screen="combat" className="combat-world-browser" actions={<button className="button button-ghost button-small" onClick={() => setOpen((value) => !value)}>{open ? 'Collapse' : 'Expand'}</button>}>
    {open ? <>
      <div className="world-current-selection"><div><span className="tiny-label">{activeLocation ? 'CURRENT HUNT' : 'SELECTED LOCATION'}</span><strong>{activeLocation ? activeLocation.name : location?.name ?? 'No location'}</strong><small>{activeLocation ? currentHunt : currentSelection}</small></div>{activeLocation && activeLocation.id !== location?.id && <div><span className="tiny-label">BROWSING</span><strong>{location?.name}</strong><small>{currentSelection}</small></div>}</div>
      <div className="world-hierarchy-grid">
        <WorldColumn label="CONTINENT" nodes={continentDefinitions} selectedId={continent.id} onSelect={selectContinent} totalLevel={totalLevel} />
        <WorldColumn label="REGION" nodes={regions} selectedId={region?.id} onSelect={selectRegion} totalLevel={totalLevel} />
        <WorldColumn label="AREA" nodes={areas} selectedId={area?.id} onSelect={selectArea} totalLevel={totalLevel} />
        <WorldColumn label="SUB-AREA" nodes={subAreas} selectedId={subArea?.id} onSelect={selectSubArea} totalLevel={totalLevel} />
      </div>
      <div className="world-locations-row"><div className="world-location-list"><div className="world-section-heading"><span className="tiny-label">COMBAT LOCATIONS</span><small>{locations.length} destination{locations.length === 1 ? '' : 's'}</small></div>{locations.map((candidate) => <LocationCard key={candidate.id} location={candidate} selected={candidate.id === location?.id} active={candidate.id === activeLocationId} available={isCombatLocationAvailable(candidate.id, totalLevel)} onSelect={() => selectLocation(candidate.id)} />)}</div><LocationPreview location={location} active={sameLocation} available={canHunt} activeLocationId={activeLocationId} onStart={sameLocation ? undefined : activeLocationId ? switchHunt : startHunt} /></div>
    </> : <div className="collapsed-world-summary"><div><span className="tiny-label">{activeLocation ? 'CURRENT HUNT' : 'SELECTED'}</span><strong>{activeLocation ? activeLocation.name : location?.name}</strong><small>{activeLocation ? currentHunt : currentSelection}</small></div>{activeLocation && activeLocation.id !== location?.id && <div><span className="tiny-label">SELECTED</span><strong>{location?.name}</strong><small>{currentSelection}</small></div>}</div>}
  </Panel>
}

function WorldColumn({ label, nodes, selectedId, onSelect, totalLevel }: { label: string; nodes: Array<{ id: string; name: string; description: string; availability: 'available' | 'locked' | 'coming-soon'; requiredCombatLevel?: number; presentation: { iconKey: keyof typeof worldIcons } }>; selectedId?: string; onSelect: (id: string) => void; totalLevel: number }) {
  return <div className="world-column"><span className="tiny-label">{label}</span><div className="world-column-list">{nodes.map((node) => { const available = node.availability === 'available' && (node.requiredCombatLevel ?? 0) <= totalLevel; const Icon = worldIcons[node.presentation.iconKey] ?? MapPin; const lockText = node.availability === 'coming-soon' ? 'Coming soon' : node.requiredCombatLevel ? `Requires Combat Lv ${node.requiredCombatLevel}` : 'Locked'; return <button key={node.id} className={`world-node ${selectedId === node.id ? 'is-selected' : ''} ${!available ? 'is-locked' : ''}`} onClick={() => available && onSelect(node.id)} disabled={!available} data-debug-kind={`world-${label.toLowerCase()}`} data-debug-world-id={node.id} data-debug-label={node.name}><Icon size={14} /><span><strong>{node.name}</strong><small>{!available ? lockText : node.description}</small></span>{!available ? <Lock size={12} /> : <ChevronRight size={12} />}</button> })}</div></div>
}

function LocationCard({ location, selected, active, available, onSelect }: { location: CombatLocationDefinition; selected: boolean; active: boolean; available: boolean; onSelect: () => void }) {
  const poolNames = location.enemyPool.map((entry) => enemyById[entry.enemyId]?.name).filter(Boolean)
  return <button className={`world-location-card ${selected ? 'is-selected' : ''} ${active ? 'is-active' : ''} ${!available ? 'is-locked' : ''}`} onClick={onSelect} data-debug-kind="combat-location" data-debug-location-id={location.id} data-debug-label={location.name}><PlaceholderArt icon={location.presentation.iconKey === 'tent' ? 'shield' : 'target'} size="small" variant={active ? 'gold' : location.presentation.accent === 'blue' ? 'blue' : 'muted'} /><span><strong>{location.name}</strong><small>{active ? 'CURRENT HUNT' : available ? `AVAILABLE · ${poolNames.length} enemy types · ${location.groupGeneration.minGroupSize}-${location.groupGeneration.maxGroupSize} enemies` : 'LOCKED'}</small></span>{!available ? <Lock size={13} /> : <ChevronRight size={14} />}</button>
}

function LocationPreview({ location, active, available, activeLocationId, onStart }: { location?: CombatLocationDefinition; active: boolean; available: boolean; activeLocationId: string | null; onStart?: () => void }) {
  if (!location) return <div className="world-location-preview empty-state"><Target size={24} /><strong>No combat location</strong><p>Select a sub-area with a hunting destination.</p></div>
  const poolNames = location.enemyPool.map((entry) => enemyById[entry.enemyId]?.name).filter(Boolean)
  return <div className="world-location-preview"><div className="location-preview-top"><PlaceholderArt icon={location.presentation.iconKey === 'tent' ? 'shield' : 'target'} size="medium" variant="gold" /><div><span className="tiny-label">{active ? 'CURRENT HUNT' : 'SELECTED LOCATION'}</span><h3>{location.name}</h3><p>{location.description}</p></div></div><div className="location-meta-grid"><div><span>FAMILY</span><strong>{enemyFamilyById[location.familyId]?.name ?? location.familyId}</strong></div><div><span>GROUPS</span><strong>{location.groupGeneration.minGroupSize}-{location.groupGeneration.maxGroupSize} enemies</strong></div><div><span>RECOMMENDED</span><strong>Lv {location.recommendedCombatLevel[0]}-{location.recommendedCombatLevel[1]}</strong></div></div><div className="location-pool"><span className="tiny-label">POSSIBLE ENEMIES · INFORMATIONAL</span><div>{poolNames.map((name) => <span key={name}>{name}</span>)}</div></div>{location.sharedLoot && location.sharedLoot.length > 0 && <div className="location-shared-loot"><span className="tiny-label">KNOWN SHARED LOOT</span><small>{location.sharedLoot.map((drop) => drop.itemId.replace('item.', '')).join(' · ')}</small></div>}<button aria-label="Start selected location hunt" className="button button-primary full-button" onClick={onStart} disabled={!available || active}>{active ? 'Hunt active' : activeLocationId ? 'Switch hunt' : 'Start hunt'}<Play size={14} /></button>{!available && <small className="locked-copy">Requires Combat Level {location.requiredCombatLevel}</small>}</div>
}
