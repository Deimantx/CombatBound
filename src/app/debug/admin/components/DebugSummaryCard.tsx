import type { ReactNode } from "react";

export function DebugSummaryCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return <div className="debug-summary-card"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}
