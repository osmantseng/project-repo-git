import { EventEmitter } from "events";
export const enum CropEvents {
    Crop = "Crop",
    CropInfo = "CropInfo",
    CurrentRatio = "CurrentRatio",
    NotControlMenu = "NotControlMenu",
    UpdateCropInfo = "UpdateCropInfo",
    ApplyCrop = "ApplyCrop",
    BeginCrop = "BeginCrop",
    EndCrop = "EndCrop",
    ResetCrop = "ResetCrop",
    // GetCurrentCropSize = "GetCurrentCropSize",
    PreviewCrop = "PreviewCrop",
    /**
     * 是否显示Reset Button
     */
     ShowResetButton = "ShowResetButton"
}

export const enum CropUIEvents {
    updateClipBound = "updateClipBound"
}

export const cropEvent = new EventEmitter();
