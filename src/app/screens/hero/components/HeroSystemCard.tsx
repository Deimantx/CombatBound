import type { LucideIcon } from "lucide-react";

export function HeroSystemCard({
  system,
  title,
  description,
  summary,
  icon: Icon,
  onOpen,
}: {
  system: "equipment" | "spellbook" | "abilities" | "automation" | "stats";
  title: string;
  description: string;
  summary: React.ReactNode;
  icon: LucideIcon;
  onOpen: (button: HTMLButtonElement) => void;
}) {
  return (
    <button
      className="hero-system-card"
      onClick={(event) => onOpen(event.currentTarget)}
      data-debug-kind="hero-system-card"
      data-debug-system={system}
    >
      <span className="hero-card-icon"><Icon size={18} /></span>
      <span className="hero-card-copy">
        <strong>{title}</strong>
        <small>{description}</small>
        <span className="hero-card-summary">{summary}</span>
      </span>
      <span className="hero-card-open">OPEN <span aria-hidden="true">→</span></span>
    </button>
  );
}
