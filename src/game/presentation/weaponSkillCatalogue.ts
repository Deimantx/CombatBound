import { proficiencyById, proficiencyDefinitions } from "../data/proficiencies";
import { weaponSkillDefinitions, type WeaponSkillDefinition } from "../data/weaponSkills";
import type { WeaponProficiencyId } from "../progression/progressionTypes";

export interface WeaponSkillGroup {
  proficiencyId: WeaponProficiencyId;
  name: string;
  icon: string;
  skills: WeaponSkillDefinition[];
}

/**
 * Builds authored weapon groups from the skill data. The proficiency catalogue
 * supplies presentation and canonical ordering, so adding a skill for an
 * existing weapon never requires a UI change.
 */
export function getWeaponSkillGroups(
  skills: readonly WeaponSkillDefinition[] = weaponSkillDefinitions,
): WeaponSkillGroup[] {
  const grouped = new Map<WeaponProficiencyId, WeaponSkillDefinition[]>();
  for (const skill of skills) {
    const current = grouped.get(skill.proficiencyId) ?? [];
    current.push(skill);
    grouped.set(skill.proficiencyId, current);
  }

  const canonicalOrder = proficiencyDefinitions
    .filter((definition) => definition.category === "melee" || definition.category === "ranged")
    .map((definition) => definition.id as WeaponProficiencyId);

  return [...grouped.entries()]
    .sort(([left], [right]) => {
      const leftIndex = canonicalOrder.indexOf(left);
      const rightIndex = canonicalOrder.indexOf(right);
      return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex);
    })
    .map(([proficiencyId, authoredSkills]) => {
      const definition = proficiencyById[proficiencyId];
      return {
        proficiencyId,
        name: definition?.name ?? proficiencyId,
        icon: definition?.icon ?? "sword",
        skills: authoredSkills,
      };
    });
}
