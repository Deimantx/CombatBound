import { ChevronDown } from "lucide-react";

export function DisclosureChevron({ open, size = 14, className = "" }: { open: boolean; size?: number; className?: string }) {
  return <ChevronDown size={size} className={`disclosure-chevron ${open ? "is-open" : ""} ${className}`.trim()} aria-hidden="true" />;
}
