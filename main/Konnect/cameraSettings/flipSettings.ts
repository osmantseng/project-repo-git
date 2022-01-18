import _ from "lodash";
import { logger } from "../util";
import { ESettingType } from "../setting/const";
import SettingBase from "../setting/settingBase";

export class VerticalFlipSetting extends SettingBase<boolean> {
  get settingType() {
    return ESettingType.CamVerticalFlip;
  }
  static defaultValue = false;
  get defaultValue() {
    return _.clone(VerticalFlipSetting.defaultValue);
  }
  private _value = this.defaultValue;
  get value() {
    return _.clone(this._value);
  }
  set value(value) {
    this._value = value;
  }
  updateAction() {
    let sceneItem = this.dependencies.sceneItem;
    if (_.isNil(sceneItem)) {
      return;
    }
    
    sceneItem.scale = {
      x: sceneItem.scale.x,
      y: Math.abs(sceneItem.scale.y) * (this._value ? -1 : 1),
    };
  }
  updatePartially(value: any) {
    if (_.isBoolean(value)) {
      this.update(value);
    }
  }
  serialize() {
    return this.value;
  }
  static get valueUI() {
    return false;
  }
  get valueUI() {
    return this.value;
  }
  get requiresVCRestartOnChange() {
    return false;
  }
  get requiresReloadOnVidSwitch() {
    return false;
  }
}

export class HorizontalFlipSetting extends SettingBase<boolean> {
  get settingType() {
    return ESettingType.CamHorizintalFlip;
  }
  static defaultValue = false;
  get defaultValue() {
    return _.clone(VerticalFlipSetting.defaultValue);
  }
  private _value = this.defaultValue;
  get value() {
    return _.clone(this._value);
  }
  set value(value) {
    this._value = value;
  }
  updateAction() {
    let sceneItem = this.dependencies.sceneItem;
    if (_.isNil(sceneItem)) {
      return;
    }
    sceneItem.scale = {
      x: Math.abs(sceneItem.scale.x) * (this._value ? -1 : 1),
      y: sceneItem.scale.y,
    };
  }
  updatePartially(value: any) {
    if (_.isBoolean(value)) {
      this.update(value);
    }
  }
  serialize() {
    return this.value;
  }
  static get valueUI() {
    return false;
  }
  get valueUI() {
    return this.value;
  }
  get requiresVCRestartOnChange() {
    return false;
  }
  get requiresReloadOnVidSwitch() {
    return false;
  }
}
