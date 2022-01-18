import _, { Dictionary } from "lodash";
import { ESettingType } from "../setting/const";
import SettingBase from "../setting/settingBase";
import { ITemplate } from "./interface";
import { ICamInfo } from "../webcam/interface";
import { emptyCamInfo } from "../webcam/conts";
import settings from "electron-settings";
import { v4 as uuid } from "uuid";
import { isCamInfoEqual } from "../webcam/util";
import { logger } from "../util";

export default class TemplateSetting extends SettingBase<
  ITemplate,
  ITemplate[],
  Dictionary<any>
> {
  get settingType() {
    return ESettingType.CamTemplate;
  }

  protected _templates = [] as ITemplate[];
  get templates() {
    return this._templates;
  }

  static get version() {
    return "P1";
  }
  static get defaultValue() {
    return {
      id: "",
      name: "",
      version: TemplateSetting.version,
      camInfo: _.clone(emptyCamInfo) as ICamInfo,
      data: {},
      isChecked: false,
    } as ITemplate;
  }

  get defaultValue() {
    return _.cloneDeep(TemplateSetting.defaultValue);
  }

  private _value = this.defaultValue;
  get value() {
    return _.cloneDeep(this._value);
  }
  set value(value) {
    this._value = value;
  }

  reload() {
    this._templates = TemplateSetting.getTemplates(this._value.camInfo);
  }
  updateAction() {}
  updatePartially(value: any) {
    let newValue = this.value;

    let newId = _.get(value, "id");
    if (_.isString(newId)) {
      newValue.id = newId;
    }

    let newName = _.get(value, "name");
    if (_.isString(newName)) {
      newValue.name = newName;
    }

    let newVersion = _.get(value, "version");
    if (_.isString(newVersion)) {
      newValue.version = newVersion;
    }

    let newData = _.get(value, "data");
    if (_.isPlainObject(newData)) {
      newValue.data = newData;
    }

    let newCamInfo = _.get(value, "camInfo");
    if (_.isPlainObject(newCamInfo)) {
      newValue.camInfo = _.chain(newCamInfo)
        .defaults(emptyCamInfo)
        .pick(["name", "serialNumber", "pid", "vid"])
        .value() as ICamInfo;
    }

    let newIsChecked = _.get(value, "isChecked");
    if (_.isBoolean(newIsChecked)) {
      newValue.isChecked = newIsChecked;
    }

    this.update(newValue);
  }
  serialize() {
    return { ...this.value };
  }
  get valueUI() {
    _.forEach(this._templates, (template) => {
      template.isChecked = template.id === this._value.id;
      if (template.id === this._value.id) {
        template.data = this._value.data;
      }
    });
    //logger.debug(`templateSetting valueUI ${JSON.stringify(this._templates)}`);
    return this.templates;
  }
  compare() {}
  get requiresVCRestartOnChange() {
    return false;
  }
  get requiresReloadOnVidSwitch() {
    return true;
  }
  static getTemplatePath(camInfo?: ICamInfo) {
    if (_.isNil(camInfo)) {
      return `${ESettingType.TemplateCollection}Default`;
    } else {
      return `${ESettingType.TemplateCollection}.${camInfo.vid}-${camInfo.pid}`;
    }
  }
  static getTemplates(camInfo?: ICamInfo) {
    let templatePath = TemplateSetting.getTemplatePath(camInfo);
    let templates = settings.getSync(templatePath);

    /* logger.debug(
      `getTemplates ${JSON.stringify(camInfo)} ${templatePath} ${_.isArray(
        templates
      )}`
    ); */
    if (!_.isArray(templates)) {
      return [] as ITemplate[];
    }
    let availableTemplates = _.transform(
      templates,
      (result, x) => {
        let presetWrapper = {
          id: _.get(x, "id", uuid().toString()),
          name: _.get(x, "name", ""),
          version: _.get(x, "version", ""),
          camInfo: {
            name: _.get(x, "camInfo.name", ""),
            vid: _.get(x, "camInfo.vid", ""),
            pid: _.get(x, "camInfo.pid", ""),
            serialNumber: _.get(x, "camInfo.serialNumber", ""),
          } as ICamInfo,
          data: _.get(x, "data", {}),
          isChecked: _.get(x, "isChecked", false),
        } as ITemplate;
        result.push(presetWrapper);
        return true;
      },
      [] as ITemplate[]
    );

    /* if (!_.isNil(camInfo)) {
      return _.filter(availableTemplates, (template) =>
        isCamInfoEqual(template.camInfo, camInfo)
      );
    } */

    return availableTemplates;
  }
  getTemplates() {
    return this._templates;
  }
  saveTemplatesToFiles() {
    let templatePath = TemplateSetting.getTemplatePath(this._value.camInfo);
    _.forEach(this._templates, (template) => {
      template.isChecked = template.id === this._value.id;
      if (template.id === this._value.id) {
        template.data = this._value.data;
      }
    });
    settings.setSync(templatePath, this._templates as Dictionary<any>[]);
    //logger.debug(`saveTemplatesToFiles1 ${templatePath}`);
    //logger.debug(`saveTemplatesToFiles2 ${JSON.stringify(this._templates)}`);
  }
  createTemplate(
    name: string,
    data = {} as Dictionary<any>,
    camInfo = emptyCamInfo
  ) {
    return {
      id: uuid().toString(),
      name: name,
      version: TemplateSetting.version,
      camInfo: camInfo,
      data: data,
      isChecked: false,
    } as ITemplate;
  }
  addTemplate(template: ITemplate) {
    this._templates.push(template);
  }
  saveTemplate(templateId: string, data = {} as Dictionary<any>) {
    let template = _.find(this._templates, { id: templateId });
    if (_.isNil(template)) {
      logger.verbose(`Preset ${template} does NOT exist.`);
    } else {
      template.data = data;
      if (templateId === this._value.id) {
        this._value.data = data;
      }
    }
  }
  renameTemplate(templateId: string, name: string) {
    let template = _.find(this._templates, { id: templateId });
    if (_.isNil(template)) {
      logger.verbose(`Preset ${template} does NOT exist.`);
    } else {
      logger.verbose(`Preset ${templateId} does exist.`);
      template.name = name;
      if (templateId === this._value.id) {
        this._value.name = name;
      }
    }
  }
  removeTemplate(templateId: string) {
    _.remove(this._templates, (template) => template.id === templateId);
  }
}
