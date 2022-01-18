import _ from "lodash";
import SettingBase from "../setting/settingBase";
import { ESettingType } from "../setting/const";
import { INumberOption, INumberOptionUI } from "../setting/interface";
import {
  getVideoOutputResolution,
  setOBSSetting,
  setSceneItem2Center,
  setSceneItemBounds2FullScreen,
} from "../obs/obsStatic";
import { IWidthHeight } from "../obs/interface";

const resolutionOptionDefault = {
  name: "1080p",
  value: 1080,
} as INumberOption;

const resolutionOptions = [
  resolutionOptionDefault,
  {
    name: "720p",
    value: 720,
  },
  {
    name: "360p",
    value: 360,
  },
];

export abstract class ResolutionSettingBase extends SettingBase<
  number,
  INumberOptionUI[]
> {
  get settingType() {
    return ESettingType.ObsFrameRate;
  }
  static get defaultValue() {
    return _.clone(resolutionOptionDefault.value);
  }
  get defaultValue() {
    return ResolutionSetting.defaultValue;
  }
  protected _value = this.defaultValue;
  get value() {
    return _.clone(this._value);
  }
  set value(value) {
    this._value = value;
  }
  abstract updateAction(): void;
  updatePartially(value: any) {
    if (_.isString(value)) {
      value = _.toInteger(value);
    }

    if (_.isNumber(value) && value > 0) {
      this.update(value);
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
      this.value = _.round(value);
    }
    return true;
  }
  static get valueUI() {
    return _.map(resolutionOptions, (resolutionOption, index) => {
      return {
        ...resolutionOption,
        id: index.toString(),
        isChecked: false,
      } as INumberOptionUI;
    });
  }
  get valueUI() {
    return _.map(resolutionOptions, (resolutionOption, index) => {
      return {
        ...resolutionOption,
        id: index.toString(),
        isChecked: resolutionOption.value === this._value,
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

export default class ResolutionSetting extends ResolutionSettingBase {
  updateAction() {
    let obsHandler = this.dependencies.obsHandler;
    if (_.isNil(obsHandler) || !obsHandler.isOBSBackendInitialized) {
      return;
    }

    let outputResolution = getVideoOutputResolution();
    let supposedHeight = this._value;
    let supposedWidth =
      (outputResolution.width / outputResolution.height) * supposedHeight;

    let sceneItem = this.dependencies.sceneItem;
    if (
      _.isNil(sceneItem) ||
      (outputResolution.height === supposedHeight &&
        outputResolution.width === supposedWidth)
    ) {
      return;
    }

    obsHandler.restartVirtualCamTask(() => {
      setOBSSetting("Video", "Base", `${supposedWidth}x${supposedHeight}`);
      setOBSSetting("Video", "Output", `${supposedWidth}x${supposedHeight}`);

      if (!_.isNil(sceneItem)) {
        setSceneItem2Center(sceneItem);
        setSceneItemBounds2FullScreen(sceneItem);
      }
    });
  }
}

export class ResolutionSettingP1 extends ResolutionSettingBase {
  static fixedRatio = {
    width: 16,
    height: 9,
  } as IWidthHeight;

  updateAction() {
    let obsHandler = this.dependencies.obsHandler;
    if (_.isNil(obsHandler) || !obsHandler.isOBSBackendInitialized) {
      return;
    }

    let supposedHeight = this._value;
    let supposedWidth = _.floor(
      (this._value * ResolutionSettingP1.fixedRatio.width) /
        ResolutionSettingP1.fixedRatio.height
    );

    let sceneItem = this.dependencies.sceneItem;
    let outputResolution = getVideoOutputResolution();
    if (
      _.isNil(sceneItem) ||
      (outputResolution.height === supposedHeight &&
        outputResolution.width === supposedWidth)
    ) {
      return;
    }

    obsHandler.restartVirtualCamTask(() => {
      setOBSSetting("Video", "Base", `${supposedWidth}x${supposedHeight}`);
      setOBSSetting("Video", "Output", `${supposedWidth}x${supposedHeight}`);
      if (!_.isNil(sceneItem)) {
        setSceneItem2Center(sceneItem);
        setSceneItemBounds2FullScreen(sceneItem);
      }
    });
  }
}
