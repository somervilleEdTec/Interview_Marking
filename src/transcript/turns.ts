import type { TranscriptLine, TranscriptTurn } from "../model/types";

/** Build mark-alignment lines from timestamped turns only. */
export function turnsToLines(turns: TranscriptTurn[]): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  let n = 1;
  for (const t of turns) {
    if (t.startMs == null) continue;
    lines.push({
      n: n++,
      startMs: t.startMs,
      endMs: t.endMs ?? t.startMs,
      text: t.text,
    });
  }
  return lines;
}

export function linesToTurns(lines: TranscriptLine[]): TranscriptTurn[] {
  return lines.map((l) => ({
    startMs: l.startMs,
    endMs: l.endMs,
    speaker: null,
    text: l.text,
  }));
}

/** Format cue start for export Column A (empty if unknown). */
export function formatTurnTimestamp(startMs: number | null): string {
  if (startMs == null || !Number.isFinite(startMs)) return "";
  const totalSec = Math.max(0, Math.floor(startMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
