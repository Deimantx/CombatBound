import { describe, expect, it } from 'vitest'
import { combatLocationDefinitions } from '../game/data/world/combatLocations'
import { continentDefinitions } from '../game/data/world/continents'
import { areaDefinitions } from '../game/data/world/areas'
import { regionDefinitions } from '../game/data/world/regions'
import { subAreaDefinitions } from '../game/data/world/subAreas'
import { cascadeSelection, getAreasForRegion, getDefaultWorldSelection, getLocationsForSubArea, getRegionsForContinent, getSubAreasForArea, isCombatLocationAvailable, worldBreadcrumb } from '../game/world/worldSelectors'
import { validateWorldContent } from '../game/world/worldValidation'

describe('combat world hierarchy', () => {
  it('has no orphaned or inconsistent parent-child definitions', () => {
    expect(validateWorldContent()).toEqual([])
  })

  it('filters each browser layer by its selected parent', () => {
    const continent = continentDefinitions[0]
    const region = getRegionsForContinent(continent.id)[0]
    const area = getAreasForRegion(region.id)[0]
    const subArea = getSubAreasForArea(area.id)[0]
    const locations = getLocationsForSubArea(subArea.id)
    expect(region.continentId).toBe(continent.id)
    expect(area.regionId).toBe(region.id)
    expect(subArea.areaId).toBe(area.id)
    expect(locations.every((location) => location.subAreaId === subArea.id)).toBe(true)
  })

  it('cascades selection without retaining impossible descendants', () => {
    const selected = cascadeSelection({ continentId: continentDefinitions[0].id, regionId: regionDefinitions[0].id, areaId: areaDefinitions[1].id, subAreaId: subAreaDefinitions[0].id, combatLocationId: combatLocationDefinitions[0].id })
    expect(areaDefinitions.find((area) => area.id === selected.areaId)?.regionId).toBe(selected.regionId)
    expect(subAreaDefinitions.find((subArea) => subArea.id === selected.subAreaId)?.areaId).toBe(selected.areaId)
    expect(combatLocationDefinitions.find((location) => location.id === selected.combatLocationId)?.subAreaId).toBe(selected.subAreaId)
  })

  it('defaults to the first available destination and exposes breadcrumbs', () => {
    const selection = getDefaultWorldSelection()
    expect(isCombatLocationAvailable(selection.combatLocationId, 4)).toBe(true)
    expect(worldBreadcrumb(selection).split(' · ')).toHaveLength(5)
  })
})
