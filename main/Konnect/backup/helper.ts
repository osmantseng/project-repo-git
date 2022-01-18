import electron from "electron";
import os from "os";

/**
 * Clears all cookies from session cookie store.
 */
export async function clearCookies() {
  electron.session.defaultSession.clearStorageData({
    storages: ["cookies"],
  });
}

/**
 * Returns a filename that suffixes the OS platform such that when settings
 * backed up to the could, windows/mac settings can be differentiated.
 */
export function getCloudBackupFilename() {
  return `settings_${os.platform()}.json`;
}
