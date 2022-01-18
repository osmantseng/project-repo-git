import _, { Dictionary } from "lodash";
import { EKonnectRatio } from "./const";
import {
  ICropInfo,
  IRatioValue,
  IRatioOptionUI,
  IRatioOption,
} from "./interface";
import SettingBase from "../setting/settingBase";
import {
  getInputResolution,
  getVideoOutputResolution,
  setOBSSetting,
  setSceneItem2Center,
  setSceneItemBounds2FullScreen,
} from "../obs/obsStatic";
import { logger } from "../util";
import { ESettingType } from "../setting/const";

export const zeroCropInfo = {
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
} as ICropInfo;

// Default ratio is 16:9 1280x720
export const ratioOptionDefault = {
  name: EKonnectRatio.cropRatio_16_9,
  widthRatio: 16,
  heightRatio: 9,
  cropInfo: null,
} as IRatioOption;

const ratioOptions = [
  ratioOptionDefault,
  {
    name: EKonnectRatio.cropRatio_9_16,
    widthRatio: 9,
    heightRatio: 16,
    cropInfo: null,
  },
  {
    name: EKonnectRatio.cropRatio_4_3,
    widthRatio: 4,
    heightRatio: 3,
    cropInfo: null,
  },
  {
    name: EKonnectRatio.cropRatio_3_4,
    widthRatio: 3,
    heightRatio: 4,
    cropInfo: null,
  },
  {
    name: EKonnectRatio.cropRatio_1_1,
    widthRatio: 1,
    heightRatio: 1,
    cropInfo: null,
  },
  {
    name: EKonnectRatio.cropRatio_free,
    widthRatio: -1,
    heightRatio: -1,
    cropInfo: null,
  },
] as IRatioOption[];

export default class RatioSetting extends SettingBase<
  IRatioValue,
  IRatioOptionUI[],
  Dictionary<any>
> {
  get settingType() {
    return ESettingType.CamRatio;
  }
  static defaultValue = ratioOptionDefault as IRatioValue;
  get defaultValue() {
    let defaultValue = _.cloneDeep(RatioSetting.defaultValue);
    return defaultValue;
  }
  protected _value = this.defaultValue;
  get value() {
    return _.cloneDeep(this._value);
  }
  set value(value) {
    this._value = value;
    this._value.cropInfo = this.fixCropInfo(this._value.cropInfo);
  }
  private fixCropInfo(
    cropInfo: any,
    defaultCropInfo: ICropInfo = zeroCropInfo
  ) {
    if (_.isNull(cropInfo)) {
      return null;
    }
    // Even though IRatioValue.cropInfo implements ICropInfo, it could still become some invalid value in runtime.
    let tmp = {} as ICropInfo;
    let left = _.get(cropInfo, "left");
    tmp.left = _.isNumber(left) ? left : defaultCropInfo.left;

    let right = _.get(cropInfo, "right");
    tmp.right = _.isNumber(right) ? right : defaultCropInfo.right;

    let top = _.get(cropInfo, "top");
    tmp.top = _.isNumber(top) ? top : defaultCropInfo.top;

    let bottom = _.get(cropInfo, "bottom");
    tmp.bottom = _.isNumber(bottom) ? bottom : defaultCropInfo.bottom;
    return tmp;
  }
  updateAction() {
    let sceneItem = this.dependencies.sceneItem;
    if (_.isNil(sceneItem)) {
      return;
    }

    let cropInfo = this._value.cropInfo;
    if (_.isNull(cropInfo)) {
      cropInfo = zeroCropInfo;
    }
    logger.debug(
      `cropInfo ${cropInfo.top}, ${cropInfo.left}, ${cropInfo.bottom}, ${cropInfo.right}`
    );

    let restartVC = false;
    let currentCrop = sceneItem.crop;
    if (
      currentCrop.top !== cropInfo.top ||
      currentCrop.left !== cropInfo.left ||
      currentCrop.bottom !== cropInfo.bottom ||
      currentCrop.right !== cropInfo.right
    ) {
      sceneItem.crop = cropInfo;
      restartVC = true;
    }

    let obsHandler = this.dependencies.obsHandler;
    if (!_.isNil(obsHandler) && restartVC) {
      let inputResolution = getInputResolution(sceneItem.source);
      let supposedWidth = inputResolution.width;
      let supposedHeight = inputResolution.height;

      supposedWidth = supposedWidth - cropInfo.left - cropInfo.right;
      supposedHeight = supposedHeight - cropInfo.top - cropInfo.bottom;

      let outputResolution = getVideoOutputResolution();
      supposedWidth = _.round(
        (outputResolution.height / supposedHeight) * supposedWidth
      );
      if (supposedWidth % 2 !== 0) {
        // OBS does not allow odd number width and height output somehow
        supposedWidth -= 1;
      }

      if (outputResolution.width !== supposedWidth) {
        obsHandler.restartVirtualCamTask(() => {
          logger.debug(
            `CropSetting set value ${supposedWidth}x${outputResolution.height}`
          );
          setOBSSetting(
            "Video",
            "Base",
            `${supposedWidth}x${outputResolution.height}`
          );
          setOBSSetting(
            "Video",
            "Output",
            `${supposedWidth}x${outputResolution.height}`
          );

          if (!_.isNil(sceneItem)) {
            setSceneItem2Center(sceneItem);
            setSceneItemBounds2FullScreen(sceneItem);
          }
        });
      }
    }
  }
  updatePartially(value: any) {
    let newValue = this.value;

    let newName = _.get(value, "name");
    if (_.isString(newName)) {
      newValue.name = newName;
    }

    let newWidthRatio = _.toNumber(_.get(value, "widthRatio"));
    if (_.isNumber(newWidthRatio)) {
      newValue.widthRatio = newWidthRatio;
    }

    let newHeightRatio = _.toNumber(_.get(value, "heightRatio"));
    if (_.isNumber(newHeightRatio)) {
      newValue.heightRatio = newHeightRatio;
    }

    let newCropInfo = _.get(value, "cropInfo");
    if (_.isUndefined(newCropInfo)) {
      // pass
    } else if (_.isNull(newCropInfo)) {
      // pass
      newValue.cropInfo = null;
    } else if (_.isNil(newValue.cropInfo)) {
      newValue.cropInfo = this.fixCropInfo(newCropInfo);
    } else {
      newValue.cropInfo = this.fixCropInfo(newCropInfo, newValue.cropInfo);
    }

    this.update(newValue);
  }
  serialize() {
    let value = this.value;
    if (_.isNull(value.cropInfo)) {
      return value
    }
    else {
      value.cropInfo = this.fixCropInfo(value.cropInfo);
      return { ...value, cropInfo: { ...value.cropInfo } };
    }
  }
  static get valueUI() {
    return _.map(ratioOptions, (ratioOption, index) => {
      return {
        ...ratioOption,
        id: index.toString(),
        isChecked: false,
      } as IRatioOptionUI;
    });
  }
  get valueUI() {
    return _.map(ratioOptions, (ratioOption, index) => {
      return ratioOption.name === this._value.name
        ? ({
            ...this.value,
            id: index.toString(),
            isChecked: true,
          } as IRatioOptionUI)
        : ({
            ...ratioOption,
            id: index.toString(),
            isChecked: false,
          } as IRatioOptionUI);
    });
  }
  get requiresVCRestartOnChange() {
    return true;
  }
  get requiresReloadOnVidSwitch() {
    return false;
  }
}

export class RatioSettingP1 extends RatioSetting {
  updateAction() {
    let sceneItem = this.dependencies.sceneItem;
    if (_.isNil(sceneItem)) {
      return;
    }

    let cropInfo = this._value.cropInfo;
    if (_.isNull(cropInfo)) {
      cropInfo = zeroCropInfo;
    }

    logger.debug(
      `cropInfo ${cropInfo.top}, ${cropInfo.left}, ${cropInfo.bottom}, ${cropInfo.right}`
    );

    let currentCrop = sceneItem.crop;
    if (
      currentCrop.top !== cropInfo.top ||
      currentCrop.left !== cropInfo.left ||
      currentCrop.bottom !== cropInfo.bottom ||
      currentCrop.right !== cropInfo.right
    ) {
      sceneItem.crop = cropInfo;
      //restartVC = true;
    }
  }
}
