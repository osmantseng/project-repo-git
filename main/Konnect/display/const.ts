export enum EDisplayRequest {
  getDisplayIds = "getDisplayIds",
  startDisplay = "startDisplay",
  endDisplay = "endDisplay",
  updateDisplay = "updateDisplay",
  hideDisplay = "hideDisplay",
}

export enum EDisplayNotification {
  updateDisplay = "updateDisplay",
}

export enum ECropUIEvents {
  show = "show",
  hide = "hide",
  mouseEnterCropArea = "mouseEnterCropArea",
  mouseExitCropArea = "mouseExitCropArea",
  updateClipBound = "updateClipBound",
  setPreviewCrop = "setPreviewCrop"
}
