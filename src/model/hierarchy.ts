/** Hierarchy from punctuation: "risk.normalised" → parent "risk". */

export function codeParent(sheetName: string): string | null {
  const m = sheetName.match(/^(.*)[.\-_:/]([^.\-_:/]+)$/);
  return m ? m[1] : null;
}

export function groupCodesByParent<
  T extends { sheetName: string; parent: string | null },
>(codes: T[]): Map<string | null, T[]> {
  const map = new Map<string | null, T[]>();
  for (const c of codes) {
    const key = c.parent;
    const list = map.get(key) ?? [];
    list.push(c);
    map.set(key, list);
  }
  return map;
}
