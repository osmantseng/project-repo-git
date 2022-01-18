import { app, BrowserWindow, IpcMain, DownloadItem, shell } from "electron";
import { EUpdateNotification, EUpdateRequest } from "./const";
import { download, Progress } from "electron-dl";
import fs from "fs";
import path from "path";
import { logger } from "./util";
import _, { Dictionary } from "lodash";
import os from "os";
import axios from "axios";
import { IDownloadItem, IVersion, IVersionData } from "./interface";

export class Version implements IVersion {
  version_major: number;
  version_minor: number;
  version_build: number;

  constructor(
    version_major: number,
    version_minor: number,
    version_build: number
  ) {
    this.version_major = version_major;
    this.version_minor = version_minor;
    this.version_build = version_build;
  }

  toString() {
    return `${this.version_major}.${this.version_minor}.${this.version_build}`;
  }
}

export class UpdateHandler {
  private currentDownload?: DownloadItem;
  private downloadUrl: string | undefined;

  static latestPackageInfoUrl =
    "https://accoblobstorageus.blob.core.windows.net/software/version/konnect/";

  protected _currentVersion = new Version(0, 0, 0);
  get currentVersion() {
    return this._currentVersion;
  }

  protected _latestVersion = new Version(0, 0, 0);
  get latestVersion() {
    return this._latestVersion;
  }

  get isUpdateAvailable() {
    if (_.isNil(this.downloadUrl)) {
      logger.debug("Update not available because there is no downloadUrl");
      return false;
    }
    let currentVersion = this._currentVersion;
    let latestVersion = this._latestVersion;
    if (latestVersion.version_major > currentVersion.version_major) {
      return true;
    } else if (
      latestVersion.version_major === currentVersion.version_major &&
      latestVersion.version_minor > currentVersion.version_minor
    ) {
      return true;
    } else if (
      latestVersion.version_major === currentVersion.version_major &&
      latestVersion.version_minor === currentVersion.version_minor &&
      latestVersion.version_build > currentVersion.version_build
    ) {
      return true;
    }
    return false;
  }

  constructor() {
    this.readCurrentVersion();
    this.readLatestVersion();
  }

  readCurrentVersion() {
    let packagePath = path.join(app.getAppPath(), "package.json");
    let buffer = fs.readFileSync(packagePath, "utf-8");
    try {
      let packageInfo = JSON.parse(buffer.toString());
      let versionArr = _.chain(packageInfo)
        .get("version", "")
        .split(".")
        .map((x) => _.toInteger(x))
        .value();

      if (versionArr.length > 0 && _.isInteger(versionArr[0])) {
        this._currentVersion.version_major = versionArr[0];
      }
      if (versionArr.length > 1 && _.isInteger(versionArr[1])) {
        this._currentVersion.version_minor = versionArr[1];
      }
      if (versionArr.length > 2 && _.isInteger(versionArr[2])) {
        this._currentVersion.version_build = versionArr[2];
      }

      logger.debug(
        `UpdateHandler readCurrentVersion ${this._currentVersion.toString()}`
      );
    } catch (e) {
      logger.error(`Cannot read current version: ${e}`);
    }
  }

  readLatestVersion() {
    let packageFilename = this.getPackageInfoFilename();
    logger.debug(
      `readLatestVersion ${UpdateHandler.latestPackageInfoUrl}${packageFilename}`
    );
    axios
      .get(`${UpdateHandler.latestPackageInfoUrl}${packageFilename}`, {
        timeout: 10 * 1000,
      })
      .then((response) => {
        let packageInfo: Dictionary<any> = response.data;
        logger.debug(
          `UpdateHandler readLatestVersion ${JSON.stringify(packageInfo)}`
        );
        if (_.get(packageInfo, "active", false)) {
          this.downloadUrl = _.get(packageInfo, "download_url");
          this._latestVersion = _.chain(packageInfo)
            .pick(["version_major", "version_minor", "version_build"])
            .mapValues((x) => {
              if (_.isString(x)) {
                x = _.toInteger(x);
              }

              if (_.isNumber(x)) {
                return _.round(x);
              }

              return undefined;
            })
            .defaults(this._latestVersion)
            .value() as IVersion;
          logger.debug(
            `UpdateHandler readLatestVersion ${this._latestVersion.toString()}`
          );
        }
      })
      .catch((e) => {
        logger.error(
          `Cannot read latest version from ${UpdateHandler.latestPackageInfoUrl}${packageFilename}\n ${e}`
        );
      });
  }

  getPackageInfoFilename(): string {
    switch (process.platform) {
      case "win32":
        return "knt_win.json";
      case "darwin":
        return "knt_osx.json";
      default:
        return "knt.json";
    }
  }

  onDownloadUpdateStarted(window: BrowserWindow, item: DownloadItem) {
    this.currentDownload = item;
    window.webContents.send(EUpdateNotification.onDownloadUpdateStarted, {
      filename: item.getFilename(),
      savePath: item.getSavePath(),
      totalBytes: item.getTotalBytes(),
    } as IDownloadItem);
  }

  onDownloadUpdateProgress(window: BrowserWindow, progress: Progress) {
    window.webContents.send(
      EUpdateNotification.onDownloadUpdateProgress,
      progress
    );
  }

  onDownloadUpdateCancel(window: BrowserWindow) {
    this.currentDownload = undefined;
    window.webContents.send(EUpdateNotification.onDownloadUpdateCancel);
  }

  startDownloadUpdate(window: BrowserWindow) {
    if (_.isNil(this.downloadUrl)) {
      return false;
    }
    
    logger.debug(`startDownloadUpdate ${this.downloadUrl}`);
    download(window, this.downloadUrl, {
      onStarted: (item) => {
        logger.debug(`startDownloadUpdate ${item.getSavePath()}`);
        this.onDownloadUpdateStarted(window, item);
      },
      onProgress: (progress) => {
        this.onDownloadUpdateProgress(window, progress);
      },
      onCancel: (item) => {
        this.onDownloadUpdateCancel(window);
      },
    }).then((item) => {
      window.webContents.send(EUpdateNotification.onDownloadUpdateCompleted, {
        filename: item.getFilename(),
        savePath: item.getSavePath(),
        totalBytes: item.getTotalBytes(),
      } as IDownloadItem);

      logger.debug(`Download complete: ${item.getSavePath()} ${item.getFilename()}`);
      shell
        .openExternal(item.getSavePath())
        .then(() => {})
        .catch((err) => {
          logger.warn(`Error opening the update package: ${err}`);
        });
    });
    return true;
  }

  cancelDownloadUpdate() {
    if (!_.isNil(this.currentDownload)) {
      this.currentDownload.cancel();
    }
  }
}

export const updateHandler = new UpdateHandler();

export const setup = (ipcMain: IpcMain, mainWindow: BrowserWindow) => {
  // EUpdateRequest.getIsUpdateAvailable
  ipcMain.handle(EUpdateRequest.getIsUpdateAvailable, (event) => {
    return updateHandler.isUpdateAvailable;
  });

  ipcMain.handle(EUpdateRequest.getVersionInfo, (event) => {
    logger.verbose(`m2r ${EUpdateRequest.getVersionInfo}`);
    return {
      currentVersion: updateHandler.currentVersion.toString(),
      updateVersion: updateHandler.latestVersion.toString(),
    } as IVersionData;
  });

  // EUpdateRequest.getIsUpdateAvailable
  ipcMain.handle(EUpdateRequest.startDownloadUpdate, (event) => {
    logger.verbose(`m2r ${EUpdateRequest.startDownloadUpdate}`);
    return updateHandler.startDownloadUpdate(mainWindow);
  });

  ipcMain.on(EUpdateRequest.cancelDownloadUpdate, (event) => {
    logger.verbose(`m2r ${EUpdateRequest.cancelDownloadUpdate}`);
    updateHandler.cancelDownloadUpdate();
  });
};
