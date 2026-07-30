/**
 * Repair common PDF text-extract artifacts where ligature glyphs were mapped
 * to the wrong Unicode code points (e.g. "parƟcipant", "aŌerwards", "beƩer").
 */
const PDF_LIGATURE_FIXES: ReadonlyArray<readonly [string, string]> = [
  ["Ɵ", "ti"],
  ["Ō", "ft"],
  ["Ʃ", "tt"],
  ["ƫ", "tti"],
  ["ﬁ", "fi"],
  ["ﬂ", "fl"],
  ["ﬀ", "ff"],
  ["ﬃ", "ffi"],
  ["ﬄ", "ffl"],
  ["ﬅ", "ft"],
  ["ﬆ", "st"],
];

export function normalizePdfText(text: string): string {
  let out = text;
  for (const [from, to] of PDF_LIGATURE_FIXES) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}
