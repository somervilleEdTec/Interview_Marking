import { resolveMarkLines, markToRecordingMs, DEFAULT_WINDOW } from "./resolve";
import type { Mark, Session, TranscriptLine } from "./types";

describe("markToRecordingMs", () => {
  it("maps wall clock to recording offset", () => {
    const start = "2026-01-01T10:00:00.000Z";
    const mark = "2026-01-01T10:01:30.000Z";
    expect(markToRecordingMs(mark, start, 0)).toBe(90_000);
    expect(markToRecordingMs(mark, start, 5)).toBe(95_000);
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
    at: "2026-01-01T10:00:03.000Z",
    slot: "A",
    codeRef: "risk",
    window: { before: 1, after: 1 },
    dropped: false,
    note: "",
  };

  it("uses overlap not containment", () => {
    const r = resolveMarkLines(mark, session, transcript);
    expect(r).not.toBeNull();
    expect(r!.lineStart).toBe(1);
    expect(r!.lineEnd).toBe(2);
    expect(r!.text).toContain("hello");
  });
});
