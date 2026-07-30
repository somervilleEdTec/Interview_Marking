import { contextBridge, ipcRenderer } from "electron";
import type { Session, Code, Mark } from "../../src/model/types";
import type { ControllerProfileId } from "../../src/input/controller-profiles";

export interface InterviewAPI {
  loadStore: () => Promise<unknown>;
  resetMarking: () => Promise<{
    store: unknown;
    session: Session | null;
  }>;
  fullReset: () => Promise<{ store: unknown }>;
  pickWorkbook: () => Promise<{
    path?: string;
    codes?: Code[];
    workbookSheets?: string[];
    error?: string;
  } | null>;
  assignKey: (sheetName: string, key: string | null) => Promise<Code[] | null>;
  upsertCriterion: (index: number, label: string) => Promise<Code[] | null>;
  removeCriterion: (index: number) => Promise<Code[] | null>;
  getAssignedGamepad: () => Promise<string | null>;
  setAssignedGamepad: (id: string | null) => Promise<string | null>;
  openBluetoothSettings: () => Promise<boolean>;
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
  mergeExport: () => Promise<unknown>;
  appendExcel: () => Promise<unknown>;
  exportCodebook: () => Promise<unknown>;
  saturation: () => Promise<unknown>;
  sendGamepad: (
    buttons: boolean[],
    l1: boolean,
    profileId?: ControllerProfileId,
  ) => Promise<unknown>;
  onMark: (
    cb: (payload: { mark: Mark; session: Session }) => void,
  ) => () => void;
  onSession: (cb: (session: Session) => void) => () => void;
  onArmed: (cb: (armed: boolean) => void) => () => void;
}

const api: InterviewAPI = {
  loadStore: () => ipcRenderer.invoke("store:load"),
  resetMarking: () => ipcRenderer.invoke("store:resetMarking"),
  fullReset: () => ipcRenderer.invoke("store:fullReset"),
  pickWorkbook: () => ipcRenderer.invoke("workbook:pick"),
  assignKey: (sheetName, key) =>
    ipcRenderer.invoke("codes:assignKey", sheetName, key),
  upsertCriterion: (index, label) =>
    ipcRenderer.invoke("criteria:upsert", index, label),
  removeCriterion: (index) => ipcRenderer.invoke("criteria:remove", index),
  getAssignedGamepad: () => ipcRenderer.invoke("controller:getAssigned"),
  setAssignedGamepad: (id) => ipcRenderer.invoke("controller:setAssigned", id),
  openBluetoothSettings: () => ipcRenderer.invoke("controller:openBluetooth"),
  startSession: (payload) => ipcRenderer.invoke("session:start", payload),
  setArmed: (on) => ipcRenderer.invoke("session:arm", on),
  getSession: (id) => ipcRenderer.invoke("session:get", id),
  updateSession: (session) => ipcRenderer.invoke("session:update", session),
  importTranscript: () => ipcRenderer.invoke("transcript:import"),
  exportDocx: () => ipcRenderer.invoke("transcript:exportDocx"),
  mergeExport: () => ipcRenderer.invoke("transcript:mergeExport"),
  appendExcel: () => ipcRenderer.invoke("excel:append"),
  exportCodebook: () => ipcRenderer.invoke("codebook:export"),
  saturation: () => ipcRenderer.invoke("saturation:list"),
  sendGamepad: (buttons, l1, profileId) =>
    ipcRenderer.invoke("gamepad:buttons", buttons, l1, profileId),
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
