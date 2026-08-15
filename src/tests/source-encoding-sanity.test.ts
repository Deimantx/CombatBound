import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const brokenSequences = [
  "\u00c3\u201a\u00c2\u00b7",
  "\u00c3\u0192\u00e2\u20ac\u201d",
  "\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u009d",
  "\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u0153",
  "\u00c3\u00a2\u00e2\u20ac\u00a2",
  "\u00c3\u00a2\u00e2\u20ac\u2122",
  "\u00c3\u00a2\u00e2\u20ac\u0153",
  "\u00c3\u00a2\u00e2\u20ac\ufffd",
  "\u00c3\u00af\u00c2\u00bf\u00c2\u00bd",
  "\u00ef\u00bf\u00bd",
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(entry.name) ? [path] : [];
  });
}

describe("source encoding", () => {
  it("contains no known mojibake sequences", () => {
    const root = join(process.cwd(), "src");
    const failures = sourceFiles(root).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return brokenSequences.filter((sequence) => source.includes(sequence)).map((sequence) => `${path}: ${sequence}`);
    });
    expect(failures).toEqual([]);
  });

  it("does not treat ordinary Unicode as broken by default", () => {
    expect("· × → %").not.toContain(String.fromCodePoint(0x00c3, 0x201a));
    expect(statSync(join(process.cwd(), "src")).isDirectory()).toBe(true);
  });
});
