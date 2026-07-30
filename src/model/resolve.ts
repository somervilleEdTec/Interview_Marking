import type { Mark, Session, TimeWindow, TranscriptLine } from "./types";
import { markAtToMs } from "./time";
import { normalizeTranscriptText } from "../transcript/normalize-transcript-text";

/** Mark interview time → recording timeline ms (plus manual alignment offset). */
export function markToRecordingMs(
  markAtMs: number,
  recordingOffsetSec: number,
): number {
  return markAtMs + recordingOffsetSec * 1000;
}

export function resolveMarkLines(
  mark: Mark,
  session: Session,
  transcript: TranscriptLine[],
): { lineStart: number; lineEnd: number; text: string } | null {
  if (!transcript.length) return null;
  const atMs = markAtToMs(mark.at, session.startedAt);
  const center = markToRecordingMs(atMs, session.recordingOffsetSec);
  const from = center - mark.window.before * 1000;
  const to = center + mark.window.after * 1000;
  const lines = transcript.filter((l) => l.endMs >= from && l.startMs <= to);
  if (!lines.length) return null;
  return {
    lineStart: lines[0].n,
    lineEnd: lines[lines.length - 1].n,
    text: normalizeTranscriptText(lines.map((l) => l.text).join(" ")),
  };
}

export const DEFAULT_WINDOW: TimeWindow = { before: 45, after: 15 };
