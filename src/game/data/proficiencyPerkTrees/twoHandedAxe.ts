import { createWeaponTree, conditional, damage, interval, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'two-handed-axe', weaponName: 'Two-Handed Axe', rootName: 'Greataxe Foundations', icon: 'axe', apexName: 'Greataxe Master',
  branches: [
    { name: 'Massive Power', kind: 'power', names: ['Weighted Blade', 'Committed Chop', 'Brutal Weight', 'Savage Criticals', 'Overhead Ruin', 'Monstrous Swing', 'World Splitter'] },
    { name: 'Bleed', kind: 'bleed', names: ['Jagged Greatblade', 'Deep Wound', 'Rivers of Blood', 'Bleeding Ruin', 'Persistent Trauma', 'Bloodstorm', 'Red Harvest'] },
    { name: 'Armour Break', kind: 'armour', names: ['Split Iron', 'Crush Plate', 'Sunder Deep', 'Open the Shell', 'Shatter Guard', 'No Armour Left', 'Siegebreaker'] },
    { name: 'Execution', kind: 'execution', names: ['Hunter of the Weak', 'Savage Finish', "Death's Approach", 'Execution Weight', 'No Escape', 'Marked for Ruin', 'Decapitation'] },
    { name: 'Stamina / Tempo', kind: 'tempo', names: ['Heavy Conditioning', 'Recovery Step', 'Ruthless Breathing', 'Efficient Tempo', 'Full Reserve', "Reaver's Rhythm", 'Unending Reaver'] },
  ],
  crossNodes: [
    { name: 'Blood and Iron', links: [[1, 6], [2, 6]], effects: [{ type: 'weaponConditionalDamageModifier', operation: 'increased', valuePerRank: .12, condition: { type: 'targetHasEffect', effectId: 'effect.bleed' } }, { type: 'weaponArmorPenetrationModifier', mode: 'flat', valuePerRank: 10 }] },
    { name: 'Ruinous Momentum', links: [[0, 6], [4, 6]], effects: [damage(.15), interval(-.05)] },
    { name: "Executioner's Harvest", links: [[3, 6], [1, 6]], effects: [conditional(.2, { type: 'targetHpBelow', fraction: .3 }), conditional(.12, { type: 'targetHasEffect', effectId: 'effect.bleed' })] },
  ],
  apexEffects: [damage(.2), { type: 'statModifier', stat: 'criticalStrikeMultiplier', operation: 'flat', valuePerRank: .2 }, { type: 'weaponArmorPenetrationModifier', mode: 'percent', valuePerRank: .15 }, interval(-.05)],
}

export const twoHandedAxePerks = createWeaponTree(profile)
