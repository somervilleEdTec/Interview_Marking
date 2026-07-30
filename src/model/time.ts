/** Interview-relative time helpers — clocks start at 0:00 (m:ss). */

/** Format elapsed ms as `m:ss` (minutes may exceed 59). */
export function formatInterviewTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Elapsed ms since session start (wall clock used only to measure duration). */
export function elapsedSinceStart(
  startedAtIso: string | undefined,
  nowMs: number = Date.now(),
): number {
  if (!startedAtIso) return 0;
  const start = Date.parse(startedAtIso);
  if (Number.isNaN(start)) return 0;
  return Math.max(0, nowMs - start);
}

/** Latest mark time in interview-relative ms (0 if none). */
export function maxMarkAtMs(
  marks: { at: number | string }[] | undefined,
): number {
  let max = 0;
  for (const m of marks ?? []) {
    if (typeof m.at === "number" && Number.isFinite(m.at)) {
      max = Math.max(max, m.at);
    }
  }
  return max;
}

/**
 * Display elapsed for the Mark clock: frozen when paused, else live.
 */
export function displayElapsedMs(
  session: {
    startedAt: string;
    pausedElapsedMs?: number;
  },
  nowMs: number = Date.now(),
): number {
  if (session.pausedElapsedMs != null) {
    return Math.max(0, session.pausedElapsedMs);
  }
  return elapsedSinceStart(session.startedAt, nowMs);
}

/** Freeze the interview clock at the current (or given) elapsed ms. */
export function pauseSessionClock<
  T extends { startedAt: string; pausedElapsedMs?: number },
>(session: T, nowMs: number = Date.now()): T {
  if (session.pausedElapsedMs != null) return session;
  session.pausedElapsedMs = elapsedSinceStart(session.startedAt, nowMs);
  return session;
}

/** Resume a frozen clock so live elapsed continues from the paused value. */
export function resumeSessionClock<
  T extends { startedAt: string; pausedElapsedMs?: number },
>(session: T, nowMs: number = Date.now()): T {
  const elapsed = session.pausedElapsedMs ?? 0;
  session.startedAt = new Date(nowMs - elapsed).toISOString();
  delete session.pausedElapsedMs;
  return session;
}

/**
 * Normalize mark `at` to interview-relative ms.
 * Accepts number, numeric string, or legacy wall-clock ISO (with startedAt).
 */
export function markAtToMs(at: number | string, startedAtIso?: string): number {
  if (typeof at === "number" && Number.isFinite(at)) return Math.max(0, at);
  const s = String(at).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.max(0, Number(s));
  const markMs = Date.parse(s);
  if (!Number.isNaN(markMs) && startedAtIso) {
    const start = Date.parse(startedAtIso);
    if (!Number.isNaN(start)) return Math.max(0, markMs - start);
  }
  return 0;
}
