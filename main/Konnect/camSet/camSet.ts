import { ESettingType } from "../setting/const";
import DeviceSetting, {
  KonnectDeviceSettingP1,
  PhysicDeviceSetting,
} from "../cameraSettings/deviceSetting";
import EffectSetting from "../cameraSettings/effectSetting";
import {
  HorizontalFlipSetting,
  VerticalFlipSetting,
} from "../cameraSettings/flipSettings";
import { IDependencies } from "../setting/interface";
import RatioSetting, { RatioSettingP1 } from "../cameraSettings/ratioSetting";
import SettingCollection from "../setting/settingCollection";
import _ from "lodash";
import { IInput, IScene, ISceneItem } from "obs-studio-node";
import { IOBSHandler } from "../obs/interface";
import {
  AdjustSetting,
  AdjustSettingCollection,
} from "../cameraSettings/adjustSetting";
import { EAdjustType, EIAMCamCtrlType } from "../cameraSettings/const";

export default class CamSet implements IDependencies {
  private _parentOBSHandler: IOBSHandler | undefined;
  private _input: IInput;
  private _scene: IScene;
  private _sceneItem: ISceneItem;
  private _settings: SettingCollection;

  get obsHandler() {
    return this._parentOBSHandler;
  }
  get input() {
    return this._input;
  }
  get scene() {
    return this._scene;
  }
  get sceneItem() {
    return this._sceneItem;
  }
  get settings() {
    return this._settings;
  }

  constructor(
    input: IInput,
    scene: IScene,
    sceneItem: ISceneItem,
    parentOBSHandler?: IOBSHandler
  ) {
    this._input = input;
    this._scene = scene;
    this._sceneItem = sceneItem;
    this._parentOBSHandler = parentOBSHandler;
    let settings = new SettingCollection(this);
    settings.add(ESettingType.CamDevice, new KonnectDeviceSettingP1(this));
    settings.add(ESettingType.CamRatio, new RatioSettingP1(this));
    settings.add(ESettingType.CamVerticalFlip, new VerticalFlipSetting(this));
    settings.add(
      ESettingType.CamHorizintalFlip,
      new HorizontalFlipSetting(this)
    );
    settings.add(ESettingType.CamEffect, new EffectSetting(this));

    let adjustSettings = new AdjustSettingCollection(this);
    let adjustItems = {
      [EAdjustType.lowLight]: EIAMCamCtrlType.LowLightCompensation,
      [EAdjustType.brightness]: EIAMCamCtrlType.Brightness,
      [EAdjustType.contrast]: EIAMCamCtrlType.Contrast,
      [EAdjustType.saturation]: EIAMCamCtrlType.Saturation,
      [EAdjustType.backlight]: EIAMCamCtrlType.BacklightCompensation,
      [EAdjustType.whiteBalance]: EIAMCamCtrlType.WhiteBalance,
      [EAdjustType.exposure]: EIAMCamCtrlType.Exposure,
      [EAdjustType.sharpness]: EIAMCamCtrlType.Sharpness,
      [EAdjustType.hue]: EIAMCamCtrlType.Hue,
      [EAdjustType.gamma]: EIAMCamCtrlType.Gamma,
      [EAdjustType.focus]: EIAMCamCtrlType.Focus,
    };

    _.forEach(adjustItems, (adjustItem, name) => {
      adjustSettings.add(name, new AdjustSetting(this, adjustItem, name));
    });

    settings.add(ESettingType.CamAdjustCollection, adjustSettings);

    this._settings = settings;
  }
}
