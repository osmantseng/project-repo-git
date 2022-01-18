import { ICamInfo } from "../webcam/interface";

export interface IPreset {
  id: string;
  name: string;
  version: string;
  modelInfo: ICamInfo;
  data: any;
  isChecked: boolean;
}

export interface IPresetOptionUI extends IPreset {}
