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

export const earthShieldSpecializationNodes = Array.from({ length: 22 }, (_, index) => {
  const positions = [
    [31, 34], [39, 27], [50, 25], [61, 28], [69, 35],
    [25, 46], [36, 43], [48, 42], [61, 43], [75, 47],
    [29, 58], [42, 57], [55, 58], [68, 60], [79, 65],
    [35, 72], [48, 70], [61, 73], [72, 77], [46, 84], [60, 85], [77, 84],
  ] as const;
  const prerequisites = [
    ["earth-shield.root"], ["earth-shield.root"], ["earth-shield.root"], ["earth-shield.root"], ["earth-shield.root"],
    ["earth-shield.preview.01"], ["earth-shield.preview.02"], ["earth-shield.preview.03"], ["earth-shield.preview.03"], ["earth-shield.preview.05"],
    ["earth-shield.preview.06"], ["earth-shield.preview.07"], ["earth-shield.preview.08"], ["earth-shield.preview.09"], ["earth-shield.preview.10"],
    ["earth-shield.preview.11"], ["earth-shield.preview.12"], ["earth-shield.preview.13"], ["earth-shield.preview.14"], ["earth-shield.preview.16"], ["earth-shield.preview.17"], ["earth-shield.preview.19"],
  ] as const;
  const [x, y] = positions[index];
  return {
    id: `earth-shield.preview.${String(index + 1).padStart(2, "0")}`,
    x,
    y,
    label: "Future Perk",
    prerequisiteIds: prerequisites[index],
  };
});

export const earthShieldSpecializationEdges = earthShieldSpecializationNodes.flatMap((node) => node.prerequisiteIds.map((from) => ({ from, to: node.id })));
