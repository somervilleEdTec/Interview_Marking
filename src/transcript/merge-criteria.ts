import type { Mark, TranscriptTurn } from "../model/types";
import { markAtToMs } from "../model/time";
import { markToRecordingMs } from "../model/resolve";
import { formatTurnTimestamp } from "./turns";

export interface MergedRow {
  timestamp: string;
  criteria: string;
  speaker: string;
  response: string;
}

/**
 * Link each coded mark to the nearest transcript turn start.
 * Does not invent speakers, times, criteria, or response text.
 */
export function mergeCriteriaByNearestTimestamp(
  turns: TranscriptTurn[],
  marks: Mark[],
  recordingOffsetSec: number,
  startedAtIso?: string,
): MergedRow[] {
  const timed = turns
    .map((t, index) => ({ t, index }))
    .filter((x) => x.t.startMs != null) as {
    t: TranscriptTurn & { startMs: number };
    index: number;
  }[];

  if (!timed.length) {
    throw new Error(
      "Transcript has no timestamps — cannot merge criteria by time",
    );
  }

  const criteriaByTurn = new Map<number, string[]>();

  const coded = marks
    .filter((m) => !m.dropped && m.codeRef)
    .map((m) => ({
      mark: m,
      t: markToRecordingMs(
        markAtToMs(m.at, startedAtIso),
        recordingOffsetSec,
      ),
    }))
    .sort((a, b) => a.t - b.t);

  for (const { mark, t } of coded) {
    let bestIdx = timed[0].index;
    let bestDist = Math.abs(timed[0].t.startMs - t);
    for (let i = 1; i < timed.length; i++) {
      const dist = Math.abs(timed[i].t.startMs - t);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = timed[i].index;
      }
      // equal distance: keep earlier turn (already chosen)
    }
    const list = criteriaByTurn.get(bestIdx) ?? [];
    if (!list.includes(mark.codeRef!)) list.push(mark.codeRef!);
    criteriaByTurn.set(bestIdx, list);
  }

  return turns.map((turn, index) => ({
    timestamp: formatTurnTimestamp(turn.startMs),
    criteria: (criteriaByTurn.get(index) ?? []).join("; "),
    speaker: turn.speaker ?? "",
    response: turn.text,
  }));
}
