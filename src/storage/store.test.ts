import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, it, expect, afterEach } from "vitest";
import {
  saveStore,
  loadStore,
  resetMarkingData,
  fullResetStore,
  normalizeSessionClocks,
  type AppStore,
} from "./store";
import type { Session } from "../model/types";

const dirs: string[] = [];

function tmpUserData(): string {
  const d = mkdtempSync(join(tmpdir(), "im-store-"));
  dirs.push(d);
  return d;
}

afterEach(() => {
  while (dirs.length) {
    const d = dirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function sampleSession(): Session {
  return {
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
      },
    ],
    transcript: [{ n: 1, startMs: 0, endMs: 1000, text: "Hi" }],
    transcriptTurns: [{ startMs: 0, endMs: 1000, speaker: "I", text: "Hi" }],
    recordingOffsetSec: 1.5,
    armed: true,
  };
}

function seededStore(userData: string): AppStore {
  const store: AppStore = {
    project: {
      workbookPath: "/tmp/book.xlsx",
      workbookSheets: ["Theme"],
      codes: [{ sheetName: "Theme", parent: null, rowCount: 1, key: "A" }],
      sessions: [sampleSession()],
    },
    activeSessionId: "s1",
    saturation: [{ at: 1000, code: "Theme", kind: "first_mark" }],
    assignedGamepadId: "pad-1",
  };
  saveStore(userData, store);
  return store;
}

describe("resetMarkingData", () => {
  it("clears marks and transcripts but keeps settings", () => {
    const dir = tmpUserData();
    seededStore(dir);
    const next = resetMarkingData(dir);
    const session = next.project!.sessions[0];
    expect(session.marks).toEqual([]);
    expect(session.transcript).toBeUndefined();
    expect(session.transcriptTurns).toBeUndefined();
    expect(session.recordingOffsetSec).toBe(0);
    expect(session.armed).toBe(false);
    expect(session.pausedElapsedMs).toBe(0);
    expect(session.participantNumber).toBe("P1");
    expect(next.project!.codes).toHaveLength(1);
    expect(next.project!.workbookPath).toBe("/tmp/book.xlsx");
    expect(next.assignedGamepadId).toBe("pad-1");
    expect(next.saturation).toEqual([]);
    expect(
      JSON.parse(
        readFileSync(join(dir, "interview-marking-store.json"), "utf8"),
      ).saturation,
    ).toEqual([]);
  });

  it("resets the interview clock to 0:00", () => {
    const dir = tmpUserData();
    seededStore(dir);
    const before = Date.now();
    const next = resetMarkingData(dir);
    const session = next.project!.sessions[0];
    expect(session.pausedElapsedMs).toBe(0);
    const started = Date.parse(session.startedAt);
    expect(started).toBeGreaterThanOrEqual(before);
    expect(started).toBeLessThanOrEqual(Date.now());
  });
});

describe("normalizeSessionClocks", () => {
  it("freezes legacy sessions at last mark instead of wall elapsed", () => {
    const store: AppStore = {
      project: {
        workbookPath: "",
        codes: [],
        sessions: [
          {
            ...sampleSession(),
            startedAt: "2020-01-01T00:00:00.000Z",
            armed: true,
          },
        ],
      },
      activeSessionId: "s1",
      saturation: [],
      assignedGamepadId: null,
    };
    expect(normalizeSessionClocks(store)).toBe(true);
    const session = store.project!.sessions[0];
    expect(session.armed).toBe(false);
    expect(session.pausedElapsedMs).toBe(1000);
  });
});

describe("fullResetStore", () => {
  it("wipes the store to an empty slate", () => {
    const dir = tmpUserData();
    seededStore(dir);
    const next = fullResetStore(dir);
    expect(next).toEqual({
      project: null,
      activeSessionId: null,
      saturation: [],
      assignedGamepadId: null,
    });
    expect(loadStore(dir)).toEqual(next);
  });
});
