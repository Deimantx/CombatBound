import { createWeaponTree, conditional, damage, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'two-handed-hammer', weaponName: 'Two-Handed Hammer', rootName: 'Warhammer Mastery', icon: 'hammer', apexName: 'Warhammer Master',
  branches: [
    { name: 'Crushing Power', kind: 'power', names: ['Massive Head', 'Full Force', 'Impact Training', 'Crushing Criticals', 'Overwhelming Impact', 'Earthshaker', 'Cataclysmic Blow'] },
    { name: 'Armor Destruction', kind: 'armor', names: ['Dent Armor', 'Crush Steel', 'Pulverize Plate', 'Broken Shell', 'Deep Fracture', 'Total Break', 'Fortress Breaker'] },
    { name: 'Guard Crushing', kind: 'guard', names: ['Through the Guard', 'Break the Shield', 'Unstoppable Weight', 'Shattered Block', 'No Safe Guard', 'Guard Annihilator', 'Nothing Stops the Hammer'] },
    { name: 'Stamina / Heavy Rhythm', kind: 'tempo', names: ['Conditioned Back', 'Heavy Recovery', 'Impact Breathing', 'Efficient Technique', 'Full Body Swing', 'Siege Rhythm', 'Endless Siege'] },
    { name: 'Concussion / Control', kind: 'control', names: ['Rattling Blow', 'Dazed Enemy', 'Slowed Reaction', 'Heavy Daze', 'Exploit the Daze', 'Crushing Tempo', 'Brain Rattler'] },
  ],
  crossNodes: [
    { name: 'Siege Engine', links: [[1, 6], [0, 6]], effects: [{ type: 'weaponArmorPenetrationModifier', mode: 'flat', valuePerRank: 10 }, damage(.15)] },
    { name: 'Total Suppression', links: [[2, 6], [4, 6]], effects: [{ type: 'weaponBlockPenetrationModifier', stat: 'blockChance', valuePerRank: .1 }, { type: 'weaponConditionalDamageModifier', operation: 'addPercent', valuePerRank: .15, condition: { type: 'targetHasEffect', effectId: 'effect.concussed' } }] },
    { name: 'Ruinous Impact', links: [[3, 6], [1, 6]], effects: [{ type: 'weaponBlockPenetrationModifier', stat: 'blockPower', valuePerRank: .2 }, conditional(.2, { type: 'targetHasEffect', effectId: 'effect.armor-broken' })] },
  ],
  apexEffects: [damage(.2), { type: 'statModifier', stat: 'critDamage', operation: 'flat', valuePerRank: .2 }, { type: 'weaponArmorPenetrationModifier', mode: 'percent', valuePerRank: .15 }, { type: 'weaponBlockPenetrationModifier', stat: 'blockChance', valuePerRank: .1 }, { type: 'weaponBlockPenetrationModifier', stat: 'blockPower', valuePerRank: .2 }],
}

export const twoHandedHammerPerks = createWeaponTree(profile)
