import { ArrowLeft, CircleDot, LocateFixed, Maximize2, Shield, Sparkles } from "lucide-react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";
import { getMagicArt } from "../../../../game/magicArts/magicArtLogic";
import { buildMagicArtTooltip } from "../../../../game/presentation/tooltipBuilders";
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

type WorkspaceMode = "browser" | "skill-tree";
type Pan = { x: number; y: number };
type PanInteraction = { pointerId: number; startX: number; startY: number; startPan: Pan };

const SKILL_TREE_WORLD_WIDTH = 1320;
const SKILL_TREE_WORLD_HEIGHT = 900;
const SKILL_TREE_OVERSCROLL = 100;

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

function clampSkillTreePan(pan: Pan, stage: HTMLDivElement | null) {
  const stageWidth = stage?.clientWidth ?? 0;
  const stageHeight = stage?.clientHeight ?? 0;
  const maxX = Math.max(SKILL_TREE_OVERSCROLL, (SKILL_TREE_WORLD_WIDTH - stageWidth) / 2 + SKILL_TREE_OVERSCROLL);
  const maxY = Math.max(SKILL_TREE_OVERSCROLL, (SKILL_TREE_WORLD_HEIGHT - stageHeight) / 2 + SKILL_TREE_OVERSCROLL);
  return {
    x: Math.max(-maxX, Math.min(maxX, pan.x)),
    y: Math.max(-maxY, Math.min(maxY, pan.y)),
  };
}

export function MagicArtsWorkspace() {
  const [mode, setMode] = useState<WorkspaceMode>("browser");
  const [selectedId, setSelectedId] = useState("magic-art.earth-shield");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const selected = magicArtsBrowserLayout.find((node) => node.id === selectedId) ?? magicArtsBrowserLayout[0];
  const art = selected.artId ? getMagicArt(selected.artId) : undefined;
  const openSkillTree = () => {
    setSelectedNode(null);
    setPan({ x: 0, y: 0 });
    setMode("skill-tree");
  };
  const backToBrowser = () => setMode("browser");

  return <div className="magic-arts-workspace" data-debug-kind="magic-arts-workspace" data-debug-view={mode}>
    <div className="magic-arts-workspace-heading">
      {mode === "browser"
        ? <div><span className="tiny-label">MAGIC ARTS</span><h3>Choose a Magic Art</h3></div>
        : <><button type="button" className="magic-art-back-button" onClick={backToBrowser} aria-label="Back to Magic Arts" title="Back to Magic Arts" data-debug-action="back-to-magic-arts"><ArrowLeft size={16} /></button><div><span className="tiny-label">EARTH SHIELD</span><h3>Skill Tree</h3></div></>}
    </div>
    <div className="magic-arts-browser-layout">
      <main className="magic-arts-primary-view" data-debug-kind={mode === "browser" ? "magic-arts-browser" : "magic-art-specialization"}>
        <div className="magic-arts-view-transition" key={mode}>
          {mode === "browser"
            ? <MagicArtsBrowserContent selectedId={selectedId} onSelect={setSelectedId} />
            : <MagicArtSkillTreeContent pan={pan} setPan={setPan} selectedNode={selectedNode} setSelectedNode={setSelectedNode} />}
        </div>
      </main>
      <aside className="magic-arts-context-panel" data-debug-kind="magic-arts-inspector" data-debug-legacy-kind="magic-art-context-details">
        {mode === "browser"
          ? <MagicArtInspector art={art} onOpenSkillTree={openSkillTree} />
          : <MagicArtPerkInspector selectedNode={selectedNode} />}
      </aside>
    </div>
  </div>;
}

function futureArtTooltip(id: string) {
  return { id, title: "Future Magic Art", subtitle: "Magic Art", description: "Not available yet.", rows: [] };
}

function MagicArtsBrowserContent({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string>();
  const focusRgb = hoveredId ? accentRgb[magicArtsBrowserLayout.find((node) => node.id === hoveredId)?.accent ?? "blue"] : "122,130,136";

  return <section ref={stageRef} className="magic-arts-atlas-stage is-browser" aria-label="Magic Arts browser" data-debug-kind="magic-arts-primary-stage" style={atlasStageStyle(focusRgb)} onPointerMove={(event) => updateAtlasPointer(stageRef.current, event)} onPointerLeave={() => { setHoveredId(undefined); resetAtlasPointer(stageRef.current); }}>
    <CombatAtlasBackdrop atmosphere="world" />
    {magicArtsBrowserLayout.map((node, index) => {
      const real = node.kind === "art";
      const dimmed = Boolean(hoveredId && hoveredId !== node.id);
      return <GameTooltip key={node.id} content={real ? buildMagicArtTooltip(earthShield) : futureArtTooltip(node.id)}>
        <button type="button" className={`combat-atlas-node magic-art-atlas-node accent-${node.accent} ${selectedId === node.id ? "is-selected" : ""} ${dimmed ? "is-dimmed" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${Math.min(index * 34, 180)}ms`, "--atlas-node-rgb": accentRgb[node.accent] } as CSSProperties} aria-pressed={selectedId === node.id} aria-label={real ? "Earth Shield, Magic Art" : "Future Magic Art, not available"} onPointerEnter={() => setHoveredId(node.id)} onPointerLeave={() => setHoveredId(undefined)} onFocus={() => setHoveredId(node.id)} onBlur={() => setHoveredId(undefined)} onClick={() => onSelect(node.id)} data-debug-kind="magic-art-node" data-debug-magic-art-id={node.artId} data-debug-placeholder-id={real ? undefined : node.id}>
          <span className="combat-atlas-node-halo" /><span className="combat-atlas-node-orb">{real ? <Shield size={18} strokeWidth={1.55} /> : <Sparkles size={16} strokeWidth={1.55} />}</span><span className="combat-atlas-node-label"><strong>{real ? "Earth Shield" : "Future Art"}</strong><em>{real ? "MAGIC ART" : "NOT AVAILABLE"}</em></span>
        </button>
      </GameTooltip>;
    })}
  </section>;
}

function MagicArtInspector({ art, onOpenSkillTree }: { art: ReturnType<typeof getMagicArt> | undefined; onOpenSkillTree: () => void }) {
  if (!art) return <><div className="magic-art-context-icon is-muted"><CircleDot size={17} /></div><span className="tiny-label magic-arts-inspector-kicker">MAGIC ART</span><h3>Future Magic Art</h3><p>Not available yet.</p></>;

  return <><div className="magic-art-context-icon"><Shield size={18} /></div><span className="tiny-label magic-arts-inspector-kicker">MAGIC ART</span><h3>{art.name}</h3><p>{art.description}</p><MagicArtStats art={art} /><button type="button" className="magic-art-open-tree" onClick={onOpenSkillTree} data-debug-action="open-magic-art-specialization"><Maximize2 size={14} /> OPEN SKILL TREE</button></>;
}

function MagicArtStats({ art }: { art: NonNullable<ReturnType<typeof getMagicArt>> }) {
  return <div className="magic-arts-detail-grid" data-debug-kind="magic-art-stats"><span>Mana</span><strong>{art.manaCost}</strong><span>Cooldown</span><strong>{art.cooldownSeconds}s</strong><span>Duration</span><strong>{art.durationSeconds}s</strong><span>Absorb</span><strong>{art.barrier?.absorbAmount ?? 0}</strong><span>Target</span><strong>{art.targetMode === "self" ? "Self" : "Selected enemy"}</strong></div>;
}

function MagicArtSkillTreeContent({ pan, setPan, selectedNode, setSelectedNode }: { pan: Pan; setPan: (next: Pan) => void; selectedNode: string | null; setSelectedNode: (id: string | null) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<PanInteraction | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const beginPan = (event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    const target = event.target as Element;
    if (target.closest("button, a, input, textarea, select, [data-no-pan]")) return;
    event.preventDefault();
    interaction.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startPan: pan };
    setIsPanning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const movePan = (event: ReactPointerEvent<HTMLElement>) => {
    const current = interaction.current;
    if (!current || current.pointerId !== event.pointerId) return;
    setPan(clampSkillTreePan({ x: current.startPan.x + event.clientX - current.startX, y: current.startPan.y + event.clientY - current.startY }, stageRef.current));
  };
  const stopPan = (event?: ReactPointerEvent<HTMLElement>) => {
    const stage = stageRef.current;
    if (event && stage && typeof stage.hasPointerCapture === "function" && stage.hasPointerCapture(event.pointerId) && typeof stage.releasePointerCapture === "function") stage.releasePointerCapture(event.pointerId);
    interaction.current = null;
    setIsPanning(false);
  };

  return <section ref={stageRef} className={`magic-arts-atlas-stage is-skill-tree ${isPanning ? "is-panning" : ""}`} aria-label="Earth Shield Skill Tree" data-debug-kind="magic-arts-primary-stage" data-debug-legacy-kind="magic-art-specialization-graph" onPointerDown={beginPan} onPointerMove={(event) => { updateAtlasPointer(stageRef.current, event); movePan(event); }} onPointerUp={stopPan} onPointerCancel={stopPan} onLostPointerCapture={stopPan} onPointerLeave={() => resetAtlasPointer(stageRef.current)} onDragStart={(event) => event.preventDefault()} style={atlasStageStyle("122,130,136")}>
    <CombatAtlasBackdrop atmosphere="world" />
    <div className="magic-art-specialization-camera">
      <div className="magic-art-specialization-world" data-debug-kind="magic-art-specialization-world" style={{ height: `${SKILL_TREE_WORLD_HEIGHT}px`, transform: `translate(-50%, -50%) translate3d(${pan.x}px, ${pan.y}px, 0)`, width: `${SKILL_TREE_WORLD_WIDTH}px` }}>
      <svg className="magic-art-specialization-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{earthShieldSpecializationEdges.map((edge) => { const from = edge.from === "earth-shield.root" ? { x: 50, y: 50 } : earthShieldSpecializationNodes.find((node) => node.id === edge.from); const to = earthShieldSpecializationNodes.find((node) => node.id === edge.to); return from && to ? <line key={`${edge.from}-${edge.to}`} x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} className={selectedNode === edge.from || selectedNode === edge.to ? "is-highlighted" : undefined} /> : null; })}</svg>
      <GameTooltip content={buildMagicArtTooltip(earthShield)}><button type="button" className={`magic-art-tree-node magic-art-tree-root ${selectedNode === "earth-shield.root" ? "is-selected" : ""}`} style={{ left: "50%", top: "50%" }} onClick={() => setSelectedNode("earth-shield.root")} aria-pressed={selectedNode === "earth-shield.root"} aria-label="Earth Shield base Magic Art" data-debug-kind="magic-art-specialization-node" data-debug-specialization-node-id="earth-shield.root"><span className="magic-art-tree-node-halo" /><span className="magic-art-tree-node-orb"><Shield size={18} /></span><span className="magic-art-tree-node-label"><strong>Earth Shield</strong><em>ROOT ART</em></span></button></GameTooltip>
      {earthShieldSpecializationNodes.map((node, index) => <GameTooltip key={node.id} content={{ id: node.id, title: "Future Perk", subtitle: "Earth Shield Skill Tree", description: "Not available yet.", rows: [] }}><button type="button" className={`magic-art-tree-node ${selectedNode === node.id ? "is-selected" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${Math.min(index * 28, 160)}ms` }} onClick={() => setSelectedNode(node.id)} aria-pressed={selectedNode === node.id} aria-label={`Future Perk ${index + 1}`} data-debug-kind="magic-art-specialization-node" data-debug-specialization-node-id={node.id}><span className="magic-art-tree-node-halo" /><span className="magic-art-tree-node-orb"><Sparkles size={13} /></span><span className="magic-art-tree-node-label"><strong>Future Perk</strong><em>NOT AVAILABLE</em></span></button></GameTooltip>)}
      </div>
    </div>
    <div className="magic-art-specialization-controls"><button type="button" className="magic-art-center-button" onClick={() => setPan({ x: 0, y: 0 })} title="Center skill tree"><LocateFixed size={13} /> CENTER</button></div>
  </section>;
}

function MagicArtPerkInspector({ selectedNode }: { selectedNode: string | null }) {
  const selectedPlaceholder = earthShieldSpecializationNodes.find((node) => node.id === selectedNode);
  if (selectedPlaceholder) {
    const prerequisite = selectedPlaceholder.prerequisiteIds[0] === "earth-shield.root" ? "Earth Shield base art" : "Previous Perk Rank X";
    return <><div className="magic-art-context-icon is-muted"><Sparkles size={17} /></div><span className="tiny-label magic-arts-inspector-kicker">FUTURE PERK</span><h3>Future Perk</h3><p>Not available yet.</p><div className="magic-arts-perk-requirement"><span>Requires</span><strong>{prerequisite}</strong></div></>;
  }

  return <><div className="magic-art-context-icon"><Shield size={18} /></div><span className="tiny-label magic-arts-inspector-kicker">BASE MAGIC ART</span><h3>Earth Shield</h3><MagicArtStats art={earthShield} /></>;
}
