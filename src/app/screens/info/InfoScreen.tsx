
import {
  BookOpen,
  CircleHelp,
  Compass,
  Crosshair,
  Info,
  Map,
  Shield,
  Sparkles,
  Swords,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  combatReferenceGroups,
  combatStatReferences,
  damageTypeReferences,
} from "../../../game/data/combatGlossary";
import { effectDefinitions } from "../../../game/data/effects";
import { proficiencyDefinitions } from "../../../game/data/proficiencies";
import { proficiencyPerkDefinitions } from "../../../game/data/proficiencyPerks";
import { magicArtDefinitions } from "../../../game/data/magicArts";
import { weaponSkillDefinitions } from "../../../game/data/weaponSkills";
import { CollapsiblePanel } from "../../components/CollapsiblePanel";
import { Panel } from "../../components/Panel";
import { ScreenHeading } from "../../shell/ScreenHeading";

export function InfoScreen() {
  return (
    <div className="screen info-screen" data-debug-screen="info">
      <ScreenHeading screen="info" />
      <div className="info-layout">
        <Panel
          title="Defensive Proficiency Training"
          subtitle="Armour and Shield improve from resolved enemy attacks"
          icon={Shield}
          panelId="infoDefensiveTraining"
          screen="info"
          className="info-guide"
        >
          <div className="skill-reference-grid">
            <div className="skill-reference-card">
              <strong>Armour XP</strong>
              <p>
                Each resolved enemy direct attack awards 0.25 XP for every
                equipped matching armour piece. Miss, Evasion, Block, and
                Hit all count; action resolutions, damage-over-time ticks, and
                passive time do not.
              </p>
              <small>
                4 matching pieces = 1.00 XP/event · mixed armor splits exactly
                by piece
              </small>
            </div>
            <div className="skill-reference-card">
              <strong>Shield XP</strong>
              <p>
                An actual Shield in the Offhand trains Shield at the full 1.00
                XP/event rate. A successful Block is not required, and Shield XP
                is added alongside Armour XP.
              </p>
              <small>
                Health Regen restores HP during active combat only and grants no
                Proficiency XP.
              </small>
            </div>
          </div>
        </Panel>
        <Panel
          title="About CombatBound Idle"
          subtitle="The first playable gameplay vertical slice"
          icon={Info}
          panelId="infoAbout"
          screen="info"
          className="info-about"
        >
          <div className="info-hero">
            <div className="info-mark">CB</div>
            <div>
              <h3>CombatBound Idle</h3>
              <p>A tactical semi-idle combat RPG prototype.</p>
            </div>
          </div>
          <p>
            Choose an enemy territory rather than a single monster. A Combat
            Location owns a population and continuously generates randomized
            groups while the Hunt is active.
          </p>
          <div className="info-tags">
            <span>LOCATION HUNTING</span>
            <span>MULTI-ENEMY COMBAT</span>
            <span>REAL PROGRESSION</span>
          </div>
        </Panel>
        <Panel
          title="Combat Basics"
          subtitle="What happens during a Hunt"
          icon={Swords}
          panelId="infoBasics"
          screen="info"
          className="info-guide"
        >
          <GuideRow
            icon={Swords}
            title="Continuous combat"
            copy="Combat advances continuously in real time. Normal attacks happen automatically using Attack Interval."
          />
          <GuideRow
            icon={Crosshair}
            title="One selected target"
            copy="The Hunter attacks one selected enemy at a time. Every living enemy keeps independent HP, timers, actions, effects, and rewards."
          />
          <GuideRow
            icon={Shield}
            title="Player decisions"
            copy="Equipment, weapon Proficiency, Combat Abilities, magic, Healing Potion, and target selection shape the fight."
          />
        </Panel>
        <Panel
          title="Combat Abilities"
          subtitle="Prepare non-magic actions in Hero"
          icon={Zap}
          panelId="infoCombatAbilities"
          screen="info"
          className="info-guide"
        >
          <GuideRow icon={Zap} title="Five-slot Combat Ability Loadout" copy="Magic Arts, weapon skills, and active defenses share five Hero slots. Only equipped abilities appear in Combat." />
          <GuideRow icon={Swords} title="Equipment requirements" copy="Known abilities remain visible even when unavailable. Hero shows whether the current equipment satisfies each requirement." />
        </Panel>
        <Panel
          title="Combat Resolution"
          subtitle="The current defensive order"
          icon={Crosshair}
          panelId="infoResolution"
          screen="info"
          className="info-resolution"
        >
          <div className="resolution-flow">
            {[
              "Accuracy vs Evasion",
              "Damage Roll",
              "Critical Strike",
              "Block",
              "Armour",
              "Resistance",
              "Incoming Effect Modifiers",
              "Barrier",
              "Health",
            ].map((step, index) => (
              <div className="resolution-step" key={step}>
                <strong>{step}</strong>
                {index < 8 && <span>â†“</span>}
              </div>
            ))}
          </div>
          <p className="info-callout">
            A failed Accuracy check Evades before Block, Armour, or Resistance.
            Spells bypass Accuracy; incoming effect modifiers and Barriers apply afterward.
          </p>
        </Panel>
        <Panel
          title="Weapon Skills"
          subtitle="Stamina abilities tied to weapon proficiency"
          icon={Swords}
          panelId="infoWeaponSkills"
          screen="info"
          className="info-guide"
        >
          <GuideRow icon={Swords} title="One-Handed Sword identity" copy="Accuracy, tempo, reliable damage, fluid positioning, and controlled cleave. These prototype skills do not add new Bleed or DoT mechanics." />
          <GuideRow icon={Zap} title="How they work" copy="Equip Weapon Skills in Hero → Combat Abilities. They use Stamina, the matching weapon proficiency, standard cooldowns, and the canonical Accuracy / Crit / damage pipeline." />
          <div className="skill-reference-grid">
            {weaponSkillDefinitions.map((skill) => <div className="skill-reference-card" key={skill.id} data-debug-kind="info-weapon-skill" data-debug-action-id={skill.id} data-debug-proficiency-id={skill.proficiencyId}><strong>{skill.name}</strong><p>{skill.description}</p><small>{Math.round(skill.damageMultiplier * 100)}% damage · +{skill.accuracyModifier} Accuracy · {skill.staminaCost} Stamina · planned Lv {skill.unlock.level}</small></div>)}
          </div>
        </Panel>
        <Panel
          title="Combat Stats Reference"
          subtitle="Definitions shared with Equipment and tooltips"
          icon={Zap}
          panelId="infoStats"
          screen="info"
          className="info-reference-panel"
        >
          <div className="info-stat-reference">
            {combatReferenceGroups.map((group) => (
              <CollapsiblePanel
                key={group.id}
                title={group.label}
                panelId={`info-stats-${group.id}`}
                screen="info"
                defaultOpen={group.id === "offense"}
              >
                <div className="info-reference-list">
                  {combatStatReferences
                    .filter((reference) => reference.category === group.id)
                    .map((reference) => (
                      <div
                        className="info-reference-row"
                        key={reference.id}
                        data-debug-kind="info-stat-reference"
                        data-debug-stat-key={reference.id}
                      >
                        <div>
                          <strong>{reference.label}</strong>
                          <p>{reference.shortDescription}</p>
                        </div>
                        {reference.formula && (
                          <small>{reference.formula}</small>
                        )}
                      </div>
                    ))}
                </div>
              </CollapsiblePanel>
            ))}
          </div>
        </Panel>
        <Panel
          title="Damage Types & Resistances"
          subtitle="Typed mitigation and resistances"
          icon={Sparkles}
          panelId="infoDamageTypes"
          screen="info"
          className="info-guide"
        >
          <div className="damage-type-grid">
            {damageTypeReferences.map((type) => (
              <div className="damage-type-card" key={type.id}>
                <strong>{type.label}</strong>
                <p>{type.description}</p>
              </div>
            ))}
          </div>
          <p className="info-callout">
            Positive Resistance reduces that damage type. Negative Resistance is
            a Weakness and increases damage taken. Physical damage is reduced by
            Armour; elemental and Chaos damage use matching Resistances.
          </p>
        </Panel>
        <Panel
          title="Statuses & Effects"
          subtitle="Current effect definitions"
          icon={Shield}
          panelId="infoEffects"
          screen="info"
          className="info-guide"
        >
          <div className="effect-reference-list">
            {effectDefinitions.map((effect) => (
              <div
                className={`effect-reference-row effect-${effect.kind}`}
                key={effect.id}
                data-debug-kind="info-effect-reference"
                data-debug-effect-id={effect.id}
              >
                <div>
                  <strong>{effect.name}</strong>
                  <span>
                    {effect.kind.toUpperCase()} · {effect.tags.join(" · ")}
                  </span>
                </div>
                <p>{effect.description}</p>
                <small>
                  {effect.durationSeconds === null
                    ? "No fixed duration"
                    : `${effect.durationSeconds.toFixed(1)}s duration`}{" "}
                  · {effect.stacking.mode.replace("-", " ")}
                </small>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Combat Proficiencies"
          subtitle="Use equipped weapons and authored Magic Arts to improve their tracks"
          icon={BookOpen}
          panelId="infoProficiencies"
          screen="info"
          className="info-guide"
        >
          <div className="skill-reference-grid">
            {proficiencyDefinitions.map((proficiency) => (
              <div
                className="skill-reference-card"
                key={proficiency.id}
                data-debug-kind="info-proficiency-reference"
                data-debug-proficiency-id={proficiency.id}
              >
                <strong>{proficiency.name}</strong>
                <p>{proficiency.description}</p>
                <small>
                  {proficiency.category.toUpperCase()} · Maximum Level{" "}
                  {proficiency.maxLevel} · {proficiency.perkIds.length} Perks
                </small>
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          title="Hunter Rank & Perks"
          subtitle="Career rank gates and independent perk progression"
          icon={Sparkles}
          panelId="infoHunterRank"
          screen="info"
          className="info-guide"
        >
          <div className="skill-reference-grid">
            <div className="skill-reference-card">
              <strong>Hunter Rank</strong>
              <p>
                Hunter Rank is a separate career progression from Proficiency XP.
                It is used for world and equipment requirements and is not granted
                by combat or Proficiency XP.
              </p>
              <small>Ranks 1–30 · points are awarded by the Profession system</small>
            </div>
            <div className="skill-reference-card">
              <strong>Proficiency XP</strong>
              <p>
                Each weapon, magic, and defensive path tracks its own XP and
                level. Its harder decade-scaled curve rewards focused training
                without changing Hunter Rank.
              </p>
              <small>Each Proficiency has an independent level cap</small>
            </div>
            <div className="skill-reference-card">
              <strong>Perk Points</strong>
              <p>
                Perk Points are independent spendable points for authored
                Proficiency trees. Combat and Proficiency XP do not grant them;
                bonus points are tracked separately.
              </p>
              <small>{proficiencyPerkDefinitions.length} authored perks</small>
            </div>
          </div>
        </Panel>
        <CollapsiblePanel
          title="Magic Arts"
          subtitle="Current authored Magic choices"
          icon={Sparkles}
          panelId="infoActions"
          screen="info"
          defaultOpen={false}
          className="info-actions-panel"
        >
          <div className="info-action-columns">
            <div>
                <h3>Magic Arts</h3>
              {magicArtDefinitions.map((art) => (
                <GuideRow
                  key={art.id}
                  title={art.name}
                  copy={`${art.description} Costs ${art.manaCost} Mana; ${art.cooldownSeconds}s cooldown; ${art.durationSeconds}s duration; ${art.barrier?.absorbAmount ?? 0} absorb. Proficiency: Magic Arts.`}
                />
              ))}
            </div>
          </div>
        </CollapsiblePanel>
        <Panel
          title="Action Engine"
          subtitle="Unified actions and automation"
          icon={Zap}
          panelId="infoCombatSystemsV7"
          screen="info"
          className="info-guide"
        >
          <div className="skill-reference-grid">
            <div className="skill-reference-card">
              <strong>Unified actions</strong>
              <p>
                Magic Arts, Active Defense and consumables share validation,
                cooldowns and a 0.75s standard Global Cooldown. Basic weapon
                attacks remain background actions and are never blocked by GCD.
              </p>
            </div>
            <div className="skill-reference-card">
              <strong>Automation</strong>
              <p>
                Rules are evaluated by ascending priority. The first valid
                action is used once per opportunity; invalid reasons are kept
                for inspection and manual target selection is preserved unless
                target override is enabled.
              </p>
            </div>
          </div>
          <div className="info-effect-list">
            <GuideRow
              icon={Sparkles}
              title="Effects remain independent"
              copy="Magic Arts can apply authored effects and barriers. Specialization effects are intentionally not authored in this phase."
            />
          </div>
        </Panel>
        <Panel
          title="World navigation"
          subtitle="The Combat Browser hierarchy"
          icon={Map}
          panelId="infoWorld"
          screen="info"
          className="info-guide"
        >
          <GuideRow
            icon={Compass}
            title="Choose a territory"
            copy="Browse Continent → Region → Area → Combat Location. Parent selections filter the next layer and cascade safely."
          />
          <GuideRow
            icon={Map}
            title="Locations own populations"
            copy="A location shows possible enemy types and group-size range. That list is informational; it is not an individual monster picker."
          />
          <GuideRow
            icon={Swords}
            title="Start a Hunt"
            copy="Starting a location generates a weighted random group. After recovery, another group is generated automatically until you stop, die, or the Hunter is defeated."
          />
        </Panel>
        <Panel
          title="UI Inspector"
          subtitle="Development-only interface aid"
          icon={CircleHelp}
          panelId="infoInspector"
          screen="info"
          className="info-inspector"
        >
          <p>
            The UI Inspector identifies semantic interface targets for design
            and development without changing authored layout.
          </p>
          <ol>
            <li>
              Click <strong>Inspect UI</strong> in the top status bar.
            </li>
            <li>
              Hover to see a yellow target highlight and pixel dimensions.
            </li>
            <li>
              Check the source file and line for the inspected JSX element.
            </li>
            <li>Left-click to copy a CombatBound UI reference instantly.</li>
            <li>
              Press <kbd>Escape</kbd> or close the card to exit.
            </li>
          </ol>
        </Panel>
        <Panel
          title="Current MVP limitations"
          subtitle="Deliberately deferred"
          icon={BookOpen}
          panelId="infoPrototype"
          screen="info"
          className="info-status"
        >
          <div className="status-checks">
            <span>âœ“ No offline combat simulation</span>
            <span>âœ“ No crafting or gathering systems</span>
            <span>âœ“ No movement, companions, or bosses</span>
            <span>âœ“ Placeholder art and temporary balance</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function GuideRow({
  icon: Icon,
  title,
  copy,
}: {
  icon?: LucideIcon;
  title: string;
  copy: string;
}) {
  return (
    <div className="guide-row">
      <span className="guide-icon">
        {Icon ? <Icon size={15} /> : <span>â€¢</span>}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </div>
  );
}
