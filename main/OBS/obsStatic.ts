import _ from "lodash";
import * as osn from "obs-studio-node";
import { logger } from "../util";
import { IWidthHeight, IVideoDevice } from "./obsInterface";
const { byOS, OS, getOS } = require('../../main/operating-systems');

/* OBS backend settings */
export const setOBSSetting = (
  category: string,
  parameter: string,
  value: any
) => {
  let oldValue: any;

  // Getting settings container
  const settings = osn.NodeObs.OBS_settings_getSettings(category).data;

  settings.forEach((subCategory: any) => {
    subCategory.parameters.forEach((param: any) => {
      if (param.name === parameter) {
        oldValue = param.currentValue;
        param.currentValue = value;
      }
    });
  });

  // Saving updated settings container
  if (value != oldValue) {
    osn.NodeObs.OBS_settings_saveSettings(category, settings);
  }
};

export const getOBSSetting = (category: string, parameter: string): any => {
  let value: any;

  // Getting settings container
  const settings = osn.NodeObs.OBS_settings_getSettings(category).data;

  // Getting parameter value
  settings.forEach((subCategory: any) => {
    subCategory.parameters.forEach((param: any) => {
      if (param.name === parameter) {
        value = param.currentValue;
      }
    });
  });

  return value;
};

export const getOBSAvailableValues = (
  category: string,
  subcategory: any,
  parameter: any
) => {
  const categorySettings = osn.NodeObs.OBS_settings_getSettings(category).data;
  if (!categorySettings) {
    logger.warn(`There is no category ${category} in OBS settings`);
    return [];
  }

  const subcategorySettings = categorySettings.find(
    (sub: any) => sub.nameSubCategory === subcategory
  );
  if (!subcategorySettings) {
    logger.warn(
      `There is no subcategory ${subcategory} for OBS settings category ${category}`
    );
    return [];
  }

  const parameterSettings = subcategorySettings.parameters.find(
    (param: any) => param.name === parameter
  );
  if (!parameterSettings) {
    logger.warn(
      `There is no parameter ${parameter} for OBS settings category ${category}.${subcategory}`
    );
    return [];
  }

  return parameterSettings.values.map((value: any) => Object.values(value)[0]);
};

export const getVideoBaseResolution = () => {
  let resolutionStr = getOBSSetting("Video", "Base");
  let resolution: string[] = _.split(resolutionStr, "x");
  let outputResolution: IWidthHeight = {
    width: _.toNumber(resolution[0]),
    height: _.toNumber(resolution[1]),
  };
  return outputResolution;
};

export const getVideoOutputResolution = () => {
  let resolutionStr = getOBSSetting("Video", "Output");
  let resolution: string[] = _.split(resolutionStr, "x");
  let outputResolution: IWidthHeight = {
    width: _.toNumber(resolution[0]),
    height: _.toNumber(resolution[1]),
  };
  return outputResolution;
};

/* OBS virtual camera */
export const isVirtualCamPluginInstalled = () =>
  osn.NodeObs.OBS_service_isVirtualCamPluginInstalled() as boolean;

export const installVirtualCamPlugin = () => {
  osn.NodeObs.OBS_service_installVirtualCamPlugin();
  return isVirtualCamPluginInstalled();
};

export const uninstallVirtualCamPlugin = () => {
  osn.NodeObs.OBS_service_uninstallVirtualCamPlugin();
  return isVirtualCamPluginInstalled();
};

export const startVirtualCam = () => {
  osn.NodeObs.OBS_service_createVirtualWebcam("Konnect Virtual Camera");
  osn.NodeObs.OBS_service_startVirtualWebcam();
};

export const stopVirtualCam = () => {
  osn.NodeObs.OBS_service_stopVirtualWebcam();
  osn.NodeObs.OBS_service_removeVirtualWebcam();
};

/* Input */

/** Returns available video devices for the input. */
const _getVideoDevices = (input: osn.IInput) => {
  let res: IVideoDevice[] = [];

  if (osn.isListProperty(input.properties.get("video_device_id"))) {
    let videoDeviceIdProp = input.properties.get(
      "video_device_id"
    ) as osn.IListProperty;
    let availableVideoDevices = videoDeviceIdProp.details.items;
    availableVideoDevices.forEach((availableVideoDevice) => {
      logger.verbose(
        `Found video device: ${availableVideoDevice.name} , ${availableVideoDevice.value}`
      );
      res.push(availableVideoDevice);
    });
  }

  return res;
};

/*
 * Returns available video devices for the input.
 * If no device is provided, use use a dummy input to test available video devices.
 */
export const getVideoDevices = (input?: osn.IInput) => {
  if (_.isNil(input)) {

    /*OSMAN Modifily 20220118
    let dummyInput = osn.InputFactory.create("dshow_input", "video", {
      // Somehow using this setting will hide virtual cameras
      // audio_device_id: "does_not_exist",
      video_device_id: "does_not_exist",
    });
    */

    let dummyInput = byOS({
      [OS.Windows]: () =>
      osn.InputFactory.create("dshow_input", "video", {
        // Somehow if video_device_id is set to "does_not_exist", virtual cameras will be hidden.
        // audio_device_id: "does_not_exist",
        video_device_id: "does_not_exist",
      }),
      [OS.Mac]: () =>
      osn.InputFactory.create("av_capture_input", "video", {
        // Somehow if video_device_id is set to "does_not_exist", virtual cameras will be hidden.
        // audio_device_id: "does_not_exist",
        device: "does_not_exist",
      }),
    })

    let res = _getVideoDevices(dummyInput);
    dummyInput.release();
    return res;
  }

  return _getVideoDevices(input);
};

/** Returns available resolution values for the input. */
export const getInputResolution = (
  input: osn.IInput,
  returnDefault = false
) => {
  /*
   * Find the current resolution of camera.
   * The value can be read from camera.properties.get("resolution")
   *
   * However, if camera.settings["res_type"] is set to 0, which means "Device Default",
   * the value of camera.properties.get("resolution") will be empty!
   * Set camera.settings["res_type"] to 1, which means "Custom", before reading the value camera.settings["res_type"]
   *
   * Other available options will be listed in resolutionProp.details.items
   */
  let result: IWidthHeight = {
    width: -1,
    height: -1,
  };
  let isDefaultResolution = false;
  let settings = input.settings;
  if (input.properties.get("res_type").value === 0) {
    isDefaultResolution = true;
    settings["res_type"] = 1;
    input.update(settings);
  }

  if (osn.isListProperty(input.properties.get("resolution"))) {
    let resolutionProp = input.properties.get(
      "resolution"
    ) as osn.IListProperty;
    let resolution: string[] = _.split(resolutionProp.value, "x");
    result.width = _.toNumber(resolution[0]);
    result.height = _.toNumber(resolution[1]);
  }

  if (isDefaultResolution && returnDefault) {
    settings["res_type"] = 0;
    input.update(settings);
  }

  logger.debug(`getCameraDeviceResolution: ${result.width}x${result.height}`);
  return result;
};

export const clearInputResolution = (input: osn.IInput) => {
  let settings = input.settings;
  settings["res_type"] = 1;
  settings["resolution"] = "";
  input.update(settings);
};

/* SceneItem */
export const setSceneItem2Center = (sceneItem: osn.ISceneItem) => {
  let baseResolution = getVideoBaseResolution();
  sceneItem.alignment = osn.EAlignment.Center;
  sceneItem.position = {
    x: baseResolution.width / 2,
    y: baseResolution.height / 2,
  };
};

export const setInput2SceneCenter = (input: osn.IInput, scene: osn.IScene) => {
  let sceneItem = scene.findItem(input.name);
  if (!_.isNil(sceneItem)) {
    setSceneItem2Center(sceneItem);
  }
};

export const setSceneItemBounds2FullScreen = (sceneItem: osn.ISceneItem) => {
  let baseResolution = getVideoBaseResolution();
  sceneItem.boundsAlignment = 0;
  sceneItem.boundsType = osn.EBoundsType.ScaleToHeight;
  sceneItem.bounds = { x: baseResolution.width, y: baseResolution.height };
};
