import type { ReactNode } from "react";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import type { TooltipModel } from "../../../../game/presentation/tooltipTypes";
import { PlaceholderArt } from "../../../components/PlaceholderArt";

export function DebugCatalogueIdentity({
  tooltip,
  icon,
  variant = "muted",
  children,
  kind,
  targetId,
  label,
}: {
  tooltip: TooltipModel;
  icon: string;
  variant?: "muted" | "gold" | "blue" | "red";
  children: ReactNode;
  kind: string;
  targetId?: string;
  label?: string;
}) {
  return (
    <GameTooltip content={tooltip} targetId={targetId} label={label}>
      <div className="debug-catalogue-identity" tabIndex={0} data-debug-kind={kind} data-debug-target-id={targetId}>
        <PlaceholderArt icon={icon} size="small" variant={variant} />
        <div className="debug-row-main">{children}</div>
      </div>
    </GameTooltip>
  );
}
