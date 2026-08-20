import { createMagicTree, type MagicTreeProfile } from './magicHelpers'

const profile: MagicTreeProfile = {
  proficiencyId: 'air-magic', schoolName: 'Air Magic', damageType: 'lightning', rootName: 'Air Magic Foundations', icon: 'wind',
  branches: [
    { name: 'Lightning / Shock', kind: 'lightning', names: ['Static Charge', 'Conductive Target', 'Charged Strike', 'Voltage Spike', 'Overcharge', 'Thunderhead', "Stormcaller's Judgment"], icon: 'zap' },
    { name: 'Chain / Multi-Target', kind: 'chain', names: ['Forked Current', 'Conductive Arc', 'Chain Reaction', 'Storm Network', 'Charged Chain', 'Rolling Thunder', 'Tempest'], icon: 'zap' },
    { name: 'Haste / Cooldown', kind: 'haste', names: ['Quick Cast', 'Light Incantation', 'Wind at Your Back', 'Storm Rhythm', 'Tailwind', 'Eye of the Storm', 'Unending Gale'], icon: 'timer' },
    { name: 'Shock / Control', kind: 'control', names: ['Interference', 'Fast Counter', 'Feedback Spark', 'Exposing Shock', 'Danger Sense', 'Storm Lock', 'Perfect Disruption'], icon: 'zap' },
    { name: 'Wind / Evasion', kind: 'wind', names: ['Windstep', 'Featherlight', 'Slipstream', 'Gale Guard', 'Untouchable Current', 'Storm Dancer', 'Living Wind'], icon: 'wind' },
  ],
  crossNodes: [
    { name: 'Thunderstep', links: [[0, 5], [4, 5]], effects: [{ type: 'spellConditionalDamageModifier', operation: 'increased', valuePerRank: .1, condition: { type: 'targetHasEffect', effectId: 'effect.shocked' } }, { type: 'statModifier', stat: 'evasionRating', operation: 'flat', valuePerRank: 3 }] },
    { name: 'Chain Interference', links: [[1, 5], [3, 5]], effects: [{ type: 'spellDamageModifier', valuePerRank: .05 }] },
    { name: 'Perfect Storm', links: [[2, 5], [0, 5]], effects: [{ type: 'spellDamageModifier', valuePerRank: .1 }, { type: 'spellCooldownModifier', valuePerRank: -.08 }, { type: 'spellCriticalDamageModifier', valuePerRank: .1 }] },
  ],
  apexName: 'Stormlord', apexEffects: [{ type: 'spellDamageModifier', valuePerRank: .15 }, { type: 'spellCooldownModifier', valuePerRank: -.15 }, { type: 'statModifier', stat: 'evasionRating', operation: 'flat', valuePerRank: 5 }, { type: 'appliedEffectDurationModifier', effectId: 'effect.shocked', valuePerRank: .15 }, { type: 'spellCriticalDamageModifier', valuePerRank: .15 }],
}

export const airMagicPerks = createMagicTree(profile)
