import { ArrowLeft, Crosshair, Maximize2, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { getMagicArt } from "../../../../game/magicArts/magicArtLogic";
import { calculateMagicArtsXp } from "../../../../game/magicArts/magicArtProgression";
import type { GameState } from "../../../../game/gameState";
import { getProficiencyLevelProgress } from "../../../../game/progression/proficiencyProgression";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { buildMagicArtTooltip } from "../../../../game/presentation/tooltipBuilders";
import { PlaceholderArt } from "../../../components/PlaceholderArt";
import { earthShieldSpecializationNodes, magicArtsBrowserConnections, magicArtsBrowserLayout } from "./magicArtsBrowserLayout";

type BrowserSelection = string;

export function MagicArtsWorkspace({ game }: { game: GameState }) {
  const [view, setView] = useState<{ mode: "browser" } | { mode: "specialization"; artId: "magic-art.earth-shield" }>({ mode: "browser" });
  const [selectedId, setSelectedId] = useState<BrowserSelection>("magic-art.earth-shield");
  if (view.mode === "specialization") return <MagicArtSpecializationView game={game} onBack={() => setView({ mode: "browser" })} />;
  return <MagicArtsBrowser game={game} selectedId={selectedId} onSelect={setSelectedId} onOpenSpecialization={() => setView({ mode: "specialization", artId: "magic-art.earth-shield" })} />;
}

function magicArtTooltip() {
  const art = getMagicArt("magic-art.earth-shield")!;
  return buildMagicArtTooltip(art);
}

function MagicArtsBrowser({ game, selectedId, onSelect, onOpenSpecialization }: { game: GameState; selectedId: string; onSelect: (id: string) => void; onOpenSpecialization: () => void }) {
  const selected = magicArtsBrowserLayout.find((node) => node.id === selectedId) ?? magicArtsBrowserLayout[0];
  const art = selected.artId ? getMagicArt(selected.artId) : undefined;
  const nodeMap = useMemo(() => new Map(magicArtsBrowserLayout.map((node) => [node.id, node])), []);
  const line = (fromId: string, toId: string) => {
    const from = nodeMap.get(fromId); const to = nodeMap.get(toId);
    return from && to ? <line key={`${fromId}-${toId}`} className={fromId === selectedId || toId === selectedId ? "is-highlighted" : undefined} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} /> : null;
  };
  return <div className="magic-arts-workspace" data-debug-kind="magic-arts-browser">
    <div className="magic-arts-workspace-heading"><div><span className="tiny-label">MAGIC ARTS</span><h3>Arcane combat disciplines</h3><p>Explore authored Arts and future design space.</p></div><span className="magic-arts-browser-count">1 REAL ART · {magicArtsBrowserLayout.length - 1} PREVIEW POSITIONS</span></div>
    <div className="magic-arts-browser-layout">
      <section className="magic-arts-browser-stage" aria-label="Magic Arts browser">
        <div className="magic-arts-stage-grid" />
        <svg className="magic-arts-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{magicArtsBrowserConnections.map(([from, to]) => line(from, to))}</svg>
        {magicArtsBrowserLayout.map((node) => {
          const real = node.kind === "art";
          const tooltip = real ? magicArtTooltip() : { id: node.id, title: "Future Magic Art", subtitle: "Design placeholder", description: "Gameplay and progression are not authored yet.", rows: [] };
          return <GameTooltip key={node.id} content={tooltip}><button type="button" className={`magic-art-browser-node is-${node.kind} accent-${node.accent} ${selectedId === node.id ? "is-selected" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => onSelect(node.id)} aria-label={real ? "Earth Shield, Magic Art" : "Future Magic Art, design placeholder"} data-debug-kind="magic-art-node" data-debug-magic-art-id={node.artId} data-debug-placeholder-id={real ? undefined : node.id}><PlaceholderArt icon={real ? "shield" : "sparkles"} size={real ? "medium" : "small"} variant={real ? "gold" : "muted"} /><span>{real ? "Earth Shield" : "Future Art"}</span>{real && <small>35 Mana · 10s</small>}</button></GameTooltip>;
        })}
      </section>
      <aside className="magic-arts-context-panel" data-debug-kind="magic-art-context-details">
        {art ? <><div className="magic-arts-detail-kicker"><Sparkles size={14} /> AUTHORED MAGIC ART</div><h3>{art.name}</h3><p>{art.description}</p><div className="magic-arts-detail-grid"><span>Mana</span><strong>{art.manaCost}</strong><span>Cooldown</span><strong>{art.cooldownSeconds}s</strong><span>Duration</span><strong>{art.durationSeconds}s</strong><span>Absorb</span><strong>{art.barrier?.absorbAmount ?? 0}</strong><span>Target</span><strong>Self</strong></div><div className="magic-arts-xp-callout"><span>Current Cast XP</span><strong>{calculateMagicArtsXp(art.manaCost)} XP + damage dealt</strong><small>Mana spent + effective HP damage.</small></div><button type="button" className="button primary full-button" onClick={onOpenSpecialization} data-debug-action="open-magic-art-specialization"><Maximize2 size={14} /> OPEN SPECIALIZATION</button></> : <><div className="magic-arts-detail-kicker"><Crosshair size={14} /> DESIGN PLACEHOLDER</div><h3>Future Magic Art</h3><p>Gameplay and progression are not authored yet.</p><small className="muted-copy">Selection is local to this browser and never changes saved game state.</small></>}
      </aside>
    </div>
  </div>;
}

function MagicArtSpecializationView({ game, onBack }: { game: GameState; onBack: () => void }) {
  const art = getMagicArt("magic-art.earth-shield")!;
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; pan: typeof pan } | null>(null);
  const center = () => setPan({ x: 0, y: 0 });
  const move = (event: React.PointerEvent<HTMLDivElement>) => { if (!drag.current) return; setPan({ x: drag.current.pan.x + event.clientX - drag.current.x, y: drag.current.pan.y + event.clientY - drag.current.y }); };
  const stop = () => { drag.current = null; };
  const level = getProficiencyLevelProgress(game.progression.proficiencies["magic-arts"]?.totalXp ?? 0).level;
  return <div className="magic-arts-workspace magic-art-specialization" data-debug-kind="magic-art-specialization">
    <header className="magic-art-specialization-header"><button type="button" className="button button-ghost" onClick={onBack} data-debug-action="back-to-magic-arts"><ArrowLeft size={14} /> BACK</button><div><span className="tiny-label">EARTH SHIELD · MAGIC ART</span><h3>Base Art and specialization preview</h3></div><div className="magic-art-specialization-stats"><strong>{art.manaCost} Mana</strong><strong>{art.cooldownSeconds}s Cooldown</strong><strong>{art.durationSeconds}s Duration</strong><strong>{art.barrier?.absorbAmount ?? 0} Absorb</strong></div></header>
    <div className="magic-art-specialization-body"><section className="magic-art-specialization-stage" onPointerDown={(event) => { if ((event.target as Element).closest("button")) return; drag.current = { x: event.clientX, y: event.clientY, pan }; (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId); }} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} data-debug-kind="magic-art-specialization-graph"><svg className="magic-art-specialization-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{earthShieldSpecializationNodes.map((node, index) => <line key={node.id} x1="50%" y1="50%" x2={`${node.x}%`} y2={`${node.y}%`} className={`${index % 2 === 0 ? "is-major" : ""} ${selectedNode === node.id ? "is-highlighted" : ""}`} />)}</svg><div className="magic-art-specialization-camera" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}><GameTooltip content={magicArtTooltip()}><button type="button" className="magic-art-specialization-root" aria-label="Earth Shield base Magic Art" data-debug-kind="magic-art-specialization-node" data-debug-specialization-node-id="earth-shield.root"><PlaceholderArt icon="shield" size="large" variant="gold" /><strong>Earth Shield</strong><small>80 absorb · 12s</small></button></GameTooltip>{earthShieldSpecializationNodes.map((node) => <GameTooltip key={node.id} content={{ id: node.id, title: "Specialization Node", subtitle: "Design Placeholder", description: "Effect not authored yet.", rows: [] }}><button type="button" className={`magic-art-specialization-node ${selectedNode === node.id ? "is-selected" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => setSelectedNode(node.id)} aria-pressed={selectedNode === node.id} aria-label={`Specialization placeholder ${node.id}`} data-debug-kind="magic-art-specialization-node" data-debug-specialization-node-id={node.id}><Sparkles size={13} /><span>·</span></button></GameTooltip>)}</div><div className="magic-art-specialization-controls"><button type="button" className="button button-ghost" onClick={center}>CENTER</button><span>DRAG EMPTY SPACE TO PAN · {selectedNode ? "PREVIEW NODE SELECTED" : level > 0 ? `MAGIC ARTS LV ${level}` : "UNTRAINED"}</span></div></section><aside className="magic-art-specialization-details"><span className="tiny-label">BASE MAGIC ART</span><h3>{art.name}</h3><p>{art.description}</p><div className="magic-arts-detail-grid"><span>Mana</span><strong>{art.manaCost}</strong><span>Cooldown</span><strong>{art.cooldownSeconds}s</strong><span>Duration</span><strong>{art.durationSeconds}s</strong><span>Flat absorb</span><strong>{art.barrier?.absorbAmount ?? 0}</strong><span>Target</span><strong>Self</strong></div><div className="magic-arts-preview-note"><strong>SPECIALIZATION PREVIEW</strong><span>Upgrade effects, ranks, points, purchases, and save state are intentionally not authored in this phase.</span></div></aside></div>
  </div>;
}
