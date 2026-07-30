import type { TranscriptLine } from "../model/types";

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

export function parseTranscriptFile(
  filename: string,
  content: string,
): TranscriptLine[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".txt")) {
    throw new Error(
      "TXT files have no timestamps. Export SRT or VTT from your transcription tool.",
    );
  }
  if (lower.endsWith(".vtt")) return parseVtt(content);
  if (lower.endsWith(".srt")) return parseSrt(content);
  throw new Error("Unsupported transcript format — use .srt or .vtt");
}
