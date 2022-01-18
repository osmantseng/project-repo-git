import _ from "lodash";
import { logger } from "../util";
import { kensingtonCamInfos } from "./conts";
import { ICamInfoExtra, ICamInfo } from "./interface";
const camCtrlLib = require("../../UVCCamCtrl.node");

export function getCamInfo(cameraPath: string | number, cameraName?: string) {
  let res = {
    name: "",
    vid: "",
    pid: "",
    serialNumber: "",
    isVirtual: false,
    isValid: false,
  } as ICamInfoExtra;

  let _cameraPath = cameraPath.toString();
  if (_.isString(cameraName)) {
    if (_.size(_cameraPath) < _.size(cameraName) + 1) {
      // Invalid
      return res;
    }
    res.name = cameraName;
    _cameraPath = _cameraPath.slice(_.size(cameraName));
  } else {
    if (_cameraPath.lastIndexOf(":") === -1) {
      // Invalid
      return res;
    }
    res.name = _cameraPath.substring(0, _cameraPath.lastIndexOf(":"));
    _cameraPath = _cameraPath.slice(_cameraPath.lastIndexOf(":"));
  }

  if (!_.startsWith(_cameraPath, ":")) {
    // Invalid
    return res;
  }

  // cameraPath of a virtual camera is equal to cameraName + ":"
  // cameraPath of a real camera is equal to cameraName + ":" + ...
  if (_cameraPath === ":") {
    res.isValid = true;
    res.isVirtual = true;
    return res;
  }

  // cameraPath of a real camera should contain both "vid_" and "pid_"
  if (!(_cameraPath.includes("vid_") && _cameraPath.includes("pid_"))) {
    return res;
  }

  _cameraPath = _cameraPath.slice(_cameraPath.indexOf("vid_"));
  let info = _.split(_cameraPath, "&");
  if (
    _.size(info) > 1 &&
    _.startsWith(info[0], "vid_") &&
    _.startsWith(info[1], "pid_")
  ) {
    res.vid = info[0].slice(4);
    res.pid = info[1].slice(4);
    res.isValid = true;
    try {
      let serialNum = camCtrlLib.GetSerialNum(cameraPath);
      res.serialNumber = serialNum;
      logger.debug(`Serial number of camera ${cameraPath}\n${serialNum}`);
    } catch (e) {
      logger.warn(`Error occured when reading camera serial number`);
    }
    return res;
  }

  return res;
}

export function getKensingtonCamInfo(camInfo: ICamInfo) {
  /* if (!camInfo.isValid || camInfo.isVirtual) {
    return undefined;
  } */
  /* let kensingtonCamInfo = _.find(kensingtonCamInfos, {
    vid: camInfo.vid,
    pid: camInfo.pid,
  }); */
  let kensingtonCamInfo = _.find(kensingtonCamInfos, (kensingtonCamInfo) =>
    isCamInfoEqual(kensingtonCamInfo, camInfo)
  );

  if (_.isNil(kensingtonCamInfo)) {
    return undefined;
  } else {
    return {
      name: kensingtonCamInfo.name,
      vid: kensingtonCamInfo.vid,
      pid: kensingtonCamInfo.pid,
      serialNumber: camInfo.serialNumber,
    } as ICamInfo;
  }
}

export function isCamInfoEqual(
  camModelInfo1: ICamInfo,
  camModelInfo2: ICamInfo,
  compareSerialNumber = false,
  compareName = false
) {
  let isEqual =
    camModelInfo1.vid === camModelInfo2.vid &&
    camModelInfo1.pid === camModelInfo2.pid;

  if (compareSerialNumber) {
    isEqual =
      isEqual && camModelInfo1.serialNumber === camModelInfo2.serialNumber;
  }

  if (compareName) {
    isEqual = isEqual && camModelInfo1.name === camModelInfo2.name;
  }

  return isEqual;
}
