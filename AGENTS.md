# Local-first development

- Prefer **Cursor Desktop** on your machine to save cloud agent cost/tokens.
- Cloud agents: only when explicitly requested.
- **Do not push, open PRs, or publish releases unless the user explicitly asks.**
- Never add microphone, camera, or screen-capture APIs (`getUserMedia`, `mediaDevices`, `getDisplayMedia`).
- Keep modules small; surgical diffs; Excel writes are append-only with backup first.
- UI visual work: use Claude Opus 5 (`claude-opus-5-thinking-high`) per project plan.
- Windows installer: `npm run dist:win` → `release/InterviewMarking-Setup.exe`.
