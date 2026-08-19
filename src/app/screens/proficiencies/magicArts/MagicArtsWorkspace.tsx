import { ArrowLeft, CircleDot, LocateFixed, Maximize2, Shield, Sparkles } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";
import { getMagicArt } from "../../../../game/magicArts/magicArtLogic";
import type { GameState } from "../../../../game/gameState";
import { buildMagicArtTooltip } from "../../../../game/presentation/tooltipBuilders";
import { getProficiencyLevelProgress } from "../../../../game/progression/proficiencyProgression";
import { GameTooltip } from "../../../components/tooltip/GameTooltip";
import { CombatAtlasBackdrop } from "../../combat/atlas/CombatAtlasBackdrop";
import { earthShieldSpecializationEdges, earthShieldSpecializationNodes, magicArtsBrowserLayout } from "./magicArtsBrowserLayout";

const accentRgb: Record<string, string> = {
  earth: "182,151,91",
  blue: "91,157,181",
  violet: "132,111,153",
  gold: "188,151,83",
};

const earthShield = getMagicArt("magic-art.earth-shield")!;

type Pan = { x: number; y: number };
type PanInteraction = { pointerId: number; startX: number; startY: number; startPan: Pan; moved: boolean };

function atlasStageStyle(focusRgb = "122,130,136") {
  return {
    "--atlas-default-rgb": "122,130,136",
    "--atlas-atmosphere-rgb": "122,130,136",
    "--atlas-focus-rgb": focusRgb,
    "--atlas-x": "50%",
    "--atlas-y": "50%",
    "--atlas-shift-x": "0px",
    "--atlas-shift-y": "0px",
  } as CSSProperties;
}

function updateAtlasPointer(stage: HTMLDivElement | null, event: ReactPointerEvent<HTMLElement>) {
  if (!stage) return;
  const rect = stage.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100));
  const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100));
  stage.style.setProperty("--atlas-x", `${x}%`);
  stage.style.setProperty("--atlas-y", `${y}%`);
  stage.style.setProperty("--atlas-shift-x", `${(x - 50) / 16}px`);
  stage.style.setProperty("--atlas-shift-y", `${(y - 50) / 16}px`);
}

function resetAtlasPointer(stage: HTMLDivElement | null) {
  stage?.style.setProperty("--atlas-x", "50%");
  stage?.style.setProperty("--atlas-y", "50%");
  stage?.style.setProperty("--atlas-shift-x", "0px");
  stage?.style.setProperty("--atlas-shift-y", "0px");
}

export function MagicArtsWorkspace({ game }: { game: GameState }) {
  const [view, setView] = useState<"browser" | "specialization">("browser");
  const [selectedId, setSelectedId] = useState("magic-art.earth-shield");
  if (view === "specialization") return <MagicArtSpecializationView game={game} onBack={() => setView("browser")} />;
  return <MagicArtsBrowser selectedId={selectedId} onSelect={setSelectedId} onOpenSkillTree={() => setView("specialization")} />;
}

function magicArtTooltip() {
  return buildMagicArtTooltip(earthShield);
}

function futureArtTooltip(id: string) {
  return { id, title: "Future Magic Art", subtitle: "Magic Art", description: "Not available yet.", rows: [] };
}

function MagicArtsBrowser({ selectedId, onSelect, onOpenSkillTree }: { selectedId: string; onSelect: (id: string) => void; onOpenSkillTree: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string>();
  const selected = magicArtsBrowserLayout.find((node) => node.id === selectedId) ?? magicArtsBrowserLayout[0];
  const art = selected.artId ? getMagicArt(selected.artId) : undefined;
  const focusRgb = hoveredId ? accentRgb[magicArtsBrowserLayout.find((node) => node.id === hoveredId)?.accent ?? "blue"] : "122,130,136";
  return <div className="magic-arts-workspace" data-debug-kind="magic-arts-browser">
    <div className="magic-arts-workspace-heading"><div><span className="tiny-label">MAGIC ARTS</span><h3>Choose a Magic Art</h3></div></div>
    <div className="magic-arts-browser-layout">
      <section ref={stageRef} className="magic-arts-atlas-stage" aria-label="Magic Arts browser" style={atlasStageStyle(focusRgb)} onPointerMove={(event) => updateAtlasPointer(stageRef.current, event)} onPointerLeave={() => { setHoveredId(undefined); resetAtlasPointer(stageRef.current); }}>
        <CombatAtlasBackdrop atmosphere="world" />
        {magicArtsBrowserLayout.map((node, index) => {
          const real = node.kind === "art";
          const dimmed = Boolean(hoveredId && hoveredId !== node.id);
          return <GameTooltip key={node.id} content={real ? magicArtTooltip() : futureArtTooltip(node.id)}>
            <button type="button" className={`combat-atlas-node magic-art-atlas-node accent-${node.accent} ${selectedId === node.id ? "is-selected" : ""} ${dimmed ? "is-dimmed" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${Math.min(index * 34, 180)}ms`, "--atlas-node-rgb": accentRgb[node.accent] } as CSSProperties} aria-pressed={selectedId === node.id} aria-label={real ? "Earth Shield, Magic Art" : "Future Magic Art, not available"} onPointerEnter={() => setHoveredId(node.id)} onPointerLeave={() => setHoveredId(undefined)} onFocus={() => setHoveredId(node.id)} onBlur={() => setHoveredId(undefined)} onClick={() => onSelect(node.id)} data-debug-kind="magic-art-node" data-debug-magic-art-id={node.artId} data-debug-placeholder-id={real ? undefined : node.id}>
              <span className="combat-atlas-node-halo" /><span className="combat-atlas-node-orb">{real ? <Shield size={18} strokeWidth={1.55} /> : <Sparkles size={16} strokeWidth={1.55} />}</span><span className="combat-atlas-node-label"><strong>{real ? "Earth Shield" : "Future Art"}</strong><em>{real ? "MAGIC ART" : "NOT AVAILABLE"}</em></span>
            </button>
          </GameTooltip>;
        })}
      </section>
      <aside className="magic-arts-context-panel" data-debug-kind="magic-art-context-details">
        {art ? <><div className="magic-art-context-icon"><Shield size={18} /></div><h3>{art.name}</h3><button type="button" className="magic-art-open-tree" onClick={onOpenSkillTree} data-debug-action="open-magic-art-specialization"><Maximize2 size={14} /> OPEN SKILL TREE</button></> : <><div className="magic-art-context-icon is-muted"><CircleDot size={17} /></div><h3>Future Magic Art</h3><p>Not available yet.</p></>}
      </aside>
    </div>
  </div>;
}

function MagicArtSpecializationView({ game, onBack }: { game: GameState; onBack: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<PanInteraction | null>(null);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const level = getProficiencyLevelProgress(game.progression.proficiencies["magic-arts"]?.totalXp ?? 0).level;
  const selectedPlaceholder = earthShieldSpecializationNodes.find((node) => node.id === selectedNode);
  const beginPan = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as Element).closest("button")) return;
    interaction.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startPan: pan, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const movePan = (event: ReactPointerEvent<HTMLElement>) => {
    const current = interaction.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) current.moved = true;
    setPan({ x: current.startPan.x + dx, y: current.startPan.y + dy });
  };
  const stopPan = () => { interaction.current = null; };
  return <div className="magic-arts-workspace magic-art-specialization" data-debug-kind="magic-art-specialization">
    <header className="magic-art-specialization-header"><button type="button" className="magic-art-back-button" onClick={onBack} aria-label="Back to Magic Arts" title="Back to Magic Arts" data-debug-action="back-to-magic-arts"><ArrowLeft size={16} /></button><div><span className="tiny-label">EARTH SHIELD</span><h3>Skill Tree</h3></div><div className="magic-art-specialization-stats"><strong>{earthShield.manaCost} Mana</strong><strong>{earthShield.cooldownSeconds}s Cooldown</strong><strong>{earthShield.durationSeconds}s Duration</strong><strong>{earthShield.barrier?.absorbAmount ?? 0} Absorb</strong></div></header>
    <div className="magic-art-specialization-body"><section ref={stageRef} className="magic-art-atlas-stage" onPointerDown={beginPan} onPointerMove={(event) => { updateAtlasPointer(stageRef.current, event); movePan(event); }} onPointerUp={stopPan} onPointerCancel={stopPan} onPointerLeave={() => resetAtlasPointer(stageRef.current)} data-debug-kind="magic-art-specialization-graph" style={atlasStageStyle("122,130,136")}>
      <CombatAtlasBackdrop atmosphere="world" />
      <div className="magic-art-specialization-camera" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        <svg className="magic-art-specialization-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{earthShieldSpecializationEdges.map((edge) => { const from = edge.from === "earth-shield.root" ? { x: 50, y: 50 } : earthShieldSpecializationNodes.find((node) => node.id === edge.from); const to = earthShieldSpecializationNodes.find((node) => node.id === edge.to); return from && to ? <line key={`${edge.from}-${edge.to}`} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} className={selectedNode === edge.from || selectedNode === edge.to ? "is-highlighted" : undefined} /> : null; })}</svg>
        <GameTooltip content={magicArtTooltip()}><button type="button" className="magic-art-tree-node magic-art-tree-root" style={{ left: "50%", top: "50%" }} aria-label="Earth Shield base Magic Art" data-debug-kind="magic-art-specialization-node" data-debug-specialization-node-id="earth-shield.root"><span className="magic-art-tree-node-halo" /><span className="magic-art-tree-node-orb"><Shield size={18} /></span><span className="magic-art-tree-node-label"><strong>Earth Shield</strong><em>ROOT ART</em></span></button></GameTooltip>
        {earthShieldSpecializationNodes.map((node, index) => <GameTooltip key={node.id} content={{ id: node.id, title: "Future Perk", subtitle: "Earth Shield Skill Tree", description: "Not available yet.", rows: [] }}><button type="button" className={`magic-art-tree-node ${selectedNode === node.id ? "is-selected" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${Math.min(index * 28, 160)}ms` }} onClick={() => setSelectedNode(node.id)} aria-pressed={selectedNode === node.id} aria-label={`Future Perk ${index + 1}`} data-debug-kind="magic-art-specialization-node" data-debug-specialization-node-id={node.id}><span className="magic-art-tree-node-halo" /><span className="magic-art-tree-node-orb"><Sparkles size={13} /></span><span className="magic-art-tree-node-label"><strong>Future Perk</strong><em>NOT AVAILABLE</em></span></button></GameTooltip>)}
      </div>
      <div className="magic-art-specialization-controls"><button type="button" className="magic-art-center-button" onClick={() => setPan({ x: 0, y: 0 })} title="Center skill tree"><LocateFixed size={13} /> CENTER</button><span>{selectedPlaceholder ? "FUTURE PERK SELECTED" : level > 0 ? `MAGIC ARTS LV ${level}` : "MAGIC ARTS LV 0"}</span></div>
    </section><aside className="magic-art-specialization-details">{selectedPlaceholder ? <><span className="tiny-label">FUTURE PERK</span><h3>Future Perk</h3><p>Not available yet.</p></> : <><span className="tiny-label">EARTH SHIELD</span><h3>Earth Shield</h3><div className="magic-arts-detail-grid"><span>Mana</span><strong>{earthShield.manaCost}</strong><span>Cooldown</span><strong>{earthShield.cooldownSeconds}s</strong><span>Duration</span><strong>{earthShield.durationSeconds}s</strong><span>Absorb</span><strong>{earthShield.barrier?.absorbAmount ?? 0}</strong><span>Target</span><strong>Self</strong></div></>}</aside></div>
  </div>;
}
