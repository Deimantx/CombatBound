import { createWeaponTree, conditional, damage, interval, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'two-handed-sword', weaponName: 'Two-Handed Sword', rootName: 'Greatsword Foundations', icon: 'sword', apexName: 'Greatsword Master',
  branches: [
    { name: 'Heavy Power', kind: 'power', names: ['Broad Blade', 'Full Commitment', 'Massive Swing', 'Driving Force', 'Overwhelming Stroke', 'Titanic Blow', 'Catastrophic Strike'] },
    { name: 'Critical', kind: 'critical', names: ['Edge Control', 'Keen Greatblade', 'Heavy Criticals', 'Measured Impact', 'Decisive Blow', 'Perfect Commitment', 'Mortal Arc'] },
    { name: 'Cleave', kind: 'cleave', names: ['Wide Arc', 'Sweeping Cut', 'Follow-Through', 'Crowd Pressure', 'Bloodied Arc', 'War Sweep', 'Battlefield Reaper'] },
    { name: 'Stamina / Tempo', kind: 'tempo', names: ['Heavy Conditioning', 'Efficient Recovery', 'Economical Swing', 'Measured Breathing', 'Power Reserve', "Veteran's Rhythm", 'Endless Greatblade'] },
    { name: 'Guard / Execution', kind: 'guard', names: ['Two-Handed Guard', 'Deflecting Steel', 'Punishing Guard', 'Lasting Counter', 'Execution Arc', "Warrior's Sentence", "King's Execution"] },
  ],
  crossNodes: [
    { name: 'Sweeping Execution', links: [[2, 6], [4, 6]], effects: [damage(.12), conditional(.2, { type: 'targetHpBelow', fraction: .35 })] },
    { name: "Titan's Discipline", links: [[0, 6], [3, 6]], effects: [damage(.12), { type: 'statModifier', stat: 'staminaRegen', operation: 'flat', valuePerRank: 1 }] },
    { name: 'Perfect Greatblade', links: [[1, 6], [2, 6]], effects: [{ type: 'statModifier', stat: 'criticalStrikeMultiplier', operation: 'flat', valuePerRank: .15 }, damage(.1)] },
  ],
  apexEffects: [damage(.2), { type: 'statModifier', stat: 'criticalStrikeMultiplier', operation: 'flat', valuePerRank: .2 }, damage(.1), interval(-.05)],
}

export const twoHandedSwordPerks = createWeaponTree(profile)
