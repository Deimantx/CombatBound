import { createWeaponTree, conditional, damage, interval, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'shortbow', weaponName: 'Shortbow', rootName: 'Shortbow Foundations', icon: 'bow', apexName: 'Shortbow Master',
  branches: [
    { name: 'Rapid Fire', kind: 'tempo', names: ['Quick Draw', 'Fast Nock', 'Loose Rhythm', 'Rapid Cadence', 'Relentless Volley', "Skirmisher's Rhythm", 'Rain of Arrows'] },
    { name: 'Precision / Crit', kind: 'critical', names: ['Steady Aim', 'Fine Fletching', 'Quick Sight', 'Keen Archer', 'Critical Release', 'Deadeye Rhythm', 'Perfect Shot'] },
    { name: 'Barbed Arrows / Bleed', kind: 'bleed', names: ['Barbed Arrows', 'Tearing Shaft', 'Multiple Barbs', 'Blooded Target', 'Deep Barbs', "Hunter's Bleed", 'Crimson Volley'] },
    { name: 'Mobility / Evasion', kind: 'mobility', names: ['Mobile Archer', 'Light Footing', 'Loose on the Move', 'Skirmish Step', 'Untouchable Archer', 'Running Shot', 'Ghost Archer'], icon: 'bow' },
    { name: 'Multi-Shot', kind: 'multi', names: ['Split Shot', 'Paired Release', 'Triple Nock', 'Crowd Pressure', 'Barbed Volley', 'Skirmish Volley', 'Arrow Storm'] },
  ],
  crossNodes: [
    { name: 'Bloody Tempo', links: [[2, 6], [0, 6]], effects: [{ type: 'onWeaponHitApplyEffect', effectId: 'effect.bleed', chancePerRank: .1 }, interval(-.06)] },
    { name: 'Mobile Marksman', links: [[3, 6], [1, 6]], effects: [{ type: 'statModifier', stat: 'evasionRating', operation: 'flat', valuePerRank: 10 }, { type: 'statModifier', stat: 'accuracyRating', operation: 'flat', valuePerRank: 8 }] },
    { name: 'Storm Hunter', links: [[4, 6], [2, 6]], effects: [{ type: 'weaponSecondaryTargetDamage', fractionPerRank: .2, maxAdditionalTargets: 3 }, conditional(.15, { type: 'targetHasEffect', effectId: 'effect.bleed' })] },
  ],
  apexEffects: [damage(.2), interval(-.08), { type: 'statModifier', stat: 'criticalStrikeChance', operation: 'flat', valuePerRank: .08 }, { type: 'weaponSecondaryTargetDamage', fractionPerRank: .25, maxAdditionalTargets: 3 }, { type: 'statModifier', stat: 'evasionRating', operation: 'flat', valuePerRank: 10 }],
}

export const shortbowPerks = createWeaponTree(profile)
