import { describe, it, expect } from "vitest";
import { stripTranscriptData, type AppStore } from "./store";
import type { Session } from "../model/types";

function sampleStore(): AppStore {
  const session: Session = {
    id: "s1",
    participantNumber: "P1",
    interviewNumber: "I1",
    startedAt: new Date().toISOString(),
    defaultWindow: { before: 2, after: 4 },
    marks: [
      {
        id: "m1",
        at: 1000,
        slot: "A",
        codeRef: "Theme",
        window: { before: 2, after: 4 },
        dropped: false,
        resolved: { lineStart: 1, lineEnd: 2, text: "secret transcript" },
      },
    ],
    transcript: [{ n: 1, startMs: 0, endMs: 1000, text: "secret" }],
    transcriptTurns: [
      { startMs: 0, endMs: 1000, speaker: "I", text: "secret" },
    ],
    recordingOffsetSec: 0,
    armed: false,
  };
  return {
    project: {
      workbookPath: "/tmp/book.xlsx",
      workbookSheets: ["Theme"],
      codes: [{ sheetName: "Theme", parent: null, rowCount: 1, key: "A" }],
      sessions: [session],
    },
    activeSessionId: "s1",
    saturation: [],
    assignedGamepadId: "pad-1",
  };
}

describe("stripTranscriptData", () => {
  it("removes transcripts and resolved excerpts but keeps settings", () => {
    const store = sampleStore();
    stripTranscriptData(store);
    const session = store.project!.sessions[0];
    expect(session.transcript).toBeUndefined();
    expect(session.transcriptTurns).toBeUndefined();
    expect(session.marks[0].resolved).toBeUndefined();
    expect(session.marks).toHaveLength(1);
    expect(store.project!.codes).toHaveLength(1);
    expect(store.assignedGamepadId).toBe("pad-1");
    expect(session.participantNumber).toBe("P1");
  });
});
