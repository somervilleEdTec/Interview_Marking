import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  dialog,
  shell,
} from "electron";
import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";
import {
  KEYBOARD_MAP,
  gamepadAction,
  type MarkAction,
} from "../../src/input/action-map";
import {
  loadStore,
  saveStore,
  upsertSession,
  appendMark,
  exportCodebookCsv,
} from "../../src/storage/store";
import {
  readCodes,
  appendRows,
  isWorkbookLocked,
  assertWritable,
} from "../../src/excel/workbook";
import { parseTranscriptFile } from "../../src/transcript/parse";
import { writeNumberedDocx } from "../../src/transcript/docx";
import { resolveMarkLines, DEFAULT_WINDOW } from "../../src/model/resolve";
import type { Mark, Session, MarkSlot, Code } from "../../src/model/types";

let mainWindow: BrowserWindow | null = null;
let armed = false;
let activeSessionId: string | null = null;
let codes: Code[] = [];
let gamepadTimer: NodeJS.Timeout | null = null;
let lastPadSignature = "";

function userData(): string {
  return app.getPath("userData");
}

function send(channel: string, payload: unknown): void {
  mainWindow?.webContents.send(channel, payload);
}

function slotToCode(slot: MarkSlot): string | null {
  if (slot === "general" || slot === "nofit") return null;
  return codes.find((c) => c.key === slot)?.sheetName ?? null;
}

function handleAction(action: MarkAction): void {
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
  const mark: Mark = {
    id: randomUUID(),
    at: new Date().toISOString(),
    slot,
    codeRef: slotToCode(slot),
    window: { ...DEFAULT_WINDOW },
    dropped: false,
    note: "",
  };
  const session = appendMark(userData(), activeSessionId, mark);
  send("mark:captured", { mark, session });
}

function registerShortcuts(): void {
  unregisterShortcuts();
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
  armed = true;
  send("input:armed", true);
}

function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
  armed = false;
  send("input:armed", false);
}

/** Poll renderer-reported gamepad OR keepalive channel — renderer sends button state. */
function startGamepadBridge(): void {
  ipcMain.removeHandler("gamepad:buttons");
  ipcMain.handle("gamepad:buttons", (_e, buttons: boolean[], l1: boolean) => {
    if (!armed) return { action: null, connected: true };
    const sig = buttons.map((b) => (b ? "1" : "0")).join("") + (l1 ? "L" : "");
    if (sig === lastPadSignature) return { action: null, connected: true };
    lastPadSignature = sig;
    if (!buttons.some(Boolean)) return { action: null, connected: true };
    const action = gamepadAction(buttons, l1);
    if (action) handleAction(action);
    return { action, connected: true };
  });
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
      sandbox: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  startGamepadBridge();

  ipcMain.handle("store:load", () => loadStore(userData()));

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
      codes = await readCodes(path);
      const store = loadStore(userData());
      store.project = {
        workbookPath: path,
        codes,
        sessions: store.project?.sessions ?? [],
      };
      saveStore(userData(), store);
      return { path, codes };
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

  ipcMain.handle("session:arm", (_e, on: boolean) => {
    if (on) registerShortcuts();
    else unregisterShortcuts();
    const store = loadStore(userData());
    const session = store.project?.sessions.find(
      (s) => s.id === activeSessionId,
    );
    if (session) {
      session.armed = on;
      saveStore(userData(), store);
    }
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
      filters: [{ name: "Subtitles", extensions: ["srt", "vtt"] }],
      properties: ["openFile"],
    });
    if (res.canceled || !res.filePaths[0]) return null;
    const path = res.filePaths[0];
    const content = readFileSync(path, "utf8");
    try {
      const lines = parseTranscriptFile(path, content);
      const store = loadStore(userData());
      const session = store.project?.sessions.find(
        (s) => s.id === activeSessionId,
      );
      if (!session) return { error: "No active session" };
      session.transcript = lines;
      for (const m of session.marks) {
        if (m.dropped) continue;
        const r = resolveMarkLines(m, session, lines);
        if (r) m.resolved = r;
      }
      saveStore(userData(), store);
      return { lines, session };
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

  ipcMain.handle("excel:append", async () => {
    const store = loadStore(userData());
    const project = store.project;
    const session = project?.sessions.find((s) => s.id === activeSessionId);
    if (!project?.workbookPath || !session)
      return { error: "Missing project or session" };
    const rows = session.marks
      .filter((m) => !m.dropped && m.codeRef && m.resolved)
      .map((m) => ({
        sheetName: m.codeRef!,
        participantNumber: session.participantNumber,
        interviewNumber: session.interviewNumber,
        lineRange: `${m.resolved!.lineStart}–${m.resolved!.lineEnd}`,
        text: m.resolved!.text,
      }));
    const notes = session.marks.filter(
      (m) => !m.dropped && (!m.codeRef || m.slot === "nofit"),
    );
    try {
      const backupPath = await appendRows(project.workbookPath, rows);
      return { backupPath, written: rows.length, notes };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });

  ipcMain.handle("codebook:export", async () => {
    const store = loadStore(userData());
    if (!store.project) return { error: "No project" };
    const csv = exportCodebookCsv(store.project.codes);
    const res = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: "codebook.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (res.canceled || !res.filePath) return null;
    writeFileSync(res.filePath, csv, "utf8");
    return { path: res.filePath };
  });

  ipcMain.handle("saturation:list", () => loadStore(userData()).saturation);

  ipcMain.handle("shell:showItem", (_e, p: string) =>
    shell.showItemInFolder(p),
  );

  app.on("will-quit", () => {
    unregisterShortcuts();
    if (gamepadTimer) clearInterval(gamepadTimer);
  });
});

app.on("window-all-closed", () => {
  unregisterShortcuts();
  if (process.platform !== "darwin") app.quit();
});
