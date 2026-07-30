# Interview Marking

Local Windows desktop app for **eyes-free live interview marking**, SRT/VTT alignment, and append-only write-back to your existing Excel coding workbook.

No audio or video is ever captured. The app stores times, integers, and text only.

## End users (Windows)

1. Open [Releases](https://github.com/somervilleEdTec/Interview_Marking/releases)
2. Download **`InterviewMarking-Setup.exe`**
3. Run the installer (unsigned MVP: SmartScreen → More info → Run anyway)
4. Launch **Interview Marking** from the Start Menu

## Developers

```bash
npm install
npm run dev          # Electron + Vite
npm test
npm run typecheck
npm run build
npm run dist:win     # NSIS installer → release/InterviewMarking-Setup.exe (Windows)
```

Requirements: Node 22+, Windows for packaging/running global shortcuts against Zoom.

### Workflow

Develop locally to save cost/tokens. Push to GitHub only when requested. See [AGENTS.md](AGENTS.md).

CI runs lint-free checks: typecheck, unit tests, build, and a ban on AV permission APIs. Tag `v*` triggers a Windows Release build of the Setup.exe.

### Transcript prerequisite

Alignment needs **SRT or VTT** (timestamped). Plain Word/TXT exports are rejected. Export subtitles from Autotekst/Whisper before the Transcript step.

### Phase 0 input test

See [docs/input-spike.md](docs/input-spike.md) — verify keyboard/gamepad while Zoom is focused before relying on marking in production interviews.
