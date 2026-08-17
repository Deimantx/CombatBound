import { createWeaponTree, damage, interval, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'one-handed-axe', weaponName: 'One-Handed Axe', rootName: 'Axe Mastery', icon: 'axe', apexName: 'Axe Lord',
  branches: [
    { name: 'Cleaving Power', kind: 'power', names: ['Heavy Edge', 'Committed Swing', 'Weight Behind the Blade', 'Brutal Arc', 'Splitting Force', 'Overhand Violence', "Headsman's Edge"] },
    { name: 'Bleed', kind: 'bleed', names: ['Notched Edge', 'Open the Wound', 'Deep Laceration', 'Blood Trail', 'Persistent Wounds', 'Red Momentum', "Butcher's Finish"] },
    { name: 'Armour Break', kind: 'armour', names: ['Chipped Guard', 'Rending Impact', 'Split Plate', 'Open Defense', 'Sundered Guard', 'Broken Formation', 'Armour Reaper'] },
    { name: 'Tempo / Stamina', kind: 'tempo', names: ['Efficient Chop', 'Quick Recovery', 'Working Rhythm', 'Measured Chops', 'Relentless Work', "Woodcutter's Rhythm", 'Endless Cleaver'] },
    { name: 'Execution', kind: 'execution', names: ['Predatory Eye', 'Weakening Cuts', 'No Mercy', 'Finish the Job', 'Execution Window', 'Marked for Death', 'Final Chop'] },
  ],
  crossNodes: [
    { name: "Butcher's Rhythm", links: [[1, 6], [3, 6]], effects: [{ type: 'weaponConditionalDamageModifier', operation: 'increased', valuePerRank: .1, condition: { type: 'targetHasEffect', effectId: 'effect.bleed' } }, { type: 'weaponOnHitResourceRestore', resource: 'stamina', amountPerRank: 1 }] },
    { name: 'Split Guard', links: [[2, 6], [0, 5]], effects: [{ type: 'weaponArmorPenetrationModifier', mode: 'flat', valuePerRank: 10 }, { type: 'weaponConditionalDamageModifier', operation: 'increased', valuePerRank: .1, condition: { type: 'targetHasEffect', effectId: 'effect.crushed' } }] },
    { name: "Predator's Momentum", links: [[4, 5], [3, 6]], effects: [interval(-.06), { type: 'weaponConditionalDamageModifier', operation: 'increased', valuePerRank: .1, condition: { type: 'targetHpBelow', fraction: .35 } }] },
  ],
  apexEffects: [damage(.15), { type: 'statModifier', stat: 'accuracyRating', operation: 'flat', valuePerRank: 8 }, { type: 'statModifier', stat: 'criticalStrikeMultiplier', operation: 'flat', valuePerRank: .1 }, { type: 'weaponArmorPenetrationModifier', mode: 'flat', valuePerRank: 10 }, interval(-.05)],
}

export const oneHandedAxePerks = createWeaponTree(profile)
