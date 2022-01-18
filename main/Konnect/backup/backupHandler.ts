import { BrowserWindow } from 'electron';
import settings from 'electron-settings';
import _ from 'lodash';
import { logger } from '../util';
import { ECloudBackupProvider } from './const';
import {
  getGoogleUserInfo,
  googleSignInWithPopup,
  removeGoogleUserInfo,
  restoreSettingsFromGoogle,
  saveSettingsToGoogle
} from './gdrive';
import {
  getMicrosoftUserInfo,
  microsoftSignInWithPopup,
  removeMicrosoftUserInfo,
  restoreSettingsFromOneDrive,
  saveSettingsToOneDrive
} from './onedrive';

export default class BackupHandler {
  private _cloudBackupProvider: ECloudBackupProvider | undefined;
  get cloudBackupProvider() {
    return this._cloudBackupProvider;
  }
  set cloudBackupProvider(value) {
    this._cloudBackupProvider = value;
  }

  constructor() {}

  updateCloudBackupProvider() {
    try {
      if (settings.hasSync('cloudBackup.provider')) {
        let provider = settings.getSync('cloudBackup.provider');
        logger.debug(`BackupHandler updateCloudBackupProvider ${provider}`);
        if (
          !_.isNil(provider) &&
          _.indexOf(_.values<string>(ECloudBackupProvider), _.toString(provider)) > -1
        ) {
          this._cloudBackupProvider = _.toString(provider) as ECloudBackupProvider;

          return this._cloudBackupProvider;
        } else {
          settings.unsetSync('cloudBackup.provider');
        }
      }
    } catch (error) {}
  }

  saveCloudBackupProvider() {
    if (_.isNil(this._cloudBackupProvider)) {
      settings.unsetSync('cloudBackup.provider');
    } else {
      settings.setSync('cloudBackup.provider', this._cloudBackupProvider);
    }
  }

  signInWithPopup(mainWindow: BrowserWindow, provider: ECloudBackupProvider) {
    switch (provider) {
      case ECloudBackupProvider.google:
        return googleSignInWithPopup(mainWindow);
      case ECloudBackupProvider.oneDrive:
        return microsoftSignInWithPopup(mainWindow);
      default:
        return new Promise((resolve, reject) => {
          reject(undefined);
        });
    }
  }

  getCloudUserInfo() {
    let provider = this.updateCloudBackupProvider();
    switch (provider) {
      case ECloudBackupProvider.google:
        return getGoogleUserInfo();
      case ECloudBackupProvider.oneDrive:
        return getMicrosoftUserInfo();
      default:
        return undefined;
    }
  }

  eraseCloudBackupProvider() {
    let provider = this.updateCloudBackupProvider();
    if (settings.hasSync('cloudBackup')) {
      settings.unsetSync('cloudBackup');
    }
    switch (provider) {
      case ECloudBackupProvider.google:
        removeGoogleUserInfo();
        break;
      case ECloudBackupProvider.oneDrive:
        removeMicrosoftUserInfo();
        break;
      default:
    }
  }

  backupToCloud(mainWindow: BrowserWindow, data: any) {
    let provider = this.updateCloudBackupProvider();
    //logger.debug(JSON.stringify(data));
    switch (provider) {
      case ECloudBackupProvider.google:
        return saveSettingsToGoogle(mainWindow, data);
      case ECloudBackupProvider.oneDrive:
        return saveSettingsToOneDrive(mainWindow, data);
      default:
        return new Promise<void>((resolve) => {
          resolve();
        });
    }
  }

  restoreFromCloud(mainWindow: BrowserWindow, setDataFunc: (data: any) => void) {
    let provider = this.updateCloudBackupProvider();
    switch (provider) {
      case ECloudBackupProvider.google:
        return restoreSettingsFromGoogle(mainWindow, setDataFunc);
      case ECloudBackupProvider.oneDrive:
        return restoreSettingsFromOneDrive(mainWindow, setDataFunc);
      default:
        return new Promise<void>((resolve) => {
          resolve();
        });
    }
  }
}
