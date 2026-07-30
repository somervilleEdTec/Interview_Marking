import { describe, it, expect } from "vitest";
import {
  displayElapsedMs,
  maxMarkAtMs,
  pauseSessionClock,
  resumeSessionClock,
  formatInterviewTime,
} from "./time";

describe("pause/resume session clock", () => {
  it("freezes elapsed on pause and resumes from the same point", () => {
    const started = Date.parse("2026-07-30T10:00:00.000Z");
    const session = {
      startedAt: new Date(started).toISOString(),
    };
    const atStop = started + 65_000;
    pauseSessionClock(session, atStop);
    expect(session.pausedElapsedMs).toBe(65_000);
    expect(displayElapsedMs(session, atStop + 3_600_000)).toBe(65_000);
    expect(formatInterviewTime(displayElapsedMs(session))).toBe("1:05");

    const later = atStop + 10_000;
    resumeSessionClock(session, later);
    expect(session.pausedElapsedMs).toBeUndefined();
    expect(displayElapsedMs(session, later)).toBe(65_000);
    expect(displayElapsedMs(session, later + 5_000)).toBe(70_000);
  });

  it("maxMarkAtMs ignores non-numeric ats", () => {
    expect(
      maxMarkAtMs([
        { at: 1000 },
        { at: "2026-01-01T00:00:00.000Z" },
        { at: 4500 },
      ]),
    ).toBe(4500);
    expect(maxMarkAtMs([])).toBe(0);
  });
});
