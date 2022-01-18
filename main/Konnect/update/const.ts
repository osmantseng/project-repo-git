export enum EUpdateRequest {
  getVersionInfo = "getVersionInfo",
  getIsUpdateAvailable = "getIsUpdateAvailable",
  startDownloadUpdate = "startUpdate",
  cancelDownloadUpdate = "cancelUpdate",
  installUpdate = "installUpdate",
}

export enum EUpdateNotification {
  onDownloadUpdateStarted = "onDownloadUpdateStarted",
  onDownloadUpdateProgress = "onDownloadUpdateProgress",
  onDownloadUpdateCancel = "onDownloadUpdateCancel",
  onDownloadUpdateCompleted = "onDownloadUpdateCompleted",
}
