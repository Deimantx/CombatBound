import deepWoodsMap from '../../../../assets/maps/Deeepwoods.png'
import greenvaleMap from '../../../../assets/maps/Greenvale.png'
import northwoodMap from '../../../../assets/maps/Northwoods.png'
import oldRoadMap from '../../../../assets/maps/OldRoad.png'
import worldMap from '../../../../assets/maps/Tauraque.png'

export const combatWorldMapAssets = {
  world: worldMap,
  greenvale: greenvaleMap,
  northwood: northwoodMap,
  'deep-woods': deepWoodsMap,
  'old-road': oldRoadMap,
} as const

export const combatWorldMapAssetAspectRatios = {
  world: 1536 / 1024,
  greenvale: 1536 / 1024,
  northwood: 1448 / 1086,
  'deep-woods': 1448 / 1086,
  'old-road': 1448 / 1086,
} as const
