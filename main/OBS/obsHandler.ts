import * as osn from "obs-studio-node";
import { v4 as uuid } from "uuid";
import _, { Dictionary } from "lodash";
import * as path from "path";
import { app, BrowserWindow, IpcMain } from "electron";
const { byOS, OS, getOS } = require('../../main/operating-systems');
import {
  KonnectFilters,
  KonnectCropRatios,
  KonnectSettingTypes,
  OBSFilterTypes,
  OBSHandlerEvents,
  UIEvents,
  IAMCameraControls,
  IAMVideoProcAmps,
  ECameraControlFlags,
} from "./obsConst";
import {
  IFilterOption,
  IFilterOptionUI,
  ICropOption,
  ICropOptionUI,
  IVideoDeviceUI,
  IWidthHeight,
  ICropInfo,
  IAdjust,
  ICamCtrlRange,
  INumberOption,
  INumberOptionUI,
  IStringOption,
  IStringOptionUI,
} from "./obsInterface";
import { resolveResourcePath, logger } from "../util";
import {
  clearInputResolution,
  getVideoBaseResolution,
  getVideoDevices,
  getVideoOutputResolution,
  installVirtualCamPlugin,
  isVirtualCamPluginInstalled,
  setSceneItem2Center,
  setSceneItemBounds2FullScreen,
  setOBSSetting,
  startVirtualCam,
  stopVirtualCam,
  getInputResolution,
  getOBSSetting,
} from "./obsStatic";
const camCtrlLib = require("../UVCCamCtrl.node");

export interface ISetting {
  readonly type: KonnectSettingTypes;
  readonly defaultValue: any;
  //readonly availableValue: any;
  value: any;
  readonly valueUI: any;
  /* save: () => void;
  load: () => void;
  apply: () => void;
  default: () => void */
}
export interface IListSetting<T, U> extends ISetting {
  readonly defaultValue: T;
  value: T;
  readonly valueUI: U[];
}
export interface ISingleSetting<T, U> extends ISetting {
  readonly defaultValue: T;
  value: T;
  readonly valueUI: U;
}
export interface IDictSetting<T, U> extends ISetting {
  readonly defaultValue: Dictionary<T>;
  value: Dictionary<T>;
  readonly valueUI: Dictionary<U>;
}

abstract class OBSSettingBase implements ISetting {
  abstract type: KonnectSettingTypes;
  abstract defaultValue: any;
  abstract value: any;
  abstract valueUI: any;

  protected _parent?: OBSHandler;
  get parent() {
    return this._parent;
  }

  constructor(parent?: OBSHandler) {
    this._parent = parent;
  }
}

const framerateOptionDefault = {
  name: "30",
  value: "30",
} as IStringOption;

const framerateOptions = [
  /* {
    name: "10(測試用)",
    value: 10,
  }, */
  {
    name: "24",
    value: "24 NTSC",
  },
  framerateOptionDefault,
  {
    name: "60",
    value: "60",
  },
  /* {
    name: "Custom framerate",
    value: -1
  } */
];

class FrameRateSetting
  extends OBSSettingBase
  implements IListSetting<IStringOption, IStringOptionUI>
{
  get type() {
    return KonnectSettingTypes.obsFrameRate;
  }

  static get defaultValue() {
    return _.cloneDeep(framerateOptionDefault);
  }
  get defaultValue() {
    return FrameRateSetting.defaultValue;
  }

  private _value = this.defaultValue;
  get value() {
    return _.cloneDeep(this._value);
  }
  set value(val) {
    this._value = val;
    let restartVirtualCam = false;
    if (!_.isNil(this.parent) && this.parent.isVirtualCamStarted) {
      this.parent.stopVirtualCam();
      restartVirtualCam = true;
    }

    setOBSSetting("Video", "FPSCommon", val.value);
    let tmp = getOBSSetting("Video", "FPSCommon");
    logger.debug(`FrameRateSetting set value ${tmp}`);

    if (!_.isNil(this.parent) && restartVirtualCam) {
      this.parent.startVirtualCam();
    }
  }

  get valueUI() {
    let valueUI = _.map(framerateOptions, (framerateOption, index) => {
      return {
        ...framerateOption,
        id: index.toString(),
        isChecked: framerateOption.name === this._value.name,
      } as IStringOptionUI;
    });

    return valueUI;
  }
}

const resolutionOptionDefault = {
  name: "720p",
  value: 720,
} as INumberOption;

const resolutionOptions = [
  {
    name: "1080p",
    value: 1080,
  },
  resolutionOptionDefault,
  {
    name: "360p",
    value: 360,
  },
];

class ResolutionSetting
  extends OBSSettingBase
  implements IListSetting<INumberOption, INumberOptionUI>
{
  get type() {
    return KonnectSettingTypes.obsResolution;
  }

  static get defaultValue() {
    return _.cloneDeep(resolutionOptionDefault);
  }
  get defaultValue() {
    return ResolutionSetting.defaultValue;
  }

  private _value: INumberOption = this.defaultValue;
  get value() {
    return _.cloneDeep(this._value);
  }
  set value(val) {
    if (val.value > 0) {
      this._value = val;

      let outputResolution = getVideoOutputResolution();
      if (this._value.value === outputResolution.height) {
        return;
      }

      let restartVirtualCam = false;
      if (!_.isNil(this.parent) && this.parent.isVirtualCamStarted) {
        this.parent.stopVirtualCam();
        restartVirtualCam = true;
      }

      let supposedHeight = val.value;
      let supposedWidth =
        (outputResolution.width / outputResolution.height) * supposedHeight;

      setOBSSetting("Video", "Base", `${supposedWidth}x${supposedHeight}`);
      setOBSSetting("Video", "Output", `${supposedWidth}x${supposedHeight}`);

      if (!_.isNil(this.parent)) {
        let camIndex = this.parent.selectedCamIndex;
        let sceneItem = this.parent.camSets[camIndex].sceneItem;
        setSceneItem2Center(sceneItem);
        setSceneItemBounds2FullScreen(sceneItem);
        if (restartVirtualCam) {
          this.parent.startVirtualCam();
        }
      }
    }
  }

  get valueUI() {
    let valueUI = _.map(resolutionOptions, (resolutionOption, index) => {
      return {
        ...resolutionOption,
        id: index.toString(),
        isChecked: resolutionOption.name === this._value.name,
      } as INumberOptionUI;
    });

    return valueUI;
  }
}

abstract class CamSetSettingBase implements ISetting {
  abstract type: KonnectSettingTypes;
  abstract defaultValue: any;
  abstract value: any;
  abstract valueUI: any;
  /* abstract updatePartially(
    value: Dictionary<any>,
    callback?: (value: any) => void
  ): void; */

  protected input: osn.IInput;
  protected scene: osn.IScene;
  protected sceneItem: osn.ISceneItem;
  protected _parent?: CamSetSettingCollection;
  get parent() {
    return this._parent;
  }

  constructor(
    input: osn.IInput,
    scene: osn.IScene,
    sceneItem: osn.ISceneItem,
    parent?: CamSetSettingCollection
  ) {
    this.input = input;
    this.scene = scene;
    this.sceneItem = sceneItem;
    this._parent = parent;
  }
}

class DeviceSetting
  extends CamSetSettingBase
  implements IListSetting<string | number, IVideoDeviceUI>
{
  get type() {
    return KonnectSettingTypes.camSetDevice;
  }

  static get defaultValue(): string | number {
    return "";
  }
  get defaultValue(): string | number {
    return DeviceSetting.defaultValue;
  }

  private _value: string | number;
  get value() {
    return this._value;
  }
  set value(val) {
    this._value = val;

    let settings = this.input.settings;
    settings["video_device_id"] = val;
    settings["res_type"] = 1;
    settings["resolution"] = "";
    this.input.update(settings);

    let parentSettingCollection = this._parent;
    if (!_.isNil(parentSettingCollection)) {
      parentSettingCollection.adjustSettingCollection.updateDefaultValue();
      parentSettingCollection.adjustSettingCollection.updateValue();
    }
    setSceneItem2Center(this.sceneItem);
    setSceneItemBounds2FullScreen(this.sceneItem);
    //clearInputResolution(this.input);
  }

  /* updatePartially(value: Dictionary<any>, callback?: (value: string) => void) {
    let newValue = this.value;
    let video_device_id = _.get(value, "video_device_id");
    if (_.isString(video_device_id) || _.isNumber(video_device_id)) {
      newValue = video_device_id;
    }

    this.value = newValue;
  } */

  get valueUI() {
    let deviceOptions = getVideoDevices(this.input);
    let valueUI = _.map(deviceOptions, (deviceOption, index) => {
      return {
        ...deviceOption,
        id: index.toString(),
        isChecked: deviceOption.value === this._value,
      } as IVideoDeviceUI;
    });

    return valueUI;
  }

  static get valueUI() {
    let deviceOptions = getVideoDevices();
    let valueUI = _.map(deviceOptions, (deviceOption, index) => {
      return {
        ...deviceOption,
        id: index.toString(),
        isChecked: false,
      } as IVideoDeviceUI;
    });

    return valueUI;
  }

  constructor(
    input: osn.IInput,
    scene: osn.IScene,
    sceneItem: osn.ISceneItem,
    parent?: CamSetSettingCollection
  ) {
    super(input, scene, sceneItem, parent);
    this._value = input.properties.get("video_device_id").value;
  }
}

// Default filter is None
const filterOptionDefault = {
  name: KonnectFilters.None,
  imgPath: "./images/graphic_none.png",
  filterType: OBSFilterTypes.None,
  settings: {},
} as IFilterOption;

const filterOptions = [
  filterOptionDefault,
  {
    name: KonnectFilters.BW_Contrast,
    imgPath: "./images/graphic_bw_contrast.png",
    filterType: OBSFilterTypes.Clut,
    settings: {
      image_path: resolveResourcePath(
        "filters",
        "konnect",
        "Presets A Lighter Skin Tone",
        "BW Contrast_18.2021-06-24 15-11-15.cube"
      ),
      clut_amount: 1,
    },
  },
  {
    name: KonnectFilters.Captivate,
    imgPath: "./images/graphic_captivate.png",
    filterType: OBSFilterTypes.Clut,
    settings: {
      image_path: resolveResourcePath(
        "filters",
        "konnect",
        "Presets A Lighter Skin Tone",
        "Captivate v1_29.2021-06-18 12-03-14.cube"
      ),
      clut_amount: 1,
    },
  },
  {
    name: KonnectFilters.Contrast,
    imgPath: "./images/graphic_contrast.png",
    filterType: OBSFilterTypes.Clut,
    settings: {
      image_path: resolveResourcePath(
        "filters",
        "konnect",
        "Presets A Lighter Skin Tone",
        "Contrast v1_19.2021-06-18 12-03-14.cube"
      ),
      clut_amount: 1,
    },
  },
  {
    name: KonnectFilters.Cool,
    imgPath: "./images/graphic_cool.png",
    filterType: OBSFilterTypes.Clut,
    settings: {
      image_path: resolveResourcePath(
        "filters",
        "konnect",
        "Presets A Lighter Skin Tone",
        "Cool v1_23.2021-06-18 12-03-14.cube"
      ),
      clut_amount: 1,
    },
  },
  {
    name: KonnectFilters.Highlight,
    imgPath: "./images/graphic_highlight.png",
    filterType: OBSFilterTypes.Clut,
    settings: {
      image_path: resolveResourcePath(
        "filters",
        "konnect",
        "Presets A Lighter Skin Tone",
        "Highlight v1.2_27.2021-06-18 12-03-14.cube"
      ),
      clut_amount: 1,
    },
  },
  {
    name: KonnectFilters.Stylish,
    imgPath: "./images/graphic_stylish.png",
    filterType: OBSFilterTypes.Clut,
    settings: {
      image_path: resolveResourcePath(
        "filters",
        "konnect",
        "Presets A Lighter Skin Tone",
        "Stylish 1.5.cube_31.2021-06-18 12-03-14.cube"
      ),
      clut_amount: 1,
    },
  },
  {
    name: KonnectFilters.Vibrant,
    imgPath: "./images/graphic_vibrant.png",
    filterType: OBSFilterTypes.Clut,
    settings: {
      image_path: resolveResourcePath(
        "filters",
        "konnect",
        "Presets A Lighter Skin Tone",
        "Vibrant 1.2_25.2021-06-18 12-03-14.cube"
      ),
      clut_amount: 1,
    },
  },
  {
    name: KonnectFilters.Warm,
    imgPath: "./images/graphic_warm.png",
    filterType: OBSFilterTypes.Clut,
    settings: {
      image_path: resolveResourcePath(
        "filters",
        "konnect",
        "Presets A Lighter Skin Tone",
        "Warm v1_21.2021-06-18 12-03-14.cube"
      ),
      clut_amount: 1,
    },
  },
] as IFilterOption[];

// Currently only allows one filter at a time
class FilterSetting
  extends CamSetSettingBase
  implements IListSetting<IFilterOption, IFilterOptionUI>
{
  get type() {
    return KonnectSettingTypes.camSetFilter;
  }

  static filterName = "konnectFilter";

  static get defaultValue() {
    return _.cloneDeep(filterOptionDefault);
  }
  get defaultValue() {
    return FilterSetting.defaultValue;
  }

  private _value: IFilterOption = this.defaultValue;
  get value() {
    return _.cloneDeep(this._value);
  }
  set value(val) {
    let filter = this.scene.source.findFilter(FilterSetting.filterName);
    let filterOption = FilterSetting.getFilterOption(val.name);

    if (val.filterType === OBSFilterTypes.None) {
      // Remove existing filter.
      if (!_.isNil(filter)) {
        logger.verbose("filterOption is null. Remove existing filter.");
        this.scene.source.removeFilter(filter);
      }
      this._value = this.defaultValue; // Default value is None filter.
    } else {
      val.settings = _.defaults(val.settings, filterOption.settings);

      _.forEach(val.settings, (value, key) => {
        logger.debug(`FilterSetting ${key} ${value}`);
      });

      if (_.isNil(filter)) {
        // filter does not exist. Add a new one.
        logger.verbose("filter does not exist. Add a new one.");
        filter = osn.FilterFactory.create(
          val.filterType,
          FilterSetting.filterName,
          val.settings
        );
        this.scene.source.addFilter(filter);
      } else {
        // filter existed. Update its setting.
        logger.verbose("filter existed. Update its setting.");
        filter.update(val.settings);
      }
      this._value = val;
    }
  }

  get valueUI() {
    let valueUI = _.map(filterOptions, (filterOption, index) => {
      return {
        //...filterOption,
        name: filterOption.name,
        imgPath: filterOption.imgPath,
        filterType: filterOption.filterType,
        settings:
          filterOption.name === this._value.name
            ? this._value.settings
            : filterOption.settings,
        id: index.toString(),
        isChecked: filterOption.name === this._value.name,
      } as IFilterOptionUI;
    });

    return valueUI;
  }

  static get valueUI() {
    let valueUI = _.map(filterOptions, (filterOption, index) => {
      return {
        ...filterOption,
        id: index.toString(),
        isChecked: false,
      } as IFilterOptionUI;
    });

    return valueUI;
  }

  static getFilterOption(filterName: string) {
    let filterOption = _.find(filterOptions, ["name", filterName]);
    if (_.isNil(filterOption)) {
      return _.cloneDeep(FilterSetting.defaultValue);
    }
    return _.cloneDeep(filterOption);
  }
}

// Default ratio is 16:9 1280x720
const cropOptionDefault = {
  name: KonnectCropRatios.cropRatio_16_9,
  widthRatio: 16,
  heightRatio: 9,
  cropInfo: {
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
} as ICropOption;

const cropOptions = [
  cropOptionDefault,
  {
    name: KonnectCropRatios.cropRatio_9_16,
    widthRatio: 9,
    heightRatio: 16,
    cropInfo: {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    },
  },
  {
    name: KonnectCropRatios.cropRatio_4_3,
    widthRatio: 4,
    heightRatio: 3,
    cropInfo: {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    },
  },
  {
    name: KonnectCropRatios.cropRatio_3_4,
    widthRatio: 3,
    heightRatio: 4,
    cropInfo: {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    },
  },
  {
    name: KonnectCropRatios.cropRatio_1_1,
    widthRatio: 1,
    heightRatio: 1,
    cropInfo: {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    },
  },
  {
    name: KonnectCropRatios.cropRatio_free,
    widthRatio: -1,
    heightRatio: -1,
    cropInfo: {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    },
  },
] as ICropOption[];

class CropSetting
  extends CamSetSettingBase
  implements IListSetting<ICropOption, ICropOptionUI>
{
  get type() {
    return KonnectSettingTypes.camSetCrop;
  }

  static get defaultValue() {
    return _.cloneDeep(cropOptionDefault);
  }
  get defaultValue() {
    return CropSetting.defaultValue;
  }

  private _value: ICropOption = this.defaultValue;
  get value() {
    return _.cloneDeep(this._value);
  }
  set value(val) {
    this._value = val;

    let inputResolution = getInputResolution(this.input);
    let supposedWidth = inputResolution.width;
    let supposedHeight = inputResolution.height;

    if (!_.isNil(val.cropInfo)) {
      logger.debug(
        `cropInfo ${val.cropInfo.top}, ${val.cropInfo.left}, ${val.cropInfo.bottom}, ${val.cropInfo.right}`
      );
      this.sceneItem.crop = val.cropInfo;
      supposedWidth = supposedWidth - val.cropInfo.left - val.cropInfo.right;
      supposedHeight = supposedHeight - val.cropInfo.top - val.cropInfo.bottom;
    }

    let outputResolution = getVideoOutputResolution();
    supposedWidth = _.round(
      (outputResolution.height / supposedHeight) * supposedWidth
    );
    if (supposedWidth % 2 !== 0) {
      // OBS does not allow odd number width and height output somehow
      supposedWidth -= 1;
    }

    if (outputResolution.width !== supposedWidth) {
      let restartVirtualCam = false;
      let parentOBSHandler = this._parent?.parent?.parent;
      if (!_.isNil(parentOBSHandler) && parentOBSHandler.isVirtualCamStarted) {
        parentOBSHandler.stopVirtualCam();
        restartVirtualCam = true;
      }

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

      setSceneItem2Center(this.sceneItem);
      setSceneItemBounds2FullScreen(this.sceneItem);

      if (!_.isNil(parentOBSHandler) && restartVirtualCam) {
        parentOBSHandler.startVirtualCam();
      }
    }
  }

  get valueUI() {
    let valueUI = _.map(cropOptions, (cropOption, index) => {
      return {
        //...cropOption,
        name: cropOption.name,
        widthRatio: cropOption.widthRatio,
        heightRatio: cropOption.heightRatio,
        cropInfo: this._value.cropInfo,
        id: index.toString(),
        isChecked: cropOption.name === this._value.name,
      } as ICropOptionUI;
    });

    return valueUI;
  }

  static get valueUI() {
    let valueUI = _.map(cropOptions, (ratioOption, index) => {
      return {
        ...ratioOption,
        id: index.toString(),
        isChecked: false,
      } as ICropOptionUI;
    });

    return valueUI;
  }

  static getCropOption(cropName: string) {
    let cropOption = _.find(cropOptions, ["name", cropName]);
    if (_.isNil(cropOption)) {
      return _.cloneDeep(CropSetting.defaultValue);
    }
    return _.cloneDeep(cropOption);
  }
}

class VerticalFlip
  extends CamSetSettingBase
  implements ISingleSetting<boolean, boolean>
{
  get type() {
    return KonnectSettingTypes.camSetVerticalFlip;
  }

  get defaultValue() {
    return false;
  }

  private _value = this.defaultValue;
  get value() {
    return _.clone(this._value);
  }
  set value(val) {
    this._value = val;
    let scale = this.sceneItem.scale;
    this.sceneItem.scale = {
      x: scale.x,
      y: Math.abs(scale.y) * (this._value ? -1 : 1),
    };
  }

  get valueUI() {
    return this.value;
  }
}

class HorizontalFlip
  extends CamSetSettingBase
  implements ISingleSetting<boolean, boolean>
{
  get type() {
    return KonnectSettingTypes.camSetHorizontalFlip;
  }

  get defaultValue() {
    return false;
  }

  private _value = this.defaultValue;
  get value() {
    return _.clone(this._value);
  }
  set value(val) {
    this._value = val;
    let scale = this.sceneItem.scale;
    this.sceneItem.scale = {
      x: Math.abs(scale.x) * (this._value ? -1 : 1),
      y: scale.y,
    };
  }

  get valueUI() {
    return this.value;
  }
}

class AdjustSetting
  extends CamSetSettingBase
  implements ISingleSetting<IAdjust, IAdjust>
{
  get type() {
    return KonnectSettingTypes.camSetAdjust;
  }

  private name: string;
  private iamSettingType: IAMCameraControls | IAMVideoProcAmps;
  private _defaultValue: IAdjust;
  get defaultValue() {
    return _.cloneDeep(this._defaultValue);
  }

  private _value: IAdjust;
  get value() {
    return _.cloneDeep(this._value);
  }
  set value(val) {
    let video_device_id = this.input.settings["video_device_id"];
    var res: any = camCtrlLib.SetKGTCamValue(
      video_device_id,
      this.iamSettingType,
      val.value,
      val.isAuto ? 1 : 2
    );

    this._value = this.readValue();

    if (res === -1) {
      logger.error(`Failed to set ${this.name}`);
    }
  }

  get valueUI() {
    return this.value;
  }

  constructor(
    name: string,
    iamSettingType: IAMCameraControls | IAMVideoProcAmps,
    input: osn.IInput,
    scene: osn.IScene,
    sceneItem: osn.ISceneItem,
    parent?: CamSetSettingCollection
  ) {
    super(input, scene, sceneItem, parent);
    this.name = name;
    this.iamSettingType = iamSettingType;

    this._defaultValue = this.readDefaultValue();
    this._value = this.readValue();
  }

  readDefaultValue() {
    let video_device_id = this.input.settings["video_device_id"];
    let rawCamRange: any = [0, 0, 0, 0, 0];
    try {
      rawCamRange = camCtrlLib.GetKGTCamRange(
        video_device_id,
        this.iamSettingType
      );
    } catch (e) {
      logger.error(
        `Error occured when reading camera prop range ${this.iamSettingType} ${video_device_id}\n${e}`
      );
    }

    if (!_.isArray(rawCamRange) || rawCamRange.length !== 5) {
      rawCamRange = [0, 0, 0, 0, 0];
    }

    let camCtrlRange = {
      min: rawCamRange[0],
      max: rawCamRange[1],
      step: rawCamRange[2],
      default: rawCamRange[3],
      flags: rawCamRange[4],
    } as ICamCtrlRange;
    let isSupported = _.some(rawCamRange, (value) => value !== 0);

    return {
      name: this.name,
      iamSettingType: this.iamSettingType,
      range: camCtrlRange,
      value: camCtrlRange.default,
      isSupported: isSupported,
      isAuto:
        camCtrlRange.flags === ECameraControlFlags.Auto ||
        camCtrlRange.flags === ECameraControlFlags.AutoAndManual,
      isAutoSupported: camCtrlRange.flags === ECameraControlFlags.AutoAndManual,
    } as IAdjust;
  }

  updateDefaultValue() {
    this._defaultValue = this.readDefaultValue();
  }

  readValue() {
    let video_device_id = this.input.settings["video_device_id"];
    let rawCamValue: any = [0, 0];
    try {
      rawCamValue = camCtrlLib.GetKGTCamValue(
        video_device_id,
        this.iamSettingType
      );
    } catch (e) {
      logger.error(
        `Error occured when reading camera prop value ${this.iamSettingType} ${video_device_id}\n${e}`
      );
    }

    if (!_.isArray(rawCamValue) || rawCamValue.length !== 2) {
      rawCamValue = [0, 0];
    }

    let value = this.defaultValue;
    value.value = rawCamValue[0];
    value.isAuto = rawCamValue[1] === ECameraControlFlags.Auto;
    return value;
  }

  updateValue() {
    this._value = this.readValue();
  }
}

class AdjustSettingCollection
  extends CamSetSettingBase
  implements IDictSetting<IAdjust, IAdjust>
{
  get type() {
    return KonnectSettingTypes.camSetAdjustCollection;
  }

  private adjustSettingCollection: Dictionary<AdjustSetting>;

  get defaultValue() {
    return _.mapValues(
      this.adjustSettingCollection,
      (adjustSetting) => adjustSetting.defaultValue
    ) as Dictionary<IAdjust>;
  }

  get value() {
    return _.mapValues(
      this.adjustSettingCollection,
      (adjustSetting) => adjustSetting.value
    ) as Dictionary<IAdjust>;
  }
  set value(newAdjustSettingCollectionVal) {
    _.forEach(newAdjustSettingCollectionVal, (newAdjustVal, name) => {
      let adjustSetting = _.get(this.adjustSettingCollection, name, undefined);
      if (!_.isNil(adjustSetting)) {
        adjustSetting.value = newAdjustVal;
      }
    });
  }

  get valueUI() {
    return this.value;
  }

  constructor(
    adjustSettingCollection: Dictionary<AdjustSetting>,
    input: osn.IInput,
    scene: osn.IScene,
    sceneItem: osn.ISceneItem,
    parent?: CamSetSettingCollection
  ) {
    super(input, scene, sceneItem, parent);
    this.adjustSettingCollection = adjustSettingCollection;
  }

  getAdjustSettingByName(name: string) {
    return _.get(this.adjustSettingCollection, name, undefined);
  }

  getAdjustSettingByEnum(iamSettingType: IAMCameraControls | IAMVideoProcAmps) {
    return _.find(this.adjustSettingCollection, [
      "iamSettingType",
      iamSettingType,
    ]);
  }

  updateDefaultValue() {
    _.forEach(this.adjustSettingCollection, (adjustSetting) => {
      adjustSetting.updateDefaultValue();
    });
  }

  updateValue() {
    _.forEach(this.adjustSettingCollection, (adjustSetting) => {
      adjustSetting.updateValue();
    });
  }
}

class CamSetSettingCollection {
  private _parent?: CamSet;
  private collection: ISetting[];
  private _device: DeviceSetting;
  private _filter: FilterSetting;
  private _crop: CropSetting;
  private _verticalFlip: VerticalFlip;
  private _horizontalFlip: HorizontalFlip;
  private _adjustCollection: AdjustSettingCollection;

  get parent() {
    return this._parent;
  }
  get device() {
    return this._device;
  }
  get filter() {
    return this._filter;
  }
  get crop() {
    return this._crop;
  }
  get verticalFlip() {
    return this._verticalFlip;
  }
  get horizontalFlip() {
    return this._horizontalFlip;
  }
  get adjustSettingCollection() {
    return this._adjustCollection;
  }

  constructor(
    input: osn.IInput,
    scene: osn.IScene,
    sceneItem: osn.ISceneItem,
    parent?: CamSet
  ) {
    this._parent = parent;
    this._device = new DeviceSetting(input, scene, sceneItem, this);
    this._filter = new FilterSetting(input, scene, sceneItem, this);
    this._crop = new CropSetting(input, scene, sceneItem, this);
    this._verticalFlip = new VerticalFlip(input, scene, sceneItem, this);
    this._horizontalFlip = new HorizontalFlip(input, scene, sceneItem, this);

    let adjustItems = {
      Brightness: IAMVideoProcAmps.Brightness,
      Contrast: IAMVideoProcAmps.Contrast,
      Saturation: IAMVideoProcAmps.Saturation,
      Backlight: IAMVideoProcAmps.BacklightCompensation,
      "White Balance": IAMVideoProcAmps.WhiteBalance,
      Exposure: IAMCameraControls.Exposure,
      Sharpness: IAMVideoProcAmps.Sharpness,
      Hue: IAMVideoProcAmps.Hue,
      Gamma: IAMVideoProcAmps.Gamma,
      Focus: IAMCameraControls.Focus,
    };

    let adjustSettingCollection = _.mapValues(
      adjustItems,
      (value, key) =>
        new AdjustSetting(key, value, input, scene, sceneItem, this)
    ) as Dictionary<AdjustSetting>;

    this._adjustCollection = new AdjustSettingCollection(
      adjustSettingCollection,
      input,
      scene,
      sceneItem,
      this
    );

    this.collection = [
      this._device,
      this._filter,
      this._crop,
      this._verticalFlip,
      this._horizontalFlip,
      this._adjustCollection,
    ];
  }
}

class CamSet {
  private _parent?: OBSHandler;
  private _input: osn.IInput;
  private _scene: osn.IScene;
  private _sceneItem: osn.ISceneItem;

  get parent() {
    return this._parent;
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

  private _settings: CamSetSettingCollection;
  get settings() {
    return this._settings;
  }

  constructor(input: osn.IInput, scene: osn.IScene, parent?: OBSHandler) {
    this._parent = parent;
    this._sceneItem = scene.add(input);
    clearInputResolution(input);
    setSceneItem2Center(this._sceneItem);
    setSceneItemBounds2FullScreen(this._sceneItem);
    this._input = input;
    this._scene = scene;
    this._settings = new CamSetSettingCollection(
      input,
      scene,
      this._sceneItem,
      this
    );
  }
}

class OBSHandler {
  private workingDirectory: string;
  private appDataDirectory: string;
  private language: string = "en-US";
  private pipeName: string;
  private version: string = "1.0.0";

  private _framerateSetting = new FrameRateSetting(this);
  private _resolutionSetting = new ResolutionSetting(this);
  get framerateSetting() {
    return this._framerateSetting;
  }
  get resolutionSetting() {
    return this._resolutionSetting;
  }

  private _camCount = 0;
  get camCount() {
    return this._camSets.length;
  }
  private _camSets: CamSet[] = [];
  get camSets() {
    return this._camSets;
  }

  private _selectedCamIndex = -1;
  get selectedCamIndex() {
    return this._selectedCamIndex;
  }
  set selectedCamIndex(camIndex) {
    if (camIndex < 0 || camIndex >= this._camSets.length) {
      return;
    }
    this._selectedCamIndex = camIndex;
    let camSet = this._camSets[camIndex];
    setSceneItem2Center(camSet.sceneItem);
    setSceneItemBounds2FullScreen(camSet.sceneItem);
    osn.Global.setOutputSource(1, camSet.scene);
  }

  private _isOBSBackendInitialized: boolean = false;
  get isOBSBackendInitialized() {
    return this._isOBSBackendInitialized;
  }

  private _isVirtualCamStarted: boolean = false;
  get isVirtualCamStarted() {
    return this._isVirtualCamStarted;
  }

  constructor(camCount = 1) {
    this.workingDirectory = path.join(
      app.getAppPath().replace("app.asar", "app.asar.unpacked"),
      "node_modules",
      "obs-studio-node"
    );
    this.appDataDirectory = app.getPath("userData");
    this.pipeName = `kensington-webcamworks-pipe-${uuid()}`;

    this._camCount = camCount;
  }

  /** Initialize OBS backend. */
  initOBS() {
    logger.verbose("Initializing OBS backend...");
    if (this._isOBSBackendInitialized) {
      logger.warn("OBS backend already initialized!");
      return;
    }

    let initResult: any;
    try {
      osn.NodeObs.IPC.host(this.pipeName);
      osn.NodeObs.SetWorkingDirectory(this.workingDirectory);
      initResult = osn.NodeObs.OBS_API_initAPI(
        this.language,
        this.appDataDirectory,
        this.version
      );
    } catch (e) {
      this._isOBSBackendInitialized = false;
      throw Error("Exception when initializing OBS backend: " + e);
    }

    if (initResult != osn.EVideoCodes.Success) {
      this._isOBSBackendInitialized = false;
      throw Error("OBS backend initialization failed with code " + initResult);
    }

    this._isOBSBackendInitialized = true;
    logger.verbose("OBS backend initialized successfully");
  }

  /** End OBS backend. */
  endOBS() {
    logger.verbose("Ending OBS backend...");

    try {
      osn.NodeObs.OBS_service_removeCallback();
      osn.NodeObs.IPC.disconnect();
    } catch (e) {
      this._isOBSBackendInitialized = false;
      throw Error("Exception when ending OBS backend: " + e);
    }

    this._isOBSBackendInitialized = false;
    logger.verbose("OBS backend ended successfully");
  }

  /** Start virtual camera */
  startVirtualCam() {
    if (!isVirtualCamPluginInstalled()) {
      logger.verbose("Virtual camera not installed. Installing...");
      const installResult = installVirtualCamPlugin();
      if (!installResult) {
        logger.error("Virtual camera installation failed!");
        return;
      }
      logger.verbose("Virtual camera installation complete.");
    }

    if (!this._isVirtualCamStarted) {
      logger.verbose("Virtual camera starting...");
      startVirtualCam();
      logger.verbose("Virtual camera started.");
      this._isVirtualCamStarted = true;
    }
  }

  /** Stop virtual camera */
  stopVirtualCam() {
    logger.verbose("Virtual camera stopping...");
    stopVirtualCam();
    logger.verbose("Virtual camera stopped.");
    this._isVirtualCamStarted = false;
  }

  /** Initialize OBSHandler */
  private _init() {
    let restartVirtualCam = false;
    if (this.isVirtualCamStarted) {
      this.stopVirtualCam();
      restartVirtualCam = true;
    }

    const videoDevices = getVideoDevices();
    for (let i = 0; i < this._camCount; i++) {
      let scene = osn.SceneFactory.create(i.toString());
      let video_device_id =
        i === 0 && videoDevices.length > 0 ? videoDevices[0].value : "";

      /*OSMAN Modifily 20220118
      let input = osn.InputFactory.create("dshow_input", i.toString(), {
        video_device_id: video_device_id,
        res_type: 1,
      });
      */

      let input = byOS({
        [OS.Windows]: () =>
        osn.InputFactory.create("dshow_input", i.toString(), {
          // Somehow if video_device_id is set to "does_not_exist", virtual cameras will be hidden.
          // audio_device_id: "does_not_exist",
          video_device_id: video_device_id,
          res_type: 1,
        }),
        [OS.Mac]: () =>
        osn.InputFactory.create("av_capture_input", i.toString(), {
          // Somehow if video_device_id is set to "does_not_exist", virtual cameras will be hidden.
          // audio_device_id: "does_not_exist",
          device: video_device_id,
          use_preset : true
        }),
      })

      let camSet = new CamSet(input, scene, this);
      this._camSets.push(camSet);
    }

    if (this._camSets.length > 0) {
      this.selectedCamIndex = 0;
      let cropOption = this._camSets[0].settings.crop;
      cropOption.value = cropOption.defaultValue;
    }

    this._resolutionSetting.value = this._resolutionSetting.defaultValue;
    this._framerateSetting.value = this._framerateSetting.defaultValue;

    if (restartVirtualCam) {
      this.startVirtualCam();
    }
  }

  init() {
    this.initOBS();
    this._init();
  }
}

export const obsHandler = new OBSHandler();
let checkUIReadyId: NodeJS.Timeout;

export const initOBS = () => {
  obsHandler.init();
};

export const endOBS = () => {
  obsHandler.endOBS();
};

export const sendUIResizeEvent = (mainWindow: BrowserWindow) => {
  mainWindow.webContents.send(UIEvents.UIResize);
};

const debounceSendUIResizeEvent = _.debounce(sendUIResizeEvent, 30, {
  maxWait: 90,
});

export const setup = (ipcMain: IpcMain, mainWindow: BrowserWindow) => {
  mainWindow.on("resize", () => {
    debounceSendUIResizeEvent(mainWindow);
  });

  mainWindow.on("resized", () => {
    debounceSendUIResizeEvent(mainWindow);
  });

  // UIEvents.UIReady
  ipcMain.on(UIEvents.UIReady, (event) => {
    logger.verbose("r2m " + UIEvents.UIReady);
    clearInterval(checkUIReadyId);
    checkUIReadyId = setInterval(() => {
      try {
        logger.verbose("m2r " + UIEvents.UIReady);
        mainWindow.webContents.send(UIEvents.UIReady);
      } catch (e) {
        logger.error(e);
      }
    }, 500);
  });

  // OBSHandlerEvents.InitOBS
  ipcMain.on(OBSHandlerEvents.InitOBS, (event) => {
    logger.verbose("r2m " + OBSHandlerEvents.InitOBS);
    clearInterval(checkUIReadyId);
    //obsHandler.init();
    try {
      obsHandler.init();
    } catch (e) {
      logger.error(e);
      logger.verbose(`m2r ${OBSHandlerEvents.InitOBS}: ${false}`);
      event.reply(OBSHandlerEvents.InitOBS, false);
      return;
    }

    logger.verbose(`m2r ${OBSHandlerEvents.InitOBS}: ${true}`);
    event.reply(OBSHandlerEvents.InitOBS, true);
  });

  // OBSHandlerEvents.GetFramerate
  ipcMain.handle(OBSHandlerEvents.GetFramerate, (event) => {
    logger.verbose(`r2m ${OBSHandlerEvents.GetFramerate}`);
    return obsHandler.framerateSetting.valueUI;
  });

  // OBSHandlerEvents.SetFramerate
  ipcMain.handle(
    OBSHandlerEvents.SetFramerate,
    (event, framerateOption: IStringOptionUI) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.SetFramerate} ${framerateOption.name} ${framerateOption.value}`
      );
      obsHandler.framerateSetting.value = framerateOption as IStringOptionUI;
      return obsHandler.framerateSetting.valueUI;
    }
  );

  // OBSHandlerEvents.GetResolution
  ipcMain.handle(OBSHandlerEvents.GetResolution, (event) => {
    logger.verbose(`r2m ${OBSHandlerEvents.GetResolution}`);
    return obsHandler.resolutionSetting.valueUI;
  });

  // OBSHandlerEvents.GetOutputResolution
  ipcMain.handle(OBSHandlerEvents.GetOutputResolution, (event) => {
    return getVideoOutputResolution();
  });

  // OBSHandlerEvents.SetResolution
  ipcMain.handle(
    OBSHandlerEvents.SetResolution,
    (event, resolutionOption: INumberOptionUI) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.SetResolution} ${resolutionOption.name} ${resolutionOption.value}`
      );
      obsHandler.resolutionSetting.value = resolutionOption as INumberOption;
      return obsHandler.resolutionSetting.valueUI;
    }
  );

  // OBSHandlerEvents.UpdateOutputResolution
  ipcMain.on(OBSHandlerEvents.UpdateOutputResolution, (event) => {
    event.reply(
      OBSHandlerEvents.UpdateOutputResolution,
      getVideoOutputResolution()
    );
  });

  // OBSHandlerEvents.StartVirtualCam
  ipcMain.on(OBSHandlerEvents.StartVirtualCam, (event) => {
    obsHandler.startVirtualCam();
  });

  // OBSHandlerEvents.StopVirtualCam
  ipcMain.on(OBSHandlerEvents.StopVirtualCam, (event) => {
    obsHandler.stopVirtualCam();
  });

  // OBSHandlerEvents.GetCamDeviceOptions
  ipcMain.handle(
    OBSHandlerEvents.GetCamDeviceOptions,
    (event, camIndex?: number) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.GetCamDeviceOptions}: ${camIndex}`
      );
      if (
        _.isNil(camIndex) ||
        camIndex < 0 ||
        camIndex >= obsHandler.camCount
      ) {
        return DeviceSetting.valueUI;
      } else {
        return obsHandler.camSets[camIndex].settings.device.valueUI;
      }
    }
  );

  // OBSHandlerEvents.SetCamDevice
  ipcMain.handle(
    OBSHandlerEvents.SetCamDevice,
    (event, camIndex: number, deviceId: string | number) => {
      logger.verbose(`r2m ${OBSHandlerEvents.SetCamDevice}: ${deviceId}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return DeviceSetting.valueUI;
      }
      let camSet = obsHandler.camSets[camIndex];
      camSet.settings.device.value = deviceId;
      return camSet.settings.device.valueUI;
    }
  );

  //OBSHandlerEvents.GetCamResolution
  ipcMain.handle(
    OBSHandlerEvents.GetCamResolution,
    (event, camIndex: number) => {
      logger.verbose(`r2m ${OBSHandlerEvents.GetCamResolution}: ${camIndex}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return {
          width: -1,
          height: -1,
        } as IWidthHeight;
      }
      let camSet = obsHandler.camSets[camIndex];
      return getInputResolution(camSet.input);
    }
  );

  // OBSHandlerEvents.GetCamFilterOptions
  ipcMain.handle(
    OBSHandlerEvents.GetCamFilterOptions,
    (event, camIndex?: number) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.GetCamFilterOptions}: ${camIndex}`
      );
      if (
        _.isNil(camIndex) ||
        camIndex < 0 ||
        camIndex >= obsHandler.camCount
      ) {
        return FilterSetting.valueUI;
      } else {
        return obsHandler.camSets[camIndex].settings.filter.valueUI;
      }
    }
  );

  // OBSHandlerEvents.SetCamFilter
  ipcMain.handle(
    OBSHandlerEvents.SetCamFilter,
    (
      event,
      camIndex: number,
      filterName: string,
      settings: Dictionary<any> = {}
    ) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.SetCamFilter}: ${camIndex} ${filterName} ${settings}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return FilterSetting.valueUI;
      }
      let camSet = obsHandler.camSets[camIndex];
      let filterOption = FilterSetting.getFilterOption(filterName);
      filterOption.settings = settings; // 小心javascript參照，FilterOption.getFilterOption回傳複製的新物件
      camSet.settings.filter.value = filterOption;
      return camSet.settings.filter.valueUI;
    }
  );

  // OBSHandlerEvents.GetCamCropOptions
  ipcMain.handle(
    OBSHandlerEvents.GetCamCropOptions,
    (event, camIndex?: number) => {
      logger.verbose(`r2m ${OBSHandlerEvents.GetCamCropOptions}: ${camIndex}`);
      if (
        _.isNil(camIndex) ||
        camIndex < 0 ||
        camIndex >= obsHandler.camCount
      ) {
        return CropSetting.valueUI;
      } else {
        return obsHandler.camSets[camIndex].settings.crop.valueUI;
      }
    }
  );

  //OBSHandlerEvents.GetCamCrop
  ipcMain.handle(OBSHandlerEvents.GetCamCrop, (event, camIndex: number) => {
    logger.verbose(`r2m ${OBSHandlerEvents.GetCamCrop}: ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return {
        name: "",
        widthRatio: -1,
        heightRatio: -1,
        cropInfo: undefined,
      } as ICropOptionUI;
    }
    return obsHandler.camSets[camIndex].settings.crop.value;
  });

  // OBSHandlerEvents.SetCamCrop
  ipcMain.handle(
    OBSHandlerEvents.SetCamCrop,
    (event, camIndex: number, cropName: string, cropInfo?: ICropInfo) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.SetCamCrop}: ${camIndex} ${cropName} ${cropInfo?.top} ${cropInfo?.left} ${cropInfo?.bottom} ${cropInfo?.right}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return CropSetting.valueUI;
      }
      let camSet = obsHandler.camSets[camIndex];
      let cropOption = CropSetting.getCropOption(cropName);
      if (!_.isNil(cropInfo)) {
        cropOption.cropInfo = cropInfo; // 小心javascript參照，FilterOption.getFilterOption回傳複製的新物件
      }
      camSet.settings.crop.value = cropOption;

      mainWindow.webContents.send(
        OBSHandlerEvents.UpdateOutputResolution,
        getVideoOutputResolution()
      );

      return camSet.settings.crop.valueUI;
    }
  );

  //OBSHandlerEvents.GetCamVerticalFlip
  ipcMain.handle(
    OBSHandlerEvents.GetCamVerticalFlip,
    (event, camIndex: number) => {
      logger.verbose(`r2m ${OBSHandlerEvents.GetCamVerticalFlip}: ${camIndex}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return;
      }
      let camSet = obsHandler.camSets[camIndex];
      return camSet.settings.verticalFlip.value;
    }
  );

  //OBSHandlerEvents.SetCamVerticalFlip
  ipcMain.handle(
    OBSHandlerEvents.SetCamVerticalFlip,
    (event, camIndex: number, value?: boolean) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.SetCamVerticalFlip}: ${camIndex} ${value}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return;
      }
      let camSet = obsHandler.camSets[camIndex];
      if (_.isBoolean(value)) {
        camSet.settings.verticalFlip.value = value;
      } else {
        camSet.settings.verticalFlip.value =
          !camSet.settings.verticalFlip.value;
      }

      return camSet.settings.verticalFlip.value;
    }
  );

  //OBSHandlerEvents.GetCamHorizontalFlip
  ipcMain.handle(
    OBSHandlerEvents.GetCamHorizontalFlip,
    (event, camIndex: number) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.GetCamHorizontalFlip}: ${camIndex}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return;
      }
      let camSet = obsHandler.camSets[camIndex];
      return camSet.settings.horizontalFlip.value;
    }
  );

  //OBSHandlerEvents.SetCamHorizontalFlip
  ipcMain.handle(
    OBSHandlerEvents.SetCamHorizontalFlip,
    (event, camIndex: number, value?: boolean) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.SetCamHorizontalFlip}: ${camIndex} ${value}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return;
      }
      let camSet = obsHandler.camSets[camIndex];
      if (_.isBoolean(value)) {
        camSet.settings.horizontalFlip.value = value;
      } else {
        camSet.settings.horizontalFlip.value =
          !camSet.settings.horizontalFlip.value;
      }

      return camSet.settings.horizontalFlip.value;
    }
  );

  // OBSHandlerEvents.ResetCameraAdjusts
  ipcMain.handle(
    OBSHandlerEvents.ResetCameraAdjusts,
    (event, camIndex: number) => {
      logger.verbose(`r2m ${OBSHandlerEvents.ResetCameraAdjusts}: ${camIndex}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return undefined;
      }

      let camSet = obsHandler.camSets[camIndex];
      camSet.settings.adjustSettingCollection.value =
        camSet.settings.adjustSettingCollection.defaultValue;
      return camSet.settings.adjustSettingCollection.defaultValue;
    }
  );

  // OBSHandlerEvents.GetCamAdjusts
  ipcMain.handle(OBSHandlerEvents.GetCamAdjusts, (event, camIndex: number) => {
    logger.verbose(`r2m ${OBSHandlerEvents.GetCamAdjusts}: ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return undefined;
    }

    let camSet = obsHandler.camSets[camIndex];
    return camSet.settings.adjustSettingCollection.valueUI;
  });

  // OBSHandlerEvents.SetCamAdjusts
  ipcMain.handle(
    OBSHandlerEvents.SetCamAdjusts,
    (event, camIndex: number, value: Dictionary<IAdjust>) => {
      logger.verbose(`r2m ${OBSHandlerEvents.SetCamAdjusts}: ${camIndex}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return undefined;
      }

      let camSet = obsHandler.camSets[camIndex];
      camSet.settings.adjustSettingCollection.value = value;
      return camSet.settings.adjustSettingCollection.valueUI;
    }
  );

  // OBSHandlerEvents.GetCamAdjust
  ipcMain.handle(
    OBSHandlerEvents.GetCamAdjust,
    (event, camIndex: number, name: string) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.GetCamAdjust}: ${camIndex} ${name}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return undefined;
      }

      let camSet = obsHandler.camSets[camIndex];
      let adjustSetting =
        camSet.settings.adjustSettingCollection.getAdjustSettingByName(name);
      if (_.isNil(adjustSetting)) {
        return undefined;
      }

      return adjustSetting.valueUI;
    }
  );

  // OBSHandlerEvents.SetCamAdjust
  ipcMain.handle(
    OBSHandlerEvents.SetCamAdjust,
    (event, camIndex: number, name: string, value: number, isAuto: boolean) => {
      logger.verbose(
        `r2m ${OBSHandlerEvents.SetCamAdjust}: ${camIndex} ${name} ${value} ${isAuto}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return;
      }

      let camSet = obsHandler.camSets[camIndex];
      let adjustSetting =
        camSet.settings.adjustSettingCollection.getAdjustSettingByName(name);
      logger.debug(adjustSetting);
      if (_.isNil(adjustSetting)) {
        return undefined;
      }

      adjustSetting.value = {
        value: value,
        isAuto: isAuto,
      } as IAdjust;

      return adjustSetting.valueUI;
    }
  );
};
