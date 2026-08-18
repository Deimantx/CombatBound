import type { AtlasAtmosphere } from './combatAtlasTypes'

export function CombatAtlasBackdrop({ atmosphere }: { atmosphere: AtlasAtmosphere }) {
  return <div className="combat-atlas-backdrop" data-atlas-atmosphere={atmosphere} aria-hidden="true">
    <div className="combat-atlas-fog combat-atlas-fog-one" />
    <div className="combat-atlas-fog combat-atlas-fog-two" />
    <svg className="combat-atlas-contours" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M-8 80 C14 58 20 92 41 71 S75 50 108 68" />
      <path d="M-10 91 C17 68 27 104 50 80 S82 61 110 77" />
      <path d="M9 -8 C25 12 9 28 26 42 S45 70 37 108" />
      <path d="M87 -8 C70 13 88 29 72 46 S57 78 68 108" />
      <circle cx="50" cy="50" r="31" />
      <circle cx="50" cy="50" r="43" />
    </svg>
    <span className="combat-atlas-atmosphere-mark">ATLAS / {atmosphere.toUpperCase()}</span>
  </div>
}
