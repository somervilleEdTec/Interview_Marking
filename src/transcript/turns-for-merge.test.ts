import { describe, it, expect } from "vitest";
import { turnsForMerge, sessionHasTimedTranscript } from "./turns-for-merge";
import { mergeCriteriaByNearestTimestamp } from "./merge-criteria";
import { parseTxt, parseSrt, parseSpeakerTurns } from "./parse";
import { srtOrVttToTurns } from "./parse";
import type { Mark, Session, TranscriptTurn } from "../model/types";

const mark = (at: number, codeRef: string): Mark => ({
  id: "m1",
  at,
  slot: "A",
  codeRef,
  window: { before: 45, after: 15 },
  dropped: false,
  note: "",
});

function session(partial: Partial<Session>): Session {
  return {
    id: "s1",
    participantNumber: "P1",
    interviewNumber: "1",
    startedAt: new Date().toISOString(),
    defaultWindow: { before: 45, after: 15 },
    marks: [mark(50_000, "risk")],
    recordingOffsetSec: 0,
    armed: false,
    ...partial,
  };
}

describe("turnsForMerge", () => {
  it("falls back to transcript lines when turns lack timestamps", () => {
    const untimed: TranscriptTurn[] = [
      { startMs: null, endMs: null, speaker: null, text: "prose" },
    ];
    const s = session({
      transcriptTurns: untimed,
      transcript: [
        { n: 1, startMs: 1000, endMs: 2000, text: "Hello" },
        { n: 2, startMs: 50_000, endMs: 51_000, text: "World" },
      ],
    });
    const turns = turnsForMerge(s);
    expect(turns[0].startMs).toBe(1000);
    expect(sessionHasTimedTranscript(s)).toBe(true);
    const rows = mergeCriteriaByNearestTimestamp(turns, s.marks, 0);
    expect(rows[1].criteria).toBe("risk");
  });

  it("uses empty-array turns as missing and falls back to lines", () => {
    const s = session({
      transcriptTurns: [],
      transcript: [{ n: 1, startMs: 0, endMs: 1000, text: "Hi" }],
    });
    expect(turnsForMerge(s)).toHaveLength(1);
  });

  it("disables merge eligibility for prose-only turns", () => {
    const s = session({
      transcriptTurns: parseTxt("Just prose without times.\n\nMore prose."),
      transcript: undefined,
    });
    expect(sessionHasTimedTranscript(s)).toBe(false);
  });
});

describe("load + merge timestamped formats", () => {
  it("merges SRT and speaker-turn content", () => {
    const srt = `1
00:00:01,000 --> 00:00:02,000
Hello

2
00:00:50,000 --> 00:00:51,000
World
`;
    const srtTurns = srtOrVttToTurns(parseSrt(srt));
    expect(
      mergeCriteriaByNearestTimestamp(srtTurns, [mark(50_000, "risk")], 0).some(
        (r) => r.criteria === "risk",
      ),
    ).toBe(true);

    const speaker = parseSpeakerTurns(
      "[00:00] I: Hello\n[00:50] P: World",
    );
    expect(
      mergeCriteriaByNearestTimestamp(speaker, [mark(50_000, "risk")], 0).some(
        (r) => r.criteria === "risk",
      ),
    ).toBe(true);
  });

  it("sniffs speaker-turn TXT as timestamped", () => {
    const turns = parseTxt("[00:00] I: Hello there.\n[00:22] P: Yeah fine.");
    expect(turns).toHaveLength(2);
    expect(turns[0].startMs).toBe(0);
    expect(turns[1].speaker).toBe("P");
  });
});
