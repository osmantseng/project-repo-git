import { OnSendHeadersListenerDetails } from "electron/main";
import { Dictionary } from "lodash";
import {
  OBSFilterTypes,
  KonnectSettingTypes,
  KonnectFilters,
  IAMCameraControls,
  IAMVideoProcAmps,
} from "./obsConst";

export interface IWidthHeight {
  width: number;
  height: number;
}

export interface INumberOption {
  name: string;
  value: number;
}
export interface INumberOptionUI extends INumberOption {
  id: string;
  isChecked: boolean;
}

export interface IStringOption {
  name: string;
  value: string;
}
export interface IStringOptionUI extends IStringOption {
  id: string;
  isChecked: boolean;
}

export interface IVideoDevice {
  name: string;
  value: string | number;
}
export interface IVideoDeviceUI extends IVideoDevice {
  id: string;
  isChecked: boolean;
}

export interface IFilterOption {
  name: string;
  imgPath: string; // 預覽圖片
  filterType: OBSFilterTypes;
  settings: Dictionary<any>;
}
export interface IFilterOptionUI extends IFilterOption {
  id: string;
  isChecked: boolean;
}

export interface ICropInfo {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ICropOption {
  name: string;
  widthRatio: number;
  heightRatio: number;
  cropInfo: ICropInfo | undefined;
}
export interface ICropOptionUI extends ICropOption {
  id: string;
  isChecked: boolean;
}

export interface ICamCtrlRange {
  min: number;
  max: number;
  step: number;
  default: number;
  flags: number;
}

export interface IAdjust {
  name: string;
  iamSettingType: IAMCameraControls | IAMVideoProcAmps;
  range: ICamCtrlRange;
  isSupported: boolean;
  value: number;
  isAuto: boolean;
  isAutoSupported: boolean;
}
