import { ESettingType } from '../setting/const';
import DeviceSetting, {
  KonnectDeviceSettingP1,
  PhysicDeviceSetting
} from '../cameraSettings/deviceSetting';
import EffectSetting from '../cameraSettings/effectSetting';
import { HorizontalFlipSetting, VerticalFlipSetting } from '../cameraSettings/flipSettings';
import { IDependencies } from '../setting/interface';
import RatioSetting, { RatioSettingP1 } from '../cameraSettings/ratioSetting';
import SettingCollection from '../setting/settingCollection';
import _ from 'lodash';
import { IInput, IScene, ISceneItem } from 'obs-studio-node';
import { IOBSHandler } from '../obs/interface';
import { AdjustSetting, AdjustSettingCollection } from '../cameraSettings/adjustSetting';
import { EAdjustType, EIAMCamCtrlType } from '../cameraSettings/const';
import { ICamSet } from './interface';
import TemplateSetting from '../cameraSettings/templateSetting';
import { isCamInfoEqual } from '../webcam/util';
import settings from 'electron-settings';
import { ITemplate } from '../cameraSettings/interface';
import { logger } from '../util';
import { ICamInfo } from '../webcam/interface';

export default class CamSet implements ICamSet {
  protected _parentOBSHandler: IOBSHandler | undefined;
  protected _input: IInput;
  protected _scene: IScene;
  protected _sceneItem: ISceneItem;
  protected _settings: SettingCollection;

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

  constructor(input: IInput, scene: IScene, sceneItem: ISceneItem, parentOBSHandler?: IOBSHandler) {
    this._input = input;
    this._scene = scene;
    this._sceneItem = sceneItem;
    this._parentOBSHandler = parentOBSHandler;
    this._settings = new SettingCollection(this);
  }
}

export class CamSetP1 extends CamSet {
  protected _deviceSetting: KonnectDeviceSettingP1;
  static get deviceSetting() {
    return KonnectDeviceSettingP1;
  }
  get deviceSetting() {
    return this._deviceSetting;
  }
  protected _templateSetting = new TemplateSetting(this);
  get templateSetting() {
    return this._templateSetting;
  }
  constructor(input: IInput, scene: IScene, sceneItem: ISceneItem, parentOBSHandler?: IOBSHandler) {
    super(input, scene, sceneItem, parentOBSHandler);
    this._deviceSetting = new KonnectDeviceSettingP1(this);
    this._settings.add(ESettingType.CamRatio, new RatioSettingP1(this));
    this._settings.add(ESettingType.CamVerticalFlip, new VerticalFlipSetting(this));
    this._settings.add(ESettingType.CamHorizintalFlip, new HorizontalFlipSetting(this));
    this._settings.add(ESettingType.CamEffect, new EffectSetting(this));

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
      [EAdjustType.focus]: EIAMCamCtrlType.Focus
    };

    _.forEach(adjustItems, (adjustItem, name) => {
      adjustSettings.add(name, new AdjustSetting(this, adjustItem, name));
    });

    this._settings.add(ESettingType.CamAdjustCollection, adjustSettings);

    let camInfo = this._deviceSetting.camInfo;
    let availableTemplates = TemplateSetting.getTemplates(camInfo);
    /* logger.debug(
      `camSetP1 constructor ${JSON.stringify(camInfo)} ${JSON.stringify(
        availableTemplates
      )}`
    ); */
    // 讀取最後使用的template
    let lastTemplate = _.find(availableTemplates, 'isChecked');
    this.updateTemplate(lastTemplate);
    this.updateSettings(true);

    this.templateSetting.saveTemplatesToFiles();
  }

  static getLastStatePath(camInfo: ICamInfo) {
    return `${ESettingType.LastStateCollection}.${camInfo.vid}-${camInfo.pid}-${camInfo.serialNumber}`;
  }

  protected updateTemplate(template?: ITemplate) {
    let prevCamInfo = _.cloneDeep(this._templateSetting.value.camInfo);
    if (_.isNil(template)) {
      template = this._templateSetting.defaultValue;
      template.camInfo = this._deviceSetting.camInfo;
      template.data = this._settings.defaultValue;
    }

    this._templateSetting.update(template);
    if (!isCamInfoEqual(prevCamInfo, template.camInfo)) {
      this._templateSetting.reload();
    }

    //logger.debug(`camSetP1 updateTemplate ${JSON.stringify(template)}`);
  }

  protected updateSettings(loadLastState = false, reset = false) {
    /* logger.debug(
      `camSetP1 updateSettings ${JSON.stringify(this._templateSetting.value)}`
    ); */
    let camInfo = this._deviceSetting.camInfo;
    let lastStatePath = CamSetP1.getLastStatePath(camInfo);
    // 查詢是否有紀錄最後狀態，如果有則讀取，否則讀取template設定值
    if (loadLastState && settings.hasSync(lastStatePath)) {
      // 讀取最後狀態
      let lastState = settings.getSync(lastStatePath);
      this.settings.load(lastState);
    } else if (this._templateSetting.value.id !== '') {
      this.settings.load(this._templateSetting.value.data);
    } else if (reset) {
      this.settings.reset();
    }
  }

  setCamDevice(videoDeviceId: string, updateDevice = true) {
    if (updateDevice) {
      this.deviceSetting.update(videoDeviceId);
    }

    if (isCamInfoEqual(this._templateSetting.value.camInfo, this._deviceSetting.camInfo, true)) {
      return;
    }

    this._settings.get(ESettingType.CamAdjustCollection)?.reload();
    this._settings.get(ESettingType.CamRatio)?.reset();

    let camInfo = this._deviceSetting.camInfo;
    let availableTemplates = TemplateSetting.getTemplates(camInfo);
    // 讀取最後使用的template
    let lastTemplate = _.find(availableTemplates, 'isChecked');
    this.updateTemplate(lastTemplate);
    this.updateSettings(true, true);

    this.templateSetting.saveTemplatesToFiles();
  }

  /* protected _setTemplate(templateId: string) {
    let availableTemplates = TemplateSetting.getTemplates(
      this._deviceSetting.camInfo
    );
    let selectedTemplate = _.find(availableTemplates, { id: templateId });
    this.updateTemplate(selectedTemplate);
    this.updateSettings(false, true);

    this.templateSetting.saveTemplatesToFiles();
  } */

  saveLastState() {
    let lastStatePath = CamSetP1.getLastStatePath(this.deviceSetting.camInfo);
    let data = this._settings.serialize();
    //logger.debug(`saveTemplatesToFiles1 ${lastStatePath}`);
    //logger.debug(`saveTemplatesToFiles2 ${JSON.stringify(data)}`);
    settings
      .set(lastStatePath, data)
      .then(() => {
        logger.debug(`save path ${lastStatePath}`);
      })
      .catch((err) => {
        logger.warn(`save path ${lastStatePath}`);
        logger.warn(`save error ${err}`);
      });
  }

  createTemplate(name: string) {
    let template = this._templateSetting.createTemplate(
      name,
      this._settings.serialize(),
      this._deviceSetting.camInfo
    );
    this._templateSetting.addTemplate(template);
    this._templateSetting.value = template;
    this._templateSetting.saveTemplatesToFiles();
    this.saveLastState();
  }

  saveTemplate(templateId: string) {
    this._templateSetting.saveTemplate(templateId, this._settings.serialize());
    this._templateSetting.saveTemplatesToFiles();
    this.saveLastState();
  }

  renameTemplate(templateId: string, name: string) {
    this._templateSetting.renameTemplate(templateId, name);
    this._templateSetting.saveTemplatesToFiles();
    this.saveLastState();
  }

  removeTemplate(templateId: string | string[]) {
    if (_.isString(templateId)) {
      templateId = [templateId];
    }
    _.forEach(templateId, (id) => {
      this._templateSetting.removeTemplate(id);
      if (id === this._templateSetting.value.id) {
        let template = this._templateSetting.defaultValue;
        template.camInfo = this._deviceSetting.camInfo;
        this._templateSetting.update(template);
      }
    });
    this._templateSetting.saveTemplatesToFiles();
    this.saveLastState();
  }

  setTemplate(templateId?: string) {
    if (_.isNil(templateId)) {
      this._settings.reset();
      let template = this._templateSetting.defaultValue;
      template.camInfo = this._deviceSetting.camInfo;
      template.data = this._settings.defaultValue;
      this._templateSetting.update(template);
    } else {
      let template = _.find(this._templateSetting.templates, {
        id: templateId
      });
      if (_.isNil(template)) {
        logger.verbose(`Preset ${templateId} does NOT exist.`);
      } else {
        logger.verbose(`Preset ${templateId} does exist.`);
        logger.debug(JSON.stringify(template));
        this._settings.load(template.data);
        this._templateSetting.update(template);
      }
    }
    this._templateSetting.saveTemplatesToFiles();
    this.saveLastState();
  }

  compareTemplate() {
    let currentData = this._settings.serialize();
    let presetData = this._templateSetting.value.data;
    let res = !_.isEqual(presetData, currentData);
    logger.debug(`compareTemplate preset ${JSON.stringify(presetData)}`);
    logger.debug(`compareTemplate current ${JSON.stringify(currentData)}`);
    logger.debug(`compareTemplate res ${res}`);
    return res;
  }

  /* compareTemplate = _.debounce(this._compareTemplate, 500, {
    maxWait: 3 * 500,
  }); */
}
