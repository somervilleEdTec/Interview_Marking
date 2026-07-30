/** True when the BrowserWindow can accept webContents.send. */
export function canSendToWindow(
  win: {
    isDestroyed: () => boolean;
    webContents?: { isDestroyed: () => boolean } | null;
  } | null,
): boolean {
  if (!win || win.isDestroyed()) return false;
  const wc = win.webContents;
  if (!wc || wc.isDestroyed()) return false;
  return true;
}
