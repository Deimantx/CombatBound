import { createWeaponTree, conditional, damage, interval, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'one-handed-mace', weaponName: 'One-Handed Mace', rootName: 'Mace Mastery', icon: 'hammer', apexName: 'Mace Lord',
  branches: [
    { name: 'Crushing Force', kind: 'power', names: ['Weighted Head', 'Full Swing', 'Bone-Shaking Impact', 'Crushing Blow', 'Heavy Hand', 'Devastating Impact', 'Skullcracker'] },
    { name: 'Armor Crushing', kind: 'armor', names: ['Dent Plate', 'Crack the Shell', 'Crushing Geometry', 'Collapsed Defense', 'Pulverize', 'Nothing Left to Guard', 'Platebreaker'] },
    { name: 'Guard / Block', kind: 'guard', names: ['Defensive Grip', 'Solid Guard', 'Brace for Impact', 'Guarded Counter', 'Iron Wrist', 'Counterweight', 'Unmoving Hand'] },
    { name: 'Tempo / Stamina', kind: 'tempo', names: ['Conditioned Arms', 'Short Recovery', 'Efficient Impact', 'Economical Motion', 'Rhythmic Strikes', 'Hammering Rhythm', 'Unbroken Cadence'] },
    { name: 'Punisher / Exposed', kind: 'control', names: ['Read the Opening', 'Punishing Blow', 'Concussive Hit', 'Staggering Presence', 'Exploit Weakness', 'Relentless Punishment', 'Crushing Sentence'] },
  ],
  crossNodes: [
    { name: "Breaker's Rhythm", links: [[1, 6], [3, 6]], effects: [interval(-.05), { type: 'weaponConditionalDamageModifier', operation: 'addPercent', valuePerRank: .08, condition: { type: 'targetHasEffect', effectId: 'effect.armor-broken' } }] },
    { name: 'Iron Hand', links: [[2, 6], [0, 5]], effects: [{ type: 'statModifier', stat: 'armor', operation: 'flat', valuePerRank: 10 }, { type: 'weaponBlockPenetrationModifier', stat: 'blockPower', valuePerRank: .1 }, damage(.1)] },
    { name: 'Ruthless Impact', links: [[4, 5], [1, 6]], effects: [conditional(.15, { type: 'targetHasEffect', effectId: 'effect.concussed' }), conditional(.15, { type: 'targetHasEffect', effectId: 'effect.armor-broken' })] },
  ],
  apexEffects: [damage(.15), { type: 'statModifier', stat: 'armor', operation: 'flat', valuePerRank: 10 }, { type: 'weaponArmorPenetrationModifier', mode: 'flat', valuePerRank: 10 }, { type: 'statModifier', stat: 'blockChance', operation: 'flat', valuePerRank: .05 }, { type: 'statModifier', stat: 'critDamage', operation: 'flat', valuePerRank: .1 }],
}

export const oneHandedMacePerks = createWeaponTree(profile)
