import { ESettingType } from "./const";
import { IOBSHandler } from "../obs/interface";
import { IInput, IScene, ISceneItem } from "obs-studio-node";

export interface IDependencies {
  readonly obsHandler: IOBSHandler | undefined;
  readonly input: IInput | undefined;
  readonly scene: IScene | undefined;
  readonly sceneItem: ISceneItem | undefined;
}

export interface ISetting<
  ValueType = any,
  ValueUIType = ValueType,
  ValueSaveType = ValueType
> {
  readonly settingType: ESettingType;
  readonly defaultValue: ValueType;
  value: ValueType;
  readonly changed: boolean;
  readonly valueUI: ValueUIType;
  reset(): void; // Return to default value.
  reload(): void; // Some settings need to sync with the backend
  update(value: ValueType): void; // Update value and set changed to true
  updatePartially(value: any): void;
  readonly requiresVCRestartOnChange: boolean;
  readonly requiresReloadOnVidSwitch: boolean;
  serialize(): ValueSaveType;
  unChanged(): void; // Set changed to false
  load(value: any): void; // Load value. Set changed to false
}

export interface IStringOption {
  name: string;
  value: string;
}
export interface IStringOptionUI extends IStringOption {
  id: string;
  isChecked: boolean;
}

export interface INumberOption {
  name: string;
  value: number;
}
export interface INumberOptionUI extends INumberOption {
  id: string;
  isChecked: boolean;
}
