# Phase 0 — Input spike (Windows)

## Purpose

Prove that marking works while **Zoom holds keyboard focus**, before investing in product UI.

## Test matrix

| Input                                              | Zoom focused (second monitor shows app) | Expected                                    |
| -------------------------------------------------- | --------------------------------------- | ------------------------------------------- |
| Global shortcuts A S D F J K L ; Space N Backspace | App armed                               | Marks fire; UI flash/ribbon update          |
| DualSense face buttons + L1 overlay                | App armed                               | Marks fire                                  |
| DualSense idle ~10+ min                            | Keepalive poll                          | Status shows disconnect; reconnect recovers |
| Shortcuts while **disarmed**                       | —                                       | No global capture                           |

## Procedure

1. Build/run `npm run dev` on Windows.
2. Setup → assign keys → Start session (arms shortcuts).
3. Focus Zoom on primary display; leave Interview Marking visible on secondary.
4. Press home-row keys and controller buttons; confirm counts increase without focusing the app.
5. Disarm; confirm keys no longer captured system-wide.
6. Leave DualSense idle; note connection indicator; press a button to wake.

## DualSense keepalive

Renderer polls `navigator.getGamepads()` every 32ms while armed and forwards edge presses to the main process. Connection state is shown in the top bar (`#pad-status`).

## Result template

- Date / machine / Electron version:
- Keyboard while Zoom focused: PASS / FAIL
- Gamepad while Zoom focused: PASS / FAIL
- Idle disconnect handling: PASS / FAIL
- Notes:

**Gate:** If keyboard FAIL, do not ship browser-only alternatives; Electron globalShortcut is required (already the architecture).
