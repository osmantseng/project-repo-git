export const enum UIEvents {
  UIReady = "UIReady",
  UIResize = "UIResize",
  UIResized = "UIResized",
}

export const virtualCamName = "Streamlabs OBS Virtual Webcam"; // "Konnect Virtual Camera";

export const enum OBSHandlerEvents {
  IsVirtualCamPluginInstalled = "IsVirtualCamPluginInstalled",
  InstallVirtualCamPlugin = "InstallVirtualCamPlugin",
  UninstallVirtualCamPlugin = "UninstallVirtualCamPlugin",
  StartVirtualCam = "StartVirtualCam",
  StopVirtualCam = "StopVirtualCam",
  UpdateOutputResolution = "UpdateOutputResolution",
  InitOBS = "InitOBS",
  GetFramerate = "GetFramerate",
  SetFramerate = "SetFramerate",
  GetResolution = "GetResolution",
  SetResolution = "SetResolution",
  GetOutputResolution = "GetOutputResolution",
  GetCamDeviceOptions = "GetCamDeviceOptions",
  SetCamDevice = "SetCamDevice",
  //GetCamResolutionOptions = "GetCamResolutionOptions",
  GetCamResolution = "GetCamResolution",
  //SetCamResolution = "SetCamResolution",
  GetCamFilterOptions = "GetCamFilterOptions",
  SetCamFilter = "SetCamFilter",
  GetCamCropOptions = "GetCamCropOptions",
  GetCamCrop = "GetCamCrop",
  SetCamCrop = "SetCamCrop",
  GetCamVerticalFlip = "GetCamVerticalFlip",
  SetCamVerticalFlip = "SetCamVerticalFlip",
  GetCamHorizontalFlip = "GetCamHorizontalFlip",
  SetCamHorizontalFlip = "SetCamHorizontalFlip",
  ResetCameraAdjusts = "ResetCameraAdjusts",
  GetCamAdjusts = "GetCamAdjusts",
  SetCamAdjusts = "SetCamAdjusts",
  GetCamAdjust = "GetCamAdjust",
  SetCamAdjust = "SetCamAdjust",
}

export const enum OBSFilterTypes {
  None = "",
  FaceMask = "face_mask_filter",
  Mask = "mask_filter",
  Crop = "crop_filter",
  Gain = "gain_filter",
  Color = "color_filter",
  Scale = "scale_filter",
  Scroll = "scroll_filter",
  GPUDelay = "gpu_delay",
  ColorKey = "color_key_filter",
  Clut = "clut_filter",
  Sharpness = "sharpness_filter",
  ChromaKey = "chroma_key_filter",
  AsyncDelay = "async_delay_filter",
  NoiseSuppress = "noise_suppress_filter",
  InvertPolarity = "invert_polarity_filter",
  NoiseGate = "noise_gate_filter",
  Compressor = "compressor_filter",
  Limiter = "limiter_filter",
  Expander = "expander_filter",
  LumaKey = "luma_key_filter",
  NDI = "ndi_filter",
  NDIAudio = "ndi_audiofilter",
  PremultipliedAlpha = "premultiplied_alpha_filter",
  VST = "vst_filter",
}

export const enum KonnectSettingTypes {
  camSetDevice,
  camSetFilter,
  camSetCrop,
  camSetVerticalFlip,
  camSetHorizontalFlip,
  camSetAdjust,
  camSetAdjustCollection,
  obsFrameRate,
  obsResolution,
}

export const enum KonnectFilters {
  None = "None",
  BW_Contrast = "BW Contrast",
  Captivate = "Captivate",
  Contrast = "Contrast",
  Cool = "Cool",
  Highlight = "Highlight",
  Stylish = "Stylish",
  Vibrant = "Vibrant",
  Warm = "Warm",
}

export const enum KonnectCropRatios {
  cropRatio_16_9 = "16:9",
  cropRatio_9_16 = "9:16",
  cropRatio_4_3 = "4:3",
  cropRatio_3_4 = "3:4",
  cropRatio_1_1 = "1:1",
  cropRatio_free = "Free ratio",
}

export const enum IAMCameraControls {
  Pan = "CameraControl_Pan",
  Tilt = "CameraControl_Tilt",
  Roll = "CameraControl_Roll",
  Zoom = "CameraControl_Zoom",
  Exposure = "CameraControl_Exposure",
  Iris = "CameraControl_Iris",
  Focus = "CameraControl_Focus",
}

export const enum IAMVideoProcAmps {
  Brightness = "VideoProcAmp_Brightness",
  Contrast = "VideoProcAmp_Contrast",
  Hue = "VideoProcAmp_Hue",
  Saturation = "VideoProcAmp_Saturation",
  Sharpness = "VideoProcAmp_Sharpness",
  Gamma = "VideoProcAmp_Gamma",
  ColorEnable = "VideoProcAmp_ColorEnable",
  WhiteBalance = "VideoProcAmp_WhiteBalance",
  BacklightCompensation = "VideoProcAmp_BacklightCompensation",
  Gain = "VideoProcAmp_Gain",
}

export const enum ECameraControlFlags {
  Auto = 1,
  Manual = 2,
  AutoAndManual = 3,
}
