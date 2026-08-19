import type { LucideIcon } from "lucide-react";

export function HeroSystemCard({
  system,
  title,
  description,
  summary,
  preview,
  icon: Icon,
  onOpen,
}: {
  system: "abilities" | "automation";
  title: string;
  description: string;
  summary: React.ReactNode;
  preview: React.ReactNode;
  icon: LucideIcon;
  onOpen: (button: HTMLButtonElement) => void;
}) {
  return (
    <button
      className="hero-system-card"
      onClick={(event) => onOpen(event.currentTarget)}
      data-debug-kind="hero-build-system"
      data-debug-system={system}
    >
      <span className="hero-card-icon"><Icon size={18} /></span>
      <span className="hero-card-copy">
        <strong>{title}</strong>
        <small>{description}</small>
        <span className="hero-card-summary">{summary}</span>
        <span className="hero-build-preview">{preview}</span>
      </span>
      <span className="hero-card-open">OPEN <span aria-hidden="true">→</span></span>
    </button>
  );
}

export function HeroBuildPreviewSlots({ slots }: { slots: Array<{ actionId?: string | null; icon?: string; label?: string }> }) {
  return <span className="hero-build-preview-slots">{slots.map((slot, index) => <span key={`${slot.actionId ?? "empty"}-${index}`} className={`hero-build-preview-slot ${slot.actionId ? "is-filled" : "is-empty"}`} data-debug-kind="hero-build-preview-slot" data-debug-action-id={slot.actionId ?? ""} data-debug-empty={slot.actionId ? "false" : "true"} aria-label={slot.label ?? (slot.actionId ? `Slot ${index + 1}` : `Empty slot ${index + 1}`)}><span className="hero-build-preview-art">{slot.icon ?? "·"}</span></span>)}</span>;
}
