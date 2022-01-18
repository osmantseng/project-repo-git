export enum EAdjustType {
  lowLight = "lowLight",
  brightness = "brightness",
  contrast = "contrast",
  saturation = "saturation",
  backlight = "backlight",
  whiteBalance = "whiteBalance",
  exposure = "exposure",
  sharpness = "sharpness",
  hue = "hue",
  gamma = "gamma",
  focus = "focus",
}

export enum EIAMCamCtrlType {
  Pan = "CameraControl_Pan",
  Tilt = "CameraControl_Tilt",
  Roll = "CameraControl_Roll",
  Zoom = "CameraControl_Zoom",
  Exposure = "CameraControl_Exposure",
  Iris = "CameraControl_Iris",
  Focus = "CameraControl_Focus",
  LowLightCompensation = "CameraControl_LowLightCompensation",

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

export enum ECameraControlFlag {
  Auto = 1,
  Manual = 2,
  AutoAndManual = 3,
}

export enum EKonnectEffect {
  none = "none",
  bwContrast = "bwContrast",
  captivate = "captivate",
  contrast = "contrast",
  cool = "cool",
  highlight = "highlight",
  stylish = "stylish",
  vibrant = "vibrant",
  warm = "warm",
}

export enum EKonnectEffectTone {
  Lighter = "Lighter",
  Medium = "Medium",
  Darker = "Darker",
}

export enum EKonnectRatio {
  cropRatio_16_9 = "16:9",
  cropRatio_9_16 = "9:16",
  cropRatio_4_3 = "4:3",
  cropRatio_3_4 = "3:4",
  cropRatio_1_1 = "1:1",
  cropRatio_free = "Free ratio",
}
