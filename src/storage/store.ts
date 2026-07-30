import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
} from "fs";
import { dirname, join } from "path";
import type { Project, Session, Mark, SaturationEvent } from "../model/types";
import { maxMarkAtMs } from "../model/time";

export interface AppStore {
  project: Project | null;
  activeSessionId: string | null;
  saturation: SaturationEvent[];
  /** Gamepad.id of the pad assigned for marking. */
  assignedGamepadId: string | null;
}

const empty = (): AppStore => ({
  project: null,
  activeSessionId: null,
  saturation: [],
  assignedGamepadId: null,
});

export function storePath(userData: string): string {
  return join(userData, "interview-marking-store.json");
}

export function loadStore(userData: string): AppStore {
  const p = storePath(userData);
  if (!existsSync(p)) return empty();
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as Partial<AppStore>;
    return {
      ...empty(),
      ...raw,
      assignedGamepadId: raw.assignedGamepadId ?? null,
      saturation: raw.saturation ?? [],
    };
  } catch {
    // Preserve a corrupt store for recovery instead of silently wiping it.
    try {
      renameSync(p, `${p}.corrupt-${Date.now()}`);
    } catch {
      /* ignore backup failure */
    }
    return empty();
  }
}

/**
 * Ensure stopped/legacy sessions hold a frozen clock so elapsed does not
 * keep growing across app restarts or reinstalls that keep settings.
 */
export function normalizeSessionClocks(store: AppStore): boolean {
  let dirty = false;
  if (!store.project) return false;
  for (const session of store.project.sessions) {
    if (session.pausedElapsedMs != null) {
      if (session.armed) {
        session.armed = false;
        dirty = true;
      }
      continue;
    }
    // Prefer last mark over wall elapsed — wall time explodes after reinstall.
    session.pausedElapsedMs = maxMarkAtMs(session.marks);
    session.armed = false;
    dirty = true;
  }
  return dirty;
}

/**
 * Freeze legacy/runaway interview clocks. Call once at app boot
 * (not on every loadStore — that would pause a live marking session).
 */
export function freezeOrphanSessionClocks(userData: string): AppStore {
  const store = loadStore(userData);
  if (normalizeSessionClocks(store)) saveStore(userData, store);
  return store;
}

export function saveStore(userData: string, store: AppStore): void {
  const p = storePath(userData);
  mkdirSync(dirname(p), { recursive: true });
  // Atomic write — avoid truncated JSON if the process dies mid-save.
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(store), "utf8");
  renameSync(tmp, p);
}

/** Persist immediately after each mark (crash-safe). */
export function upsertSession(userData: string, session: Session): AppStore {
  const store = loadStore(userData);
  if (!store.project) {
    store.project = { workbookPath: "", codes: [], sessions: [session] };
  } else {
    const i = store.project.sessions.findIndex((s) => s.id === session.id);
    if (i >= 0) {
      const prev = store.project.sessions[i];
      // Keep transcript payload if the renderer omitted it on a partial update
      store.project.sessions[i] = {
        ...session,
        transcript: session.transcript ?? prev.transcript,
        transcriptTurns: session.transcriptTurns ?? prev.transcriptTurns,
      };
    } else store.project.sessions.push(session);
  }
  store.activeSessionId = session.id;
  saveStore(userData, store);
  return store;
}

export function appendMark(
  userData: string,
  sessionId: string,
  mark: Mark,
): Session {
  const store = loadStore(userData);
  const session = store.project?.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("No active session");
  session.marks.push(mark);
  if (mark.codeRef) {
    const first = !store.saturation.some(
      (e) => e.code === mark.codeRef && e.kind === "first_mark",
    );
    if (first) {
      store.saturation.push({
        at: mark.at,
        code: mark.codeRef,
        kind: "first_mark",
      });
    }
    store.saturation.push({
      at: mark.at,
      code: mark.codeRef,
      kind: "last_seen",
    });
  }
  saveStore(userData, store);
  return session;
}

/** Clear marks and transcripts from all sessions; keep codes/bindings/workbook. */
export function resetMarkingData(userData: string): AppStore {
  const store = loadStore(userData);
  const now = new Date().toISOString();
  if (store.project) {
    for (const session of store.project.sessions) {
      session.marks = [];
      session.transcript = undefined;
      session.transcriptTurns = undefined;
      session.recordingOffsetSec = 0;
      session.armed = false;
      session.startedAt = now;
      session.pausedElapsedMs = 0;
    }
  }
  store.saturation = [];
  saveStore(userData, store);
  return store;
}

/** Wipe project, sessions, saturation, and controller assignment. */
export function fullResetStore(userData: string): AppStore {
  const store = empty();
  saveStore(userData, store);
  return store;
}

/**
 * Remove all transcription payloads from a store (in place).
 * Used on uninstall when the user chooses to keep settings.
 * Clears transcript lines/turns and resolved mark excerpts.
 */
export function stripTranscriptData(store: AppStore): AppStore {
  if (store.project) {
    for (const session of store.project.sessions) {
      delete session.transcript;
      delete session.transcriptTurns;
      for (const mark of session.marks) {
        delete mark.resolved;
      }
    }
  }
  return store;
}

/** Persist store after stripping all transcription data from userData. */
export function stripAndSaveTranscripts(userData: string): AppStore {
  const store = stripTranscriptData(loadStore(userData));
  saveStore(userData, store);
  return store;
}

export function exportCodebookCsv(
  codes: { sheetName: string; parent: string | null; rowCount: number }[],
): string {
  const header = "sheetName,parent,rowCount";
  const rows = codes.map(
    (c) =>
      `"${c.sheetName.replace(/"/g, '""')}","${(c.parent ?? "").replace(/"/g, '""')}",${c.rowCount}`,
  );
  return [header, ...rows].join("\n");
}
