import { createWeaponTree, conditional, damage, interval, type WeaponTreeProfile } from './helpers'

const profile: WeaponTreeProfile = {
  proficiencyId: 'crossbow', weaponName: 'Crossbow', rootName: 'Crossbow Mastery', icon: 'crossbow', apexName: 'Crossbow Master',
  branches: [
    { name: 'Bolt Power', kind: 'power', names: ['Heavy Bolt', 'Powerful Limbs', 'Massive Impact', 'Driven Bolt', 'Overdrawn Mechanism', 'Siege Bolt', 'Ballista Shot'] },
    { name: 'Armor Penetration', kind: 'penetration', names: ['Hardened Bolts', 'Bodkin Bolt', 'Punch Through', 'Plate Piercer', 'Siege Heads', 'Ignore the Plate', 'Armor Means Nothing'] },
    { name: 'Critical Burst', kind: 'critical', names: ['Calibrated Trigger', 'Killing Mechanism', 'Precision Trigger', 'Deadly Release', 'Critical Bolt', 'Execution Trigger', 'Perfect Mechanism'] },
    { name: 'Reload / Tempo', kind: 'tempo', names: ['Smooth Crank', 'Quick Reload', 'Efficient Mechanism', 'Practiced Reload', 'Combat Reload', 'Veteran Loader', 'Clockwork Volley'] },
    { name: 'Execution / Control', kind: 'control', names: ['Stopping Bolt', 'Heavy Impact', 'Pinning Force', 'Marked Target', 'Finisher Bolt', 'No Escape', 'Final Bolt'] },
  ],
  crossNodes: [
    { name: 'Siege Mechanism', links: [[1, 6], [0, 6]], effects: [damage(.15), { type: 'weaponArmorPenetrationModifier', mode: 'percent', valuePerRank: .1 }] },
    { name: 'Deadly Machine', links: [[2, 6], [3, 6]], effects: [{ type: 'statModifier', stat: 'critDamage', operation: 'flat', valuePerRank: .15 }, interval(-.06)] },
    { name: 'Pinned Execution', links: [[4, 6], [1, 5]], effects: [conditional(.2, { type: 'targetHasEffect', effectId: 'effect.concussed' }), conditional(.2, { type: 'targetHasEffect', effectId: 'effect.armor-broken' })] },
  ],
  apexEffects: [damage(.2), { type: 'statModifier', stat: 'critDamage', operation: 'flat', valuePerRank: .2 }, { type: 'weaponArmorPenetrationModifier', mode: 'percent', valuePerRank: .15 }, interval(-.08)],
}

export const crossbowPerks = createWeaponTree(profile)
