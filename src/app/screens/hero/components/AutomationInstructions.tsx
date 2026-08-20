import { ArrowLeft, BookOpen } from "lucide-react";

export function AutomationInstructions({ onBack }: { onBack: () => void }) {
  return (
    <div className="automation-instructions-view" data-debug-kind="automation-instructions">
      <div className="automation-instructions-toolbar">
        <div>
          <span className="tiny-label">COMBAT AUTOMATION</span>
          <h3>Automation Instructions</h3>
          <p>Build reliable combat behavior for your Hunter.</p>
        </div>
        <button className="button button-ghost" onClick={onBack} data-debug-kind="automation-instructions-back">
          <ArrowLeft size={14} /> BACK TO RULES
        </button>
      </div>
      <article className="automation-instructions combatbound-scroll">
        <nav className="automation-instructions-toc" aria-label="Automation instructions contents">
          <span className="tiny-label">ON THIS PAGE</span>
          <a href="#quick-start">Quick Start</a><a href="#rules">Rules</a><a href="#conditions">Conditions</a>
          <a href="#targeting">Targeting</a><a href="#resources">Resources</a><a href="#examples">Examples</a>
        </nav>
        <section id="quick-start" data-debug-help-section="quick-start">
          <div className="automation-help-heading"><BookOpen size={17} /><h4>Quick Start</h4></div>
          <p>Automation checks enabled rules in priority order and tries the first action whose conditions and normal action validation both pass.</p>
          <div className="instruction-example"><strong>Priority 10 · Healing Potion</strong><span>IF Player Life is below 35%</span><small>Consumables remain available while the player is Stunned.</small></div>
          <div className="instruction-callout tip"><strong>TIP</strong><span>Start with one survival rule, test it in Combat, then add offensive rules.</span></div>
        </section>
        <section id="rules" data-debug-help-section="rules">
          <h4>Rules and Priority</h4>
          <p>A rule contains an action, a priority, an enabled state, and one or more conditions. Conditions use AND logic. Lower priority numbers are checked first.</p>
          <p>Automation uses the same validation as manual Combat controls, including cooldowns, resources, equipment, targets, and Crowd Control.</p>
        </section>
        <section id="conditions" data-debug-help-section="conditions">
          <h4>Conditions</h4>
          <p>The editor supports player and target health thresholds, Mana and Stamina thresholds, Effect presence, Barrier state, and a minimum number of living enemies.</p>
          <p>Thresholds are percentages of the relevant maximum. Effect checks use the current Effect ID or supported tags.</p>
        </section>
        <section id="targeting" data-debug-help-section="targeting">
          <h4>Target Priority</h4>
          <p>With Auto Target Override off, rules use the manually selected living enemy. With it on, enabled preferences choose among elite, low-health, low-evasion, and first-living targets.</p>
        </section>
        <section id="resources" data-debug-help-section="resources">
          <h4>Resources and Cooldowns</h4>
          <p>Magic Arts use Mana. Weapon Skills and defensive actions use Stamina. Standard actions also share a Global Cooldown.</p>
          <p>When a higher-priority action is unavailable, Automation continues checking lower-priority rules.</p>
        </section>
        <section id="examples" data-debug-help-section="examples">
          <h4>Example Setups</h4>
          <div className="instruction-setup"><strong>Safe Setup</strong><p>10 Healing Potion · Player Life below 35%</p><p>20 Earth Shield · Player Life below 70% AND Barrier missing</p><p>30 Flame Burst · Target missing Ignite AND Mana above 40%</p><small>Emergency recovery comes before defense and damage.</small></div>
          <div className="instruction-setup"><strong>Status Setup</strong><p>10 Lightning Pulse · Target missing Shock AND Mana above 20%</p><p>20 Earth Shield · Barrier missing</p><p>30 Flame Burst · Target missing Ignite AND Mana above 35%</p><small>Status maintenance comes before general damage.</small></div>
        </section>
      </article>
    </div>
  );
}
