import type { ModifiableCombatStatKey, ResistanceDamageType } from '../../combat/combatTypes'
import type { ProficiencyPerkDefinition, ProficiencyPerkEffect } from '../../progression/progressionTypes'
import { all, id, pos } from './helpers'

type DefensiveId = 'light-armor' | 'medium-armor' | 'heavy-armor' | 'shield'
type BranchSpec = { name: string; names: [string, string, string, string, string, string, string]; icon: string }

const stat = (statName: ModifiableCombatStatKey, valuePerRankPerPiece: number, minimumPieces?: number): ProficiencyPerkEffect => ({ type: 'equippedArmorStatModifier', stat: statName, operation: 'flat', valuePerRankPerPiece, minimumPieces })
const resistance = (damageType: ResistanceDamageType, valuePerRankPerPiece: number, minimumPieces?: number): ProficiencyPerkEffect => ({ type: 'equippedArmorResistanceModifier', damageType, valuePerRankPerPiece, minimumPieces })
const spell = (modifier: Extract<ProficiencyPerkEffect, { type: 'equippedArmorSpellModifier' }>['modifier'], valuePerRank: number, minimumPieces: number): ProficiencyPerkEffect => ({ type: 'equippedArmorSpellModifier', modifier, valuePerRank, minimumPieces })
const weapon = (modifier: Extract<ProficiencyPerkEffect, { type: 'equippedArmorWeaponModifier' }>['modifier'], valuePerRank: number, minimumPieces: number): ProficiencyPerkEffect => ({ type: 'equippedArmorWeaponModifier', modifier, valuePerRank, minimumPieces })

const branchLevels = [5, 10, 20, 30, 40, 60, 90]
const branchRanks = [3, 3, 2, 2, 1, 1, 1]
const branchColumns = [0, 2, 4, 6, 8]

const branchData: Record<DefensiveId, { name: string; icon: string; root: string; branches: [BranchSpec, BranchSpec, BranchSpec, BranchSpec, BranchSpec]; apex: string; effects: (branch: number, index: number) => ProficiencyPerkEffect[] }> = {
  'light-armor': {
    name: 'Light Armor', icon: 'wind', root: 'Light Armor Foundation', apex: 'Master of Light Armor',
    branches: [
      { name: 'Arcane Mobility', icon: 'spark', names: ['Aether Attunement', 'Open Channels', 'Spellstep', 'Flowing Focus', 'Arcane Slip', 'Quickened Weave', 'Windborne Casting'] },
      { name: 'Mana Weaving', icon: 'spark', names: ['Threaded Mana', 'Deep Reservoir', 'Efficient Weave', 'Mana on the Move', 'Sustained Channel', 'Endless Reserve', 'Living Conduit'] },
      { name: 'Evasive Form', icon: 'wind', names: ['Featherstep', 'Reading Motion', 'Measured Footwork', 'Veiled Approach', 'Ghost Step', 'Unseen Angle', 'Untouchable Form'] },
      { name: 'Barrier Ward', icon: 'shield', names: ['Ward Stitching', 'Layered Barrier', 'Resonant Ward', 'Barrier Flow', 'Spellward Skin', 'Lasting Ward', 'Aegis of Air'] },
      { name: 'Elemental Veil', icon: 'spark', names: ['Softened Elements', 'Flame Veil', 'Frost Veil', 'Storm Veil', 'Chaos Veil', 'Prismatic Guard', 'Elemental Sanctuary'] },
    ],
    effects: (branch, index) => {
      if (branch === 0) return [index === 0 ? stat('manaRegenFlat', .15) : index === 1 ? stat('evasionRating', 1, 2) : index === 2 ? spell('damage', .03, 2) : index === 3 ? spell('cooldown', -.03, 2) : index === 4 ? stat('evasionRating', 5, 3) : index === 5 ? spell('manaCost', -.05, 3) : stat('manaRegenFlat', .5, 4)]
      if (branch === 1) return [index === 0 ? stat('maxMana', 4) : index === 1 ? stat('maxMana', 8, 2) : index === 2 ? spell('manaCost', -.03, 2) : index === 3 ? stat('manaRegenFlat', .2, 2) : index === 4 ? spell('barrierAmount', .05, 3) : index === 5 ? stat('maxMana', 12, 3) : spell('manaCost', -.1, 4)]
      if (branch === 2) return [index === 0 ? stat('evasionRating', 2) : index === 1 ? stat('evasionRating', 5, 2) : index === 2 ? stat('evasionRating', 3, 2) : index === 3 ? stat('evasionRating', 7, 2) : index === 4 ? stat('blockChance', .01, 3) : index === 5 ? stat('evasionRating', 8, 3) : stat('evasionRating', 12, 4)]
      if (branch === 3) return [index === 0 ? spell('barrierAmount', .04, 1) : index === 1 ? spell('barrierAmount', .06, 2) : index === 2 ? stat('lifeRegenFlat', .1, 2) : index === 3 ? spell('barrierDuration', .1, 2) : index === 4 ? resistance('fire', .01, 3) : index === 5 ? stat('maxLife', 10, 3) : spell('barrierAmount', .15, 4)]
      if (index === 0) return [resistance('fire', .005), resistance('cold', .005), resistance('lightning', .005)] // [TUNING]
      if (index === 1) return [resistance('fire', .01)] // [TUNING]
      if (index === 2) return [resistance('cold', .01, 2)] // [TUNING]
      if (index === 3) return [resistance('lightning', .01, 2)] // [TUNING]
      if (index === 4) return [resistance('chaos', .015, 3)] // [TUNING]
      if (index === 5) return [resistance('fire', .01, 3), resistance('cold', .01, 3), resistance('lightning', .01, 3)] // [TUNING]
      return [resistance('fire', .015, 4), resistance('cold', .015, 4), resistance('lightning', .015, 4), resistance('chaos', .01, 4)] // [TUNING]
    },
  },
  'medium-armor': {
    name: 'Medium Armor', icon: 'swords', root: 'Medium Armor Foundation', apex: 'Master of Medium Armor',
    branches: [
      { name: 'Stamina Discipline', icon: 'wind', names: ['Balanced Breathing', 'Stamina Reserve', 'Efficient Motion', 'Second Wind', 'Combat Rhythm', 'Enduring Pace', 'Unbroken Stamina'] },
      { name: 'Mobile Defense', icon: 'shield', names: ['Moving Guard', 'Reactive Step', 'Skirmisher Pace', 'Deflecting Path', 'Mobile Bulwark', 'Dancing Defense', 'Uncatchable'] },
      { name: 'Weapon Tempo', icon: 'sword', names: ['Ready Grip', 'Tempo Study', 'Measured Strikes', 'Swift Recovery', 'Battle Cadence', 'Rapid Technique', 'Perfect Tempo'] },
      { name: 'Balanced Guard', icon: 'shield', names: ['Practical Armor', 'Guarded Center', 'Firm Footing', 'Flexible Guard', 'Reinforced Frame', 'Adaptive Defense', 'Balanced Mastery'] },
      { name: 'General Resilience', icon: 'spark', names: ["Hunter's Resolve", 'Pain Tolerance', 'Status Awareness', 'Hardy Constitution', 'Elemental Balance', 'Relentless Survivor', 'Versatile Resilience'] },
    ],
    effects: (branch, index) => {
      if (branch === 0) return [index === 0 ? stat('staminaRegen', .25) : index === 1 ? stat('maxStamina', 5, 2) : index === 2 ? stat('staminaRegen', .25, 2) : index === 3 ? stat('maxStamina', 8, 2) : index === 4 ? stat('staminaRegen', .5, 3) : index === 5 ? stat('maxStamina', 15, 3) : stat('staminaRegen', 1, 4)]
      if (branch === 1) return [index === 0 ? stat('evasionRating', 2) : index === 1 ? stat('evasionRating', 5, 2) : index === 2 ? stat('evasionRating', 3, 2) : index === 3 ? stat('evasionRating', 7, 2) : index === 4 ? stat('evasionRating', 6, 3) : index === 5 ? stat('evasionRating', 10, 3) : stat('evasionRating', 12, 4)]
      if (branch === 2) return [index === 0 ? weapon('accuracy', 2, 1) : index === 1 ? weapon('damage', .03, 2) : index === 2 ? weapon('attackSpeed', 1 / .98 - 1, 2) : index === 3 ? stat('accuracyRating', 3, 2) : index === 4 ? weapon('damage', .06, 3) : index === 5 ? weapon('attackSpeed', 1 / .96 - 1, 3) : weapon('damage', .12, 4)]
      if (branch === 3) return [index === 0 ? stat('armour', 2) : index === 1 ? stat('blockChance', .01, 2) : index === 2 ? stat('blockChance', .02, 2) : index === 3 ? stat('armour', 4, 2) : index === 4 ? stat('blockChance', .015, 3) : index === 5 ? stat('blockChance', .04, 3) : stat('armour', 12, 4)]
      return [index === 0 ? stat('maxLife', 5) : index === 1 ? stat('blockEffect', .01, 2) : index === 2 ? stat('armour', 2, 2) : index === 3 ? stat('maxLife', 8, 2) : index === 4 ? resistance('fire', .01, 3) : index === 5 ? stat('blockEffect', .02, 3) : stat('armour', 8, 4)]
    },
  },
  'heavy-armor': {
    name: 'Heavy Armor', icon: 'shield', root: 'Heavy Armor Foundation', apex: 'Master of Heavy Armor',
    branches: [
      { name: 'Vitality', icon: 'heart', names: ['Weight of Life', 'Deep Vitality', 'Fortified Health', 'Living Mass', 'Titanic Frame', 'Enduring Body', 'Colossal Vitality'] },
      { name: 'Iron Shell', icon: 'shield', names: ['Iron Plates', 'Dense Mail', 'Hardened Shell', 'Steel Foundation', 'Immovable Guard', 'Ironclad', 'Unyielding Shell'] },
      { name: 'Recovery', icon: 'heart', names: ['Battle Recovery', 'Steady Pulse', 'Health Renewal', 'Deep Recovery', 'Regenerative Armor', 'Second Life', 'Everlasting Renewal'] },
      { name: 'Status Guard', icon: 'spark', names: ['Steady Nerves', 'Resistant Mind', 'Purged Weakness', 'Unshaken', 'Status Ward', 'Iron Will', 'Immunity of Steel'] },
      { name: 'Last Stand', icon: 'flame', names: ['Pressure Tested', 'Low Health Guard', 'Pain into Power', 'Desperate Strength', 'Final Bulwark', 'Deathless Guard', 'Last Stand'] },
    ],
    effects: (branch, index) => {
      if (branch === 0) return [index === 0 ? stat('maxLife', 10) : index === 1 ? stat('maxLife', 15, 2) : index === 2 ? stat('maxLife', 20, 2) : index === 3 ? stat('lifeRegenFlat', .15, 2) : index === 4 ? stat('maxLife', 35, 3) : index === 5 ? stat('lifeRegenFlat', .3, 3) : stat('maxLife', 60, 4)]
      if (branch === 1) return [index === 0 ? stat('armour', 3) : index === 1 ? stat('armour', 4, 2) : index === 2 ? stat('blockChance', .02, 2) : index === 3 ? stat('armour', 7, 2) : index === 4 ? stat('blockChance', .01, 3) : index === 5 ? stat('armour', 12, 3) : stat('armour', 24, 4)]
      if (branch === 2) return [index === 0 ? stat('lifeRegenFlat', .15) : index === 1 ? stat('lifeRegenFlat', .2, 2) : index === 2 ? stat('lifeRegenFlat', .25, 2) : index === 3 ? stat('maxLife', 10, 2) : index === 4 ? stat('lifeRegenFlat', .35, 3) : index === 5 ? stat('lifeRegenFlat', .5, 3) : stat('lifeRegenFlat', 1, 4)]
      if (branch === 3) return [index === 0 ? stat('blockEffect', .01) : index === 1 ? stat('blockEffect', .015, 2) : index === 2 ? stat('armour', 2, 2) : index === 3 ? stat('blockEffect', .02, 2) : index === 4 ? resistance('fire', .01, 3) : index === 5 ? stat('blockEffect', .03, 3) : stat('blockEffect', .08, 4)]
      return [index === 0 ? stat('armour', 2) : index === 1 ? stat('maxLife', 10, 2) : index === 2 ? stat('armour', 4, 2) : index === 3 ? stat('lifeRegenFlat', .2, 2) : index === 4 ? stat('armour', 8, 3) : index === 5 ? stat('maxLife', 20, 3) : stat('lifeRegenFlat', .75, 4)]
    },
  },
  shield: {
    name: 'Shield', icon: 'shield', root: 'Shield Foundation', apex: 'Shieldmaster',
    branches: [
      { name: 'Shield Mastery', icon: 'shield', names: ['Shield Familiarity', 'Guard Training', 'Broad Guard', 'Shield Wall', 'Perfect Guard', 'Aegis Training', 'Impenetrable Guard'] },
      { name: 'Attack Block', icon: 'shield', names: ['Braced Impact', 'Dense Guard', 'Absorbing Face', 'Reinforced Rim', 'Heavy Deflection', 'Warding Block', 'Unstoppable Guard'] },
      { name: 'Stamina Control', icon: 'wind', names: ['Guarded Breathing', 'Efficient Block', 'Stamina on Guard', 'Measured Defense', 'Endless Guard', 'Rhythmic Guard', 'Unbroken Rhythm'] },
      { name: 'Counterattack', icon: 'sword', names: ['Shield and Blade', 'Opening Counter', 'Reprisal', 'Perfect Riposte', 'Driving Counter', 'Punishing Wall', 'Countermaster'] },
      { name: 'Warding Shield', icon: 'spark', names: ['Elemental Facing', 'Arcane Facing', 'Steadfast Guard', 'Ward the Blow', 'Spellguard', 'Warding Wall', 'Aegis'] },
    ],
    effects: (branch, index) => {
      if (branch === 0) return [index === 0 ? stat('blockChance', .01) : index === 1 ? stat('blockChance', .015, 1) : index === 2 ? stat('blockChance', .02, 2) : index === 3 ? stat('blockChance', .02, 2) : index === 4 ? stat('blockChance', .04, 3) : index === 5 ? stat('blockChance', .03, 3) : stat('blockChance', .08, 4)]
      if (branch === 1) return [index === 0 ? stat('blockChance', .02) : index === 1 ? stat('armour', 3, 1) : index === 2 ? stat('blockChance', .03, 2) : index === 3 ? stat('armour', 5, 2) : index === 4 ? stat('blockChance', .05, 3) : index === 5 ? stat('blockEffect', .02, 3) : stat('blockChance', .12, 4)]
      if (branch === 2) return [index === 0 ? stat('staminaRegen', .25) : index === 1 ? stat('staminaRegen', .2, 1) : index === 2 ? stat('maxStamina', 5, 2) : index === 3 ? stat('staminaRegen', .3, 2) : index === 4 ? stat('maxStamina', 10, 3) : index === 5 ? stat('staminaRegen', .5, 3) : stat('staminaRegen', 1, 4)]
      if (branch === 3) return [index === 0 ? weapon('damage', .03, 1) : index === 1 ? weapon('accuracy', 3, 1) : index === 2 ? weapon('damage', .05, 2) : weapon('damage', index >= 5 ? .1 : .06, index >= 4 ? 3 : 2)]
      return [index === 0 ? resistance('fire', .01) : index === 1 ? resistance('cold', .01, 1) : index === 2 ? stat('armour', 2, 2) : index === 3 ? resistance('lightning', .015, 2) : index === 4 ? resistance('chaos', .02, 3) : index === 5 ? stat('blockEffect', .02, 3) : resistance('cold', .04, 4)]
    },
  },
}

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

function createTree(proficiencyId: DefensiveId): ProficiencyPerkDefinition[] {
  const profile = branchData[proficiencyId]
  const rootId = id(proficiencyId, slugify(profile.root))
  const root: ProficiencyPerkDefinition = { id: rootId, proficiencyId, branch: 'Root', name: profile.root, requiredProficiencyLevel: 1, maxRank: 5, costPerRank: 1, description: `Training while equipped with ${profile.name}.`, effects: [stat(proficiencyId === 'shield' ? 'blockChance' : 'armour', proficiencyId === 'shield' ? .01 : 1)], prerequisiteRules: [], presentation: pos(4, 0, 'root', profile.icon) }
  const definitions: ProficiencyPerkDefinition[] = [root]
  const branchCapstones: string[] = []
  profile.branches.forEach((branch, branchIndex) => {
    let previous = rootId
    branch.names.forEach((name, index) => {
      const nodeId = id(proficiencyId, slugify(name))
      const capstone = index === 6
      definitions.push({ id: nodeId, proficiencyId, branch: branch.name, name, requiredProficiencyLevel: branchLevels[index], maxRank: branchRanks[index], costPerRank: capstone ? 2 : 1, description: `${name}: ${profile.name} benefit while the matching equipment is active.`, effects: profile.effects(branchIndex, index), prerequisiteRules: all([previous, 1]), presentation: pos(branchColumns[branchIndex], index + 1, capstone ? 'capstone' : index === 5 ? 'major' : 'minor', branch.icon) })
      previous = nodeId
      if (capstone) branchCapstones.push(nodeId)
    })
  })
  const crossLinks: Array<[[number, number], [number, number]]> = [[[0, 6], [1, 6]], [[2, 6], [3, 6]], [[1, 6], [4, 6]]]
  const crossNames = ['Adaptive Defense', 'Unified Guard', 'Masterwork Convergence']
  crossLinks.forEach((links, index) => definitions.push({ id: id(proficiencyId, slugify(`cross-${index + 1}-${crossNames[index]}`)), proficiencyId, branch: 'Cross-Branch', name: crossNames[index], requiredProficiencyLevel: index === 2 ? 80 : 70, maxRank: 1, costPerRank: 2, description: `${profile.name} branches converge into a broader defensive discipline.`, effects: [stat(proficiencyId === 'shield' ? 'blockChance' : 'armour', proficiencyId === 'shield' ? .04 : 3, 2)], prerequisiteRules: all([id(proficiencyId, slugify(profile.branches[links[0][0]].names[links[0][1]])), 1], [id(proficiencyId, slugify(profile.branches[links[1][0]].names[links[1][1]])), 1]), presentation: pos(1 + index * 2, 8, 'major', profile.icon) }))
  definitions.push({ id: id(proficiencyId, slugify(profile.apex)), proficiencyId, branch: 'Apex', name: profile.apex, requiredProficiencyLevel: 100, maxRank: 1, costPerRank: 3, description: `The complete ${profile.name} discipline.`, effects: [stat(proficiencyId === 'shield' ? 'blockChance' : 'maxLife', proficiencyId === 'shield' ? .08 : 25, 4)], prerequisiteRules: all([rootId, 5]).concat([{ mode: 'any', requirements: branchCapstones.map((perkId) => ({ perkId, requiredRank: 1 })), minimumSatisfied: 3 }]), presentation: pos(4, 10, 'capstone', 'crown') })
  if (definitions.length !== 40) throw new Error(`${proficiencyId} defensive tree expected 40 nodes, found ${definitions.length}`)
  return definitions
}

export const lightArmorPerks = createTree('light-armor')
export const mediumArmorPerks = createTree('medium-armor')
export const heavyArmorPerks = createTree('heavy-armor')
export const shieldPerks = createTree('shield')
