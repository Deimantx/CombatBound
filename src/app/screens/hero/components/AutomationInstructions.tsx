import { ArrowLeft, BookOpen } from "lucide-react";

export function AutomationInstructions({ onBack }: { onBack: () => void }) {
  return (
    <div className="automation-instructions-view" data-debug-kind="automation-instructions">
      <div className="automation-instructions-toolbar">
        <div>
          <span className="tiny-label">COMBAT AUTOMATION</span>
          <h3>Automation Instructions</h3>
          <p>Learn how to build reliable combat behavior for your Hunter.</p>
        </div>
        <button className="button button-ghost" onClick={onBack} data-debug-kind="automation-instructions-back">
          <ArrowLeft size={14} /> BACK TO RULES
        </button>
      </div>
      <article className="automation-instructions combatbound-scroll">
        <nav className="automation-instructions-toc" aria-label="Automation instructions contents">
          <span className="tiny-label">ON THIS PAGE</span>
          <a href="#quick-start">Quick Start</a>
          <a href="#automation-presets">Automation Presets</a>
          <a href="#rules">Rules</a>
          <a href="#priority">Priority</a>
          <a href="#conditions">Conditions</a>
          <a href="#targeting">Targeting</a>
          <a href="#resources">Resources</a>
          <a href="#choosing-an-action">Choosing an Action</a>
          <a href="#weapon-skills">Weapon Skills</a>
          <a href="#examples">Examples</a>
          <a href="#mistakes">Common Mistakes</a>
          <a href="#glossary">Glossary</a>
        </nav>

        <section id="quick-start" data-debug-help-section="quick-start">
          <div className="automation-help-heading"><BookOpen size={17} /><h4>Quick Start</h4></div>
          <p>Combat Automation tells your Hunter which active action to try without requiring you to click it manually.</p>
          <p>Each Rule means: <strong>when these conditions are true, try to use this Action.</strong> Rules are checked from the smallest Priority number to the largest.</p>
          <div className="instruction-example"><strong>Priority 10 · Earthen Ward</strong><span>IF Player Life is below 60% AND Barrier is missing</span><small>When both requirements are true, the Hunter tries to create a Barrier.</small></div>
          <div className="instruction-callout tip"><strong>TIP</strong><span>Start with one survival Rule, test it in Combat, then add offensive Rules below it.</span></div>
        </section>

        <section id="automation-presets" data-debug-help-section="automation-presets">
          <h4>Automation Presets</h4>
          <p>Automation Presets save the current Rules, their priorities and enabled states, Conditions, Target Priority order and enabled states, and Auto Target Override. There are ten persistent slots, and each slot stores an independent snapshot.</p>
          <p>Use <strong>SAVE CURRENT</strong> for an empty slot, <strong>OVERWRITE</strong> to replace an existing slot, <strong>RENAME</strong> to give it a clear name, and <strong>LOAD</strong> to apply it. Loading keeps the Master Automation switch, equipment, the unified combat ability loadout, inventory, stats, resources, cooldowns, and live combat target unchanged.</p>
          <div className="instruction-callout important"><strong>IMPORTANT</strong><span>Presets are configuration snapshots, not live links. Missing or unequipped actions remain saved in the preset and are shown as unavailable until the required loadout or equipment is restored.</span></div>
          <p>Presets can be saved, overwritten, renamed, or loaded while a Hunt is active. Loading changes future automation decisions without resetting combat runtime or action cooldowns.</p>
        </section>

        <section id="what-automation-does" data-debug-help-section="what-automation-does">
          <h4>What Automation Does</h4>
          <p>Every combat tick, the system looks for the first enabled Rule whose conditions match and whose Action is currently valid. It does not force an action through a cooldown, missing resource, missing target, or equipment requirement.</p>
          <p>Automation only acts during an active Hunt. It uses the same action validation as the buttons in Combat, so the preview and the live action agree.</p>
        </section>

        <section id="rules" data-debug-help-section="rules">
          <h4>Rules</h4>
          <p>A Rule contains an Action, a Priority, an enabled/disabled state, and one or more Conditions. The conditions on one Rule use <strong>AND</strong> logic: every condition must be true before that Rule can run.</p>
          <p>You can create multiple Rules for the same Spell. This is useful when the same Spell should be used in different situations, with different priorities or thresholds.</p>
        </section>

        <section id="priority" data-debug-help-section="priority">
          <h4>Priority</h4>
          <p>Rule Priority controls the order in which actions are attempted. Lower numbers run first: Priority 10 is checked before Priority 20.</p>
          <div className="instruction-callout important"><strong>IMPORTANT</strong><span>Rule Priority and Target Priority are different. Rule Priority chooses which action to try. Target Priority chooses which enemy to target when Auto Target Override is enabled.</span></div>
        </section>

        <section id="conditions" data-debug-help-section="conditions">
          <h4>Conditions</h4>
          <p>Conditions describe the situation in which a Rule is allowed to run. The current editor supports:</p>
          <ul>
            <li>Player HP, Mana, or Stamina below/above a percentage.</li>
            <li>Target HP below/above a percentage.</li>
            <li>Player or Target has/misses a specific Effect.</li>
            <li>Barrier missing or Barrier below a percentage of Max HP.</li>
            <li>Target casting or Target danger at least a level.</li>
            <li>A minimum number of living enemies.</li>
          </ul>
          <p>Percentages are thresholds, not resource costs. For example, Mana above 40% means the Rule waits until your current Mana is more than 40% of Max Mana.</p>
        </section>

        <section id="when-rule-executes" data-debug-help-section="when-rule-executes">
          <h4>When a Rule Executes</h4>
          <p>A Rule executes only when its Conditions match and its Action passes normal validation. The action must also be available to the current Combat state.</p>
          <div className="instruction-example"><strong>PRIORITY 10 · Lightning Pulse</strong><span>Target casting AND Target danger at least High</span><small>The pulse is attempted while the selected target is performing a dangerous cast.</small></div>
        </section>

        <section id="skipped" data-debug-help-section="skipped">
          <h4>Why a Rule Can Be Skipped</h4>
          <p>A Rule can be skipped because a condition is false, the Master Automation switch is disabled, Combat is not active, or its Action is invalid right now.</p>
          <p>Common invalid reasons include: the Magic Art is not equipped in the five-slot loadout, Mana or Stamina is too low, the Action is on cooldown, the Global Cooldown is active, there is no valid target, a potion is unavailable, or required equipment is missing.</p>
          <p>When a higher-priority Rule is invalid, Automation continues checking lower-priority Rules. When a higher-priority Rule is valid and available, it gets the first attempt.</p>
        </section>

        <section id="targeting" data-debug-help-section="targeting">
          <h4>Target Priority</h4>
          <p>Target Priority is a ranked list of enemy-selection preferences. You can enable or disable preferences and move them up or down.</p>
          <p>Available preferences include casting enemies, highest danger casting, elite enemies, lowest health percentage, lowest health, lowest evasion, and first living enemy.</p>
          <h4 className="subheading">Auto Target Override</h4>
          <p>With Auto Target Override off, Automation uses your manually selected living enemy. With it on, the enabled Target Priority list may select a better enemy for the next automated action.</p>
          <div className="instruction-callout why"><strong>WHY?</strong><span>Rule Priority answers “what should I do?” Target Priority answers “who should receive it?”</span></div>
        </section>

        <section id="magic-arts" data-debug-help-section="magic-arts">
          <h4>Magic Arts and the Five-Slot Loadout</h4>
          <p>Knowing a Magic Art is not enough for Automation to cast it. A Magic Art Rule is active only when that Art is in one of the five Combat loadout slots. The loadout determines what is available during Combat.</p>
          <p>Loadout editing is locked during active and recovery Combat. You can still inspect authored Magic Arts and edit Automation while a Hunt continues.</p>
        </section>

        <section id="weapon-skills" data-debug-help-section="weapon-skills">
          <h4>Weapon Skills</h4>
          <p>Weapon Skills are Stamina-based active abilities tied to the currently equipped weapon proficiency. Equip them in Hero → Combat Abilities before Automation can use them.</p>
          <p>In the Action picker, expand <strong>WEAPON SKILLS</strong> and then the relevant Weapon Proficiency. The prototype One-Handed Sword group contains Swift Cut, Precision Thrust, Flowing Step, Sweeping Cut, and Opening Feint.</p>
          <p>Changing to another weapon preserves the rules and slots, but Sword skills become inactive until a One-Handed Sword is equipped again.</p>
        </section>

        <section id="choosing-an-action" data-debug-help-section="choosing-an-action">
          <h4>Choosing an Action</h4>
          <p>Actions are organized by type. Magic Arts share one Magic Arts group, Weapon Skills group by Weapon Proficiency, and defensive or consumable actions keep their root categories.</p>
          <p>Expand a category to browse it, or use <strong>Search actions...</strong> to find a name, effect, resource, tag, Magic Art, or weapon directly. A known action may still show <strong>NOT EQUIPPED</strong>; you can create the Rule now, but it will not execute until the action is equipped and otherwise usable.</p>
        </section>

        <section id="resources" data-debug-help-section="resources">
          <h4>Global Cooldown</h4>
          <p>Many active actions share a short Global Cooldown. After one such action is used, another standard action must wait until that shared delay ends. An Action can also have its own longer cooldown.</p>
          <p>Automation checks both delays through the same validation used by manual Combat buttons. It will continue to lower-priority Rules when the preferred Action is not ready.</p>
          <h4 className="subheading">Mana and Stamina</h4>
          <p>Magic uses Mana. Weapon Skills, Guard, Evasive Step, and Brace use Stamina. Use Mana above or Stamina above conditions to reserve resources for emergencies, and use low-resource Rules to decide when a defensive action should take priority.</p>
        </section>

        <section id="effects" data-debug-help-section="effects">
          <h4>Effects and Status Conditions</h4>
          <p>Effects are temporary statuses, buffs, debuffs, or Barriers. A condition such as Target missing Ignite lets you maintain a status only when it is absent. Player has Effect and Barrier missing are useful for defensive maintenance.</p>
          <p>Effects are checked by their current Effect ID or supported tags. Automation does not invent a status that is not in the effect picker.</p>
        </section>

        <section id="status-actions" data-debug-help-section="status-actions">
          <h4>Status Actions</h4>
          <p>Use effect conditions to maintain status strategies. For example, Lightning Pulse can be prioritized while a target is casting, while Flame Blast can be reserved for targets missing Ignite.</p>
          <div className="instruction-example"><strong>PRIORITY 10 · Lightning Pulse</strong><span>IF Target casting AND Target danger at least High</span><small>High-danger casts come first, then defense, status maintenance, and damage.</small></div>
        </section>

        <section id="examples" data-debug-help-section="examples">
          <h4>Example Setups</h4>
          <div className="instruction-setup"><strong>Beginner Safe Setup</strong><p>10 Healing Potion · Player Life below 35%</p><p>20 Earthen Ward · Player Life below 70% AND Barrier missing</p><p>30 Flame Blast · Target missing Ignite AND Mana above 40%</p><p>40 Ice Shard · Mana above 60%</p><small>This flows from emergency healing to Barrier, then status maintenance and damage.</small></div>
          <div className="instruction-setup"><strong>Danger-and-Status Setup</strong><p>10 Lightning Pulse · Target casting AND danger at least High AND Mana above 20%</p><p>20 Earthen Ward · Player Life below 65% AND Barrier missing</p><p>30 Flame Blast · Target missing Ignite AND Mana above 35%</p><p>40 Stone Spike · Mana above 55%</p><small>Dangerous casts come first, then defense, status maintenance, and damage.</small></div>
          <div className="instruction-setup"><strong>Resource-Conservative</strong><p>10 Healing Potion · Player Life below 30%</p><p>20 Earthen Ward · Player Life below 55% AND Barrier missing AND Mana above 40%</p><p>30 Flame Blast · Target missing Ignite AND Mana above 70%</p><p>40 Ice Shard · Mana above 80%</p><small>This setup intentionally saves Mana and waits for high resource thresholds.</small></div>
        </section>

        <section id="mistakes" data-debug-help-section="common-mistakes">
          <h4>Common Mistakes</h4>
          <ol>
            <li><strong>“My Spell never casts.”</strong> Check that it is known and equipped, that you have enough Mana, that its cooldown and Global Cooldown are ready, and that it has a valid target.</li>
            <li><strong>“My lower-priority Rule never happens.”</strong> A higher-priority Rule may always be valid and available.</li>
            <li><strong>“My target keeps changing.”</strong> Check Auto Target Override and the enabled Target Priority order.</li>
            <li><strong>“Earthen Ward keeps being attempted.”</strong> Add Barrier missing or Barrier below a suitable percentage.</li>
            <li><strong>“I run out of Mana.”</strong> Add Mana above thresholds to offensive Spell Rules.</li>
            <li><strong>“Lightning Pulse never casts.”</strong> Check that the target is casting, the danger threshold matches, and the Spell is equipped with enough Mana.</li>
            <li><strong>“A Rule says inactive.”</strong> The Spell may not be equipped, or a defensive Action may lack its equipment requirement.</li>
          </ol>
        </section>

        <section id="glossary" data-debug-help-section="glossary">
          <h4>Glossary</h4>
          <dl className="automation-glossary">
            <dt>Action</dt><dd>An active ability Automation can attempt to use.</dd>
            <dt>Rule</dt><dd>An Action combined with a Priority and Conditions.</dd>
            <dt>Priority</dt><dd>The order in which Rules or Target Priority entries are checked. Lower numbers are earlier.</dd>
            <dt>Condition</dt><dd>A requirement that must be true for a Rule to be considered.</dd>
            <dt>Target</dt><dd>The enemy an Action will affect.</dd>
            <dt>Effect</dt><dd>A temporary status, buff, debuff, or Barrier.</dd>
            <dt>Cooldown</dt><dd>The time before the same Action can be used again.</dd>
            <dt>Global Cooldown</dt><dd>A short shared delay between many active actions.</dd>
            <dt>Mana</dt><dd>The resource used by Magic.</dd>
            <dt>Stamina</dt><dd>The resource used by physical and defensive actions.</dd>
            <dt>Telegraphed</dt><dd>An enemy action that is currently preparing and will resolve when its timer ends.</dd>
            <dt>Barrier</dt><dd>A temporary absorb pool that takes damage before HP.</dd>
          </dl>
        </section>
      </article>
    </div>
  );
}
