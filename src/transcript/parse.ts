import type { TranscriptLine, TranscriptTurn } from "../model/types";
import { linesToTurns, turnsToLines } from "./turns";

function parseTimestamp(ts: string): number {
  // 00:01:02,345 or 00:01:02.345 or 01:02.345
  const norm = ts.trim().replace(",", ".");
  const parts = norm.split(":");
  let h = 0;
  let m = 0;
  let s = 0;
  if (parts.length === 3) {
    h = Number(parts[0]);
    m = Number(parts[1]);
    s = Number(parts[2]);
  } else if (parts.length === 2) {
    m = Number(parts[0]);
    s = Number(parts[1]);
  } else {
    s = Number(parts[0]);
  }
  return Math.round((h * 3600 + m * 60 + s) * 1000);
}

export function parseSrt(content: string): TranscriptLine[] {
  const blocks = content.replace(/\r\n/g, "\n").trim().split(/\n\n+/);
  const lines: TranscriptLine[] = [];
  let n = 1;
  for (const block of blocks) {
    const rows = block.split("\n").filter(Boolean);
    if (rows.length < 2) continue;
    const timeLine = rows[0].includes("-->") ? rows[0] : rows[1];
    if (!timeLine?.includes("-->")) continue;
    const [start, end] = timeLine.split("-->").map((s) => s.trim());
    const textRows = rows[0].includes("-->") ? rows.slice(1) : rows.slice(2);
    lines.push({
      n: n++,
      startMs: parseTimestamp(start),
      endMs: parseTimestamp(end),
      text: textRows.join(" ").trim(),
    });
  }
  return lines;
}

export function parseVtt(content: string): TranscriptLine[] {
  const cleaned = content.replace(/\r\n/g, "\n").replace(/^WEBVTT.*\n/, "");
  return parseSrt(cleaned);
}

/** Plain prose — no timestamps or speakers (merge export will refuse). */
export function parseTxt(content: string): TranscriptTurn[] {
  return content
    .replace(/\r\n/g, "\n")
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean)
    .map((text) => ({
      startMs: null,
      endMs: null,
      speaker: null,
      text,
    }));
}

/** `[MM:SS] I:/P:` turn paragraphs (DOCX / turn PDF text). */
export function parseSpeakerTurns(content: string): TranscriptTurn[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const turns: TranscriptTurn[] = [];
  const re = /^\[(\d{1,2}:\d{2})\]\s+([IP]):\s*(.*)$/;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(re);
    if (m) {
      turns.push({
        startMs: parseTimestamp(m[1]),
        endMs: null,
        speaker: m[2],
        text: m[3].trim(),
      });
    } else if (turns.length) {
      turns[turns.length - 1].text = `${turns[turns.length - 1].text} ${line}`.trim();
    }
  }
  return turns;
}

/** Numbered `N HH:MM:SS text` segments (numbered PDF). */
export function parseNumberedSegments(content: string): TranscriptTurn[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const turns: TranscriptTurn[] = [];
  const spaced = /^(\d+)\s+(\d{2}:\d{2}:\d{2})\s*(.*)$/;
  const glued = /^(\d+)(\d{2}:\d{2}:\d{2})(.*)$/;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(spaced) ?? line.match(glued);
    if (m) {
      turns.push({
        startMs: parseTimestamp(m[2]),
        endMs: null,
        speaker: null,
        text: (m[3] ?? "").trim(),
      });
    } else if (turns.length && !/^\d+$/.test(line)) {
      turns[turns.length - 1].text =
        `${turns[turns.length - 1].text} ${line}`.trim();
    }
  }
  return turns;
}

export function detectPdfFamily(
  content: string,
): "speaker" | "numbered" | "unknown" {
  const sample = content.slice(0, 4000);
  if (/\[\d{1,2}:\d{2}\]\s+[IP]:/.test(sample)) return "speaker";
  if (/\d+\s*\d{2}:\d{2}:\d{2}/.test(sample)) return "numbered";
  return "unknown";
}

export function parsePdfText(content: string): TranscriptTurn[] {
  const family = detectPdfFamily(content);
  if (family === "speaker") return parseSpeakerTurns(content);
  if (family === "numbered") return parseNumberedSegments(content);
  throw new Error(
    "Unrecognized PDF transcript layout — expected [MM:SS] I:/P: turns or numbered HH:MM:SS segments",
  );
}

export function srtOrVttToTurns(lines: TranscriptLine[]): TranscriptTurn[] {
  return linesToTurns(lines);
}

/**
 * Parse text-based transcript files (.srt/.vtt/.txt).
 * Binary .docx/.pdf use loadTranscriptFile instead.
 */
export function parseTranscriptFile(
  filename: string,
  content: string,
): TranscriptLine[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) {
    const turns = parseTxt(content);
    const lines = turnsToLines(turns);
    if (!lines.length) {
      throw new Error(
        "TXT files have no timestamps. Export SRT or VTT from your transcription tool for mark alignment.",
      );
    }
    return lines;
  }
  if (lower.endsWith(".vtt")) return parseVtt(content);
  if (lower.endsWith(".srt")) return parseSrt(content);
  throw new Error(
    "Unsupported transcript format — use .srt, .vtt, .txt, .docx, or .pdf",
  );
}

/** Parse any supported transcript into turns (text formats). */
export function parseTranscriptTurns(
  filename: string,
  content: string,
): TranscriptTurn[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) return parseTxt(content);
  if (lower.endsWith(".vtt")) return srtOrVttToTurns(parseVtt(content));
  if (lower.endsWith(".srt")) return srtOrVttToTurns(parseSrt(content));
  throw new Error(
    "Unsupported transcript format — use .srt, .vtt, .txt, .docx, or .pdf",
  );
}

export { parseTimestamp };
