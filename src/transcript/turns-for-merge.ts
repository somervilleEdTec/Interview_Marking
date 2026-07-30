import type { Session, TranscriptTurn } from "../model/types";
import { linesToTurns } from "./turns";

function isTimed(t: TranscriptTurn): boolean {
  return typeof t.startMs === "number" && Number.isFinite(t.startMs);
}

export function countTimedTurns(turns: TranscriptTurn[] | undefined): number {
  return turns?.filter(isTimed).length ?? 0;
}

/**
 * Prefer transcript turns that carry real timestamps; fall back to cue lines.
 * Treats empty transcriptTurns as missing so lines can still be used.
 */
export function turnsForMerge(session: Session): TranscriptTurn[] {
  const turns = session.transcriptTurns;
  if (turns?.length && countTimedTurns(turns) > 0) return turns;
  if (session.transcript?.length) return linesToTurns(session.transcript);
  return turns?.length ? turns : [];
}

export function sessionHasTimedTranscript(session: Session): boolean {
  if (countTimedTurns(session.transcriptTurns) > 0) return true;
  return (session.transcript?.length ?? 0) > 0;
}
