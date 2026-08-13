import { createWeaponTree, conditional, damage, interval, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'dagger', weaponName: 'Dagger', rootName: 'Dagger Mastery', icon: 'sword', apexName: 'Dagger Master',
  branches: [
    { name: 'Speed', kind: 'tempo', names: ['Quick Hands', 'Fast Recovery', 'Light Grip', 'Rapid Sequence', 'Flurry Rhythm', 'Blade Flurry', 'Impossible Speed'] },
    { name: 'Critical Precision', kind: 'critical', names: ['Needle Point', 'Keen Point', 'Critical Anatomy', 'Perfect Angle', 'Precise Violence', "Assassin's Focus", 'Heartseeker'] },
    { name: 'Bleed', kind: 'bleed', names: ['Serrated Point', 'Persistent Cut', 'Multiple Wounds', 'Bloodletting', 'Lingering Wound', 'Crimson Tempo', 'Thousand Cuts'] },
    { name: 'Evasion / Defense', kind: 'dodge', names: ['Light Footwork', 'Slip Away', 'Counterstep', 'Ghost Step', 'Untouchable Rhythm', 'Shadow Dance', 'Vanishing Blade'] },
    { name: 'Execution', kind: 'execution', names: ['Opportunist', 'Weak Point', 'Finish Quickly', "Assassin's Window", 'Merciless', 'Death Mark', 'Final Thrust'] },
  ],
  crossNodes: [
    { name: 'Shadow Rhythm', links: [[0, 6], [3, 6]], effects: [interval(-.06), { type: 'onDodgeApplyEffect', effectId: 'effect.dagger-evasion', durationSeconds: 3 }] },
    { name: 'Crimson Precision', links: [[1, 6], [2, 6]], effects: [{ type: 'statModifier', stat: 'critChance', operation: 'flat', valuePerRank: .04 }, conditional(.1, { type: 'targetHasEffect', effectId: 'effect.bleed' })] },
    { name: 'Vanishing Point', links: [[3, 6], [4, 6]], effects: [{ type: 'statModifier', stat: 'dodgeChance', operation: 'flat', valuePerRank: .05 }, conditional(.15, { type: 'targetHpBelow', fraction: .3 })] },
  ],
  apexEffects: [damage(.15), interval(-.08), { type: 'statModifier', stat: 'critChance', operation: 'flat', valuePerRank: .08 }, { type: 'statModifier', stat: 'critDamage', operation: 'flat', valuePerRank: .2 }, { type: 'statModifier', stat: 'accuracy', operation: 'flat', valuePerRank: 8 }],
}

export const daggerPerks = createWeaponTree(profile)
