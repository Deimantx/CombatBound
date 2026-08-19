import { createWeaponTree, conditional, damage, interval, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'longbow', weaponName: 'Longbow', rootName: 'Longbow Foundations', icon: 'bow', apexName: 'Longbow Master',
  branches: [
    { name: 'Marksman Precision', kind: 'precision', names: ['Steady Draw', 'Long Sight', 'Fine Release', 'Measured Shot', 'Unerring Arrow', 'Master Marksman', 'Impossible Shot'] },
    { name: 'Power / Crit', kind: 'power', names: ['Heavy Arrow', 'Strong Draw', 'Killing Shaft', 'Full Draw', 'Lethal Release', 'Warbow Force', 'Dragonshot'] },
    { name: 'Opening Shot', kind: 'opening', names: ['First Sight', 'Opening Aim', 'First Arrow', 'Ambush Release', 'Opening Kill', 'Perfect Ambush', 'One Shot, One Kill'] },
    { name: 'Armor Penetration', kind: 'penetration', names: ['Bodkin Points', 'Piercing Shaft', 'Deep Penetration', 'Through Plate', 'War Arrows', 'No Safe Armor', 'Steel Piercer'] },
    { name: 'Draw Discipline / Tempo', kind: 'tempo', names: ['Controlled Breathing', 'Smooth Nock', 'Efficient Draw', 'Patient Rhythm', 'Steady Reserve', 'Veteran Archer', 'Perfect Cadence'] },
  ],
  crossNodes: [
    { name: 'Piercing Marksman', links: [[3, 6], [0, 6]], effects: [{ type: 'statModifier', stat: 'accuracyRating', operation: 'flat', valuePerRank: 8 }, { type: 'statModifier', stat: 'criticalStrikeMultiplier', operation: 'flat', valuePerRank: .1 }, { type: 'weaponArmorPenetrationModifier', mode: 'flat', valuePerRank: 10 }] },
    { name: 'Deadly Opening', links: [[2, 6], [1, 6]], effects: [conditional(.15, { type: 'targetHpAbove', fraction: .75 }), damage(.1)] },
    { name: 'Patient Killer', links: [[4, 6], [2, 5]], effects: [conditional(.1, { type: 'targetHpAbove', fraction: .75 }), interval(-.05)] },
  ],
  apexEffects: [damage(.2), { type: 'statModifier', stat: 'accuracyRating', operation: 'flat', valuePerRank: 12 }, { type: 'statModifier', stat: 'criticalStrikeMultiplier', operation: 'flat', valuePerRank: .2 }, { type: 'weaponArmorPenetrationModifier', mode: 'percent', valuePerRank: .15 }],
}

export const longbowPerks = createWeaponTree(profile)
