import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  dialog,
  shell,
  session,
} from "electron";
import { join } from "path";
import { randomUUID } from "crypto";
import {
  KEYBOARD_MAP,
  gamepadAction,
  type MarkAction,
} from "../../src/input/action-map";
import {
  profileById,
  type ControllerProfileId,
} from "../../src/input/controller-profiles";
import {
  loadStore,
  saveStore,
  upsertSession,
  appendMark,
  resetMarkingData,
  fullResetStore,
  freezeOrphanSessionClocks,
} from "../../src/storage/store";
import {
  readCodes,
  isWorkbookLocked,
  assertWritable,
} from "../../src/excel/workbook";
import { loadTranscriptFile } from "../../src/transcript/load";
import { writeNumberedDocx } from "../../src/transcript/docx";
import { mergeCriteriaByNearestTimestamp } from "../../src/transcript/merge-criteria";
import { turnsForMerge } from "../../src/transcript/turns-for-merge";
import { writeTaggedExport } from "../../src/excel/tagged-export";
import { resolveMarkLines, DEFAULT_WINDOW } from "../../src/model/resolve";
import {
  elapsedSinceStart,
  pauseSessionClock,
  resumeSessionClock,
} from "../../src/model/time";
import type { Mark, Session, MarkSlot, Code } from "../../src/model/types";
import { codeParent } from "../../src/model/hierarchy";
import { canSendToWindow } from "./safe-send";

let mainWindow: BrowserWindow | null = null;
let armed = false;
let activeSessionId: string | null = null;
let codes: Code[] = [];
let gamepadTimer: NodeJS.Timeout | null = null;
let lastPadSignature = "";
let lastProfileId: string | null = null;

function codeParentSafe(sheetName: string): string | null {
  return codeParent(sheetName);
}

function userData(): string {
  return app.getPath("userData");
}

function send(channel: string, payload: unknown): void {
  if (!canSendToWindow(mainWindow)) return;
  mainWindow!.webContents.send(channel, payload);
}

function slotToCode(slot: MarkSlot): string | null {
  if (slot === "general" || slot === "nofit") return null;
  return codes.find((c) => c.key === slot)?.sheetName ?? null;
}

function handleAction(action: MarkAction): void {
  if (action.type === "toggleArmed") {
    void toggleArmedFromPad();
    return;
  }
  if (!armed || !activeSessionId) return;
  if (action.type === "undo") {
    const store = loadStore(userData());
    const session = store.project?.sessions.find(
      (s) => s.id === activeSessionId,
    );
    if (!session || !session.marks.length) return;
    session.marks.pop();
    saveStore(userData(), store);
    send("session:updated", session);
    return;
  }
  const slot: MarkSlot =
    action.type === "code"
      ? action.slot
      : action.type === "general"
        ? "general"
        : "nofit";
  const store = loadStore(userData());
  const live = store.project?.sessions.find((s) => s.id === activeSessionId);
  const atMs = elapsedSinceStart(live?.startedAt);
  const mark: Mark = {
    id: randomUUID(),
    at: atMs,
    slot,
    codeRef: slotToCode(slot),
    window: { ...DEFAULT_WINDOW },
    dropped: false,
    note: "",
  };
  const session = appendMark(userData(), activeSessionId, mark);
  send("mark:captured", { mark, session });
}

/** Bind home-row global shortcuts without changing armed state. */
function bindKeyboardShortcuts(): void {
  for (const [key, action] of Object.entries(KEYBOARD_MAP)) {
    const accel =
      key === "Space"
        ? "Space"
        : key === ";"
          ? ";"
          : key === "Backspace"
            ? "Backspace"
            : key;
    const ok = globalShortcut.register(accel, () => handleAction(action));
    if (!ok) console.warn("Failed to register", accel);
  }
}

function registerShortcuts(): void {
  globalShortcut.unregisterAll();
  bindKeyboardShortcuts();
  armed = true;
  send("input:armed", true);
}

function unregisterShortcuts(opts: { notify?: boolean } = {}): void {
  const notify = opts.notify !== false;
  globalShortcut.unregisterAll();
  armed = false;
  if (notify) send("input:armed", false);
}

/** Apply Start/Stop (armed) including interview clock pause/resume. */
function applyArmed(on: boolean): boolean {
  const store = loadStore(userData());
  const session =
    store.project?.sessions.find((s) => s.id === activeSessionId) ??
    store.project?.sessions.at(-1);
  if (session) activeSessionId = session.id;
  if (on) {
    if (session) resumeSessionClock(session);
    registerShortcuts();
  } else {
    if (session) pauseSessionClock(session);
    unregisterShortcuts();
  }
  if (session) {
    session.armed = on;
    saveStore(userData(), store);
    send("session:updated", session);
  }
  return on;
}

function startDefaultSession(): Session {
  const session: Session = {
    id: randomUUID(),
    participantNumber: "P1",
    interviewNumber: "I1",
    startedAt: new Date().toISOString(),
    defaultWindow: { before: 45, after: 15 },
    marks: [],
    recordingOffsetSec: 0,
    armed: true,
  };
  activeSessionId = session.id;
  upsertSession(userData(), session);
  registerShortcuts();
  send("session:updated", session);
  return session;
}

function toggleArmedFromPad(): void {
  if (!activeSessionId) {
    const store = loadStore(userData());
    const existing = store.project?.sessions.at(-1);
    if (existing) {
      activeSessionId = existing.id;
      applyArmed(true);
      return;
    }
    startDefaultSession();
    return;
  }
  applyArmed(!armed);
}

/** Poll renderer-reported gamepad OR keepalive channel — renderer sends button state. */
function startGamepadBridge(): void {
  ipcMain.removeHandler("gamepad:buttons");
  ipcMain.handle(
    "gamepad:buttons",
    (_e, buttons: boolean[], l1: boolean, profileId?: ControllerProfileId) => {
      const sig =
        buttons.map((b) => (b ? "1" : "0")).join("") +
        (l1 ? "L" : "") +
        (profileId ?? "");
      if (sig === lastPadSignature) return { action: null, connected: true };
      lastPadSignature = sig;
      if (!buttons.some(Boolean)) return { action: null, connected: true };
      const profile = profileId ? profileById(profileId) : undefined;
      lastProfileId = profileId ?? null;
      void lastProfileId;
      const action = gamepadAction(buttons, l1, profile);
      if (!action) return { action: null, connected: true };
      // Start/Stop must work while stopped; other actions need marking started.
      if (action.type === "toggleArmed") {
        handleAction(action);
        return { action, connected: true };
      }
      if (!armed) return { action: null, connected: true };
      handleAction(action);
      return { action, connected: true };
    },
  );
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "Interview Marking",
    backgroundColor: "#0f1419",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (e) => e.preventDefault());

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Stop runaway interview clocks left from prior installs / unclean exits.
  freezeOrphanSessionClocks(userData());
  createWindow();
  startGamepadBridge();
  const initial = loadStore(userData());
  codes = initial.project?.codes ?? [];
  const savedId = initial.activeSessionId;
  activeSessionId =
    savedId && initial.project?.sessions.some((s) => s.id === savedId)
      ? savedId
      : (initial.project?.sessions.at(-1)?.id ?? null);

  session.defaultSession.setPermissionRequestHandler((_wc, _perm, cb) =>
    cb(false),
  );

  ipcMain.handle("store:load", () => loadStore(userData()));

  ipcMain.handle("store:resetMarking", () => {
    unregisterShortcuts();
    armed = false;
    const store = resetMarkingData(userData());
    const session =
      store.project?.sessions.find((s) => s.id === activeSessionId) ??
      store.project?.sessions.at(-1) ??
      null;
    if (session) activeSessionId = session.id;
    send("input:armed", false);
    if (session) send("session:updated", session);
    return { store, session };
  });

  ipcMain.handle("store:fullReset", () => {
    unregisterShortcuts();
    armed = false;
    activeSessionId = null;
    codes = [];
    const store = fullResetStore(userData());
    send("input:armed", false);
    return { store };
  });

  ipcMain.handle("controller:getAssigned", () => {
    return loadStore(userData()).assignedGamepadId;
  });

  ipcMain.handle("controller:setAssigned", (_e, id: string | null) => {
    const store = loadStore(userData());
    store.assignedGamepadId = id;
    saveStore(userData(), store);
    return store.assignedGamepadId;
  });

  ipcMain.handle("controller:openBluetooth", async () => {
    // Windows Settings deep link; other platforms open generic BT prefs when possible
    if (process.platform === "win32") {
      await shell.openExternal("ms-settings:bluetooth");
    } else if (process.platform === "darwin") {
      await shell.openExternal(
        "x-apple.systempreferences:com.apple.BluetoothSettings",
      );
    } else {
      await shell.openExternal("https://support.microsoft.com/bluetooth");
    }
    return true;
  });

  ipcMain.handle("workbook:pick", async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
      properties: ["openFile"],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    const path = res.filePaths[0];
    if (isWorkbookLocked(path)) {
      return {
        error: "Workbook is locked. Close it in Excel and retry.",
        path,
      };
    }
    try {
      await assertWritable(path);
      const sheets = await readCodes(path);
      const store = loadStore(userData());
      const prevCodes = store.project?.codes ?? [];
      const workbookSheets = sheets.map((s) => s.sheetName);
      // Preserve typed criteria (esp. those with keys); enrich rowCount/parent when label matches a sheet
      const preserved = prevCodes.map((c) => {
        const match = sheets.find((s) => s.sheetName === c.sheetName);
        if (!match) return c;
        return {
          ...c,
          parent: match.parent,
          rowCount: match.rowCount,
        };
      });
      codes = preserved;
      store.project = {
        workbookPath: path,
        workbookSheets,
        codes: preserved,
        sessions: store.project?.sessions ?? [],
      };
      saveStore(userData(), store);
      return { path, codes: preserved, workbookSheets };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e), path };
    }
  });

  ipcMain.handle(
    "codes:assignKey",
    (_e, sheetName: string, key: string | null) => {
      const store = loadStore(userData());
      if (!store.project) return null;
      for (const c of store.project.codes) {
        if (key && c.key === key) c.key = null;
      }
      const code = store.project.codes.find((c) => c.sheetName === sheetName);
      if (code) code.key = key as Code["key"];
      codes = store.project.codes;
      saveStore(userData(), store);
      return store.project.codes;
    },
  );

  ipcMain.handle("criteria:upsert", (_e, index: number, label: string) => {
    const store = loadStore(userData());
    if (!store.project) {
      store.project = {
        workbookPath: "",
        workbookSheets: [],
        codes: [],
        sessions: [],
      };
    }
    const trimmed = label.trim();
    const sheets = store.project.workbookSheets ?? [];
    const parent = trimmed ? codeParentSafe(trimmed) : null;
    const list = store.project.codes;

    if (index >= 0 && index < list.length) {
      if (!trimmed) {
        list.splice(index, 1);
      } else {
        // Avoid duplicate labels
        const dup = list.findIndex(
          (c, i) => i !== index && c.sheetName === trimmed,
        );
        if (dup >= 0) {
          list[dup].key = list[dup].key ?? list[index].key;
          list.splice(index, 1);
        } else {
          list[index].sheetName = trimmed;
          list[index].parent = parent;
          if (sheets.includes(trimmed)) {
            /* workbook match — rowCount stays unless known */
          }
        }
      }
    } else if (trimmed && list.length < 8) {
      if (!list.some((c) => c.sheetName === trimmed)) {
        list.push({
          sheetName: trimmed,
          parent,
          rowCount: 0,
          key: null,
        });
      }
    }
    store.project.codes = list.filter((c) => c.sheetName.trim());
    codes = store.project.codes;
    saveStore(userData(), store);
    return store.project.codes;
  });

  ipcMain.handle("criteria:remove", (_e, index: number) => {
    const store = loadStore(userData());
    if (!store.project) return null;
    if (index < 0 || index >= store.project.codes.length) {
      return store.project.codes;
    }
    store.project.codes.splice(index, 1);
    codes = store.project.codes;
    saveStore(userData(), store);
    return store.project.codes;
  });

  ipcMain.handle(
    "session:start",
    (
      _e,
      payload: {
        participantNumber: string;
        interviewNumber: string;
        before: number;
        after: number;
      },
    ) => {
      const session: Session = {
        id: randomUUID(),
        participantNumber: payload.participantNumber,
        interviewNumber: payload.interviewNumber,
        startedAt: new Date().toISOString(),
        defaultWindow: { before: payload.before, after: payload.after },
        marks: [],
        recordingOffsetSec: 0,
        armed: true,
      };
      activeSessionId = session.id;
      upsertSession(userData(), session);
      registerShortcuts();
      return session;
    },
  );

  ipcMain.handle("session:arm", (_e, on: boolean) => applyArmed(on));

  /** Register/unregister home-row shortcuts without changing Start/Stop state. */
  ipcMain.handle("shortcuts:setActive", (_e, on: boolean) => {
    globalShortcut.unregisterAll();
    if (on && armed) bindKeyboardShortcuts();
    return on;
  });

  ipcMain.handle("session:get", (_e, id?: string) => {
    const store = loadStore(userData());
    const sid = id ?? activeSessionId;
    return store.project?.sessions.find((s) => s.id === sid) ?? null;
  });

  ipcMain.handle("session:update", (_e, session: Session) => {
    upsertSession(userData(), session);
    activeSessionId = session.id;
    return session;
  });

  ipcMain.handle("transcript:import", async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      filters: [
        {
          name: "Transcripts",
          extensions: ["srt", "vtt", "txt", "docx", "pdf"],
        },
      ],
      properties: ["openFile"],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    const path = res.filePaths[0];
    try {
      const { turns, lines } = await loadTranscriptFile(path);
      const store = loadStore(userData());
      const session = store.project?.sessions.find(
        (s) => s.id === activeSessionId,
      );
      if (!session) return { error: "No active session" };
      session.transcriptTurns = turns;
      session.transcript = lines.length ? lines : undefined;
      if (lines.length) {
        for (const m of session.marks) {
          if (m.dropped) continue;
          const r = resolveMarkLines(m, session, lines);
          if (r) m.resolved = r;
        }
      }
      saveStore(userData(), store);
      return { lines, turns, session };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });

  ipcMain.handle("transcript:mergeExport", async () => {
    const store = loadStore(userData());
    const session = store.project?.sessions.find(
      (s) => s.id === activeSessionId,
    );
    if (!session) return { error: "No active session" };
    const turns = turnsForMerge(session);
    if (!turns.length) return { error: "No transcript" };
    const coded = session.marks.filter((m) => !m.dropped && m.codeRef);
    if (!coded.length) return { error: "No coded marks to merge" };
    try {
      const rows = mergeCriteriaByNearestTimestamp(
        turns,
        session.marks,
        session.recordingOffsetSec,
        session.startedAt,
      );
      const res = await dialog.showSaveDialog(mainWindow!, {
        defaultPath: `tagged-${session.participantNumber}-${session.interviewNumber}.xlsx`,
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (res.canceled || !res.filePath) return null;
      await writeTaggedExport(rows, res.filePath);
      return { path: res.filePath, rows: rows.length };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });

  ipcMain.handle("transcript:exportDocx", async () => {
    const store = loadStore(userData());
    const session = store.project?.sessions.find(
      (s) => s.id === activeSessionId,
    );
    if (!session?.transcript?.length) return { error: "No transcript" };
    const res = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `transcript-${session.participantNumber}-${session.interviewNumber}.docx`,
      filters: [{ name: "Word", extensions: ["docx"] }],
    });
    if (res.canceled || !res.filePath) return null;
    await writeNumberedDocx(session.transcript, res.filePath);
    return { path: res.filePath };
  });

  app.on("will-quit", () => {
    unregisterShortcuts({ notify: false });
    if (gamepadTimer) clearInterval(gamepadTimer);
  });
});

app.on("window-all-closed", () => {
  unregisterShortcuts({ notify: false });
  if (process.platform !== "darwin") app.quit();
});
