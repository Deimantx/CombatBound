import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export type HeroWindowId = "spellbook" | "abilities" | "automation" | null;

export function HeroWindow({
  title,
  subtitle,
  icon: Icon,
  onClose,
  children,
  windowId,
}: {
  title: string;
  subtitle: string;
  icon?: React.ComponentType<{ size?: number }>;
  onClose: () => void;
  children: ReactNode;
  windowId: Exclude<HeroWindowId, null>;
}) {
  const windowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    windowRef.current?.querySelector<HTMLElement>("[data-hero-window-focus]")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !windowRef.current) return;
      const focusable = Array.from(
        windowRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), select:not([disabled]), input:not([disabled]), [href]",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="hero-window-backdrop" data-debug-kind="hero-window-backdrop">
      <div
        ref={windowRef}
        className={`hero-window hero-window-${windowId}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`hero-window-title-${windowId}`}
        data-debug-kind="hero-window"
        data-debug-window={windowId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="hero-window-header">
          <div className="panel-heading">
            {Icon && <span className="panel-icon"><Icon size={16} /></span>}
            <div>
              <h2 id={`hero-window-title-${windowId}`} className="panel-title">{title}</h2>
              <p className="panel-subtitle">{subtitle}</p>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={`Close ${title}`} data-hero-window-focus>
            <X size={16} />
          </button>
        </header>
        <div className="hero-window-body combatbound-scroll">{children}</div>
      </div>
    </div>
  );
}
