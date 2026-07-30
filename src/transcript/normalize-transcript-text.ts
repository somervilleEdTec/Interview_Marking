/**
 * Normalize transcript text for accurate imports and exports.
 * Fixes PDF ligature mis-maps, expands Unicode ligatures, strips
 * caption markup / invisible junk that shows as strange symbols in Word.
 */

/** PDF extractors often map ligature glyphs to the wrong code points. */
const PDF_LIGATURE_MISMAPS: ReadonlyArray<readonly [string, string]> = [
  ["Ɵ", "ti"],
  ["Ō", "ft"],
  ["Ʃ", "tt"],
  ["ƫ", "tti"],
];

/** Alphabetic Presentation Forms → ASCII (U+FB00–U+FB06). */
const UNICODE_LIGATURES: ReadonlyArray<readonly [string, string]> = [
  ["ﬁ", "fi"],
  ["ﬂ", "fl"],
  ["ﬀ", "ff"],
  ["ﬃ", "ffi"],
  ["ﬄ", "ffl"],
  ["ﬅ", "ft"],
  ["ﬆ", "st"],
];

const HTML_ENTITIES: ReadonlyArray<readonly [RegExp, string]> = [
  [/&nbsp;/gi, " "],
  [/&amp;/gi, "&"],
  [/&lt;/gi, "<"],
  [/&gt;/gi, ">"],
  [/&quot;/gi, '"'],
  [/&#39;/gi, "'"],
  [/&apos;/gi, "'"],
];

function applyPairs(
  text: string,
  pairs: ReadonlyArray<readonly [string, string]>,
): string {
  let out = text;
  for (const [from, to] of pairs) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out;
}

/** Expand ligatures; absorb a spurious space after the ligature (“ﬁ eld” → “field”). */
function expandLigatures(text: string): string {
  let out = text;
  for (const [from, to] of [
    ...PDF_LIGATURE_MISMAPS,
    ...UNICODE_LIGATURES,
  ] as const) {
    if (!out.includes(from)) continue;
    out = out.split(from + " ").join(to);
    out = out.split(from).join(to);
  }
  return out;
}

/** Strip known SRT/VTT/SSA cue tags only (keep literal <…> text). */
function stripCaptionMarkup(text: string): string {
  return text
    .replace(/\{\\[^}]+\}/g, "")
    .replace(
      /<\/?(?:i|b|u|font|c|v|lang|ruby|rt)(?:[\s.][^>]*)?\s*>/gi,
      "",
    );
}

/**
 * Clean one transcript string for storage or export.
 * Safe for English interview transcripts (SRT/VTT/DOCX/PDF/TXT).
 */
export function normalizeTranscriptText(text: string): string {
  if (!text) return text;
  let out = text;

  // BOM / soft hyphens / zero-width / word joiner / BOM-like
  out = out.replace(/[\uFEFF\u00AD\u200B-\u200D\u2060\uFFFD]/g, "");

  // C0/C1 controls except tab/LF/CR — often render as boxes in Word
  out = out.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");

  // Private Use Area — common broken PDF font fallbacks
  out = out.replace(/[\uE000-\uF8FF]/g, "");

  out = expandLigatures(out);

  for (const [re, to] of HTML_ENTITIES) {
    out = out.replace(re, to);
  }
  out = stripCaptionMarkup(out);

  // Collapse runs of spaces/tabs left by tag stripping (keep newlines)
  out = out.replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").trim();

  return out;
}

/** @deprecated Prefer normalizeTranscriptText — kept for call-site clarity on PDF path. */
export function normalizePdfText(text: string): string {
  return normalizeTranscriptText(text);
}

export { applyPairs, PDF_LIGATURE_MISMAPS, UNICODE_LIGATURES };
