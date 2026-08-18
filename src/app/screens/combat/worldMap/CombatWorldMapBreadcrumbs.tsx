import { ArrowLeft } from 'lucide-react'
import { areaById } from '../../../../game/data/world/areas'
import { continentById } from '../../../../game/data/world/continents'
import { regionById } from '../../../../game/data/world/regions'
import type { CombatWorldMapLevel } from './combatWorldMapTypes'

interface CombatWorldMapBreadcrumbsProps {
  level: CombatWorldMapLevel
  continentId: string
  regionId: string
  areaId: string
  onNavigate: (level: CombatWorldMapLevel) => void
  onBack: () => void
}

export function CombatWorldMapBreadcrumbs({ level, continentId, regionId, areaId, onNavigate, onBack }: CombatWorldMapBreadcrumbsProps) {
  const items: Array<{ level: CombatWorldMapLevel; label: string }> = [
    { level: 'world', label: 'WORLD' },
    ...(continentById[continentId] ? [{ level: 'continent' as const, label: continentById[continentId].name.toUpperCase() }] : []),
    ...(regionById[regionId] ? [{ level: 'region' as const, label: regionById[regionId].name.toUpperCase() }] : []),
    ...(areaById[areaId] ? [{ level: 'area' as const, label: areaById[areaId].name.toUpperCase() }] : []),
  ]
  const currentIndex = items.findIndex((item) => item.level === level)
  const visibleItems = items.slice(0, Math.max(1, currentIndex + 1))
  return <div className="combat-world-map-navigation" data-debug-kind="combat-world-breadcrumbs" data-debug-label="World map breadcrumbs">
    {level !== 'world' && <button type="button" className="combat-world-map-back" onClick={onBack} aria-label="Back"><ArrowLeft size={13} />BACK</button>}
    <nav aria-label="Combat world map breadcrumbs">
      {visibleItems.map((item, index) => <span key={item.level} className="combat-world-map-crumb-wrap">
        {index > 0 && <span className="combat-world-map-crumb-separator">›</span>}
        {index < visibleItems.length - 1 ? <button type="button" className="combat-world-map-crumb" onClick={() => onNavigate(item.level)} aria-label={`Go to ${item.label}`} data-debug-kind="combat-world-breadcrumb"><span>{item.label}</span></button> : <span className="combat-world-map-crumb is-current" data-debug-kind="combat-world-breadcrumb"><span>{item.label}</span></span>}
      </span>)}
    </nav>
  </div>
}
