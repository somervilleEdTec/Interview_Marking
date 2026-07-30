import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import type { Project, Session, Mark, SaturationEvent } from "../model/types";

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
    return empty();
  }
}

export function saveStore(userData: string, store: AppStore): void {
  const p = storePath(userData);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(store, null, 2), "utf8");
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
