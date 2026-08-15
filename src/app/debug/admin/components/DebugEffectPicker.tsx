import { useMemo, useState } from "react";
import { effectById, effectDefinitions } from "../../../../game/data/effects";
import type { DebugEffectTarget } from "../../../../game/debug/debugTypes";
import { buildEffectDefinitionTooltip } from "../../../../game/presentation/tooltipBuilders";
import { buildEffectCatalogue, classifyEffect, effectCatalogueCategories, effectSearchText, type EffectCatalogueCategory } from "../../../../game/presentation/effectCatalogue";
import { SearchField } from "../../../components/SearchField";
import { DebugButton } from "./DebugButton";
import { DebugCatalogueGroup } from "./DebugCatalogueGroup";
import { DebugCatalogueIdentity } from "./DebugCatalogueIdentity";
import { DebugFilterBar } from "./DebugFilterBar";

export function DebugEffectPicker({
  variant,
  defaultTarget = "selected-enemy",
  enemyAvailable = true,
  onApply,
}: {
  variant: "full" | "dock";
  defaultTarget?: DebugEffectTarget;
  enemyAvailable?: boolean;
  onApply: (effectId: string, target: DebugEffectTarget) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<EffectCatalogueCategory>("all");
  const [effectId, setEffectId] = useState(effectDefinitions[0]?.id ?? "");
  const [target, setTarget] = useState<DebugEffectTarget>(defaultTarget);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const normalized = search.trim().toLowerCase();
  const visibleEffects = useMemo(
    () => effectDefinitions.filter((effect) => (!normalized || effectSearchText(effect).includes(normalized)) && (category === "all" || classifyEffect(effect) === category)),
    [category, normalized],
  );
  const grouped = useMemo(() => buildEffectCatalogue(visibleEffects), [visibleEffects]);
  const selectedEffect = effectById[effectId];
  const selectedEnemyDisabled = target === "selected-enemy" && !enemyAvailable;

  return <div className={`debug-effect-picker debug-effect-picker-${variant}`} data-debug-kind="debug-effect-picker" data-debug-variant={variant}>
    <div className="debug-effect-picker-toolbar">
      <SearchField value={search} onChange={setSearch} placeholder="Search effects..." label="Search effects" debugKind="debug-effect-search" />
      <DebugFilterBar values={effectCatalogueCategories.map((entry) => entry.id)} value={category} onChange={setCategory} labels={Object.fromEntries(effectCatalogueCategories.map((entry) => [entry.id, entry.id === "all" ? "ALL" : entry.label.toUpperCase()])) as Partial<Record<EffectCatalogueCategory, string>>} />
    </div>
    <div className="debug-effect-tool">
      <select value={effectId} onChange={(event) => setEffectId(event.target.value)} aria-label="Effect to apply" data-debug-kind="debug-effect-select">
        <option value="">NO EFFECT SELECTED</option>
        {grouped.map((group) => <optgroup key={group.id} label={group.label}>{group.effects.map((effect) => <option key={effect.id} value={effect.id}>{effect.name}</option>)}</optgroup>)}
      </select>
      <select value={target} onChange={(event) => setTarget(event.target.value as DebugEffectTarget)} aria-label="Effect target">
        <option value="player">PLAYER</option>
        <option value="selected-enemy" disabled={!enemyAvailable}>SELECTED ENEMY</option>
      </select>
      <DebugButton action="apply-effect" disabled={!selectedEffect || selectedEnemyDisabled} onClick={() => selectedEffect && onApply(selectedEffect.id, target)}>APPLY</DebugButton>
    </div>
    <div className="debug-catalogue debug-catalogue-tree">
      {grouped.map((group) => {
        const id = `debug.effects.${group.id}`;
        const open = normalized ? true : expandedGroups[id] ?? true;
        return <DebugCatalogueGroup key={id} id={id} label={group.label} count={group.effects.length} icon={group.icon} expanded={open} onToggle={() => setExpandedGroups((current) => ({ ...current, [id]: !open }))} debugGroupType="effects">
          {group.effects.map((effect) => <div className="debug-catalogue-row" key={effect.id} data-debug-kind="debug-effect" data-debug-effect-id={effect.id}>
            <DebugCatalogueIdentity tooltip={buildEffectDefinitionTooltip(effect)} icon={effect.icon} variant={effect.kind === "barrier" ? "blue" : effect.kind === "buff" ? "gold" : "red"} kind="debug-effect-identity" targetId={effect.id} label={effect.name}>
              <strong>{effect.name}</strong><small>{effect.id} - {effect.kind} - {effect.tags.join(" - ")}</small>
            </DebugCatalogueIdentity>
            <button type="button" onClick={() => onApply(effect.id, target)} disabled={selectedEnemyDisabled} data-debug-kind="debug-action" data-debug-action="apply-effect" data-debug-effect-id={effect.id}>APPLY</button>
          </div>)}
        </DebugCatalogueGroup>;
      })}
    </div>
  </div>;
}
