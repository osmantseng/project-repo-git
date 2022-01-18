import _, { Dictionary } from 'lodash';

// 定义全局的electron
declare global {
  interface Window {
    electron: IElectron;
    obsHandler: IOBSHandler;
    updateHandler: IUpdateHandler;
    cropUIHandler: ICropUIHandler;
    globalDisabled: boolean;
  }
}

export interface IElectron {
  ipcRenderer: {
    on: (channel: string, func: (...args: any[]) => void) => () => void;
    once: (channel: string, func: (...args: any[]) => void) => () => void;
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
  };
}

export interface IWidthHeight {
  width: number;
  height: number;
}

export interface IBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface INumberOptionUI {
  id: string;
  name: string;
  value: number;
  isChecked: boolean;
}

export interface IStringOptionUI {
  id: string;
  name: string;
  value: string;
  isChecked: boolean;
}

export interface ITemplate {
  id: string;
  name: string;
  version: string;
  camInfo: ICamModelInfo;
  data: any;
  isChecked: boolean;
}

export interface IDeviceOptionUI {
  id: string;
  name: string;
  shortName: string | undefined;
  value: string;
  isChecked: boolean;
}

export interface IEffectSubOption {
  name: string;
  settings: Dictionary<any>;
}
export interface IEffectOptionUI {
  id: string;
  name: string;
  filterType: string;
  settings: Dictionary<any>;
  imgPath: string;
  subOptionIndex: number;
  subOptions: IEffectSubOption[];
  isChecked: boolean;
}

export interface ICropInfo {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export interface IRatioOptionUI {
  id: string;
  name: string;
  widthRatio: number;
  heightRatio: number;
  cropInfo: ICropInfo | null;
  isChecked: boolean;
}

export interface ICamCtrlRange {
  min: number;
  max: number;
  step: number;
  default: number;
  flags: number;
}
export interface IAdjustUI {
  name: string;
  iamSettingType: string;
  range: ICamCtrlRange;
  isSupported: boolean;
  value: number;
  isAutoSupported: boolean;
  isAuto: boolean;
}
export interface IAdjustIconUI extends IAdjustUI {
  key: string;
  iconName: string;
}

export interface ICloudUserInfo {
  name: string;
  email: string;
}

/*
preset: {
  savePreset: (camIndex: number, id?: string, name?: string) => void;  // 儲存此preset的資料，不指定名字時會儲存default preset
  removePreset: (camIndex: number, name: string) => Promise<IPresetOptionUI[]>;  // 移除指定名字的preset
  removePresetById: (camIndex: number, id: string) => Promise<IPresetOptionUI[]>;  // 移除指定ID的preset
  renamePresetById: (camIndex: number, id: string, newName: string) => Promise<IPresetOptionUI[]>;  // 更改指定ID的preset的名字
  getPresetOptions: (camIndex: number) => Promise<IPresetOptionUI[]>;  // 取得此攝像頭所有可用的preset，當中不包含default preset
  getPresetOption: (camIndex: number) => Promise<IPresetOptionUI>;  // 取得此攝像頭當前使用的preset
  setPreset: (camIndex: number, name?: string) => void;  // 切換至指定名稱的preset，不指定名字時切換至default preset
};
*/
export interface IOBSHandler {
  ui: {
    r2mUIReady: () => void;
    m2rUIReady: (func: () => void) => void;
    m2rUIResize: (func: () => void) => () => void;
  };
  backend: {
    r2mInitOBS: () => void;
    m2rInitOBS: (func: (result: boolean) => void) => void;
    getOBSOutputResolution: () => Promise<IWidthHeight>;
    backupToLocal: () => Promise<boolean>;
    restoreFromLocal: () => Promise<boolean>;
    getCloudBackupProvider: () => Promise<CloudTypeEnum | undefined>;
    signInWithPopup(
      provider: CloudTypeEnum,
      nextAction?: string
    ): Promise<ICloudUserInfo | undefined>;
    getCloudUserInfo(): Promise<ICloudUserInfo | undefined>;
    eraseCloudBackupProvider(): void;
    backupToCloud(): Promise<undefined>;
    restoreFromCloud(): Promise<undefined>;
    save(): void; // 儲存全部資料
  };
  preset: {
    createPreset: (camIndex: number, name: string) => Promise<ITemplate[]>; // 新增preset，新增完後自動選擇該preset
    savePreset: (camIndex: number, id: string) => Promise<ITemplate[]>; // 儲存目前資料到指定preset，新增完後自動選擇該preset
    renamePreset: (camIndex: number, id: string, name: string) => Promise<ITemplate[]>; // 變更指定preset的名字
    removePreset: (camIndex: number, id: string | string[]) => Promise<ITemplate[]>; // 移除preset，可指定單一或多個preset
    getPresetOptions: (camIndex: number) => Promise<ITemplate[]>; // 獲取此攝影機所有可選用的preset，不包含default
    getPresetOption: (camIndex: number) => Promise<ITemplate | undefined>; // 獲取此攝影機正在使用的preset，若回傳undefined表示default
    setPreset: (camIndex: number, id?: string) => Promise<ITemplate[]>; // 切換到指定preset，若不指定id則為default
    compareTemplate: (camIndex: number) => Promise<boolean>;
  };
  output: {
    getOutputResolutionOptions: () => Promise<INumberOptionUI[]>;
    setOutputResolution: (value: number) => Promise<INumberOptionUI[]>;
    getOutputFrameRateOptions: () => Promise<INumberOptionUI[]>;
    setOutputFrameRate: (value: number) => Promise<INumberOptionUI[]>;
  };
  camera: {
    getCamInputResolution: (camIndex: number) => Promise<IWidthHeight>;
    resetCamSettings: (camIndex: number) => Promise<void>;
    getCamDeviceOptions: (camIndex?: number) => Promise<IDeviceOptionUI[]>;
    setCamDevice: (camIndex: number, deviceId: string) => Promise<IDeviceOptionUI[]>;
    //getCamDeviceModelName: (camIndex: number) => Promise<string | undefined>;
    getCamEffectOptions: (camIndex?: number) => Promise<IEffectOptionUI[]>;
    setCamEffect: (camIndex: number, value: Dictionary<any>) => Promise<IEffectOptionUI[]>;
    getCamRatioOptions: (camIndex?: number) => Promise<IRatioOptionUI[]>;
    setCamRatio: (camIndex: number, value: Dictionary<any>) => Promise<IRatioOptionUI[]>;
    getCamVerticalFlip: (camIndex?: number) => Promise<boolean | undefined>;
    setCamVerticalFlip: (camIndex: number, value?: boolean) => Promise<boolean | undefined>;
    getCamHorizontalFlip: (camIndex?: number) => Promise<boolean | undefined>;
    setCamHorizontalFlip: (camIndex: number, value?: boolean) => Promise<boolean | undefined>;
    resetCamAdjusts: (camIndex: number) => Promise<Dictionary<IAdjustUI>>;
    getCamAdjusts: (camIndex: number) => Promise<Dictionary<IAdjustUI>>;
    setCamAdjusts: (
      camIndex: number,
      value: Dictionary<IAdjustUI>
    ) => Promise<Dictionary<IAdjustUI>>;
    getCamAdjust: (camIndex: number, adjustName: string) => Promise<IAdjustUI>;
    setCamAdjust: (
      camIndex: number,
      adjustName: string,
      value: Dictionary<any>
    ) => Promise<IAdjustUI>;
  };
  notification: {
    updateCamDeviceOptions: (func: () => void) => () => void;
    updateOBSOutputResolution: (func: (outputResolution: IWidthHeight) => void) => () => void;
    updatePresetOptions: (func: (presetOptions: ITemplate[]) => void) => () => void;
    updatePreset: (func: () => void) => () => void;
    updateDisplay: (func: (bounds: IBounds) => void) => () => void;
    updateTemplateChangedState: (func: (hasChanged: boolean) => void) => () => void;
  };
  virtualCam: {
    virtualCamName: string;
    startVirtualCam: () => void;
    stopVirtualCam: () => void;
  };
  display: {
    startDisplay: (camIndex: number, bounds: IBounds) => Promise<IWidthHeight | undefined>;
    updateDisplay: (camIndex: number, bounds?: IBounds, unhide = false) => void;
    hideDisplay: (camIndex: number, disablePreview = false) => void;
    endDisplay: (camIndex: number) => void;
    setPreviewCrop: (camIndex: number, previewCrop?: ICropInfo) => Promise<boolean | undefined>;
  };
}

export interface IVersionData {
  currentVersion: string;
  updateVersion: string;
}

export interface Progress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}

export interface IDownloadItem {
  filename: string;
  savePath: string;
  totalBytes: number;
}

export interface IUpdateHandler {
  getIsUpdateAvailable: () => Promise<boolean>;
  getVersionInfo: () => Promise<IVersionData | undefined>;
  startDownloadUpdate: () => Promise<boolean>;
  cancelDownloadUpdate: () => void;
  onDownloadUpdateStarted: (func: (item: IDownloadItem) => void) => () => void;
  onDownloadUpdateProgress: (func: (progress: Progress) => void) => () => void;
  onDownloadUpdateCancel: (func: () => void) => () => void;
  onDownloadUpdateCompleted: (func: (item: IDownloadItem) => void) => () => void;
}

export interface ICropUIHandler {
  updateClipBound: {
    send: (camIndex: number, clipBound: ICropInfo) => void;
    on: (func: (clipBound: ICropInfo) => void) => () => void;
  };
  show: (func: () => void) => () => void;
  hide: (func: () => void) => () => void;
}
