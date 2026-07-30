# Privacy & data handling (v2)

Interview Marking is a **local-first** desktop app for higher-education interview coding.

## Data processed

| Data                            | Where stored                                             | Leaves the device? |
| ------------------------------- | -------------------------------------------------------- | ------------------ |
| Participant / interview numbers | Electron `userData` JSON store                           | No                 |
| Marks, notes, saturation events | Same local store                                         | No                 |
| Imported transcripts            | Same local store (active session)                        | No                 |
| Coding workbook extracts        | User-chosen Excel path (+ `.bak.xlsx` backups beside it) | No                 |

No microphone, camera, or screen capture. No analytics, telemetry, or cloud AI calls.

## Network

Packaged builds load UI from local files only. Fonts ship with the app (no Google Fonts). Content Security Policy blocks unexpected network connects. Bluetooth help may open the OS settings app (or a support page on Linux).

## Security controls (v2)

- `contextIsolation`, no `nodeIntegration`, sandboxed renderer, navigation/window-open denied
- HTML escaping for transcript/notes/criteria in the UI
- Transcript import size limit (40 MB)
- Append-only Excel write-back with backup before write

## Researcher responsibilities

- Treat participant transcripts as confidential research data under your institution’s ethics / GDPR (UK) / DPA 2018 processes
- Prefer storing workbooks on approved institutional drives
- Clear or archive local `userData` when a study ends (OS app data folder for Interview Marking)
- Do not share the local store JSON or workbook backups outside approved channels

## Uninstall (Windows)

The NSIS uninstaller:

1. **Always deletes transcription data** from the local store (transcript lines/turns and resolved mark excerpts), including when settings are kept
2. **Prompts** whether to also remove settings and app data (criteria, bindings, sessions, caches)
3. Skips this cleanup when the uninstaller runs as part of an in-place upgrade

This document supports DPIA / ethics submissions; it is not legal advice.
