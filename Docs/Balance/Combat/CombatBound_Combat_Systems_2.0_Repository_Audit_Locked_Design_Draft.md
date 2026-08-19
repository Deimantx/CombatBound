# CombatBound — Combat Systems 2.0
## Repository Audit + Locked Design Draft

**Audit baseline:** `bfec447d1b665b13555b1ca6373a31618aeed561` (`offline`)  
**Purpose:** simplify the real combat model before Offline Activity Simulation and Offline Combat are built.

This is **not** a Codex implementation prompt.

It is the short design document that sits between the repository audit and the implementation pass.

---

# 1. Main conclusion

The current combat foundation is mechanically capable, but it has accumulated too many overlapping PoE-style sub-stats and special-case systems for CombatBound's current needs.

The correct direction is **not** to replace combat with a very simple damage-vs-HP system.

The correct direction is to keep the systems that create clear build choices:

- Accuracy / Evasion
- Critical Hits
- Attack Speed / Cast Speed
- five Damage Types
- Armour
- Block
- Resistances
- Barrier
- Health / Stamina / Mana
- core Ailments and debuffs
- Weapon Skills
- Spells
- Combat Abilities
- Shared Combat Abilities
- Enemy Actions
- Proficiencies

while deleting or merging the layers that mostly create implementation and UI complexity.

---

# 2. Proposed Combat 2.0 at a glance

```text
OFFENSE
├─ Weapon Damage
├─ Accuracy
├─ Critical Strike Chance
├─ Critical Strike Multiplier
├─ Attack Speed
└─ Cast Speed

DAMAGE TYPES
├─ Physical
├─ Fire
├─ Cold
├─ Lightning
└─ Chaos

DEFENSE
├─ Health
├─ Evasion
├─ Armour
├─ Block Chance
├─ Block Effect
├─ Fire Resistance
├─ Cold Resistance
├─ Lightning Resistance
├─ Chaos Resistance
└─ Barrier

RESOURCES
├─ Health + Health Regen
├─ Stamina + Stamina Regen
└─ Mana + Mana Regen

CORE HARMFUL EFFECTS
├─ Bleed
├─ Ignite
├─ Poison
├─ Chill
├─ Shock
├─ Crushed
└─ Withered

PLAYER COMBAT SYSTEMS
├─ Basic Weapon Attack
├─ Weapon Skills
├─ Combat Abilities
├─ Spells
├─ Shared Combat Abilities
├─ Consumables
├─ Cooldowns
└─ one simple Global Cooldown

ENEMIES
├─ Normal Attack
├─ Traits
├─ Enemy Actions
├─ Group Combat
└─ Target Selection
```

---

# 3. Systems removed from Combat 2.0

These should be removed as real gameplay mechanics, not merely hidden from UI.

```text
REMOVE

Action Speed
separate Attack Block
separate Spell Block
Spell Suppression
Suppressed Spell Damage Prevented
per-type Maximum Resistance stats
Additional Physical Damage Reduction
Maximum Physical Damage Reduction as a build stat
Elemental Ailment Avoidance
Physical Ailment Avoidance
Ailment Duration Reduction
Non-Damaging Ailment Effect Reduction
Reduced Extra Critical Damage Taken
Exposure
Freeze
Blind
Intimidated
Unnerved
Stances
Interrupts
```

The repository currently contains all or most of these as real `CombatStats`, item stats, perk effects, damage-resolution branches, UI metadata, or content hooks.

Removing them therefore produces meaningful code simplification.

---

# 4. Accuracy and Evasion

## Decision

**KEEP.**

Current Attack hit chance logic is already clear enough:

```text
Accuracy vs Evasion
→ Hit Chance
→ clamped to 5%–100%
```

Keep the existing formula for Combat 2.0 unless later balance testing proves it needs tuning.

Spells continue to bypass the normal Accuracy/Evasion hit check unless a particular future spell explicitly says otherwise.

This keeps a useful identity split:

```text
Attacks
→ Accuracy matters

Spells
→ do not need Accuracy by default
```

No Dodge or Parry layer should be added.

---

# 5. Critical Hits

## Decision

**KEEP, but simplify the stat model.**

Player-facing combat only needs to understand:

```text
Critical Strike Chance
Critical Strike Multiplier
```

The current engine separately carries:

```text
Base Crit Chance
Additional Base Crit Chance
Increased Crit Chance
More Crit Chance
Critical Strike Multiplier
Reduced Extra Critical Damage Taken
```

That is more layering than the current game needs.

## Combat 2.0 direction

A weapon or spell may still author its own base Critical Chance.

After all modifiers are resolved, combat should work from one final:

```text
Critical Strike Chance
```

plus:

```text
Critical Strike Multiplier
```

The generic modifier engine can still apply flat / increased / more style operations internally where useful.

Do **not** keep a separate defensive stat for `Reduced Extra Critical Damage Taken` in the current core game.

---

# 6. Attack Speed and Cast Speed

## Decision

**KEEP both.**

They have distinct purposes:

```text
Attack Speed
→ weapon attacks and weapon-based actions

Cast Speed
→ spell casting
```

## Remove

```text
Action Speed
```

The current Action Speed stat is a shared multiplier over both Attack and Cast timing and is also used by effects such as Chill.

That shared layer is unnecessary.

Generic temporary effects should modify Attack Speed and/or Cast Speed directly.

Do not replace Action Speed with another differently named universal speed stat.

---

# 7. Damage Types

## Decision

Keep exactly:

```text
Physical
Fire
Cold
Lightning
Chaos
```

No additional damage types are needed.

The current five-type foundation is already suitable for long-term itemization, enemies, spells and resistances.

---

# 8. Armour

## Decision

**SIMPLIFY.**

Current Armour mitigation changes depending on the size of the incoming Physical hit.

Combat 2.0 should instead make Armour give a stable Physical Damage Reduction value.

## Recommended formula

Use a simple diminishing formula:

```text
Armour PDR = Armour / (Armour + K)
```

then apply a global cap.

Recommended initial direction:

```text
Maximum Armour PDR = 90% [TUNING]
K = balance constant [TUNING]
```

`K` should be chosen only after the new armour values and item progression are tested.

The earlier values such as:

```text
100 Armour ≈ very low reduction
18,000 Armour ≈ around 90%
```

should be treated as **scale examples**, not two exact mathematical constraints.

## Why this is better

The UI can finally say:

```text
Armour: 4,250
Physical Damage Reduction: 68%
```

and that 68% means the same thing against every normal Physical hit.

## Remove

```text
Additional Physical Damage Reduction
Maximum Physical Damage Reduction as an item/perk stat
```

Armour should be the normal Physical mitigation layer.

The global 90% ceiling can remain a combat rule rather than a build stat.

---

# 9. Universal Block

## Decision

Replace Attack Block + Spell Block with one system:

```text
Block Chance
Block Effect
```

### Block Chance

Chance that an eligible hit is successfully blocked.

### Block Effect

How much damage a successful Block prevents.

Example:

```text
Block Chance: 35%
Block Effect: 45%

A hit passes the Block roll 35% of the time.
When it does, 45% of that hit is prevented.
The remaining 55% continues through normal mitigation.
```

## Progression

Block Effect is **not fixed**.

This is an important build-progression stat.

A weak shield can have lower Block Effect.

A strong shield can have higher Block Effect.

Shield proficiency and future gear/perks can improve it further.

## Recommended caps

```text
Block Chance cap = 75%
Block Effect cap = 75% [TUNING]
```

Do not keep separate:

```text
Max Attack Block Chance
Max Spell Block Chance
```

unless a future system provides a strong reason.

## Eligibility

Universal Block applies to eligible **Hits**:

```text
Attack Hits
Spell Hits
```

It does not block Damage over Time.

An individual action may still be authored as `unblockable` if content needs it.

## Important pipeline change

The current engine returns zero damage immediately when Block succeeds.

Combat 2.0 must instead reduce the hit by Block Effect and continue resolving the remaining damage.

---

# 10. Resistances

## Decision

Keep:

```text
Fire Resistance
Cold Resistance
Lightning Resistance
Chaos Resistance
```

## Global cap

Use:

```text
Maximum Resistance = 75%
```

for all four.

Do not keep player-build stats such as:

```text
Maximum Fire Resistance
Maximum Cold Resistance
Maximum Lightning Resistance
Maximum Chaos Resistance
```

in Combat 2.0.

If raised maximum resistances become useful in late endgame, they can be reintroduced deliberately later.

## Penetration

**KEEP.**

Penetration remains an attack/spell property that reduces the target's effective Resistance for that damage resolution.

## Exposure

**REMOVE.**

There is no need for two separate resistance-bypassing/reducing concepts right now.

---

# 11. Barrier

## Decision

**KEEP.**

Barrier is already a useful, distinct defensive concept:

```text
normal mitigation
↓
Barrier absorbs remaining damage
↓
Health
```

It does not need to become another permanent character stat.

It remains a temporary effect with an absorb pool.

The generic effect runtime already handles this model well.

---

# 12. Health, Stamina and Mana

## Decision

Keep all three.

```text
Health
→ survival

Stamina
→ martial / physical active actions and shared combat abilities

Mana
→ spells and magical actions
```

Keep regeneration for all three.

## Simplify regeneration stats

Player-facing/core stats should be:

```text
Health Regen
Stamina Regen
Mana Regen
```

Do not keep separate permanent combat-stat families such as:

```text
Life Regen Percent
Life Recovery Rate
Mana Regen Percent
Mana Recovery Rate
```

until real content requires them.

Generic stat modifiers can scale the final regeneration values without creating extra player-facing stat families.

---

# 13. Core harmful effects

Combat 2.0 should have a small named core set.

## Bleed

**KEEP.**

Physical Damage over Time.

Stacking can remain because it creates a clear identity.

## Ignite

**KEEP.**

Fire Damage over Time.

One strong refreshable Ignite is a clean initial model.

## Poison

**KEEP / ADD TO ACTUAL CONTENT.**

The current prototype effect catalogue does not currently contain a canonical Poison effect even though Poison is part of the intended Combat 2.0 set.

Recommended identity:

```text
Poison
→ stackable Chaos Damage over Time
```

Exact stack cap and damage are `[TUNING]`.

## Chill

**KEEP, but change implementation.**

Current Chill reduces `Action Speed`.

Action Speed is being removed.

Recommended Combat 2.0 Chill:

```text
Chill
→ reduces Attack Speed
→ reduces Cast Speed
```

It does not need to slow every possible game timer or Enemy Action preparation timer.

That keeps the mechanic understandable.

## Shock

**KEEP.**

Recommended identity remains close to the current implementation:

```text
Shock
→ target takes increased damage from all sources
```

Use one refreshable effect initially rather than creating another deep stacking system.

## Crushed

**KEEP / STANDARDIZE.**

The current prototype has `Armour Broken`.

Combat 2.0 should standardize that role as:

```text
Crushed
→ reduces Armour
```

Recommended initial model:

```text
one refreshable Crushed effect
```

rather than another complex stack system.

## Withered

**KEEP / STANDARDIZE.**

The current prototype has Darkness effects such as `Cursed` and `Shadow Decay`, but no canonical Withered effect.

Recommended Combat 2.0 identity:

```text
Withered
→ target takes increased Chaos damage
```

Recommended initial model:

```text
one refreshable Withered effect
```

rather than PoE-style many-stack Withered.

This preserves a Chaos-specific setup mechanic without recreating Exposure.

---

# 14. Removed status mechanics

Remove from core combat:

```text
Freeze
Blind
Exposure
Intimidated
Unnerved
```

Also remove the current generic ailment-defense stat package:

```text
Elemental Ailment Avoidance
Physical Ailment Avoidance
Ailment Duration Reduction
Non-Damaging Ailment Effect Reduction
```

## Why

The generic effect engine should remain flexible.

But a flexible effect engine does not mean the character sheet needs four separate status-defense stats before enough content exists to justify them.

Skill-specific buffs/debuffs may still exist.

For example:

```text
+Accuracy for 4s
-Evasion for 5s
+Armour for 3s
```

Those are simply ability effects.

They do not need to become global named combat mechanics.

---

# 15. Generic effect engine

## Decision

**KEEP.**

The current generic effect runtime is one of the parts that should **not** be thrown away.

It already supports:

```text
buffs
debuffs
barriers
durations
refreshing
stacking
periodic damage
periodic healing
stat modifiers
damage modifiers
persistence rules
```

Combat 2.0 should simplify the **catalogue and stat surface**, not replace this useful data-driven runtime with hard-coded effect logic.

---

# 16. Stances

## Decision

**REMOVE.**

Current High / Mid / Low stances modify:

```text
Damage
Armour
Accuracy
Attack timing
Evasion
Stamina regeneration/drain
```

They also create:

```text
stance cooldown state
stance-switch effects
stance-specific perk effects
stance-specific damage effects
automation/UI logic
```

This is exactly the sort of cross-cutting complexity the redesign is intended to remove.

Delete the system instead of merely hiding the three stance buttons.

---

# 17. Shared Combat Abilities

## Decision

**USE ONE FIVE-SLOT LOADOUT.**

The active combat ability system is simple:

```text
equip a combat ability
↓
use a weapon skill, defense, or spell
↓
follow the shared action validation rules
```

All slottable combat actions compete for the same five slots. Basic Attack and
consumables remain outside that loadout.

---

# 18. Weapon Skills

## Decision

**KEEP.**

The current reference Sword kit demonstrates a healthy structure:

```text
damage multiplier
accuracy modifier
stamina cost
cooldown
optional buff/debuff
optional cleave
```

This creates weapon identity without requiring another universal combat subsystem.

Weapon Skills should continue using the shared action framework.

---

# 19. Combat Abilities

## Decision

**KEEP.**

Defensive/martial abilities remain useful.

However abilities tied to removed stats must be remapped.

Examples:

```text
Guard
OLD: Attack Block Chance
NEW: Block Chance and/or Block Effect

Brace
OLD: Armour + Ailment Duration Reduction
NEW: Armour-focused defensive buff
```

Do not preserve a removed stat merely because one current prototype ability uses it.

---

# 20. Spells

## Decision

**KEEP.**

The current spell model is suitable:

```text
damage type
mana cost
cooldown
cast time
target
optional effect
```

## Disrupting Pulse

The current Air spell exists mainly to interrupt an Enemy Action.

Interrupts are being removed.

Do not keep a dead interrupt-only spell.

Recommended replacement direction:

```text
Air / Lightning spell
→ Lightning damage
→ applies Shock
```

The exact name and balance can be changed later.

The important point is that Air/Lightning retains a normal offensive reference spell.

---

# 21. Interrupts

## Decision

**REMOVE completely.**

This is a larger cleanup than one spell.

The repository currently has interrupt logic in:

```text
Enemy Action definitions
Spell definitions
action validation
combat resolution
combat events
proficiency XP
perk effect types
Air Magic perk branches
automation/UI
```

Combat 2.0 should delete those paths rather than leave dormant interrupt machinery.

Enemy Actions remain telegraphed actions, but the player is not expected to stop them through a universal Interrupt mechanic.

Defense comes from:

```text
build
target choice
Block
Evasion
Armour
Resistances
Barrier
abilities
healing/consumables
```

---

# 22. Cooldowns and Global Cooldown

## Decision

**KEEP.**

Individual action cooldowns remain.

Also keep one simple shared Global Cooldown for active player actions.

Current prototype value:

```text
0.75s [TUNING]
```

Do not create:

```text
Global Cooldown Reduction
multiple GCD categories
GCD-specific item stats
```

unless future gameplay proves they are needed.

---

# 23. Consumables

## Decision

**KEEP.**

Current Healing Potion is only a prototype.

Long-term direction can later move toward a richer PoE1-inspired flask/elixir system.

That future redesign should be separate from Combat Systems 2.0.

For this pass, keep the existing combat-consumable action contract working and do not expand it.

---

# 24. Enemy normal attacks

## Decision

**KEEP.**

Normal attacks provide a predictable baseline timer for every enemy.

They work well with:

```text
Accuracy
Evasion
Block
Armour
Attack Speed
```

No major conceptual change is needed.

---

# 25. Enemy Traits

## Decision

**KEEP the concept, do not overhaul it now.**

The current enemy data contains Trait definitions, but the system is not yet a mature universal trait framework.

Do not make Combat 2.0 depend on a new huge trait rewrite.

Later there should be a separate:

```text
Enemy Trait System overhaul
```

with one central reusable catalogue.

For now the principle remains:

```text
normal enemy
→ at least one clear identity Trait
```

---

# 26. Enemy Actions

Rename the player-facing concept from:

```text
Special Attacks
```

to:

```text
Enemy Actions
```

## Keep

The action model may still support:

```text
preparation time
cooldown
danger level
damage
effects
healing
conditions
target selection
```

An individual enemy does not need to use all of these.

## Remove

```text
interruptible
interrupted state
interrupt cooldown manipulation
interrupt rewards
```

Normal enemies should usually remain simple:

```text
Normal Attack
+ Trait
+ roughly one clear Enemy Action
```

More complex encounters can add more actions later.

---

# 27. Enemy defenses

Current enemies can have both:

```text
Armour
+
Additional Physical Damage Reduction
```

This creates hidden double Physical defense.

Combat 2.0 should remove enemy `Additional Physical Damage Reduction`.

If an enemy is meant to be physically tough:

```text
give it more Armour
```

If it uses a shield:

```text
give it Block Chance + Block Effect
```

This makes enemy defenses use the same language as player defenses.

---

# 28. Enemy groups and targeting

## Decision

**KEEP.**

Current randomized groups can remain while core combat is stabilized.

A future encounter pass can replace part of the randomness with structured wave sequences such as:

```text
Wave 1
→ Wave 2
→ Wave 3
→ stronger Wave 4
→ cycle / reset
```

Do not bundle that encounter redesign into Combat Systems 2.0.

Target selection also remains.

---

# 29. Proficiencies

## Decision

**KEEP.**

Keep:

```text
Weapon Proficiencies
Magic Proficiencies
Light Armor
Medium Armor
Heavy Armor
Shield
Perk Trees
```

Hunter Rank is the global career progression layer; its broader reward structure remains future work.

---

# 30. Proficiency perk cleanup

The perk framework itself should remain.

The current perk effect union, however, contains a large number of special-case mechanics tied to systems that are now being removed.

Combat 2.0 should delete perk-effect families related to:

```text
Stance switching
Stance-specific bonuses
Interrupt success
Interrupt cooldowns
Interrupted Enemy Action delays
Interrupt mana/stamina refunds
Interrupt barriers
```

## Defensive perk trees

Do **not** rebuild the entire 40-node-per-tree progression design during this pass.

Preserve the current tree topology where practical.

Remap obsolete stats according to these rules:

```text
Attack Block / Spell Block
→ Block Chance or Block Effect

Additional Physical Damage Reduction
→ Armour

Ailment Avoidance / Duration / Effect Reduction
→ Armour, Life, Regen or Resistance depending on branch identity

Spell Suppression
→ Resistance, Barrier or Block where appropriate
```

A dedicated proficiency-content overhaul can happen later.

---

# 31. Item stat cleanup

The current `ItemStats` type exposes several stats that Combat 2.0 no longer needs.

Final item combat stats should focus on meaningful build choices.

## Keep / allow

```text
Max Life
Life Regen
Accuracy
Evasion
Armour
Block Chance
Block Effect
Attack Speed
Cast Speed
Critical Chance
Critical Multiplier
Weapon Damage
Weapon Base Attack Time
Max Stamina
Stamina Regen
Max Mana
Mana Regen
Fire Resistance
Cold Resistance
Lightning Resistance
Chaos Resistance
```

## Remove from item stat surface

```text
Attack Block Chance
Spell Block Chance
Max Attack Block
Max Spell Block
Spell Suppression
Additional Physical Damage Reduction
Action Speed
per-type Maximum Resistance
Ailment Avoidance
Ailment Duration Reduction
Non-Damaging Ailment Effect Reduction
Reduced Extra Critical Damage Taken
```

Current Affix data is already relatively conservative, so this cleanup mainly affects the generic stat model and prototype gear/perks rather than requiring a full affix-system redesign.

---

# 32. Combat 2.0 damage pipeline

Use one easy-to-explain pipeline.

## Attack Hit

```text
Attack starts
↓
Accuracy vs Evasion
↓
Miss OR Hit
↓
Damage roll
↓
Critical roll
↓
Block roll
↓
successful Block reduces damage by Block Effect
↓
Physical → Armour
Elemental/Chaos → matching Resistance
↓
Barrier absorbs remaining damage
↓
Health
↓
on-hit effect / ailment application
```

## Spell Hit

```text
Spell resolves
↓
no normal Accuracy/Evasion roll
↓
Damage roll
↓
Critical roll if eligible
↓
Block roll if blockable
↓
successful Block reduces damage by Block Effect
↓
matching Resistance
↓
Barrier
↓
Health
↓
effect / ailment application
```

## Damage over Time

```text
DoT tick
↓
no Accuracy
no Evasion
no Block
↓
relevant Armour/Resistance rule
↓
Barrier only if the effect explicitly allows it [implementation rule to keep consistent]
↓
Health
```

For current Combat 2.0, Physical DoT such as Bleed should continue bypassing Armour.

Fire/Cold/Lightning/Chaos DoT should use the matching Resistance.

---

# 33. Final core character stat surface

The player should not need a huge character sheet to understand combat.

Recommended core stat groups:

## Offense

```text
Weapon Damage
Accuracy
Attack Speed
Cast Speed
Critical Strike Chance
Critical Strike Multiplier
```

## Defense

```text
Armour
Physical Damage Reduction (derived from Armour)
Evasion
Block Chance
Block Effect
Barrier (current runtime amount when active)
```

## Resistances

```text
Fire Resistance
Cold Resistance
Lightning Resistance
Chaos Resistance
```

## Resources

```text
Maximum Health
Health Regen
Maximum Stamina
Stamina Regen
Maximum Mana
Mana Regen
```

Derived values such as:

```text
Attack Interval
Attacks per Second
Cast Time
Hit Chance against current target
```

can still be shown where useful.

They do not need to become independent itemization stats.

---

# 34. Major repository architecture finding

Combat rules are no longer located in one tiny prototype file.

The biggest concern is:

```text
src/game/combat/combatEngine.ts
≈ 89 KB
```

It currently orchestrates many responsibilities including:

```text
combat lifecycle
player attacks
spells
weapon skills
enemy actions
effects
resources
progression hooks
automation hooks
rewards
stance logic
interrupt logic
```

Combat 2.0 should use the simplification pass as an opportunity to split this orchestration.

## Recommended future structure

Conceptually:

```text
combat/
├─ resolution/
│  ├─ hit
│  ├─ critical
│  ├─ block
│  └─ mitigation
│
├─ actions/
│  ├─ playerActions
│  ├─ weaponSkills
│  ├─ spells
│  └─ enemyActions
│
├─ effects/
│  ├─ effectRuntime
│  └─ barriers
│
├─ progression/
│  └─ combatProgressionHooks
│
└─ combatEngine
   └─ orchestration only
```

Exact filenames are an implementation decision.

The important rule is:

> `combatEngine.ts` should become an orchestrator, not the home of every combat feature.

This will matter heavily when Offline Combat is built.

---

# 35. What should NOT be redesigned in this pass

Do not allow Combat 2.0 to turn into another endless rewrite.

Keep these for later:

```text
Enemy Trait full overhaul
structured wave/encounter overhaul
Hunter Rank reward structure
complete Proficiency perk-tree redesign
flask/elixir overhaul
item progression/crafting redesign
new monster content
full balance pass
Offline Combat
```

Combat 2.0 should first give these future systems a clean combat foundation.

---

# 36. Three recommendations to confirm

Most of the design is already determined by the decisions made before this audit.

Only these recommendations are worth explicitly checking before the Codex implementation document is written.

## A. Status-defense stats

**Recommendation: REMOVE all four for now.**

```text
Elemental Ailment Avoidance
Physical Ailment Avoidance
Ailment Duration Reduction
Non-Damaging Ailment Effect Reduction
```

Reason: too much defensive sub-layer complexity for the current amount of status content.

---

## B. Chill

**Recommendation:**

```text
Chill reduces Attack Speed + Cast Speed.
```

Do not recreate Action Speed under another name.

---

## C. Withered

**Recommendation:**

```text
Withered causes the target to take increased Chaos damage.
One refreshable effect initially.
```

Do not use a large PoE-style stack count yet.

---

# 37. Armour and Block tuning is NOT a blocker

We do not need exact balance numbers before the code model is cleaned.

Lock architecture now:

```text
Armour
→ stable diminishing PDR
→ global 90% ceiling [TUNING]

Block Chance
→ global 75% ceiling

Block Effect
→ progression stat
→ global ~75% ceiling [TUNING]
```

Then tune actual values with real equipment/enemy progression.

Do not bake temporary prototype numbers deep into system architecture.

---

# 38. Recommended next workflow

```text
THIS AUDIT
    ↓
confirm A / B / C above
    ↓
Combat Systems 2.0 Locked Design
    ↓
full Codex implementation MD
    ↓
Combat 2.0 refactor
    ↓
GitHub implementation audit
    ↓
Offline Activity Simulation Contract
    ↓
Offline Combat Simulation
```

No Offline Combat implementation should begin before this combat model is stable.

---

# 39. Final proposed Combat 2.0 summary

```text
KEEP
Accuracy
Evasion
Crit
Attack Speed
Cast Speed
Physical / Fire / Cold / Lightning / Chaos
Armour
Universal Block
Fire / Cold / Lightning / Chaos Resistances
Penetration
Barrier
Health / Stamina / Mana
Regeneration
Bleed / Ignite / Poison / Chill / Shock / Crushed / Withered
Shared Combat Abilities
Weapon Skills
Combat Abilities
Spells
Cooldowns
Global Cooldown
Consumables
Enemy Normal Attacks
Enemy Traits
Enemy Actions
Group Combat
Target Selection
Hunter Rank foundation
Proficiencies
Perk Trees

SIMPLIFY / MERGE
Armour formula
Crit stat layering
resource regen stat layering
Attack Block + Spell Block → Block Chance
successful full Block → partial Block via Block Effect
Armour Broken → Crushed
Darkness setup debuff → Withered
Chill → Attack/Cast Speed reduction

REMOVE
Action Speed
Spell Suppression
separate Attack/Spell Block
Block max-stat variants
per-type max Resistance stats
Additional Physical Damage Reduction
status avoidance/reduction stat package
Reduced Extra Critical Damage Taken
Exposure
Freeze
Blind
Intimidated
Unnerved
Stances
Interrupts
all stance/interrupt-specific perk machinery
```

This is the recommended foundation to implement before Offline Activity Simulation.
