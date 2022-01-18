import { app, BrowserWindow, IpcMain, dialog, screen } from 'electron';
import FrameRateSetting from '../obsSettings/framerateSetting';
import ResolutionSetting, { ResolutionSettingP1 } from '../obsSettings/resolutionSetting';
import { ESettingType } from '../setting/const';
import { IDependencies } from '../setting/interface';
import SettingCollection from '../setting/settingCollection';
import { logger } from '../util';
import _, { Dictionary } from 'lodash';
import * as osn from 'obs-studio-node';
import settings from 'electron-settings';
//import CamSet from "../camSet/camSet";
import { CamSetP1 } from '../camSet/camSetP1';
import {
  EOBSDShowProp,
  EOBSInputType,
  EOBSHandlerRequest,
  UIEvents,
  EOBSHandlerNotification
} from './const';
import OBSHandler from './obsHandler';
import {
  getInputResolution,
  //getOBSAvailableValues,
  //getOBSSetting,
  getVideoOutputResolution,
  setOBSSetting,
  setSceneItem2Center,
  setSceneItemBounds2FullScreen
} from './obsStatic';
import DeviceSetting, {
  KonnectDeviceSettingP1
  //PhysicDeviceSetting
} from '../cameraSettings/deviceSetting';
import EffectSetting from '../cameraSettings/effectSetting';
import RatioSetting, { RatioSettingP1 } from '../cameraSettings/ratioSetting';
import { HorizontalFlipSetting, VerticalFlipSetting } from '../cameraSettings/flipSettings';
import { AdjustSetting, AdjustSettingCollection } from '../cameraSettings/adjustSetting';
import { IUSBDevice, IWidthHeight } from './interface';
//import { PresetHandler } from '../preset/presetHandler';
import { IPresetOptionUI } from '../preset/interface';
import { EBackupRequest, ECloudBackupProvider } from '../backup/const';
import fs from 'fs';
import BackupHandler from '../backup/backupHandler';
import { ICloudUserInfo } from '../backup/interface';
import { ECropUIEvents, EDisplayRequest } from '../display/const';
//import { RatioDisplayCollection } from '../display/displayHandler';
import { IBounds } from '../display/interface';
import { ICropInfo, ITemplate } from '../cameraSettings/interface';
//import { RatioDisplaySet } from "../display/ratioDisplaySet";
//import { RatioDisplaySet2 } from "../display/ratioDisplaySet2";
import { RatioDisplaySet3 as RatioDisplaySet } from '../display/ratioDisplaySet3';
import { ICamSet } from '../camSet/interface';
import async from 'async';
import path from 'path';
const usbDetect = require('usb-detection');

export default class OBSHandlerP1 extends OBSHandler implements IDependencies {
  private _camCount = 0;
  get camCount() {
    return this._camSets.length;
  }
  private _camSets: ICamSet[] = [];
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

  get obsHandler() {
    return this;
  }
  get input() {
    let selectedCamIndex = this._selectedCamIndex;
    if (selectedCamIndex < 0 || selectedCamIndex >= this._camSets.length) {
      return undefined;
    }
    return this._camSets[selectedCamIndex].input;
  }
  get scene() {
    let selectedCamIndex = this._selectedCamIndex;
    if (selectedCamIndex < 0 || selectedCamIndex >= this._camSets.length) {
      return undefined;
    }
    return this._camSets[selectedCamIndex].scene;
  }
  get sceneItem() {
    let selectedCamIndex = this._selectedCamIndex;
    if (selectedCamIndex < 0 || selectedCamIndex >= this._camSets.length) {
      return undefined;
    }
    return this._camSets[selectedCamIndex].sceneItem;
  }
  get camSet() {
    let selectedCamIndex = this._selectedCamIndex;
    if (selectedCamIndex < 0 || selectedCamIndex >= this._camSets.length) {
      return undefined;
    }
    return this._camSets[selectedCamIndex];
  }

  private _settings = new SettingCollection(this);
  get settings() {
    return this._settings;
  }

  /* private _presetHandler = new PresetHandler();
  get presetHandler() {
    return this._presetHandler;
  } */

  private _backHandler = new BackupHandler();
  get backHandler() {
    return this._backHandler;
  }

  private _displayCollection: Dictionary<RatioDisplaySet> = {};
  get displayCollection() {
    return this._displayCollection;
  }

  constructor(camCount = 1) {
    super();
    this._camCount = camCount;
    this._settings.add(ESettingType.ObsResolution, new ResolutionSettingP1(this));
    this._settings.add(ESettingType.ObsFrameRate, new FrameRateSetting(this));
    let settingsPath = path.resolve(
      path.join(app.getPath('userData'), '..', 'Kensington', 'Konnect')
    );
    logger.debug(`settingsPath ${settingsPath}`);

    settings.configure({
      dir: settingsPath,
      fileName: 'KensingtonKonnectSettings.json',
      numSpaces: 2,
      prettify: true
    });
  }

  buildCamSet(name: string, video_device_id: string | number = '') {
    let input = osn.InputFactory.create(EOBSInputType.DShowInput, name, {
      [EOBSDShowProp.video_device_id]: video_device_id,
      [EOBSDShowProp.res_type]: 1,
      [EOBSDShowProp.resolution]: ''
    });
    input.muted = true;
    input.volume = 0;
    input.syncOffset = { sec: 0, nsec: 0 } as osn.ITimeSpec;
    let scene = osn.SceneFactory.create(`scene-${name}`);
    let sceneItem = scene.add(input);
    let camSet = new CamSetP1(input, scene, sceneItem, this);
    return camSet;
  }

  /** Initialize OBSHandler */
  protected _init() {
    // Begin usb monitoring
    logger.verbose('Begin monitoring usb...');
    usbDetect.startMonitoring();

    // Check if settings file is correct JSON data
    this.checkSettingsFile();

    setOBSSetting('Video', 'FPSType', 'Integer FPS Value');
    setOBSSetting('Video', 'ScaleType', 'bilinear');
    let resSetting = this.settings.get(ESettingType.ObsResolution);
    if (_.isNil(resSetting)) {
      setOBSSetting('Video', 'Base', '1920x1080');
      setOBSSetting('Video', 'Output', '1920x1080');
    } else {
      resSetting.reset();
    }
    //let tmp = getOBSSetting("Advanced", "browserHWAccel");
    //logger.debug(`Advanced, browserHWAccel: ${JSON.stringify(tmp)}`);

    // Phase 1 only uses 1 camset
    //const videoDevices = KonnectDeviceSettingP1.getValueUI();
    const videoDevices = CamSetP1.deviceSetting.getValueUI();
    for (let i = 0; i < this._camCount; i++) {
      let video_device_id = i === 0 && videoDevices.length > 0 ? videoDevices[0].value : '';
      let camSet = this.buildCamSet(i.toString(), video_device_id);
      this._camSets.push(camSet);
    }

    if (this._camSets.length > 0) {
      this.selectedCamIndex = 0;
      let camSet = this._camSets[0];

      setSceneItem2Center(camSet.sceneItem);
      setSceneItemBounds2FullScreen(camSet.sceneItem);

      logger.debug(`_init ${JSON.stringify(camSet.settings.serialize())}`);
      logger.debug(`${JSON.stringify(getInputResolution(camSet.input))}`);
      logger.debug(JSON.stringify(getVideoOutputResolution()));
    }

    // Load obs settings
    _.forEach(this._settings.keys, (key) => {
      logger.verbose(`Loading ${key}`);
      let setting = this._settings.get(key);
      if (!_.isNil(setting)) {
        try {
          let value = settings.getSync(`${ESettingType.ObsSettingCollection}.${key}`);
          setting.updatePartially(value);
        } catch (e) {
          logger.error(`Error when loading setting: ${key} ${e}`);
        }
      }
    });

    // Write current settings to file
    settings.setSync(ESettingType.ObsSettingCollection, this._settings.serialize());

    // Load presets from settings file
    //this._presetHandler.loadPresets();
    // 讀取上次使用的preset紀錄
    /* if (!_.isNil(this.camSet)) {
      let camModelInfo = (this.camSet as CamSetP1).deviceSetting.camInfo;

      let presets = obsHandler.presetHandler.getPresetsUI(camModelInfo);
      let currentPreset = _.find(presets, "isChecked");
      if (_.isNil(currentPreset)) {
        currentPreset = PresetHandler.emptyPreset;
        currentPreset.modelInfo = camModelInfo;
        obsHandler.presetHandler.currentPreset = currentPreset;

        let lastStatePath = `${ESettingType.LastStateCollection}.${camModelInfo.vid}-${camModelInfo.pid}-${camModelInfo.serialNumber}`;
        logger.verbose(
          `Last state for ${lastStatePath} ${settings.hasSync(lastStatePath)}`
        );
        if (settings.hasSync(lastStatePath)) {
          let lastState = settings.getSync(lastStatePath);
          logger.verbose(`Last state ${JSON.stringify(lastState)}`);
          this.camSet.settings.load(lastState);
        }
      } else {
        obsHandler.presetHandler.currentPreset = currentPreset;
        let lastStatePath = `${ESettingType.LastStateCollection}.${camModelInfo.vid}-${camModelInfo.pid}-${camModelInfo.serialNumber}`;
        logger.verbose(
          `Last state for ${lastStatePath} ${settings.hasSync(lastStatePath)}`
        );
        if (settings.hasSync(lastStatePath)) {
          let lastState = settings.getSync(lastStatePath);
          logger.verbose(`Last state ${JSON.stringify(lastState)}`);
          this.camSet.settings.load(lastState);
        } else {
          this.camSet.settings.load(currentPreset.data);
        }
      }
    } */

    //this._presetHandler.savePresets();

    this._backHandler.updateCloudBackupProvider();
  }

  checkSettingsFile() {
    // Test if the setting file can be loaded properly.
    try {
      let test = settings.getSync();
    } catch (e) {
      logger.error(`Error when loading settings: ${e}`);
      settings.setSync({});
    }
  }

  saveObsSettings() {
    // Write current obsHandler setting to files
    settings.setSync(ESettingType.ObsSettingCollection, this._settings.serialize());
  }

  loadObsSettings() {
    // Load obsHandler setting
    _.forEach(this._settings.keys, (key) => {
      logger.verbose(`Loading ${key}`);
      let setting = this._settings.get(key);
      if (!_.isNil(setting)) {
        try {
          let value = settings.getSync(`${ESettingType.ObsSettingCollection}.${key}`);
          setting.updatePartially(value);
        } catch (e) {
          logger.error(`Error when loading setting: ${key} ${e}`);
        }
      }
    });
  }

  endOBS() {
    logger.verbose('Ending monitoring usb...');
    usbDetect.stopMonitoring();
    super.endOBS();
  }

  loadSettings(data: any) {
    _.forEach(this.settings.keys, (key) => {
      logger.verbose(`Loading ${key}`);
      let setting = this.settings.get(key);
      if (!_.isNil(setting)) {
        try {
          let value = _.get(data, `${ESettingType.ObsSettingCollection}.${key}`);
          setting.updatePartially(value);
        } catch (e) {
          logger.error(`Error when loading setting: ${key} ${e}`);
        }
      }
    });

    settings.setSync(ESettingType.ObsSettingCollection, this.settings.serialize());

    let templates = _.get(data, ESettingType.TemplateCollection, {});
    if (_.isPlainObject(templates)) {
      settings.setSync(ESettingType.TemplateCollection, templates);
    }

    logger.debug(`load setting templates: ${JSON.stringify(templates)}`);
    _.forEach(this.camSets, (camSet) => {
      (camSet as CamSetP1).templateSetting.reload();
    });
    //this._presetHandler.update(presets);
    //this._presetHandler.savePresets();
  }

  _saveDefault() {
    let camSet = this.camSet;
    if (_.isNil(camSet)) {
      return;
    }
    let camInfo = (camSet as CamSetP1).deviceSetting.camInfo;
    //目前正在使用default
    logger.debug(`save last state ${JSON.stringify(camInfo)}`);
    (camSet as CamSetP1).saveLastState();
    /* logger.debug(
      `save path ${ESettingType.LastStateCollection}.${camInfo.vid}-${camInfo.pid}-${camInfo.serialNumber}`
    );

    settings
      .set(
        `${ESettingType.LastStateCollection}.${camInfo.vid}-${camInfo.pid}-${camInfo.serialNumber}`,
        camSet.settings.serialize()
      )
      .then(() => {
        logger.debug(
          `save path ${ESettingType.LastStateCollection}.${camInfo.vid}-${camInfo.pid}-${camInfo.serialNumber}`
        );
      })
      .catch((err) => {
        logger.warn(
          `save path ${ESettingType.LastStateCollection}.${camInfo.vid}-${camInfo.pid}-${camInfo.serialNumber}`
        );
        logger.warn(`save error ${err}`);
      }); */
  }

  _compareTemplate(callback?: Function) {
    let camSet = this.camSet;
    let res = false;
    if (_.isNil(camSet)) {
      res = false;
    } else {
      res = (camSet as CamSetP1).compareTemplate();
    }

    if (_.isFunction(callback)) {
      callback(res);
    }
  }

  saveDefault = _.debounce(this._saveDefault, 1000, { maxWait: 3 * 1000 });
  compareTemplate = _.debounce(this._compareTemplate, 500, {
    maxWait: 3 * 500
  });
}

export const obsHandler = new OBSHandlerP1();
let checkUIReadyId: NodeJS.Timeout;

export const initOBS = () => {
  obsHandler.init();
};

export const endOBS = () => {
  obsHandler.endOBS();
};

export const sendUIResizeEvent = (mainWindow: BrowserWindow) => {
  try {
    updateChildWindow(mainWindow);
    mainWindow.webContents.send(UIEvents.UIResize);
  } catch (e) {
    logger.error(`sendUIResizeEvent ${e}`);
  }
};

export const updateChildWindow = (mainWindow: BrowserWindow) => {
  let childWindows = mainWindow.getChildWindows();
  let pos = mainWindow.getPosition();
  let size = mainWindow.getSize();

  if (mainWindow.isMaximized()) {
    // The pos has an offset if mainWindow is maximized for some reason.
    let display = screen.getDisplayNearestPoint({
      x: pos[0] + size[0] / 2,
      y: pos[1] + size[1] / 2
    });

    pos[0] += _.round((size[0] - display.workAreaSize.width) / 2);
    pos[1] += _.round((size[1] - display.workAreaSize.height) / 2);
    size[0] = display.workAreaSize.width;
    size[1] = display.workAreaSize.height;
  }

  _.forEach(childWindows, (childWindow) => {
    childWindow.setPosition(pos[0], pos[1]);
    childWindow.setSize(size[0], size[1]);
  });
};

const debounceSendUIResizeEvent = _.debounce(sendUIResizeEvent, 5, {
  maxWait: 15
});

let requireFix = false;

export const setupObsHandler = (ipcMain: IpcMain, mainWindow: BrowserWindow) => {
  mainWindow.on('resize', () => {
    debounceSendUIResizeEvent(mainWindow);
  });

  mainWindow.on('resized', () => {
    sendUIResizeEvent(mainWindow);
  });

  mainWindow.on('move', () => {
    debounceSendUIResizeEvent(mainWindow);
  });

  mainWindow.on('moved', () => {
    sendUIResizeEvent(mainWindow);
  });

  mainWindow.on('unmaximize', () => {
    let childWindows = mainWindow.getChildWindows();
    _.forEach(childWindows, (childWindow) => {
      childWindow.unmaximize();
    });
    sendUIResizeEvent(mainWindow);
  });

  mainWindow.on('maximize', () => {
    let childWindows = mainWindow.getChildWindows();
    _.forEach(childWindows, (childWindow) => {
      childWindow.maximize();
    });
    sendUIResizeEvent(mainWindow);
  });

  mainWindow.on('minimize', () => {
    requireFix = true;
    let childWindows = mainWindow.getChildWindows();
    _.forEach(childWindows, (childWindow) => {
      childWindow.minimize();
    });
    sendUIResizeEvent(mainWindow);
  });

  mainWindow.on('restore', () => {
    _.forEach(obsHandler.displayCollection, (x) => {
      if (x.isDisplaying) {
        x.restore();
      }
    });

    sendUIResizeEvent(mainWindow);
  });

  mainWindow.on('focus', () => {
    if (requireFix && mainWindow.isMaximized()) {
      requireFix = false;
      _.forEach(obsHandler.displayCollection, (x) => {
        if (x.isDisplaying) {
          x.restore();
        }
      });

      sendUIResizeEvent(mainWindow);
    }
  });

  // UIEvents.UIReady
  ipcMain.on(UIEvents.UIReady, (event) => {
    logger.verbose('r2m ' + UIEvents.UIReady);
    clearInterval(checkUIReadyId);
    checkUIReadyId = setInterval(() => {
      try {
        logger.verbose('m2r ' + UIEvents.UIReady);
        mainWindow.webContents.send(UIEvents.UIReady);
      } catch (e) {
        logger.error(e);
      }
    }, 500);
  });

  // EOBSHandlerRequest.InitOBS
  ipcMain.on(EOBSHandlerRequest.initOBS, (event) => {
    logger.verbose('r2m ' + EOBSHandlerRequest.initOBS);
    clearInterval(checkUIReadyId);
    mainWindow.focus();
    /* obsHandler.init();
    _.forEach(obsHandler.camSets, (camSet) => {
      if (!_.has(obsHandler.displayCollection, camSet.input.name)) {
        let displaySet = new RatioDisplaySet(camSet, mainWindow);
        _.set(obsHandler.displayCollection, camSet.input.name, displaySet);
      }
    }); */
    try {
      obsHandler.init();
      _.forEach(obsHandler.camSets, (camSet) => {
        if (!_.has(obsHandler.displayCollection, camSet.input.name)) {
          let displaySet = new RatioDisplaySet(camSet, mainWindow);
          _.set(obsHandler.displayCollection, camSet.input.name, displaySet);
        }
      });
    } catch (e) {
      logger.error(e);
      logger.verbose(`m2r ${EOBSHandlerRequest.initOBS}: ${false}`);
      event.reply(EOBSHandlerRequest.initOBS, false);
      return;
    }

    usbDetect.on('change', (device: IUSBDevice) => {
      _.forEach(obsHandler.camSets, (camSet) => {
        (camSet as CamSetP1).deviceSetting.requiresReload = true;
        /* let deviceSetting = camSet.settings.get(ESettingType.CamDevice);
        if (!_.isNil(deviceSetting)) {
          let _deviceSetting = deviceSetting as KonnectDeviceSettingP1;
          _deviceSetting.requiresReload = true;
        } */
      });
      mainWindow.webContents.send(EOBSHandlerNotification.updateCamDeviceOptions);
    });
    logger.verbose(`m2r ${EOBSHandlerRequest.initOBS}: ${true}`);
    event.reply(EOBSHandlerRequest.initOBS, true);
  });
  // EOBSHandlerRequest.save
  ipcMain.on(EOBSHandlerRequest.save, (event) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.save}`);
    obsHandler.saveDefault();
    obsHandler.compareTemplate((hasChanged: boolean) => {
      logger.debug(`compareTemplate ${hasChanged}`);
      mainWindow.webContents.send(EOBSHandlerNotification.updateTemplateChangedState, hasChanged);
    });
  });

  // EOBSHandlerRequest.GetOBSOutputResolution
  ipcMain.handle(EOBSHandlerRequest.getOBSOutputResolution, (event) => {
    return getVideoOutputResolution();
  });
  // EOBSHandlerRequest.GetCamInputResolution
  ipcMain.handle(EOBSHandlerRequest.getCamInputResolution, (event, camIndex: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getCamInputResolution}: ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return {
        width: -1,
        height: -1
      } as IWidthHeight;
    }
    let camSet = obsHandler.camSets[camIndex];
    return getInputResolution(camSet.input);
  });

  // EOBSHandlerRequest.startVirtualCam
  ipcMain.on(EOBSHandlerRequest.startVirtualCam, (event) => {
    obsHandler.startVirtualCam();
  });
  // EOBSHandlerRequest.StopVirtualCam
  ipcMain.on(EOBSHandlerRequest.stopVirtualCam, (event) => {
    obsHandler.stopVirtualCam();
  });

  // EOBSHandlerRequest.getOutputResolutionOptions
  ipcMain.handle(EOBSHandlerRequest.getOutputResolutionOptions, (event) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getOutputResolutionOptions}`);
    let setting = obsHandler.settings.get(ESettingType.ObsResolution);
    if (_.isNil(setting)) {
      return ResolutionSetting.valueUI;
    }
    let _setting = setting as ResolutionSetting;
    return _setting.valueUI;
  });
  // EOBSHandlerRequest.setOutputResolution
  ipcMain.handle(EOBSHandlerRequest.setOutputResolution, (event, value: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.setOutputResolution} ${value}`);
    let setting = obsHandler.settings.get(ESettingType.ObsResolution);
    if (_.isNil(setting)) {
      return ResolutionSetting.valueUI;
    }
    let _setting = setting as ResolutionSetting;
    _setting.update(value);
    obsHandler.saveObsSettings();
    return _setting.valueUI;
  });

  // EOBSHandlerRequest.getOutputFrameRateOptions
  ipcMain.handle(EOBSHandlerRequest.getOutputFrameRateOptions, (event) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getOutputFrameRateOptions}`);
    let setting = obsHandler.settings.get(ESettingType.ObsFrameRate);
    if (_.isNil(setting)) {
      return FrameRateSetting.valueUI;
    }
    let _setting = setting as FrameRateSetting;
    return _setting.valueUI;
  });
  // EOBSHandlerRequest.setOutputFrameRate
  ipcMain.handle(EOBSHandlerRequest.setOutputFrameRate, (event, value: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.setOutputFrameRate} ${value}`);
    let setting = obsHandler.settings.get(ESettingType.ObsFrameRate);
    if (_.isNil(setting)) {
      return FrameRateSetting.valueUI;
    }
    let _setting = setting as FrameRateSetting;
    _setting.update(value);
    obsHandler.saveObsSettings();
    return _setting.valueUI;
  });

  // EOBSHandlerRequest.createPreset
  ipcMain.handle(EOBSHandlerRequest.createPreset, (event, camIndex: number, name: string) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.createPreset} ${camIndex} ${name}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return [] as ITemplate[];
    }

    let camSet = obsHandler.camSets[camIndex] as CamSetP1;
    camSet.createTemplate(name);
    return camSet.templateSetting.valueUI;
    /* let camModelInfo = camSet.deviceSetting.camInfo;

      logger.verbose(`Creating preset ${name}`);
      let preset = obsHandler.presetHandler.buildPreset(
        name,
        camSet.settings.serialize(),
        camModelInfo
      );
      obsHandler.presetHandler.add(preset);
      obsHandler.presetHandler.currentPreset = preset;
      obsHandler.presetHandler.savePresets();
      obsHandler.saveDefault();
      return obsHandler.presetHandler.getPresetsUI(camModelInfo); */
  });

  // EOBSHandlerRequest.savePreset
  ipcMain.handle(EOBSHandlerRequest.savePreset, (event, camIndex: number, id: string) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.savePreset} ${camIndex} ${id}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return [] as ITemplate[];
    }

    let camSet = obsHandler.camSets[camIndex] as CamSetP1;
    camSet.saveTemplate(id);
    return camSet.templateSetting.valueUI;
    /* let camModelInfo = camSet.deviceSetting.camInfo;

      let preset = obsHandler.presetHandler.get(id, camModelInfo);
      if (_.isNil(preset)) {
        logger.verbose(`Preset ${id} does NOT exist.`);
      } else {
        logger.verbose(`Preset ${id} does exist.`);
        preset.data = camSet.settings.serialize();
        obsHandler.presetHandler.currentPreset = preset;
        obsHandler.presetHandler.savePresets();
      }
      obsHandler.saveDefault();
      return obsHandler.presetHandler.getPresetsUI(camModelInfo); */
  });

  ipcMain.handle(EOBSHandlerRequest.compareTemplate, (event, camIndex: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.compareTemplate} ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return false;
    }
    let camSet = obsHandler.camSets[camIndex] as CamSetP1;
    return camSet.compareTemplate();
  });

  // EOBSHandlerRequest.renamePreset
  ipcMain.handle(
    EOBSHandlerRequest.renamePreset,
    (event, camIndex: number, id: string, name: string) => {
      logger.verbose(`r2m ${EOBSHandlerRequest.renamePreset} ${camIndex} ${id} ${name}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return [] as ITemplate[];
      }

      let camSet = obsHandler.camSets[camIndex] as CamSetP1;
      camSet.renameTemplate(id, name);
      return camSet.templateSetting.valueUI;
      /* let camModelInfo = camSet.deviceSetting.camInfo;

      let preset = obsHandler.presetHandler.get(id, camModelInfo);
      if (_.isNil(preset)) {
        logger.verbose(`Preset ${id} does NOT exist.`);
      } else {
        logger.verbose(`Preset ${id} does exist.`);
        preset.name = name;
        obsHandler.presetHandler.savePresets();
      }

      return obsHandler.presetHandler.getPresetsUI(camModelInfo); */
    }
  );

  // EOBSHandlerRequest.removePreset
  ipcMain.handle(
    EOBSHandlerRequest.removePreset,
    (event, camIndex: number, id: string | string[]) => {
      logger.verbose(`r2m ${EOBSHandlerRequest.removePreset} ${camIndex} ${JSON.stringify(id)}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return [] as ITemplate[];
      }

      let camSet = obsHandler.camSets[camIndex] as CamSetP1;
      camSet.removeTemplate(id);
      return camSet.templateSetting.valueUI;
      /* let camModelInfo = camSet.deviceSetting.camInfo;

      let changed = false;
      if (_.isArray(id)) {
        _.forEach(id, (_id) => {
          let preset = obsHandler.presetHandler.get(_id, camModelInfo);
          if (_.isNil(preset)) {
            logger.verbose(`Preset ${_id} does NOT exist.`);
          } else {
            logger.verbose(`Preset ${_id} does exist.`);
            obsHandler.presetHandler.remove(_id, camModelInfo);
            changed = true;
          }
        });
      } else {
        let preset = obsHandler.presetHandler.get(id, camModelInfo);
        if (_.isNil(preset)) {
          logger.verbose(`Preset ${id} does NOT exist.`);
        } else {
          logger.verbose(`Preset ${id} does exist.`);
          obsHandler.presetHandler.remove(id, camModelInfo);
          changed = true;
        }
      }

      if (changed) {
        obsHandler.presetHandler.savePresets();
      }
      obsHandler.saveDefault();
      return obsHandler.presetHandler.getPresetsUI(camModelInfo); */
    }
  );
  // EOBSHandlerRequest.getPresetOptions
  ipcMain.handle(EOBSHandlerRequest.getPresetOptions, (event, camIndex: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getPresetOptions} ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return [] as ITemplate[];
    }

    let camSet = obsHandler.camSets[camIndex] as CamSetP1;
    logger.verbose(
      `r2m ${EOBSHandlerRequest.getPresetOptions} ${JSON.stringify(camSet.templateSetting.valueUI)}`
    );
    return camSet.templateSetting.valueUI;
    /* let camModelInfo = camSet.deviceSetting.camInfo;

      return obsHandler.presetHandler.getPresetsUI(camModelInfo); */
  });
  // EOBSHandlerRequest.getPresetOption
  ipcMain.handle(EOBSHandlerRequest.getPresetOption, (event, camIndex: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getPresetOption} ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return undefined;
    }

    let camSet = obsHandler.camSets[camIndex] as CamSetP1;
    return camSet.templateSetting.value;
    /* let camModelInfo = camSet.deviceSetting.camInfo;

      let presetOptions = obsHandler.presetHandler.getPresetsUI(camModelInfo);
      return _.find(presetOptions, "isChecked"); */
  });
  // EOBSHandlerRequest.setPreset
  ipcMain.handle(EOBSHandlerRequest.setPreset, (event, camIndex: number, id?: string) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.setPreset} ${camIndex} ${id}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      mainWindow.webContents.send(EOBSHandlerNotification.updatePreset);
      return [] as IPresetOptionUI[];
    }

    let camSet = obsHandler.camSets[camIndex] as CamSetP1;
    camSet.setTemplate(id);
    mainWindow.webContents.send(EOBSHandlerNotification.updatePreset);
    return camSet.templateSetting.valueUI;
    /* let camModelInfo = camSet.deviceSetting.camInfo;

      if (_.isNil(id)) {
        let defaultPreset = _.cloneDeep(PresetHandler.emptyPreset);
        defaultPreset.modelInfo = camModelInfo;
        obsHandler.presetHandler.currentPreset = defaultPreset;
        camSet.settings.reset();
        obsHandler.presetHandler.savePresets();
        mainWindow.webContents.send(EOBSHandlerNotification.updatePreset);
        return obsHandler.presetHandler.getPresetsUI(camModelInfo);
      }

      let preset = obsHandler.presetHandler.get(id, camModelInfo);
      if (_.isNil(preset)) {
        logger.verbose(`Preset ${id} does NOT exist.`);
      } else {
        logger.verbose(`Preset ${id} does exist.`);
        logger.debug(JSON.stringify(preset.data));
        camSet.settings.load(preset.data);
        obsHandler.presetHandler.currentPreset = preset;
        obsHandler.presetHandler.savePresets();
        logger.debug(JSON.stringify(camSet.settings.serialize()));

        mainWindow.webContents.send(EOBSHandlerNotification.updatePreset);
      }

      obsHandler.saveDefault();
      return obsHandler.presetHandler.getPresetsUI(camModelInfo); */
  });

  // EOBSHandlerRequest.resetCamSettings
  ipcMain.handle(EOBSHandlerRequest.resetCamSettings, (event, camIndex: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.resetCamSettings} ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return;
    }
    let camSet = obsHandler.camSets[camIndex];
    camSet.settings.reset();
    mainWindow.webContents.send(EOBSHandlerNotification.updatePreset);
  });

  // EOBSHandlerRequest.getCamDeviceOptions
  ipcMain.handle(EOBSHandlerRequest.getCamDeviceOptions, (event, camIndex?: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getCamDeviceOptions}: ${camIndex}`);
    if (_.isNil(camIndex) || camIndex < 0 || camIndex >= obsHandler.camCount) {
      return KonnectDeviceSettingP1.getValueUI();
    } else {
      let camSet = obsHandler.camSets[camIndex] as CamSetP1;
      let deviceSetting = camSet.deviceSetting;

      if (deviceSetting.requiresReload) {
        deviceSetting.reload();

        camSet.setCamDevice(deviceSetting.value, false);

        logger.debug(`reload cam ${JSON.stringify(camSet.settings.serialize())}`);
        mainWindow.webContents.send(EOBSHandlerNotification.updatePreset);
      }
      return deviceSetting.valueUI;
    }
  });
  // EOBSHandlerRequest.SetCamDevice
  ipcMain.handle(EOBSHandlerRequest.setCamDevice, (event, camIndex: number, value: string) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.setCamDevice}: ${camIndex} ${value}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return KonnectDeviceSettingP1.getValueUI();
    } else {
      let camSet = obsHandler.camSets[camIndex] as CamSetP1;
      camSet.setCamDevice(value);

      return camSet.deviceSetting.valueUI;
    }
  });

  // EOBSHandlerRequest.GetCamEffectOptions
  ipcMain.handle(EOBSHandlerRequest.getCamEffectOptions, (event, camIndex?: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getCamEffectOptions}: ${camIndex}`);
    if (_.isNil(camIndex) || camIndex < 0 || camIndex >= obsHandler.camCount) {
      return EffectSetting.valueUI;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let setting = camSet.settings.get(ESettingType.CamEffect);
      if (_.isNil(setting)) {
        return EffectSetting.valueUI;
      }
      let _setting = setting as EffectSetting;
      return _setting.valueUI;
    }
  });
  // EOBSHandlerRequest.SetCamEffect
  ipcMain.handle(
    EOBSHandlerRequest.setCamEffect,
    (event, camIndex: number, value: Dictionary<any>) => {
      logger.verbose(
        `r2m ${EOBSHandlerRequest.setCamEffect}: ${camIndex} ${JSON.stringify(value)}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return EffectSetting.valueUI;
      } else {
        let camSet = obsHandler.camSets[camIndex];
        let setting = camSet.settings.get(ESettingType.CamEffect);
        if (_.isNil(setting)) {
          return EffectSetting.valueUI;
        }
        let _setting = setting as EffectSetting;
        _setting.updatePartially(value);
        return _setting.valueUI;
      }
    }
  );

  // EOBSHandlerRequest.GetCamRatioOptions
  ipcMain.handle(EOBSHandlerRequest.getCamRatioOptions, (event, camIndex?: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getCamRatioOptions}: ${camIndex}`);
    if (_.isNil(camIndex) || camIndex < 0 || camIndex >= obsHandler.camCount) {
      return RatioSettingP1.valueUI;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let setting = camSet.settings.get(ESettingType.CamRatio);
      if (_.isNil(setting)) {
        return RatioSettingP1.valueUI;
      }
      let _setting = setting as RatioSettingP1;
      return _setting.valueUI;
    }
  });
  // EOBSHandlerRequest.SetCamRatio
  ipcMain.handle(
    EOBSHandlerRequest.setCamRatio,
    (event, camIndex: number, value: Dictionary<any>) => {
      logger.verbose(`r2m ${EOBSHandlerRequest.setCamRatio}: ${camIndex} ${JSON.stringify(value)}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return RatioSettingP1.valueUI;
      } else {
        let camSet = obsHandler.camSets[camIndex];
        let setting = camSet.settings.get(ESettingType.CamRatio);
        if (_.isNil(setting)) {
          return RatioSettingP1.valueUI;
        }

        let _setting = setting as RatioSettingP1;
        _setting.updatePartially(value);

        /* mainWindow.webContents.send(
          EOBSHandlerNotification.updateOBSOutputResolution,
          getVideoOutputResolution()
        ); */

        return _setting.valueUI;
      }
    }
  );

  // EOBSHandlerRequest.GetCamVerticalFlip
  ipcMain.handle(EOBSHandlerRequest.getCamVerticalFlip, (event, camIndex?: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getCamVerticalFlip}: ${camIndex}`);
    if (_.isNil(camIndex) || camIndex < 0 || camIndex >= obsHandler.camCount) {
      return VerticalFlipSetting.valueUI;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let setting = camSet.settings.get(ESettingType.CamVerticalFlip);
      if (_.isNil(setting)) {
        return VerticalFlipSetting.valueUI;
      }
      let _setting = setting as VerticalFlipSetting;
      return _setting.valueUI;
    }
  });
  // EOBSHandlerRequest.setCamVerticalFlip
  ipcMain.handle(
    EOBSHandlerRequest.setCamVerticalFlip,
    (event, camIndex: number, value?: boolean) => {
      logger.verbose(`r2m ${EOBSHandlerRequest.setCamVerticalFlip}: ${camIndex} ${value}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return VerticalFlipSetting.valueUI;
      } else {
        let camSet = obsHandler.camSets[camIndex];
        let setting = camSet.settings.get(ESettingType.CamVerticalFlip);
        if (_.isNil(setting)) {
          return VerticalFlipSetting.valueUI;
        }
        let _setting = setting as VerticalFlipSetting;
        _setting.update(_.isBoolean(value) ? value : !_setting.value);

        let displaySet = _.get(obsHandler.displayCollection, camSet.input.name);
        if (!_.isNil(displaySet)) {
          return displaySet.updateDisplay();
        }

        return _setting.valueUI;
      }
    }
  );

  // EOBSHandlerRequest.GetCamHorizontalFlip
  ipcMain.handle(EOBSHandlerRequest.getCamHorizontalFlip, (event, camIndex?: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getCamHorizontalFlip}: ${camIndex}`);
    if (_.isNil(camIndex) || camIndex < 0 || camIndex >= obsHandler.camCount) {
      return HorizontalFlipSetting.valueUI;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let setting = camSet.settings.get(ESettingType.CamHorizintalFlip);
      if (_.isNil(setting)) {
        return HorizontalFlipSetting.valueUI;
      }
      let _setting = setting as HorizontalFlipSetting;
      return _setting.valueUI;
    }
  });
  // EOBSHandlerRequest.SetCamHorizontalFlip
  ipcMain.handle(
    EOBSHandlerRequest.setCamHorizontalFlip,
    (event, camIndex: number, value?: boolean) => {
      logger.verbose(`r2m ${EOBSHandlerRequest.setCamHorizontalFlip}: ${camIndex} ${value}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return HorizontalFlipSetting.valueUI;
      } else {
        let camSet = obsHandler.camSets[camIndex];
        let setting = camSet.settings.get(ESettingType.CamHorizintalFlip);
        if (_.isNil(setting)) {
          return HorizontalFlipSetting.valueUI;
        }
        let _setting = setting as HorizontalFlipSetting;
        _setting.update(_.isBoolean(value) ? value : !_setting.value);

        let displaySet = _.get(obsHandler.displayCollection, camSet.input.name);
        if (!_.isNil(displaySet)) {
          return displaySet.updateDisplay();
        }

        return _setting.valueUI;
      }
    }
  );

  // EOBSHandlerRequest.ResetCamAdjusts
  ipcMain.handle(EOBSHandlerRequest.resetCamAdjusts, (event, camIndex: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.resetCamAdjusts}: ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return AdjustSettingCollection.valueUI;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let setting = camSet.settings.get(ESettingType.CamAdjustCollection);
      if (_.isNil(setting)) {
        return AdjustSettingCollection.valueUI;
      }
      let _setting = setting as AdjustSettingCollection;
      _setting.reset();
      obsHandler.compareTemplate((hasChanged: boolean) => {
        logger.debug(`compareTemplate ${hasChanged}`);
        mainWindow.webContents.send(EOBSHandlerNotification.updateTemplateChangedState, hasChanged);
      });
      return _setting.valueUI;
    }
  });
  // EOBSHandlerRequest.GetCamAdjusts
  ipcMain.handle(EOBSHandlerRequest.getCamAdjusts, (event, camIndex: number) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getCamAdjusts}: ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return AdjustSettingCollection.valueUI;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let setting = camSet.settings.get(ESettingType.CamAdjustCollection);
      if (_.isNil(setting)) {
        return AdjustSettingCollection.valueUI;
      }
      let _setting = setting as AdjustSettingCollection;
      return _setting.valueUI;
    }
  });
  // EOBSHandlerRequest.setCamAdjusts
  ipcMain.handle(
    EOBSHandlerRequest.setCamAdjusts,
    (event, camIndex: number, value: Dictionary<any>) => {
      logger.verbose(`r2m ${EOBSHandlerRequest.setCamAdjusts}: ${camIndex} ${value}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return AdjustSettingCollection.valueUI;
      } else {
        let camSet = obsHandler.camSets[camIndex];
        let setting = camSet.settings.get(ESettingType.CamAdjustCollection);
        if (_.isNil(setting)) {
          return AdjustSettingCollection.valueUI;
        }
        let _setting = setting as AdjustSettingCollection;
        _setting.updatePartially(value);
        return _setting.valueUI;
      }
    }
  );
  // EOBSHandlerRequest.GetCamAdjust
  ipcMain.handle(EOBSHandlerRequest.getCamAdjust, (event, camIndex: number, adjustName: string) => {
    logger.verbose(`r2m ${EOBSHandlerRequest.getCamAdjust}: ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return AdjustSetting.valueUI;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let adjustSettings = camSet.settings.get(ESettingType.CamAdjustCollection);
      if (_.isNil(adjustSettings)) {
        return AdjustSetting.valueUI;
      }
      let _adjustSettings = adjustSettings as AdjustSettingCollection;
      let adjustSetting = _adjustSettings.get(adjustName);
      if (_.isNil(adjustSetting)) {
        return AdjustSetting.valueUI;
      }
      let _adjustSetting = adjustSetting as AdjustSetting;
      return _adjustSetting.valueUI;
    }
  });
  // EOBSHandlerRequest.SetCamAdjust
  ipcMain.handle(
    EOBSHandlerRequest.setCamAdjust,
    (event, camIndex: number, adjustName: string, value: Dictionary<any>) => {
      logger.verbose(`r2m ${EOBSHandlerRequest.setCamAdjust}: ${camIndex} ${value}`);
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return AdjustSetting.valueUI;
      } else {
        let camSet = obsHandler.camSets[camIndex];
        let adjustSettings = camSet.settings.get(ESettingType.CamAdjustCollection);
        if (_.isNil(adjustSettings)) {
          return AdjustSetting.valueUI;
        }
        let _adjustSettings = adjustSettings as AdjustSettingCollection;
        let adjustSetting = _adjustSettings.get(adjustName);
        if (_.isNil(adjustSetting)) {
          return AdjustSetting.valueUI;
        }
        let _adjustSetting = adjustSetting as AdjustSetting;
        _adjustSetting.updatePartially(value);
        return _adjustSetting.valueUI;
      }
    }
  );
};

export const setupBackupHandler = (ipcMain: IpcMain, mainWindow: BrowserWindow) => {
  // EBackupRequest.backupToLocal
  ipcMain.handle(EBackupRequest.backupToLocal, async (event) => {
    logger.verbose(`r2m ${EBackupRequest.backupToLocal}`);
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        {
          name: 'json file',
          extensions: ['json']
        }
      ],
      defaultPath: app.getPath('documents')
    });
    if (result.canceled || _.isNil(result.filePath)) {
      return false;
    }
    try {
      let data = await settings.get();
      let jsonData = JSON.stringify(data, null, 2);
      fs.writeFile(result.filePath, jsonData, (err) => {
        throw err;
      });
    } catch (e) {
      logger.error(`EBackupRequest.backupToLocal ${e}`);
      return false;
    }
    return true;
  });
  // EBackupRequest.restoreFromLocal
  ipcMain.handle(EBackupRequest.restoreFromLocal, async (event) => {
    logger.verbose(`r2m ${EBackupRequest.restoreFromLocal}`);
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [
        {
          name: 'json file',
          extensions: ['json']
        }
      ],
      defaultPath: app.getPath('documents'),
      properties: ['openFile']
    });
    if (result.canceled || result.filePaths.length !== 1) {
      return false;
    }
    let res = {};
    try {
      const jsonString = fs.readFileSync(result.filePaths[0]);
      res = JSON.parse(jsonString.toString());
    } catch (e) {
      logger.error(`EBackupRequest.restoreFromLocal ${e}`);
      return false;
    }

    obsHandler.loadSettings(res);

    let camSet = obsHandler.camSet;
    if (!_.isNil(camSet)) {
      mainWindow.webContents.send(
        EOBSHandlerNotification.updatePresetOptions,
        (camSet as CamSetP1).templateSetting.valueUI
      );
    }
    /* let selectedCamIndex = obsHandler.selectedCamIndex;
    let camSet = obsHandler.camSets[selectedCamIndex];
    let deviceSetting = camSet.settings.get(ESettingType.CamDevice);
    if (!_.isNil(deviceSetting)) {
      try {
        let _deviceSetting = deviceSetting as KonnectDeviceSettingP1;
        if (!_.isNil(_deviceSetting.camInfo)) {
          let camModelInfo = _deviceSetting.camInfo;
          mainWindow.webContents.send(
            EOBSHandlerNotification.updatePresetOptions,
            obsHandler.presetHandler.getPresetsUI(camModelInfo)
          );
        }
      } catch (e) {
        logger.warn(
          "This deviceSetting is not PhysicDeviceSetting. It does not have camModelInfo property!"
        );
      }
    } */

    return true;
  });

  ipcMain.handle(EBackupRequest.getCloudBackupProvider, (event) => {
    logger.verbose(`r2m ${EBackupRequest.getCloudBackupProvider}`);
    return obsHandler.backHandler.cloudBackupProvider;
  });

  // EBackupRequest.signInWithPopup
  ipcMain.handle(
    EBackupRequest.signInWithPopup,
    (event, provider: ECloudBackupProvider, nextAction?: string) => {
      logger.verbose(`r2m ${EBackupRequest.signInWithPopup} ${provider}`);
      return new Promise<ICloudUserInfo | undefined>((resolve, reject) => {
        async.auto<{
          signInWithPopup: ICloudUserInfo | undefined;
          nextAction: any;
        }>(
          {
            signInWithPopup: (callback: Function) => {
              obsHandler.backHandler
                .signInWithPopup(mainWindow, provider)
                .then(() => {
                  obsHandler.backHandler.cloudBackupProvider = provider;
                  obsHandler.backHandler.saveCloudBackupProvider();
                  //resolve(obsHandler.backHandler.getCloudUserInfo());
                  callback(null, obsHandler.backHandler.getCloudUserInfo());
                })
                .catch(() => {
                  callback('signInWithPopup failed');
                });
            },
            nextAction: [
              'signInWithPopup',
              (results, callback: Function) => {
                if (_.isNil(nextAction)) {
                  callback(null);
                } else {
                  if (nextAction === 'restore') {
                    logger.verbose(`r2m ${EBackupRequest.restoreFromCloud}`);
                    obsHandler.backHandler
                      .restoreFromCloud(mainWindow, (data: any) => {
                        logger.debug(`restoreFromCloud ${JSON.stringify(data)}`);
                        obsHandler.loadSettings(data);

                        let camSet = obsHandler.camSet;
                        if (!_.isNil(camSet)) {
                          mainWindow.webContents.send(
                            EOBSHandlerNotification.updatePresetOptions,
                            (camSet as CamSetP1).templateSetting.valueUI
                          );
                        }
                      })
                      .then(() => {
                        logger.debug('restoreFromCloud success');
                        callback(null);
                      })
                      .catch(() => {
                        logger.error('restoreFromCloud failed');
                        callback(null);
                      });
                  } else if (nextAction === 'backup') {
                    let data = settings.getSync();
                    logger.debug(`backupToCloud ${JSON.stringify(data)}`);
                    obsHandler.backHandler
                      .backupToCloud(mainWindow, data)
                      .then(() => {
                        logger.debug('backupToCloud success');
                        callback(null);
                      })
                      .catch(() => {
                        logger.error('backupToCloud failed');
                        callback(null);
                      });
                  }
                }
              }
            ]
          },
          (err, results) => {
            if (!_.isNil(err) || _.isNil(results)) {
              resolve(undefined);
            } else {
              resolve(results.signInWithPopup);
            }
          }
        );
        /* obsHandler.backHandler
          .signInWithPopup(mainWindow, provider)
          .then(() => {
            obsHandler.backHandler.cloudBackupProvider = provider;
            obsHandler.backHandler.saveCloudBackupProvider();
            resolve(obsHandler.backHandler.getCloudUserInfo());
          })
          .then(() => {})
          .catch(() => {
            resolve(undefined);
          }); */
      });
    }
  );

  ipcMain.handle(EBackupRequest.getCloudUserInfo, (event) => {
    logger.verbose(`r2m ${EBackupRequest.getCloudUserInfo}`);
    return obsHandler.backHandler.getCloudUserInfo();
  });

  ipcMain.on(EBackupRequest.eraseCloudBackupProvider, (event) => {
    logger.verbose(`r2m ${EBackupRequest.eraseCloudBackupProvider}`);
    obsHandler.backHandler.eraseCloudBackupProvider();
  });

  ipcMain.handle(EBackupRequest.backupToCloud, async (event) => {
    logger.verbose(`r2m ${EBackupRequest.backupToCloud}`);
    //return true;
    let data = settings.getSync();
    logger.debug(`backupToCloud ${JSON.stringify(data)}`);
    return obsHandler.backHandler.backupToCloud(mainWindow, data);
  });

  ipcMain.handle(EBackupRequest.restoreFromCloud, async (event) => {
    logger.verbose(`r2m ${EBackupRequest.restoreFromCloud}`);
    return obsHandler.backHandler.restoreFromCloud(mainWindow, (data: any) => {
      logger.debug(`restoreFromCloud ${JSON.stringify(data)}`);
      obsHandler.loadSettings(data);

      let camSet = obsHandler.camSet;
      if (!_.isNil(camSet)) {
        mainWindow.webContents.send(
          EOBSHandlerNotification.updatePresetOptions,
          (camSet as CamSetP1).templateSetting.valueUI
        );
      }
    });
  });
};

export const setupDisplayHandler = (ipcMain: IpcMain, mainWindow: BrowserWindow) => {
  // EDisplayRequest.startDisplay
  ipcMain.handle(EDisplayRequest.startDisplay, (event, camIndex: number, bounds?: IBounds) => {
    logger.verbose(`r2m ${EDisplayRequest.startDisplay} ${camIndex} ${JSON.stringify(bounds)}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let displaySet = _.get(obsHandler.displayCollection, camSet.input.name);
      if (!_.isNil(displaySet)) {
        displaySet.updateDisplay(bounds, true);
        updateChildWindow(mainWindow);
      }
    }
  });

  // EDisplayRequest.updateDisplay
  ipcMain.on(
    EDisplayRequest.updateDisplay,
    (event, camIndex: number, bounds?: IBounds, unhide: boolean = false) => {
      logger.verbose(
        `r2m ${EDisplayRequest.updateDisplay} ${camIndex} ${bounds?.x} ${bounds?.y} ${bounds?.width} ${bounds?.height}, ${unhide}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return;
      } else {
        let camSet = obsHandler.camSets[camIndex];
        let displaySet = _.get(obsHandler.displayCollection, camSet.input.name);
        if (!_.isNil(displaySet)) {
          displaySet.updateDisplay(bounds, unhide);
          //updateChildWindow(mainWindow);
        }
      }
    }
  );

  // EDisplayRequest.hideDisplay
  ipcMain.on(EDisplayRequest.hideDisplay, (event, camIndex: number, disablePreview = false) => {
    logger.verbose(`r2m ${EDisplayRequest.hideDisplay} ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let displaySet = _.get(obsHandler.displayCollection, camSet.input.name);
      if (!_.isNil(displaySet)) {
        displaySet.hideDisplay(disablePreview);
      }
    }
  });

  // EDisplayRequest.endDisplay
  ipcMain.on(EDisplayRequest.endDisplay, (event, camIndex: number) => {
    logger.verbose(`r2m ${EDisplayRequest.endDisplay} ${camIndex}`);
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let displaySet = _.get(obsHandler.displayCollection, camSet.input.name);
      if (!_.isNil(displaySet)) {
        displaySet.endDisplay();
      }
    }
  });

  // ECropUIEvents.updateClipBound
  ipcMain.on(ECropUIEvents.updateClipBound, (event, camIndex: number, clipBound: ICropInfo) => {
    if (camIndex < 0 || camIndex >= obsHandler.camCount) {
      return;
    } else {
      let camSet = obsHandler.camSets[camIndex];
      let displaySet = _.get(obsHandler.displayCollection, camSet.input.name);
      if (_.isNil(displaySet)) {
      } else {
        displaySet.updateClipBound(clipBound);
      }
    }
  });

  // ECropUIEvents.setEnablePreview
  ipcMain.handle(
    ECropUIEvents.setPreviewCrop,
    (event, camIndex: number, previewCrop?: ICropInfo) => {
      logger.verbose(
        `r2m ${ECropUIEvents.setPreviewCrop} ${camIndex} ${JSON.stringify(previewCrop)}`
      );
      if (camIndex < 0 || camIndex >= obsHandler.camCount) {
        return;
      } else {
        let camSet = obsHandler.camSets[camIndex];
        let displaySet = _.get(obsHandler.displayCollection, camSet.input.name);
        if (_.isNil(displaySet)) {
          return undefined;
        } else {
          displaySet.previewCropInfo = previewCrop;
          return _.isNil(displaySet.previewCropInfo);
        }
      }
    }
  );
};
