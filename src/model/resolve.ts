import type { Mark, Session, TimeWindow, TranscriptLine } from "./types";

/** Convert wall-clock mark time into recording-relative ms. */
export function markToRecordingMs(
  markAtIso: string,
  sessionStartedAtIso: string,
  recordingOffsetSec: number,
): number {
  const markMs = Date.parse(markAtIso);
  const startMs = Date.parse(sessionStartedAtIso);
  return markMs - startMs + recordingOffsetSec * 1000;
}

export function resolveMarkLines(
  mark: Mark,
  session: Session,
  transcript: TranscriptLine[],
): { lineStart: number; lineEnd: number; text: string } | null {
  if (!transcript.length) return null;
  const center = markToRecordingMs(
    mark.at,
    session.startedAt,
    session.recordingOffsetSec,
  );
  const from = center - mark.window.before * 1000;
  const to = center + mark.window.after * 1000;
  const lines = transcript.filter((l) => l.endMs >= from && l.startMs <= to);
  if (!lines.length) return null;
  return {
    lineStart: lines[0].n,
    lineEnd: lines[lines.length - 1].n,
    text: lines.map((l) => l.text).join(" "),
  };
}

export const DEFAULT_WINDOW: TimeWindow = { before: 45, after: 15 };
