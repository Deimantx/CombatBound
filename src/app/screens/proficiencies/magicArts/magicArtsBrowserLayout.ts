import type { MagicArtId } from "../../../../game/magicArts/magicArtTypes";

export interface MagicArtsBrowserNodeLayout {
  id: string;
  kind: "art" | "placeholder";
  artId?: MagicArtId;
  label: string;
  x: number;
  y: number;
  accent: string;
}

export const magicArtsBrowserLayout: MagicArtsBrowserNodeLayout[] = [
  { id: "magic-art.earth-shield", kind: "art", artId: "magic-art.earth-shield", label: "Earth Shield", x: 13, y: 23, accent: "earth" },
  { id: "magic-art-placeholder-02", kind: "placeholder", label: "Future Magic Art", x: 36, y: 13, accent: "blue" },
  { id: "magic-art-placeholder-03", kind: "placeholder", label: "Future Magic Art", x: 62, y: 18, accent: "violet" },
  { id: "magic-art-placeholder-04", kind: "placeholder", label: "Future Magic Art", x: 86, y: 11, accent: "gold" },
  { id: "magic-art-placeholder-05", kind: "placeholder", label: "Future Magic Art", x: 23, y: 47, accent: "blue" },
  { id: "magic-art-placeholder-06", kind: "placeholder", label: "Future Magic Art", x: 48, y: 39, accent: "earth" },
  { id: "magic-art-placeholder-07", kind: "placeholder", label: "Future Magic Art", x: 75, y: 48, accent: "violet" },
  { id: "magic-art-placeholder-08", kind: "placeholder", label: "Future Magic Art", x: 94, y: 39, accent: "blue" },
  { id: "magic-art-placeholder-09", kind: "placeholder", label: "Future Magic Art", x: 8, y: 72, accent: "gold" },
  { id: "magic-art-placeholder-10", kind: "placeholder", label: "Future Magic Art", x: 34, y: 68, accent: "violet" },
  { id: "magic-art-placeholder-11", kind: "placeholder", label: "Future Magic Art", x: 59, y: 76, accent: "blue" },
  { id: "magic-art-placeholder-12", kind: "placeholder", label: "Future Magic Art", x: 84, y: 68, accent: "earth" },
  { id: "magic-art-placeholder-13", kind: "placeholder", label: "Future Magic Art", x: 16, y: 92, accent: "blue" },
  { id: "magic-art-placeholder-14", kind: "placeholder", label: "Future Magic Art", x: 43, y: 91, accent: "gold" },
  { id: "magic-art-placeholder-15", kind: "placeholder", label: "Future Magic Art", x: 69, y: 94, accent: "violet" },
  { id: "magic-art-placeholder-16", kind: "placeholder", label: "Future Magic Art", x: 92, y: 88, accent: "blue" },
];

export const magicArtsBrowserConnections = [
  ["magic-art.earth-shield", "magic-art-placeholder-06"],
  ["magic-art-placeholder-02", "magic-art-placeholder-06"],
  ["magic-art-placeholder-03", "magic-art-placeholder-06"],
  ["magic-art-placeholder-03", "magic-art-placeholder-07"],
  ["magic-art-placeholder-04", "magic-art-placeholder-08"],
  ["magic-art-placeholder-05", "magic-art-placeholder-06"],
  ["magic-art-placeholder-06", "magic-art-placeholder-07"],
  ["magic-art-placeholder-07", "magic-art-placeholder-08"],
  ["magic-art-placeholder-05", "magic-art-placeholder-10"],
  ["magic-art-placeholder-07", "magic-art-placeholder-11"],
  ["magic-art-placeholder-08", "magic-art-placeholder-12"],
  ["magic-art-placeholder-09", "magic-art-placeholder-10"],
  ["magic-art-placeholder-10", "magic-art-placeholder-11"],
  ["magic-art-placeholder-11", "magic-art-placeholder-12"],
  ["magic-art-placeholder-09", "magic-art-placeholder-13"],
  ["magic-art-placeholder-10", "magic-art-placeholder-14"],
  ["magic-art-placeholder-11", "magic-art-placeholder-15"],
  ["magic-art-placeholder-12", "magic-art-placeholder-16"],
] as const;

export const earthShieldSpecializationNodes = Array.from({ length: 22 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 22;
  const radius = index % 3 === 0 ? 29 : index % 3 === 1 ? 41 : 52;
  return {
    id: `earth-shield.preview.${String(index + 1).padStart(2, "0")}`,
    x: 50 + Math.cos(angle) * radius,
    y: 50 + Math.sin(angle) * radius * 0.72,
    label: "Design Placeholder",
  };
});
