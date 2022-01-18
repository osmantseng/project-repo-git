import _, { Dictionary } from "lodash";
import { IPreset, IPresetOptionUI } from "./interface";
import { ICamInfo } from "../webcam/interface";
import { isCamInfoEqual } from "../webcam/util";
import settings from "electron-settings";
import { ESettingType } from "../setting/const";
import { v4 as uuid } from "uuid";
import { logger } from "../util";

export class PresetHandler {
  static get version() {
    return "P1";
  }
  get version() {
    return PresetHandler.version;
  }

  static get emptyModelInfo() {
    return {
      name: "",
      vid: "",
      pid: "",
    } as ICamInfo;
  }
  get emptyModelInfo() {
    return PresetHandler.emptyModelInfo;
  }

  static get emptyPreset() {
    return {
      id: "",
      name: "",
      version: "",
      modelInfo: PresetHandler.emptyModelInfo,
      data: {},
      isChecked: false,
    } as IPreset;
  }

  protected _currentPreset = PresetHandler.emptyPreset;
  get currentPreset() {
    return _.cloneDeep(this._currentPreset);
  }
  set currentPreset(value) {
    _.forEach(this._children, (preset) => {
      if (isCamInfoEqual(preset.modelInfo, value.modelInfo)) {
        preset.isChecked = preset.name === value.name;
      }
    });
    this._currentPreset = value;
  }

  protected _children: IPreset[] = [];
  get children() {
    return this._children;
  }

  add(preset: IPreset) {
    this._children.push(preset);
  }
  get(id: string, modelInfo: ICamInfo) {
    return _.find(
      this._children,
      (child) => child.id === id && isCamInfoEqual(child.modelInfo, modelInfo)
    );
  }
  remove(id: string, modelInfo: ICamInfo) {
    _.remove(this._children, (child) => {
      return child.id === id && isCamInfoEqual(child.modelInfo, modelInfo);
    });
  }

  buildPreset(
    name: string,
    data = {} as Dictionary<any>,
    modelInfo = PresetHandler.emptyModelInfo
  ) {
    return {
      id: uuid().toString(),
      name: name,
      version: this.version,
      modelInfo: modelInfo,
      data: data,
      isChecked: false,
    } as IPreset;
  }

  update(data: any) {
    if (!_.isArray(data)) {
      return;
    }
    this._children = _.transform(
      data,
      (result, x) => {
        let presetWrapper = {
          id: _.get(x, "id", uuid().toString()),
          name: _.get(x, "name", ""),
          version: _.get(x, "version", ""),
          modelInfo: {
            name: _.get(x, "modelInfo.name", ""),
            vid: _.get(x, "modelInfo.vid", ""),
            pid: _.get(x, "modelInfo.pid", ""),
          } as ICamInfo,
          data: _.get(x, "data", {}),
          isChecked: _.get(x, "isChecked", false),
        } as IPreset;
        result.push(presetWrapper);
        return true;
      },
      [] as IPreset[]
    );
  }

  getPresetsUI(modelInfo: ICamInfo) {
    let availablePresets = _.filter(this._children, (child) => {
      if (_.isNil(modelInfo)) {
        return true;
      } else {
        return isCamInfoEqual(child.modelInfo, modelInfo);
      }
    });

    /* let valueUI = _.map(availablePresets, (preset, id) => {
      return {
        ...preset,
        id: id.toString(),
      } as IPresetOptionUI;
    }); */

    return availablePresets as IPresetOptionUI[];
  }

  savePresets() {
    settings.setSync(
      ESettingType.TemplateCollection,
      this.children as Dictionary<any>[]
    );
  }

  loadPresets() {
    let presets = settings.getSync(ESettingType.TemplateCollection);
    this.update(presets);
  }

  /* saveDefault() {
    logger.debug(JSON.stringify(this.currentPreset));
    let modelInfo = this.currentPreset.modelInfo;
    settings.set(
      `${ESettingType.DefaultCollection}.${modelInfo.vid}-${modelInfo.pid}-${modelInfo.serialNumber}`,
      this.children as Dictionary<any>[]
    );
  } */

  
}
