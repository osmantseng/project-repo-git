import _ from "lodash";
import SettingBase from "../setting/settingBase";
import { ESettingType } from "../setting/const";
import {
  INumberOption,
  INumberOptionUI,
  IStringOption,
  IStringOptionUI,
} from "../setting/interface";
import { getOBSSetting, setOBSSetting } from "../obs/obsStatic";

/* export const framerateOptionDefault = {
  name: "30",
  value: "30",
} as IStringOption;

export const framerateOptions = [
  {
    name: "24",
    value: "24 NTSC",
  },
  framerateOptionDefault,
  {
    name: "60",
    value: "60",
  },
] as IStringOption[]; */

export const framerateOptionDefault = {
  name: "30",
  value: 30,
} as INumberOption;

export const framerateOptions = [
  {
    name: "24",
    value: 24,
  },
  framerateOptionDefault,
  /* {
    name: "60",
    value: 60,
  }, */
] as INumberOption[];

export default class FrameRateSetting extends SettingBase<
  number,
  INumberOptionUI[]
> {
  get settingType() {
    return ESettingType.ObsFrameRate;
  }
  static get defaultValue() {
    return _.clone(framerateOptionDefault.value);
  }
  get defaultValue() {
    return FrameRateSetting.defaultValue;
  }
  private _value = this.defaultValue;
  get value() {
    return _.clone(this._value);
  }
  set value(value) {
    this._value = value;
  }
  updateAction() {
    let obsHandler = this.dependencies.obsHandler;
    let currentFPS = getOBSSetting("Video", "FPSInt");
    if (_.isNil(obsHandler) || this._value === currentFPS) {
      return;
    }

    obsHandler.restartVirtualCamTask(() => {
      setOBSSetting("Video", "FPSInt", this._value);
    });
  }
  updatePartially(value: any) {
    if (_.isString(value)) {
      value = _.toInteger(value);
    }

    if (_.isNumber(value)) {
      this.update(_.round(value));
    }
  }
  serialize() {
    return this.value;
  }
  load(value?: any): boolean {
    if (_.isString(value)) {
      value = _.toInteger(value);
    }

    if (_.isNumber(value)) {
      this.value = _.round (value);
    }
    return true;
  }
  static get valueUI() {
    return _.map(framerateOptions, (framerateOption, index) => {
      return {
        ...framerateOption,
        id: index.toString(),
        isChecked: false,
      } as INumberOptionUI;
    });
  }
  get valueUI() {
    return _.map(framerateOptions, (framerateOption, index) => {
      return {
        ...framerateOption,
        id: index.toString(),
        isChecked: framerateOption.value === this._value,
      } as INumberOptionUI;
    });
  }
  get requiresVCRestartOnChange() {
    return true;
  }
  get requiresReloadOnVidSwitch() {
    return false;
  }
}
