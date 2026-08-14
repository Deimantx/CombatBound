import type { MagicProficiencyId } from "../progression/progressionTypes";

export interface MagicSchoolPresentation {
  id: MagicProficiencyId;
  label: string;
  fullLabel: string;
  icon: string;
  description: string;
  accent: string;
}

const schools: Record<MagicProficiencyId, MagicSchoolPresentation> = {
  "fire-magic": { id: "fire-magic", label: "Fire", fullLabel: "Fire Magic", icon: "spark", description: "Direct damage and burning pressure.", accent: "fire" },
  "water-magic": { id: "water-magic", label: "Water", fullLabel: "Water Magic", icon: "droplets", description: "Control, chilling and elemental setup.", accent: "water" },
  "air-magic": { id: "air-magic", label: "Air", fullLabel: "Air Magic", icon: "zap", description: "Disruption and fast combat control.", accent: "air" },
  "earth-magic": { id: "earth-magic", label: "Earth", fullLabel: "Earth Magic", icon: "mountain", description: "Armor-breaking force and stability.", accent: "earth" },
  "light-magic": { id: "light-magic", label: "Light", fullLabel: "Light Magic", icon: "sun", description: "Wards, barriers and recovery.", accent: "light" },
  "darkness-magic": { id: "darkness-magic", label: "Darkness", fullLabel: "Darkness Magic", icon: "moon", description: "Decay and exploitative shadow damage.", accent: "darkness" },
};

export const magicSchoolOrder: MagicProficiencyId[] = [
  "fire-magic",
  "water-magic",
  "air-magic",
  "earth-magic",
  "light-magic",
  "darkness-magic",
];

export function getMagicSchoolPresentation(id: MagicProficiencyId) {
  return schools[id];
}
