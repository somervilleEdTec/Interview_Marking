import "./styles/app.css";
import type { Code, Session, Mark } from "./model/types";
import { resolveMarkLines } from "./model/resolve";
import { renderSetup } from "./screens/setup";
import { renderMarking } from "./screens/marking";
import { renderReview } from "./screens/review";
import { renderResolve } from "./screens/resolve";

type Screen = "setup" | "marking" | "review" | "resolve";

const state = {
  screen: "setup" as Screen,
  codes: [] as Code[],
  workbookPath: "" as string,
  session: null as Session | null,
  armed: false,
  flashSlot: null as string | null,
  ticks: [] as { id: string; slot: string }[],
  averageMarks: 0,
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

async function bootstrap(): Promise<void> {
  const store = (await window.interview.loadStore()) as {
    project?: {
      workbookPath: string;
      codes: Code[];
      sessions: Session[];
    } | null;
  };
  if (store.project) {
    state.workbookPath = store.project.workbookPath;
    state.codes = store.project.codes;
    state.averageMarks = averageMarks(store.project.sessions);
    const last = store.project.sessions.at(-1);
    if (last) state.session = last;
  }

  window.interview.onMark(
    ({ mark, session }: { mark: Mark; session: Session }) => {
      state.session = session;
      state.flashSlot = mark.slot;
      state.ticks.push({ id: mark.id, slot: mark.slot });
      if (state.ticks.length > 40) state.ticks.shift();
      if (state.screen === "marking") paint();
      setTimeout(() => {
        state.flashSlot = null;
        if (state.screen === "marking") paint();
      }, 180);
    },
  );

  window.interview.onSession((session: Session) => {
    state.session = session;
    paint();
  });

  window.interview.onArmed((armed: boolean) => {
    state.armed = armed;
    paint();
  });

  // DualSense keepalive: poll Gamepad API and forward edge presses to main
  let prev: boolean[] = [];
  setInterval(() => {
    const pads = navigator.getGamepads?.() ?? [];
    const pad = pads[0];
    const connectedEl = document.getElementById("pad-status");
    if (connectedEl) {
      connectedEl.textContent = pad ? "Controller connected" : "No controller";
      connectedEl.dataset.on = pad ? "1" : "0";
    }
    if (!pad || !state.armed) return;
    const buttons = pad.buttons.map((b) => b.pressed);
    const l1 = !!pad.buttons[4]?.pressed;
    const changed = buttons.some((b, i) => b && !prev[i]);
    prev = buttons;
    if (changed) void window.interview.sendGamepad(buttons, l1);
  }, 32);

  paint();
}

function navigate(screen: Screen): void {
  state.screen = screen;
  paint();
}

function paint(): void {
  const tb = topbar();
  tb.innerHTML = `
    <span class="eyebrow">Interview Marking</span>
    <nav class="nav">
      <button type="button" data-nav="setup" class="${state.screen === "setup" ? "active" : ""}">Setup</button>
      <button type="button" data-nav="marking" class="${state.screen === "marking" ? "active" : ""}">Mark</button>
      <button type="button" data-nav="review" class="${state.screen === "review" ? "active" : ""}">Review</button>
      <button type="button" data-nav="resolve" class="${state.screen === "resolve" ? "active" : ""}">Transcript</button>
    </nav>
    <span id="pad-status" class="pad-status" data-on="0">No controller</span>
  `;
  tb.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () =>
      navigate((btn as HTMLElement).dataset.nav as Screen),
    );
  });

  const el = stage();
  if (state.screen === "setup") {
    renderSetup(el, {
      codes: state.codes,
      workbookPath: state.workbookPath,
      onPickWorkbook: async () => {
        const res = await window.interview.pickWorkbook();
        if (!res) return;
        if (res.error) {
          alert(res.error);
          return;
        }
        state.workbookPath = res.path ?? "";
        state.codes = res.codes ?? [];
        paint();
      },
      onAssignKey: async (sheetName, key) => {
        const codes = await window.interview.assignKey(sheetName, key);
        if (codes) state.codes = codes;
        paint();
      },
      onStart: async (participantNumber, interviewNumber, before, after) => {
        state.session = await window.interview.startSession({
          participantNumber,
          interviewNumber,
          before,
          after,
        });
        state.armed = true;
        navigate("marking");
      },
    });
  } else if (state.screen === "marking") {
    renderMarking(el, {
      codes: state.codes,
      session: state.session,
      armed: state.armed,
      flashSlot: state.flashSlot,
      onToggleArm: async () => {
        state.armed = await window.interview.setArmed(!state.armed);
        paint();
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
      onExportDocx: async () => {
        const res = (await window.interview.exportDocx()) as {
          error?: string;
          path?: string;
        };
        if (res?.error) alert(res.error);
        else if (res?.path) alert(`Saved: ${res.path}`);
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
      onWindow: async (markId: string, before: number, after: number) => {
        if (!state.session) return;
        const m = state.session.marks.find((x) => x.id === markId);
        if (!m) return;
        m.window = { before, after };
        if (state.session.transcript) {
          const r = resolveMarkLines(
            m,
            state.session,
            state.session.transcript,
          );
          if (r) m.resolved = r;
        }
        state.session = await window.interview.updateSession(state.session);
        paint();
      },
      onAppend: async () => {
        const res = (await window.interview.appendExcel()) as {
          error?: string;
          backupPath?: string;
          written?: number;
          notes?: Mark[];
        };
        if (res?.error) alert(res.error);
        else {
          const noteCount = res.notes?.length ?? 0;
          alert(
            `Appended ${res.written ?? 0} rows. Backup: ${res.backupPath}. Session notes (uncoded/nofit): ${noteCount}`,
          );
        }
      },
      onCodebook: async () => {
        const res = (await window.interview.exportCodebook()) as {
          path?: string;
          error?: string;
        };
        if (res?.error) alert(res.error);
        else if (res?.path) alert(`Saved: ${res.path}`);
      },
    });
  }

  ribbon().innerHTML = state.ticks
    .map(
      (t) =>
        `<span class="tick tick-in" data-slot="${t.slot}" title="${t.slot}"></span>`,
    )
    .join("");

  document.body.classList.toggle("is-armed", state.armed);
}

void bootstrap();
