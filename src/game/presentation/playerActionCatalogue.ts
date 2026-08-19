import type { PlayerActionDefinition, PlayerActionKind } from "../combat/combatTypes";
import { proficiencyById, proficiencyDefinitions } from "../data/proficiencies";
import { spellById } from "../data/spells";
import { weaponSkillById } from "../data/weaponSkills";

export type ActionCatalogueRootId =
  | "magic"
  | "weapon-skills"
  | "active-defense"
  | "consumables"
  | "core";

export interface PlayerActionGroupingMetadata {
  rootId: ActionCatalogueRootId;
  rootLabel: string;
  rootIcon?: string;
  subgroupId?: string;
  subgroupLabel?: string;
  subgroupIcon?: string;
}

export interface ActionCatalogueItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  actionKind: PlayerActionKind;
  groupId: string;
  subgroupId?: string;
  subtitle: string;
  keywords: string[];
  searchText: string;
  equipped: boolean;
  available: boolean;
  statusLabel?: string;
}

export interface ActionCatalogueGroup {
  id: string;
  label: string;
  icon?: string;
  itemCount: number;
  items?: ActionCatalogueItem[];
  children?: ActionCatalogueGroup[];
}

export interface ActionCatalogueItemState {
  equipped?: boolean;
  available?: boolean;
  statusLabel?: string;
}

export interface BuildPlayerActionCatalogueOptions {
  getItemState?: (action: PlayerActionDefinition) => ActionCatalogueItemState | undefined;
  getSubtitle?: (action: PlayerActionDefinition, grouping: PlayerActionGroupingMetadata) => string | undefined;
}

const rootPresentation: Record<ActionCatalogueRootId, { label: string; icon: string; order: number }> = {
  magic: { label: "MAGIC", icon: "spark", order: 0 },
  "weapon-skills": { label: "WEAPON SKILLS", icon: "sword", order: 1 },
  "active-defense": { label: "ACTIVE DEFENSE", icon: "shield", order: 2 },
  consumables: { label: "CONSUMABLES", icon: "heart", order: 3 },
  core: { label: "CORE", icon: "cross", order: 4 },
};

const resourceKeyword = (action: PlayerActionDefinition) => {
  const keywords: string[] = [];
  if ((action.resourceCost?.mana ?? 0) > 0) keywords.push("mana");
  if ((action.resourceCost?.stamina ?? 0) > 0) keywords.push("stamina");
  return keywords;
};

function resourceLabel(action: PlayerActionDefinition) {
  const costs = [
    (action.resourceCost?.mana ?? 0) > 0 ? `${action.resourceCost?.mana} Mana` : "",
    (action.resourceCost?.stamina ?? 0) > 0 ? `${action.resourceCost?.stamina} Stamina` : "",
  ].filter(Boolean);
  return costs.join(" · ");
}

export function getPlayerActionGroupingMetadata(
  action: PlayerActionDefinition,
): PlayerActionGroupingMetadata {
  if (action.kind === "spell") {
    const spell = action.sourceSpellId ? spellById[action.sourceSpellId] : undefined;
    const proficiencyId = spell?.magicProficiencyId;
    const proficiency = proficiencyId ? proficiencyById[proficiencyId] : undefined;
    return {
      rootId: "magic",
      rootLabel: rootPresentation.magic.label,
      rootIcon: rootPresentation.magic.icon,
      subgroupId: `magic.${proficiencyId ?? "unknown"}`,
      subgroupLabel: proficiency?.name ?? "Unknown Magic",
      subgroupIcon: proficiency?.icon ?? "spark",
    };
  }

  if (action.kind === "magic-art") {
    return {
      rootId: "magic",
      rootLabel: "MAGIC",
      rootIcon: "sparkles",
      subgroupId: "magic-arts",
      subgroupLabel: "Magic Arts",
      subgroupIcon: "sparkles",
    };
  }

  if (action.kind === "weapon-skill") {
    const skill = action.sourceWeaponSkillId ? weaponSkillById[action.sourceWeaponSkillId] : undefined;
    const proficiencyId = skill?.proficiencyId;
    const proficiency = proficiencyId ? proficiencyById[proficiencyId] : undefined;
    return {
      rootId: "weapon-skills",
      rootLabel: rootPresentation["weapon-skills"].label,
      rootIcon: rootPresentation["weapon-skills"].icon,
      subgroupId: `weapon.${proficiencyId ?? "unknown"}`,
      subgroupLabel: proficiency?.name ?? "Unknown Weapon",
      subgroupIcon: proficiency?.icon ?? "sword",
    };
  }

  if (action.kind === "defensive") {
    return {
      rootId: "active-defense",
      rootLabel: rootPresentation["active-defense"].label,
      rootIcon: rootPresentation["active-defense"].icon,
    };
  }

  if (action.kind === "consumable") {
    return {
      rootId: "consumables",
      rootLabel: rootPresentation.consumables.label,
      rootIcon: rootPresentation.consumables.icon,
    };
  }

  return {
    rootId: "core",
    rootLabel: rootPresentation.core.label,
    rootIcon: rootPresentation.core.icon,
  };
}

function distinct(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export function buildPlayerActionCatalogue(
  actions: readonly PlayerActionDefinition[],
  options: BuildPlayerActionCatalogueOptions = {},
): ActionCatalogueGroup[] {
  const roots = new Map<string, ActionCatalogueGroup>();
  const childMaps = new Map<string, Map<string, ActionCatalogueGroup>>();

  for (const action of actions) {
    const grouping = getPlayerActionGroupingMetadata(action);
    const root = roots.get(grouping.rootId) ?? {
      id: grouping.rootId,
      label: grouping.rootLabel,
      icon: grouping.rootIcon,
      itemCount: 0,
      items: [],
      children: [],
    };
    roots.set(grouping.rootId, root);

    const state = options.getItemState?.(action) ?? {};
    const cost = resourceLabel(action);
    const subgroupLabel = grouping.subgroupLabel;
    const subtitle = options.getSubtitle?.(action, grouping) ??
      `${subgroupLabel ?? grouping.rootLabel}${cost ? ` · ${cost}` : ""}`.trim();
    const metadataKeywords = [
      action.id,
      action.name,
      action.description,
      grouping.rootLabel,
      grouping.subgroupLabel ?? "",
      ...resourceKeyword(action),
    ];
    if (action.sourceWeaponSkillId) metadataKeywords.push(...(weaponSkillById[action.sourceWeaponSkillId]?.tags ?? []));
    const item: ActionCatalogueItem = {
      id: action.id,
      name: action.name,
      description: action.description,
      icon: action.icon ?? grouping.subgroupIcon ?? grouping.rootIcon ?? "spark",
      actionKind: action.kind,
      groupId: grouping.subgroupId ?? grouping.rootId,
      subgroupId: grouping.subgroupId,
      subtitle,
      keywords: distinct(metadataKeywords),
      searchText: distinct(metadataKeywords).join(" "),
      equipped: state.equipped ?? false,
      available: state.available ?? true,
      statusLabel: state.statusLabel,
    };

    if (!grouping.subgroupId) {
      root.items = [...(root.items ?? []), item];
      root.itemCount += 1;
      continue;
    }

    let children = childMaps.get(grouping.rootId);
    if (!children) {
      children = new Map<string, ActionCatalogueGroup>();
      childMaps.set(grouping.rootId, children);
    }
    let child = children.get(grouping.subgroupId);
    if (!child) {
      child = {
        id: grouping.subgroupId,
        label: grouping.subgroupLabel ?? grouping.subgroupId,
        icon: grouping.subgroupIcon,
        itemCount: 0,
        items: [],
      };
      children.set(grouping.subgroupId, child);
      root.children = [...(root.children ?? []), child];
    }
    child.items = [...(child.items ?? []), item];
    child.itemCount += 1;
    root.itemCount += 1;
  }

  return [...roots.values()]
    .sort((left, right) => (rootPresentation[left.id as ActionCatalogueRootId]?.order ?? 99) - (rootPresentation[right.id as ActionCatalogueRootId]?.order ?? 99))
    .map((root) => {
      const orderedChildren = [...(root.children ?? [])].sort((left, right) => {
        const leftId = left.id.replace(/^magic\.|^weapon\./, "");
        const rightId = right.id.replace(/^magic\.|^weapon\./, "");
        const leftIndex = proficiencyDefinitions.findIndex((definition) => definition.id === leftId);
        const rightIndex = proficiencyDefinitions.findIndex((definition) => definition.id === rightId);
        return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
          (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
      });
      return {
        ...root,
        items: root.items?.length ? root.items : undefined,
        children: orderedChildren.length ? orderedChildren : undefined,
      };
    });
}

export function catalogueGroupContainsQuery(group: ActionCatalogueGroup, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return (group.items ?? []).some((item) => item.searchText.includes(normalizedQuery)) ||
    (group.children ?? []).some((child) => catalogueGroupContainsQuery(child, normalizedQuery));
}

export function catalogueItemMatchesQuery(item: ActionCatalogueItem, normalizedQuery: string) {
  return !normalizedQuery || item.searchText.includes(normalizedQuery);
}
