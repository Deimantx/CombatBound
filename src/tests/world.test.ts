import { describe, expect, it } from 'vitest'
import { areaDefinitions } from '../game/data/world/areas'
import { combatLocationDefinitions } from '../game/data/world/combatLocations'
import { continentDefinitions } from '../game/data/world/continents'
import { regionDefinitions } from '../game/data/world/regions'
import { cascadeSelection, getAreasForRegion, getDefaultWorldSelection, getLocationsForArea, getRegionsForContinent, isCombatLocationAvailable, locationParentBreadcrumb, worldBreadcrumb } from '../game/world/worldSelectors'
import { validateWorldContent } from '../game/world/worldValidation'

describe('combat world hierarchy', () => {
  it('has no orphaned or inconsistent parent-child definitions', () => {
    expect(validateWorldContent()).toEqual([])
  })

  it('filters each browser layer by its selected parent', () => {
    const continent = continentDefinitions[0]
    const region = getRegionsForContinent(continent.id)[0]
    const area = getAreasForRegion(region.id)[0]
    const locations = getLocationsForArea(area.id)
    expect(region.continentId).toBe(continent.id)
    expect(area.regionId).toBe(region.id)
    expect(locations.every((location) => location.areaId === area.id)).toBe(true)
  })

  it('cascades selection without retaining impossible descendants', () => {
    const selected = cascadeSelection({ continentId: continentDefinitions[0].id, regionId: regionDefinitions[0].id, areaId: areaDefinitions[1].id, combatLocationId: combatLocationDefinitions[0].id })
    expect(areaDefinitions.find((area) => area.id === selected.areaId)?.regionId).toBe(selected.regionId)
    expect(combatLocationDefinitions.find((location) => location.id === selected.combatLocationId)?.areaId).toBe(selected.areaId)
  })

  it('defaults to the first available destination and exposes four-level breadcrumbs', () => {
    const selection = getDefaultWorldSelection()
    expect(isCombatLocationAvailable(selection.combatLocationId, 4)).toBe(true)
    expect(worldBreadcrumb(selection).split(' - ')).toHaveLength(4)
    expect(locationParentBreadcrumb(selection.combatLocationId).split(' - ')).toHaveLength(3)
  })
})
