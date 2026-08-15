import { createMagicTree, type MagicTreeProfile } from './magicHelpers'

const profile: MagicTreeProfile = {
  proficiencyId: 'darkness-magic', schoolName: 'Darkness Magic', damageType: 'chaos', rootName: 'Darkness Magic Mastery', icon: 'moon',
  branches: [
    { name: 'Shadow Damage', kind: 'shadow', names: ['Shadow Bolt', 'Focused Shadow', 'Dense Darkness', 'Black Edge', 'Nightfall', 'Abyssal Force', 'Void Strike'], icon: 'moon' },
    { name: 'Curse / Weakening', kind: 'curse', names: ['Whispered Curse', 'Deepening Curse', 'Weakening Word', 'Heavy Curse', 'Open to Darkness', 'Enduring Hex', 'Doomed Soul'], icon: 'moon' },
    { name: 'Decay / Damage over Time', kind: 'decay', names: ['Shadow Decay', 'Lingering Rot', 'Deep Corruption', 'Growing Rot', 'Blackened Wound', 'Consuming Darkness', 'Endless Decay'], icon: 'timer' },
    { name: 'Drain / Sustain', kind: 'drain', names: ['Essence Drain', 'Life Siphon', 'Efficient Theft', 'Dark Reservoir', 'Feeding Shadow', 'Soul Drinker', 'Endless Hunger'], icon: 'drop' },
    { name: 'Execution / Doom', kind: 'doom', names: ['Sense Weakness', 'Approaching Doom', 'Merciless Shadow', 'Doom Mark', 'No Dawn', 'Final Night', 'Oblivion'], icon: 'target' },
  ],
  crossNodes: [
    { name: 'Devouring Curse', links: [[1, 5], [3, 5]], effects: [{ type: 'spellDamageBasedManaRestore', valuePerRank: .05 }, { type: 'spellLifeDrainModifier', valuePerRank: .05 }] },
    { name: 'Rotting Doom', links: [[2, 5], [4, 5]], effects: [{ type: 'spellConditionalDamageModifier', operation: 'increased', valuePerRank: .15, condition: { type: 'targetHasEffectAndHpBelow', effectId: 'effect.shadow-decay', fraction: .4 } }] },
    { name: 'Abyssal Hunger', links: [[0, 5], [3, 5]], effects: [{ type: 'spellDamageModifier', valuePerRank: .1 }, { type: 'statModifier', stat: 'maxMana', operation: 'flat', valuePerRank: 10 }, { type: 'spellLifeDrainModifier', valuePerRank: .03 }] },
  ],
  apexName: 'Master of Darkness', apexEffects: [{ type: 'spellDamageModifier', valuePerRank: .2 }, { type: 'spellManaCostModifier', valuePerRank: -.1 }, { type: 'appliedEffectPeriodicDamageModifier', effectId: 'effect.shadow-decay', valuePerRank: .2 }, { type: 'appliedEffectDurationModifier', effectId: 'effect.cursed', valuePerRank: .15 }, { type: 'spellLifeDrainModifier', valuePerRank: .03 }],
}

export const darknessMagicPerks = createMagicTree(profile)
