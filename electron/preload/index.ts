import { contextBridge, ipcRenderer } from "electron";
import type { Session, Code, Mark } from "../../src/model/types";

export interface InterviewAPI {
  loadStore: () => Promise<unknown>;
  pickWorkbook: () => Promise<{
    path?: string;
    codes?: Code[];
    error?: string;
  } | null>;
  assignKey: (sheetName: string, key: string | null) => Promise<Code[] | null>;
  startSession: (payload: {
    participantNumber: string;
    interviewNumber: string;
    before: number;
    after: number;
  }) => Promise<Session>;
  setArmed: (on: boolean) => Promise<boolean>;
  getSession: (id?: string) => Promise<Session | null>;
  updateSession: (session: Session) => Promise<Session>;
  importTranscript: () => Promise<unknown>;
  exportDocx: () => Promise<unknown>;
  appendExcel: () => Promise<unknown>;
  exportCodebook: () => Promise<unknown>;
  saturation: () => Promise<unknown>;
  sendGamepad: (buttons: boolean[], l1: boolean) => Promise<unknown>;
  onMark: (
    cb: (payload: { mark: Mark; session: Session }) => void,
  ) => () => void;
  onSession: (cb: (session: Session) => void) => () => void;
  onArmed: (cb: (armed: boolean) => void) => () => void;
}

const api: InterviewAPI = {
  loadStore: () => ipcRenderer.invoke("store:load"),
  pickWorkbook: () => ipcRenderer.invoke("workbook:pick"),
  assignKey: (sheetName, key) =>
    ipcRenderer.invoke("codes:assignKey", sheetName, key),
  startSession: (payload) => ipcRenderer.invoke("session:start", payload),
  setArmed: (on) => ipcRenderer.invoke("session:arm", on),
  getSession: (id) => ipcRenderer.invoke("session:get", id),
  updateSession: (session) => ipcRenderer.invoke("session:update", session),
  importTranscript: () => ipcRenderer.invoke("transcript:import"),
  exportDocx: () => ipcRenderer.invoke("transcript:exportDocx"),
  appendExcel: () => ipcRenderer.invoke("excel:append"),
  exportCodebook: () => ipcRenderer.invoke("codebook:export"),
  saturation: () => ipcRenderer.invoke("saturation:list"),
  sendGamepad: (buttons, l1) =>
    ipcRenderer.invoke("gamepad:buttons", buttons, l1),
  onMark: (cb) => {
    const fn = (_: unknown, payload: { mark: Mark; session: Session }) =>
      cb(payload);
    ipcRenderer.on("mark:captured", fn);
    return () => ipcRenderer.removeListener("mark:captured", fn);
  },
  onSession: (cb) => {
    const fn = (_: unknown, session: Session) => cb(session);
    ipcRenderer.on("session:updated", fn);
    return () => ipcRenderer.removeListener("session:updated", fn);
  },
  onArmed: (cb) => {
    const fn = (_: unknown, armed: boolean) => cb(armed);
    ipcRenderer.on("input:armed", fn);
    return () => ipcRenderer.removeListener("input:armed", fn);
  },
};

contextBridge.exposeInMainWorld("interview", api);
