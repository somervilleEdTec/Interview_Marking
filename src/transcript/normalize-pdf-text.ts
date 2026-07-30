/**
 * Repair common PDF text-extract artifacts where ligature glyphs were mapped
 * to the wrong Unicode code points (e.g. "parƟcipant", "aŌerwards", "beƩer").
 * Also expands standard Unicode ligatures. Does not invent wording beyond
 * replacing known glyph→letter sequences.
 */
const PDF_LIGATURE_FIXES: ReadonlyArray<readonly [string, string]> = [
  // Mis-mapped ligatures seen in Word/PDF exports (ToUnicode quirks)
  ["Ɵ", "ti"], // U+019F → ti (participant, question, time, …)
  ["Ō", "ft"], // U+014C → ft (after, left, …)
  ["Ʃ", "tt"], // U+01A9 → tt (better, written, …)
  ["ƫ", "tti"], // U+01AB → tti (putting, …)
  // Standard Unicode ligature code points
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
