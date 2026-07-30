import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "./styles/app.css";
import type { Code, Session, Mark } from "./model/types";
import { resolveMarkLines } from "./model/resolve";
import { renderSetup } from "./screens/setup";
import type { InputMode } from "./screens/controller-layout";
import {
  renderMarking,
  flashMarkingSlot,
  stopMarkingClock,
} from "./screens/marking";
import { renderReview } from "./screens/review";
import { renderResolve } from "./screens/resolve";
import { listConnectedPads, resolveAssignedPad } from "./input/gamepad-detect";
import {
  readPadButtons,
  shouldSuppressGamepadMarks,
} from "./input/gamepad-gate";

type Screen = "setup" | "marking" | "review" | "resolve";

const state = {
  screen: "setup" as Screen,
  codes: [] as Code[],
  workbookPath: "" as string,
  sheetSuggestions: [] as string[],
  session: null as Session | null,
  armed: false,
  flashSlot: null as string | null,
  ticks: [] as { id: string; slot: string }[],
  averageMarks: 0,
  assignedGamepadId: null as string | null,
  inputMode: "controller" as InputMode,
  pads: [] as ReturnType<typeof listConnectedPads>,
};

const stage = () => document.querySelector(".stage") as HTMLElement;
const ribbon = () => document.querySelector(".ribbon") as HTMLElement;
const topbar = () => document.querySelector(".topbar") as HTMLElement;

function averageMarks(sessions: Session[]): number {
  const done = sessions.filter((s) => s.marks.length > 0);
  if (!done.length) return 0;
  return (
    done.reduce((a, s) => a + s.marks.filter((m) => !m.dropped).length, 0) /
    done.length
  );
}

function refreshPads(): void {
  state.pads = listConnectedPads(navigator.getGamepads?.() ?? []);
}

function padStatusText(): { text: string; on: boolean } {
  const assigned = resolveAssignedPad(state.pads, state.assignedGamepadId);
  if (!state.pads.length) return { text: "No controller", on: false };
  if (state.assignedGamepadId && !assigned) {
    return { text: "Pad disconnected", on: false };
  }
  if (assigned) {
    return {
      text: assigned.profile.displayName,
      on: true,
    };
  }
  return { text: "Controller connected", on: true };
}

async function bootstrap(): Promise<void> {
  const store = (await window.interview.loadStore()) as {
    project?: {
      workbookPath: string;
      workbookSheets?: string[];
      codes: Code[];
      sessions: Session[];
    } | null;
    assignedGamepadId?: string | null;
  };
  if (store.project) {
    state.workbookPath = store.project.workbookPath;
    state.codes = store.project.codes;
    state.sheetSuggestions =
      store.project.workbookSheets ??
      store.project.codes.map((c) => c.sheetName);
    state.averageMarks = averageMarks(store.project.sessions);
    const last = store.project.sessions.at(-1);
    if (last) state.session = last;
  }
  state.assignedGamepadId = store.assignedGamepadId ?? null;

  window.interview.onMark(
    ({ mark, session }: { mark: Mark; session: Session }) => {
      state.session = session;
      state.flashSlot = mark.slot;
      state.ticks.push({ id: mark.id, slot: mark.slot });
      if (state.ticks.length > 40) state.ticks.shift();
      if (state.screen === "marking") {
        flashMarkingSlot(stage(), mark.slot, session);
        paintRibbon();
      }
      setTimeout(() => {
        state.flashSlot = null;
        if (state.screen === "marking") {
          flashMarkingSlot(stage(), null, state.session);
        }
      }, 180);
    },
  );

  let paintQueued = false;
  const requestPaint = (): void => {
    if (paintQueued) return;
    paintQueued = true;
    queueMicrotask(() => {
      paintQueued = false;
      paint();
    });
  };

  window.interview.onSession((session: Session) => {
    state.session = session;
    if (
      state.screen === "setup" &&
      shouldSuppressGamepadMarks(document.activeElement)
    ) {
      return;
    }
    requestPaint();
  });

  window.interview.onArmed((armed: boolean) => {
    state.armed = armed;
    if (
      state.screen === "setup" &&
      shouldSuppressGamepadMarks(document.activeElement)
    ) {
      return;
    }
    requestPaint();
  });

  window.addEventListener("gamepadconnected", () => {
    refreshPads();
    if (
      state.screen === "setup" &&
      !shouldSuppressGamepadMarks(document.activeElement)
    ) {
      paint();
    }
  });
  window.addEventListener("gamepaddisconnected", () => {
    refreshPads();
    if (
      state.screen === "setup" &&
      !shouldSuppressGamepadMarks(document.activeElement)
    ) {
      paint();
    }
  });

  let prev: boolean[] = [];
  let lastSetupPadsSig = "";
  setInterval(() => {
    refreshPads();
    const assigned = resolveAssignedPad(state.pads, state.assignedGamepadId);
    const status = padStatusText();
    const connectedEl = document.getElementById("pad-status");
    if (connectedEl) {
      connectedEl.textContent = status.text;
      connectedEl.dataset.on = status.on ? "1" : "0";
    }

    // Refresh Setup pad list when connectivity changes (without fighting text focus)
    if (state.screen === "setup") {
      const sig = state.pads.map((p) => p.id).join("|");
      if (
        sig !== lastSetupPadsSig &&
        !shouldSuppressGamepadMarks(document.activeElement)
      ) {
        lastSetupPadsSig = sig;
        paint();
        return;
      }
      lastSetupPadsSig = sig;
    }

    // Poll Start/Stop on Mark even while stopped; other buttons only while started.
    if (!assigned || state.screen !== "marking") {
      prev = [];
      return;
    }
    if (shouldSuppressGamepadMarks(document.activeElement)) {
      prev = [];
      return;
    }

    const rawPads = navigator.getGamepads?.() ?? [];
    const pad =
      rawPads[assigned.index] ?? rawPads.find((p) => p?.id === assigned.id);
    if (!pad) {
      prev = [];
      return;
    }

    const buttons = readPadButtons(
      pad.buttons,
      assigned.profile.analogTriggerIndices,
    );
    const changed = buttons.some((b, i) => b && !prev[i]);
    prev = buttons;
    if (!changed) return;

    if (!state.armed) {
      const startIdx =
        assigned.profile.buttons.find((b) => b.role.kind === "toggleArmed")
          ?.index ?? 9;
      if (!buttons[startIdx]) return;
    }
    void window.interview.sendGamepad(buttons, false, assigned.profileId);
  }, 32);

  paint();
}

function navigate(screen: Screen): void {
  if (state.screen === "marking" && screen !== "marking") stopMarkingClock();
  state.screen = screen;
  // Release home-row global shortcuts off Mark so Setup criterion typing works.
  void window.interview.setShortcutsActive(screen === "marking" && state.armed);
  paint();
}

let lastOverlayOn: boolean | null = null;

function syncMarkOverlay(): void {
  const on = state.screen === "marking" && !!state.session;
  if (on === lastOverlayOn) return;
  lastOverlayOn = on;
  document.body.classList.toggle("is-mark-overlay", on);
  void window.interview.setMarkOverlay(on);
}

function paintRibbon(): void {
  ribbon().innerHTML = state.ticks
    .map(
      (t) =>
        `<span class="tick tick-in" data-slot="${t.slot}" title="${t.slot}"></span>`,
    )
    .join("");
}

function paint(): void {
  refreshPads();
  const status = padStatusText();
  const tb = topbar();
  tb.replaceChildren();
  const eyebrow = document.createElement("span");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Interview Marking";
  const nav = document.createElement("nav");
  nav.className = "nav";
  for (const id of ["setup", "marking", "review", "resolve"] as Screen[]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.nav = id;
    btn.textContent =
      id === "setup"
        ? "Setup"
        : id === "marking"
          ? "Mark"
          : id === "review"
            ? "Review"
            : "Transcript";
    if (state.screen === id) btn.classList.add("active");
    btn.addEventListener("click", () => navigate(id));
    nav.appendChild(btn);
  }
  const padEl = document.createElement("span");
  padEl.id = "pad-status";
  padEl.className = "pad-status";
  padEl.dataset.on = status.on ? "1" : "0";
  padEl.textContent = status.text;
  tb.append(eyebrow, nav, padEl);

  const el = stage();
  if (state.screen === "setup") {
    renderSetup(el, {
      codes: state.codes,
      sheetSuggestions: state.sheetSuggestions,
      pads: state.pads,
      assignedGamepadId: state.assignedGamepadId,
      inputMode: state.inputMode,
      onAssignKey: async (sheetName, key) => {
        const codes = await window.interview.assignKey(sheetName, key);
        if (codes) state.codes = codes;
        paint();
      },
      onUpsertCriterion: async (index, label, opts) => {
        const codes = await window.interview.upsertCriterion(index, label);
        if (codes) state.codes = codes;
        paint();
        if (opts?.focusNext) {
          const next = document.querySelector(
            `.criteria-input[data-index="${index + 1}"]`,
          ) as HTMLInputElement | null;
          next?.focus();
        }
      },
      onRemoveCriterion: async (index) => {
        const codes = await window.interview.removeCriterion(index);
        if (codes) state.codes = codes;
        paint();
      },
      onAssignGamepad: async (id) => {
        state.assignedGamepadId = await window.interview.setAssignedGamepad(id);
        paint();
      },
      onOpenBluetooth: () => {
        void window.interview.openBluetoothSettings();
      },
      onInputMode: (mode) => {
        state.inputMode = mode;
        paint();
      },
    });
  } else if (state.screen === "marking") {
    const assigned = resolveAssignedPad(state.pads, state.assignedGamepadId);
    const profile = assigned?.profile ?? state.pads[0]?.profile ?? null;
    renderMarking(el, {
      codes: state.codes,
      session: state.session,
      armed: state.armed,
      flashSlot: state.flashSlot,
      inputMode: state.inputMode,
      profile,
      onStartSession: async () => {
        state.session = await window.interview.startSession({
          participantNumber: "P1",
          interviewNumber: "I1",
          before: 45,
          after: 15,
        });
        state.armed = true;
        paint();
      },
      onToggleMarking: async () => {
        if (!state.session) {
          state.session = await window.interview.startSession({
            participantNumber: "P1",
            interviewNumber: "I1",
            before: 45,
            after: 15,
          });
          state.armed = true;
          paint();
          return;
        }
        // onArmed + onSession coalesce into one paint via requestPaint.
        state.armed = await window.interview.setArmed(!state.armed);
      },
      onEnd: async () => {
        await window.interview.setArmed(false);
        state.armed = false;
        navigate("review");
      },
    });
  } else if (state.screen === "review") {
    renderReview(el, {
      session: state.session,
      codes: state.codes,
      averageMarks: state.averageMarks,
      onChange: async (session) => {
        state.session = await window.interview.updateSession(session);
        paint();
      },
      onContinue: () => navigate("resolve"),
    });
  } else {
    renderResolve(el, {
      session: state.session,
      onImport: async () => {
        const res = (await window.interview.importTranscript()) as {
          error?: string;
          session?: Session;
        };
        if (res?.error) alert(res.error);
        if (res?.session) state.session = res.session;
        paint();
      },
      onMergeExport: async () => {
        const res = (await window.interview.mergeExport()) as {
          error?: string;
          path?: string;
          rows?: number;
        };
        if (res?.error) alert(res.error);
        else if (res?.path)
          alert(`Merged export saved (${res.rows ?? 0} rows): ${res.path}`);
      },
      onOffset: async (sec: number) => {
        if (!state.session) return;
        state.session.recordingOffsetSec = sec;
        if (state.session.transcript) {
          for (const m of state.session.marks) {
            if (m.dropped) continue;
            const r = resolveMarkLines(
              m,
              state.session,
              state.session.transcript,
            );
            if (r) m.resolved = r;
          }
        }
        state.session = await window.interview.updateSession(state.session);
        paint();
      },
      onReset: async () => {
        if (
          !confirm(
            "Reset marking data and transcripts? The interview clock resets to 0:00. Criteria, button map, and controller settings are kept.",
          )
        ) {
          return;
        }
        const res = await window.interview.resetMarking();
        state.session = res.session;
        state.armed = false;
        state.ticks = [];
        state.flashSlot = null;
        state.averageMarks = 0;
        paint();
      },
      onFullReset: async () => {
        if (
          !confirm(
            "Full Reset clears ALL settings and data (criteria, bindings, sessions, transcripts). Continue?",
          )
        ) {
          return;
        }
        await window.interview.fullReset();
        state.codes = [];
        state.workbookPath = "";
        state.sheetSuggestions = [];
        state.session = null;
        state.armed = false;
        state.ticks = [];
        state.flashSlot = null;
        state.averageMarks = 0;
        state.assignedGamepadId = null;
        state.inputMode = "controller";
        navigate("setup");
      },
    });
  }

  paintRibbon();

  document.body.classList.toggle("is-armed", state.armed);
  syncMarkOverlay();
}

void bootstrap();
