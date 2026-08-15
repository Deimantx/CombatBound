import { createWeaponTree, conditional, damage, interval, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'spear', weaponName: 'Spear', rootName: 'Spear Mastery', icon: 'spear', apexName: 'Spearmaster',
  branches: [
    { name: 'Precision', kind: 'precision', names: ['Point Control', 'Measured Thrust', 'Narrow Opening', 'Perfect Line', 'Long Reach', 'Unerring Point', 'Perfect Thrust'] },
    { name: 'Critical Windows', kind: 'critical', names: ['Keen Spearhead', 'Piercing Precision', 'Weak-Point Study', 'Critical Window', 'Exploit Opening', 'Fatal Line', 'Heart-Piercer'] },
    { name: 'Bleed / Puncture', kind: 'bleed', names: ['Barbed Point', 'Deep Puncture', 'Repeated Puncture', 'Open Vein', 'Persistent Puncture', 'Puncture Pressure', 'Impaling Wound'] },
    { name: 'Guard / Counter', kind: 'guard', names: ['Shaft Guard', 'Deflecting Reach', 'Counter Thrust', 'Return Point', 'Guarded Reach', 'Counterfighter', 'Perfect Counterthrust'] },
    { name: 'Tempo / Opening', kind: 'opening', names: ['Quick Recovery', 'Light Hands', 'First Thrust', 'Maintain Distance', 'Relentless Point', 'Veteran Pikeman', 'Opening Dominance'] },
  ],
  crossNodes: [
    { name: "Duelist's Reach", links: [[0, 6], [3, 6]], effects: [{ type: 'statModifier', stat: 'accuracyRating', operation: 'flat', valuePerRank: 8 }, { type: 'statModifier', stat: 'attackBlockChance', operation: 'flat', valuePerRank: .03 }] },
    { name: 'Blood Point', links: [[1, 6], [2, 6]], effects: [{ type: 'onWeaponHitApplyEffect', effectId: 'effect.bleed', chancePerRank: .1 }, conditional(.15, { type: 'targetHasEffect', effectId: 'effect.bleed' })] },
    { name: 'First and Final', links: [[4, 6], [1, 6]], effects: [conditional(.2, { type: 'targetHpAbove', fraction: .75 }), conditional(.25, { type: 'targetHpBelow', fraction: .25 })] },
  ],
  apexEffects: [damage(.15), { type: 'statModifier', stat: 'accuracyRating', operation: 'flat', valuePerRank: 12 }, { type: 'statModifier', stat: 'baseCritChance', operation: 'flat', valuePerRank: .05 }, { type: 'statModifier', stat: 'attackBlockChance', operation: 'flat', valuePerRank: .05 }, interval(-.05)],
}

export const spearPerks = createWeaponTree(profile)
