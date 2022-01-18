import _, { Dictionary } from "lodash";
import { ECameraControlFlag, EIAMCamCtrlType } from "./const";
import { IAdjustValue, IAdjustUI, ICamCtrlRange } from "./interface";
import SettingBase from "../setting/settingBase";
import { logger } from "../util";
import { EOBSDShowProp } from "../obs/const";
import { ESettingType } from "../setting/const";
import { IDependencies, ISetting } from "../setting/interface";
import { ICollection } from "../interface";
const camCtrlLib = require("../../UVCCamCtrl.node");

export class AdjustSetting extends SettingBase<
  IAdjustValue,
  IAdjustUI,
  Dictionary<any>
> {
  get settingType() {
    return ESettingType.CamAdjust;
  }
  private name: string;
  private _iamCamCtrlType: EIAMCamCtrlType;
  get iamCamCtrlType() {
    return this._iamCamCtrlType;
  }
  private range = {
    min: 0,
    max: 0,
    step: 0,
    default: 0,
    flags: 0,
  } as ICamCtrlRange;
  private isSupported = false;
  private isAutoSupported = false;
  private _defaultValue = {
    value: 0,
    isAuto: false,
  } as IAdjustValue;
  get defaultValue() {
    return _.cloneDeep(this._defaultValue);
  }
  private _value = this.defaultValue;
  get value() {
    return _.cloneDeep(this._value);
  }
  set value(value) {
    this._value = value;
  }
  reload() {
    this.readRange();
    this.readValue();
  }
  updateAction() {
    let input = this.dependencies.input;
    if (_.isNil(input)) {
      return;
    }

    let video_device_id = input.settings[EOBSDShowProp.video_device_id];
    if (this._iamCamCtrlType === EIAMCamCtrlType.LowLightCompensation) {
      camCtrlLib.SetKGTCamValue(
        video_device_id,
        this._iamCamCtrlType,
        this._value.isAuto ? 1 : 0,
        0
      );
    } else {
      if (this.isAutoSupported && this._value.isAuto) {
        // Value will not change if autoFlag is set to auto
        camCtrlLib.SetKGTCamValue(
          video_device_id,
          this._iamCamCtrlType,
          this._value.value,
          ECameraControlFlag.Manual
        );
        camCtrlLib.SetKGTCamValue(
          video_device_id,
          this._iamCamCtrlType,
          this._value.value,
          this._value.isAuto
            ? ECameraControlFlag.Auto
            : ECameraControlFlag.Manual
        );
      } else {
        camCtrlLib.SetKGTCamValue(
          video_device_id,
          this._iamCamCtrlType,
          this._value.value,
          this._value.isAuto
            ? ECameraControlFlag.Auto
            : ECameraControlFlag.Manual
        );
      }
    }

    this.readValue();
  }
  updatePartially(value: any) {
    let newValue = this.value;

    let newValueValue = _.toNumber(_.get(value, "value"));
    if (_.isNumber(newValueValue)) {
      newValueValue = _.clamp(newValueValue, this.range.min, this.range.max);
      newValue.value = newValueValue;
    }

    let newIsAuto = _.get(value, "isAuto");
    if (_.isBoolean(newIsAuto)) {
      newValue.isAuto = newIsAuto;
    }

    this.update(newValue);
  }
  serialize() {
    return { ...this.value };
  }
  static get valueUI() {
    return {
      value: 0,
      isAuto: false,
      range: {
        min: 0,
        max: 0,
        step: 0,
        default: 0,
        flags: 0,
      },
      isSupported: false,
      isAutoSupported: false,
    } as IAdjustUI;
  }
  get valueUI() {
    return {
      ...this._value,
      name: this.name,
      iamCamCtrlType: this._iamCamCtrlType,
      range: this.range,
      isSupported: this.isSupported,
      isAutoSupported: this.isAutoSupported,
    } as IAdjustUI;
  }
  get requiresVCRestartOnChange() {
    return false;
  }
  get requiresReloadOnVidSwitch() {
    return true;
  }
  constructor(
    dependencies: IDependencies,
    iamCamCtrlType: EIAMCamCtrlType,
    name?: string
  ) {
    super(dependencies);
    this._iamCamCtrlType = iamCamCtrlType;
    this.name = _.isNil(name) ? iamCamCtrlType.toString() : name;
    this.readRange();
    this.readValue();
  }

  readRange() {
    let input = this.dependencies.input;
    if (_.isNil(input)) {
      return;
    }

    let video_device_id = input.settings[EOBSDShowProp.video_device_id];
    let rawCamRange: any = [0, 0, 0, 0, 0];
    try {
      rawCamRange = camCtrlLib.GetKGTCamRange(
        video_device_id,
        this._iamCamCtrlType
      );
      /* if (this.iamCamCtrlType === EIAMCamCtrlType.LowLightCompensation) {
        rawCamRange = camCtrlLib.GetKGTCamRange(
          video_device_id,
          EIAMCamCtrlType.Exposure
        );
        rawCamRange = [0, 0, 0, 0, rawCamRange[4]];
      } else {
        rawCamRange = camCtrlLib.GetKGTCamRange(
          video_device_id,
          this.iamCamCtrlType
        );
      } */
      logger.debug(`${this._iamCamCtrlType}  ${JSON.stringify(rawCamRange)}`);
    } catch (e) {
      rawCamRange = [0, 0, 0, 0, 0];
      logger.error(
        `Error occured when reading camera prop range ${this._iamCamCtrlType} ${video_device_id}\n${e}`
      );
    }

    if (!_.isArray(rawCamRange) || rawCamRange.length !== 5) {
      rawCamRange = [0, 0, 0, 0, 0];
    }

    this.range = {
      min: rawCamRange[0],
      max: rawCamRange[1],
      step: rawCamRange[2],
      default: rawCamRange[3],
      flags: rawCamRange[4],
    } as ICamCtrlRange;
    this.isSupported = _.some(rawCamRange, (value) => value !== 0);
    this.isAutoSupported =
      this.range.flags === ECameraControlFlag.AutoAndManual;
    this._defaultValue = {
      value: this.range.default,
      isAuto:
        this.range.flags === ECameraControlFlag.Auto ||
        this.range.flags === ECameraControlFlag.AutoAndManual,
    } as IAdjustValue;
  }

  readValue() {
    let input = this.dependencies.input;
    if (_.isNil(input)) {
      return;
    }

    let video_device_id = input.settings[EOBSDShowProp.video_device_id];
    let rawCamValue: any = [0, 0];
    try {
      rawCamValue = camCtrlLib.GetKGTCamValue(
        video_device_id,
        this._iamCamCtrlType
      );
      logger.debug(`${this._iamCamCtrlType}  ${JSON.stringify(rawCamValue)}`);
    } catch (e) {
      logger.error(
        `Error occured when reading camera prop value ${this._iamCamCtrlType} ${video_device_id}\n${e}`
      );
    }

    if (!_.isArray(rawCamValue) || rawCamValue.length !== 2) {
      rawCamValue = [0, 0];
    }

    if (this._iamCamCtrlType === EIAMCamCtrlType.LowLightCompensation) {
      this._value = {
        value: 0,
        isAuto: rawCamValue[0] === 1,
      } as IAdjustValue;
    } else {
      this._value = {
        value: rawCamValue[0],
        isAuto: rawCamValue[1] === ECameraControlFlag.Auto,
      } as IAdjustValue;
    }
  }
}

export class AdjustSettingCollection
  implements
    ICollection<AdjustSetting>,
    ISetting<Dictionary<IAdjustValue>, Dictionary<IAdjustUI>, Dictionary<any>>
{
  protected children: Dictionary<AdjustSetting> = {};
  get keys() {
    return _.keys(this.children);
  }
  get(name: string) {
    return _.get(this.children, name, undefined);
  }
  add(name: string, setting: AdjustSetting): void {
    this.children[name] = setting;
  }
  remove(name: string) {
    _.unset(this.children, name);
  }

  private _dependencies: IDependencies;
  get dependencies() {
    return this._dependencies;
  }
  get settingType() {
    return ESettingType.CamAdjustCollection;
  }
  get defaultValue() {
    return _.mapValues(
      this.children,
      (child) => child.defaultValue
    ) as Dictionary<IAdjustValue>;
  }
  get value() {
    return _.mapValues(
      this.children,
      (child) => child.value
    ) as Dictionary<IAdjustValue>;
  }
  set value(value) {
    _.forEach(value, (_value, key) => {
      let setting = _.get(this.children, key);
      if (!_.isNil(setting)) {
        setting.value = _value;
      }
    });
  }
  get changed() {
    return _.some(this.children, "changed");
  }
  unChanged() {
    _.forEach(this.children, (child) => {
      child.unChanged();
    });
  }
  reset() {
    _.forEach(this.children, (child, name) => {
      if (child.iamCamCtrlType === EIAMCamCtrlType.Focus) {
        return;
      }
      child.reset();
    });
  }
  reload() {
    _.forEach(this.children, (child) => {
      child.reload();
    });
  }
  update(value: Dictionary<any>) {
    _.forEach(value, (_value, key) => {
      let setting = _.get(this.children, key);
      if (!_.isNil(setting)) {
        setting.update(_value);
      }
    });
  }
  updateAction() {}
  updatePartially(value: Dictionary<any>) {
    _.forEach(value, (_value, key) => {
      let setting = _.get(this.children, key);
      if (!_.isNil(setting)) {
        setting.updatePartially(_value);
      }
    });
  }
  serialize() {
    return _.mapValues(this.children, (child) => child.serialize());
  }
  load(value: any) {
    _.forEach(value, (_value, key) => {
      let setting = _.get(this.children, key);
      if (!_.isNil(setting)) {
        setting.load(_value);
      }
    });
  }
  static get valueUI() {
    return {} as Dictionary<IAdjustUI>;
  }
  get valueUI() {
    return _.mapValues(
      this.children,
      (child) => child.valueUI
    ) as Dictionary<IAdjustUI>;
  }
  get requiresVCRestartOnChange() {
    return false;
  }
  get requiresReloadOnVidSwitch() {
    return true;
  }

  constructor(dependencies: IDependencies) {
    this._dependencies = dependencies;
  }
}
