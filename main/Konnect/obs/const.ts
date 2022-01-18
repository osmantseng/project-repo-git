export enum UIEvents {
  UIReady = "UIReady",
  UIResize = "UIResize",
  //UIResized = "UIResized",
}

// {8EE74B0A-EC26-430A-9327-981CB7C8540D}
export const virtualCamName = "Kensington Konnect Virtual Camera";

export enum EOBSDShowProp {
  video_device_id = "video_device_id",
  res_type = "res_type",
  resolution = "resolution",
  // other
}

export enum EOBSInputType {
  AudioLine = "audio_line",
  ImageSource = "image_source",
  ColorSource = "color_source",
  Slideshow = "slideshow",
  BrowserSource = "browser_source",
  FFMPEGSource = "ffmpeg_source",
  TextGDI = "text_gdiplus",
  TextFT2 = "text_ft2_source",
  VLCSource = "vlc_source",
  MonitorCapture = "monitor_capture",
  WindowCapture = "window_capture",
  GameCapture = "game_capture",
  DShowInput = "dshow_input",
  WASAPIInput = "wasapi_input_capture",
  WASAPIOutput = "wasapi_output_capture",
  AVCaptureInput = "av_capture_input",
  CoreAudioInput = "coreaudio_input_capture",
  CoreAudioOutput = "coreaudio_output_capture",
}

export enum EOBSFilterType {
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

export enum EOBSHandlerRequest {
  isVirtualCamPluginInstalled = "isVirtualCamPluginInstalled",
  installVirtualCamPlugin = "installVirtualCamPlugin",
  uninstallVirtualCamPlugin = "uninstallVirtualCamPlugin",
  startVirtualCam = "startVirtualCam",
  stopVirtualCam = "stopVirtualCam",

  initOBS = "initOBS",

  getOBSOutputResolution = "getOBSOutputResolution",
  getCamInputResolution = "getCamInputResolution",
  save = "save",

  getOutputResolutionOptions = "getOutputResolutionOptions",
  setOutputResolution = "setOutputResolution",

  getOutputFrameRateOptions = "getOutputFrameRateOptions",
  setOutputFrameRate = "setOutputFrameRate",

  createPreset = "createPreset",
  savePreset = "savePreset",
  removePreset = "removePreset",
  renamePreset = "renamePreset",
  getPresetOptions = "getPresetOptions",
  getPresetOption = "getPresetOption",
  setPreset = "setPreset",
  compareTemplate = "compareTemplate",

  resetCamSettings = "resetCamSettings",

  getCamDeviceOptions = "getCamDeviceOptions",
  setCamDevice = "setCamDevice",

  getCamEffectOptions = "getCamEffectOptions",
  setCamEffect = "setCamEffect",

  getCamRatioOptions = "getCamRatioOptions",
  setCamRatio = "setCamRatio",

  getCamVerticalFlip = "getCamVerticalFlip",
  setCamVerticalFlip = "setCamVerticalFlip",

  getCamHorizontalFlip = "getCamHorizontalFlip",
  setCamHorizontalFlip = "setCamHorizontalFlip",

  resetCamAdjusts = "resetCamAdjusts",
  getCamAdjusts = "getCamAdjusts",
  setCamAdjusts = "setCamAdjusts",
  getCamAdjust = "getCamAdjust",
  setCamAdjust = "setCamAdjust",
}

/* export enum EOBSHandlerP1Request {
  getCamName = "getCamName",
} */

export enum EOBSHandlerNotification {
  updateCamDeviceOptions = "updateCamDeviceOptions",
  updateOBSOutputResolution = "updateOBSOutputResolution",
  updateCamInputResolution = "updateCamInputResolution",
  updatePresetOptions = "updatePresetOptions",
  updatePreset = "updatePreset",
  updateTemplateChangedState = "updateTemplateChangedState",
}
