import { EOBSDShowProp } from "../obs/const";
import _ from "lodash";
import { ESettingType } from "../setting/const";
import { IDependencies } from "../setting/interface";
import SettingBase from "../setting/settingBase";
import {
  getVideoDevices,
  setSceneItem2Center,
  setSceneItemBounds2FullScreen,
} from "../obs/obsStatic";
import { IDeviceOptionUI } from "./interface";
import { getCamInfo, getKensingtonCamInfo } from "../webcam/util";
import { ICamInfo, ICamInfoExtra } from "../webcam/interface";
import * as osn from "obs-studio-node";
import { logger } from "../util";
import { IVideoDevice } from "../obs/interface";

export default class DeviceSetting extends SettingBase<
  string,
  IDeviceOptionUI[]
> {
  get settingType() {
    return ESettingType.CamDevice;
  }
  static defaultValue: string = "";
  get defaultValue() {
    return _.clone(DeviceSetting.defaultValue);
  }
  protected _camInfo: ICamInfo = {
    name: "",
    vid: "",
    pid: "",
    serialNumber: "",
  };
  get camInfo() {
    return _.clone(this._camInfo);
  }
  protected _value = this.defaultValue;
  get value() {
    return _.clone(this._value);
  }
  set value(value) {
    this._value = value;
    this._camInfo = _.pick(getCamInfo(value), [
      "name",
      "vid",
      "pid",
      "serialNumber",
    ]);
  }
  protected _requiresReload = false;
  get requiresReload() {
    return this._requiresReload;
  }
  set requiresReload(value) {
    this._requiresReload = value;
  }
  reload() {
    logger.debug("DeviceSetting reloading...");
    this._requiresReload = false;
    let devices = this.getDevices();
    let tmp = _.find(devices, ["value", this.value]);
    if (_.isNil(tmp)) {
      if (devices.length > 0) {
        this.update(devices[0].value);
      } else {
        this.reset();
      }
    } else {
      let input = this.dependencies.input;
      if (!_.isNil(input)) {
        input.update({
          [EOBSDShowProp.video_device_id]: this._value,
        });
      }
    }
  }
  updateAction() {
    let input = this.dependencies.input;
    if (_.isNil(input)) {
      return;
    }
    input.update({
      [EOBSDShowProp.video_device_id]: this._value,
    });

    let tmp = input.properties.get("resolution") as osn.IListProperty;
    let supportedResolutions = tmp.details.items;
    logger.debug(
      `Comparing resolution: ${tmp.value}\n${JSON.stringify(
        supportedResolutions
      )}`
    );
    if (
      supportedResolutions.length > 0 &&
      supportedResolutions[0].value !== tmp.value
    ) {
      input.update({
        [EOBSDShowProp.resolution]: supportedResolutions[0].value,
      });
      let sceneItem = this.dependencies.sceneItem;
      if (!_.isNil(sceneItem)) {
        setSceneItem2Center(sceneItem);
        setSceneItemBounds2FullScreen(sceneItem);
      }
    }
  }
  updatePartially(value: any) {
    if (_.isString(value)) {
      this.update(value);
    }
  }
  serialize() {
    return this.value;
  }
  static getDevices(input?: osn.IInput) {
    return getVideoDevices(input);
  }
  getDevices(input?: osn.IInput) {
    return DeviceSetting.getDevices(input);
  }
  static getValueUI(input?: osn.IInput) {
    let devices = DeviceSetting.getDevices(input);
    if (_.isNil(input)) {
      return _.map(devices, (device, index) => {
        return {
          ...device,
          shortName: device.name,
          id: index.toString(),
          isChecked: false,
        } as IDeviceOptionUI;
      });
    } else {
      let value = input.settings[EOBSDShowProp.video_device_id];
      return _.map(devices, (device, index) => {
        return {
          ...device,
          shortName: device.name,
          id: index.toString(),
          isChecked: device.value === value,
        } as IDeviceOptionUI;
      });
    }
  }
  get valueUI() {
    let input = this.dependencies.input;
    return DeviceSetting.getValueUI(input);
  }
  get requiresVCRestartOnChange() {
    return true;
  }
  get requiresReloadOnVidSwitch() {
    return false;
  }
  constructor(dependencies: IDependencies) {
    super(dependencies);
    let input = this.dependencies.input;
    if (_.isNil(input)) {
      return;
    }
    this.update(input.settings[EOBSDShowProp.video_device_id]);
  }
}

export class PhysicDeviceSetting extends DeviceSetting {
  getDevices(input?: osn.IInput) {
    return PhysicDeviceSetting.getDevices(input);
  }
  static getDevices(input?: osn.IInput) {
    let devices = getVideoDevices(input);
    return _.filter(devices, (device) => {
      let camInfo = getCamInfo(device.value, device.name);
      return camInfo.isValid && !camInfo.isVirtual;
    });
  }
  static getValueUI(input?: osn.IInput) {
    let devices = PhysicDeviceSetting.getDevices(input);
    if (_.isNil(input)) {
      return _.map(devices, (device, index) => {
        return {
          ...device,
          shortName: device.name,
          id: index.toString(),
          isChecked: false,
        } as IDeviceOptionUI;
      });
    } else {
      let value = input.settings[EOBSDShowProp.video_device_id];
      return _.map(devices, (device, index) => {
        return {
          ...device,
          shortName: device.name,
          id: index.toString(),
          isChecked: device.value === value,
        } as IDeviceOptionUI;
      });
    }
  }
  get valueUI() {
    let input = this.dependencies.input;
    return PhysicDeviceSetting.getValueUI(input);
  }
}

export class KonnectDeviceSettingP1 extends DeviceSetting {
  getDevices(input?: osn.IInput) {
    return KonnectDeviceSettingP1.getDevices(input);
  }
  static getDevices(input?: osn.IInput) {
    let devices = getVideoDevices(input);
    let groupedDevices = _.transform(
      devices,
      (result, device) => {
        let camInfo = getCamInfo(device.value, device.name);
        if (camInfo.isValid && !camInfo.isVirtual) {
          let kensingtonCamInfo = getKensingtonCamInfo(camInfo);
          if (_.isNil(kensingtonCamInfo)) {
            result.devices.push(device);
          } else {
            let serialNumber = kensingtonCamInfo.serialNumber;
            result.kensingtonDevices.push({
              name: `Kensington ${kensingtonCamInfo.name}-${serialNumber.slice(
                -3,
                serialNumber.length
              )}`,
              value: device.value,
            } as IVideoDevice);
          }
        }
      },
      {
        kensingtonDevices: [] as IVideoDevice[],
        devices: [] as IVideoDevice[],
      }
    );

    groupedDevices = {
      kensingtonDevices: _.orderBy(
        groupedDevices.kensingtonDevices,
        ["name"],
        ["desc"]
      ),
      devices: _.sortBy(groupedDevices.devices, ["name"]),
    };

    return _.concat(groupedDevices.kensingtonDevices, groupedDevices.devices);
    //return groupedDevices.kensingtonDevices;
  }
  static getValueUI(input?: osn.IInput) {
    let devices = KonnectDeviceSettingP1.getDevices(input);
    if (_.isNil(input)) {
      return _.map(devices, (device, index) => {
        return {
          ...device,
          shortName: device.name,
          id: index.toString(),
          isChecked: false,
        } as IDeviceOptionUI;
      });
    } else {
      let value = input.settings[EOBSDShowProp.video_device_id];
      return _.map(devices, (device, index) => {
        let camInfo = getCamInfo(device.value);
        let kensingtonCamInfo = getKensingtonCamInfo(camInfo);
        return {
          ...device,
          shortName: _.isNil(kensingtonCamInfo)
            ? device.name
            : kensingtonCamInfo.name,
          id: index.toString(),
          isChecked: device.value === value,
        } as IDeviceOptionUI;
      });
    }
  }
  get valueUI() {
    let input = this.dependencies.input;
    return KonnectDeviceSettingP1.getValueUI(input);
  }
}
