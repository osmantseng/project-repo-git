import * as osn from "obs-studio-node";
import { v4 as uuid } from "uuid";
import _ from "lodash";
import * as path from "path";
import { app } from "electron";
import { IOBSHandler } from "./interface";
import { logger } from "../util";
import {
  installVirtualCamPlugin,
  isVirtualCamPluginInstalled,
  startVirtualCam,
  stopVirtualCam,
} from "./obsStatic";

export default class OBSHandler implements IOBSHandler {
  private workingDirectory: string;
  private appDataDirectory: string;
  private language: string = "en-US";
  private pipeName: string;
  private version: string = "1.0.0";

  private _isOBSBackendInitialized: boolean = false;
  get isOBSBackendInitialized() {
    return this._isOBSBackendInitialized;
  }

  private _isVirtualCamStarted: boolean = false;
  get isVirtualCamStarted() {
    return this._isVirtualCamStarted;
  }

  constructor() {
    this.workingDirectory = path.join(
      app.getAppPath().replace("app.asar", "app.asar.unpacked"),
      "node_modules",
      "obs-studio-node"
    );
    this.appDataDirectory = app.getPath("userData");
    //this.pipeName = `kensington-webcamworks-pipe-${uuid()}`;
    this.pipeName = `kensington-webcamworks-pipe`;
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

  /** Stop virtual camera, do a task, then restart virtual camera. */
  restartVirtualCamTask(task: Function) {
    let restartVirtualCam = false;
    if (this.isVirtualCamStarted) {
      this.stopVirtualCam();
      restartVirtualCam = true;
    }
    task();
    if (restartVirtualCam) {
      this.startVirtualCam();
    }
  }

  /** Initialize OBSHandler */
  protected _init() {}

  init() {
    this.initOBS();
    this.restartVirtualCamTask(() => {
      this._init();
    });
  }
}
