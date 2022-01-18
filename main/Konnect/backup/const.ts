export enum EBackupRequest {
  backupToLocal = "backupToLocal",
  restoreFromLocal = "restoreFromLocal",
  getCloudBackupProvider = "getCloudBackupProvider",
  signInWithPopup = "signInWithPopup",
  getCloudUserInfo = "getCloudUserInfo",
  eraseCloudBackupProvider = "eraseCloudBackupProvider",
  backupToCloud = "backupToCloud",
  restoreFromCloud = "restoreFromCloud",
}

export enum ECloudBackupProvider {
  google = "Google",
  oneDrive = "OneDrive",
}
