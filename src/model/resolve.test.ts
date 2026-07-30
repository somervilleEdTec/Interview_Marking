import { resolveMarkLines, markToRecordingMs, DEFAULT_WINDOW } from "./resolve";
import { formatInterviewTime, markAtToMs, elapsedSinceStart } from "./time";
import type { Mark, Session, TranscriptLine } from "./types";

describe("formatInterviewTime", () => {
  it("formats from 0:00 as m:ss", () => {
    expect(formatInterviewTime(0)).toBe("0:00");
    expect(formatInterviewTime(5_000)).toBe("0:05");
    expect(formatInterviewTime(90_000)).toBe("1:30");
    expect(formatInterviewTime(3_661_000)).toBe("61:01");
  });
});

describe("markAtToMs", () => {
  it("passes through relative ms and legacy ISO", () => {
    expect(markAtToMs(90_000)).toBe(90_000);
    expect(
      markAtToMs("2026-01-01T10:01:30.000Z", "2026-01-01T10:00:00.000Z"),
    ).toBe(90_000);
  });
});

describe("elapsedSinceStart", () => {
  it("returns non-negative elapsed", () => {
    const start = "2026-01-01T10:00:00.000Z";
    expect(elapsedSinceStart(start, Date.parse(start) + 12_500)).toBe(12_500);
  });
});

describe("markToRecordingMs", () => {
  it("adds alignment offset to interview-relative mark time", () => {
    expect(markToRecordingMs(90_000, 0)).toBe(90_000);
    expect(markToRecordingMs(90_000, 5)).toBe(95_000);
  });
});

describe("resolveMarkLines", () => {
  const transcript: TranscriptLine[] = [
    { n: 1, startMs: 0, endMs: 2000, text: "hello" },
    { n: 2, startMs: 2000, endMs: 5000, text: "world" },
    { n: 3, startMs: 5000, endMs: 9000, text: "again" },
  ];
  const session: Session = {
    id: "s",
    participantNumber: "P1",
    interviewNumber: "I1",
    startedAt: "2026-01-01T10:00:00.000Z",
    defaultWindow: DEFAULT_WINDOW,
    marks: [],
    recordingOffsetSec: 0,
    armed: false,
  };
  const mark: Mark = {
    id: "m",
    at: 3_000,
    slot: "A",
    codeRef: "risk",
    window: { before: 1, after: 1 },
    dropped: false,
  };

  it("uses overlap not containment", () => {
    const r = resolveMarkLines(mark, session, transcript);
    expect(r).not.toBeNull();
    expect(r!.lineStart).toBe(1);
    expect(r!.lineEnd).toBe(2);
    expect(r!.text).toContain("hello");
  });
});
