import { useState } from "react";
import type { DebugResource } from "../../../../game/debug/debugTypes";
import type { DebugStoreApi } from "../../../../state/gameStore";
import { DebugButton } from "./DebugButton";

export function DebugResourceControl({ label, value, maximum, resource, run, debug }: { label: string; value: number; maximum: number; resource: DebugResource; run: (label: string, action: () => void) => void; debug: DebugStoreApi }) {
  const [amount, setAmount] = useState(String(Math.round(value)));
  return <div className="debug-resource-control"><div><strong>{label}</strong><span>{Math.round(value)} / {Math.round(maximum)}</span></div><div className="debug-resource-track"><i style={{ width: `${maximum > 0 ? Math.max(0, Math.min(100, value / maximum * 100)) : 0}%` }} /></div><div className="debug-resource-actions">{[0, 25, 50, 100].map((percent) => <button type="button" key={percent} onClick={() => run(`Set ${label} to ${percent}%.`, () => debug.setResourcePercent(resource, percent))} data-debug-kind="debug-action" data-debug-action="set-resource-percent" data-debug-resource={resource}>{percent}%</button>)}<input value={amount} onChange={(event) => setAmount(event.target.value)} aria-label={`Set ${label}`} inputMode="decimal" /><DebugButton action="set-resource" onClick={() => run(`Set ${label}.`, () => debug.setPlayerResource(resource, Number(amount)))}>SET</DebugButton></div></div>;
}
