import { EOBSFilterType } from "../obs/const";
import { Dictionary } from "lodash";
import { EIAMCamCtrlType } from "./const";
import { ICamInfo } from "../webcam/interface";

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
export interface IEffectValue {
  name: string;
  filterType: EOBSFilterType;
  settings: Dictionary<any>;
  subOptionIndex: number;
}
export interface IEffectOption extends IEffectValue {
  imgPath: string; // 預覽圖片
  subOptions: IEffectSubOption[];
}
export interface IEffectOptionUI extends IEffectOption {
  id: string;
  isChecked: boolean;
}

export interface ICropInfo {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
export interface IRatioValue {
  name: string;
  widthRatio: number;
  heightRatio: number;
  cropInfo: ICropInfo | null;
}
export interface IRatioOption extends IRatioValue {}
export interface IRatioOptionUI extends IRatioOption {
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
export interface IAdjustValue {
  value: number;
  isAuto: boolean;
}
export interface IAdjustUI extends IAdjustValue {
  name: string;
  iamCamCtrlType: EIAMCamCtrlType;
  range: ICamCtrlRange;
  isSupported: boolean;
  isAutoSupported: boolean;
}

export interface ITemplate {
  id: string;
  name: string;
  version: string;
  camInfo: ICamInfo;
  data: Dictionary<any>;
  isChecked: boolean;
}
