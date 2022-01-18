import { contextBridge, ipcRenderer } from 'electron';
import _, { Dictionary } from 'lodash';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on(channel: string, func: (...args: any[]) => void) {
      const listener = (event: Electron.IpcRendererEvent, ...args: any[]) => {
        func(...args);
      };
      ipcRenderer.on(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    },
    once(channel: string, func: (...args: any[]) => void) {
      const listener = (event: Electron.IpcRendererEvent, ...args: any[]) => {
        func(...args);
      };
      ipcRenderer.once(channel, listener);
      return () => {
        ipcRenderer.removeListener(channel, listener);
      };
    },
    send(channel: string, ...args: any[]) {
      ipcRenderer.send(channel, ...args);
    },
    invoke(channel: string, ...args: any[]) {
      return ipcRenderer.invoke(channel, ...args);
    }
  }
});

import { UIEvents, EOBSHandlerRequest, virtualCamName, EOBSHandlerNotification } from './obs/const';
import { IWidthHeight } from './obs/interface';
import { INumberOptionUI, IStringOptionUI } from './setting/interface';
import {
  IAdjustUI,
  ICropInfo,
  IDeviceOptionUI,
  IEffectOptionUI,
  IRatioOptionUI,
  ITemplate
} from './cameraSettings/interface';
import { IPresetOptionUI } from './preset/interface';
import { EUpdateNotification, EUpdateRequest } from './update/const';
import { IDownloadItem, IVersionData } from './update/interface';
import { Progress } from 'electron-dl';
import { EBackupRequest, ECloudBackupProvider } from './backup/const';
import { ICloudUserInfo } from './backup/interface';
import { IBounds } from './display/interface';
import { ECropUIEvents, EDisplayNotification, EDisplayRequest } from './display/const';

contextBridge.exposeInMainWorld('obsHandler', {
  ui: {
    r2mUIReady() {
      ipcRenderer.send(UIEvents.UIReady);
    },
    m2rUIReady(func: () => void) {
      ipcRenderer.once(UIEvents.UIReady, (event) => func());
    },
    m2rUIResize(func: () => void) {
      const listener = () => {
        func();
      };
      ipcRenderer.on(UIEvents.UIResize, listener);
      return () => {
        ipcRenderer.removeListener(UIEvents.UIResize, listener);
      };
    }
  },
  backend: {
    r2mInitOBS() {
      ipcRenderer.send(EOBSHandlerRequest.initOBS);
    },
    m2rInitOBS(func: (result: boolean) => void) {
      ipcRenderer.once(EOBSHandlerRequest.initOBS, (event, result: boolean) => func(result));
    },
    getOBSOutputResolution(): Promise<IWidthHeight> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getOBSOutputResolution);
    },
    backupToLocal(): Promise<boolean> {
      return ipcRenderer.invoke(EBackupRequest.backupToLocal);
    },
    restoreFromLocal(): Promise<boolean> {
      return ipcRenderer.invoke(EBackupRequest.restoreFromLocal);
    },
    getCloudBackupProvider(): Promise<ECloudBackupProvider | undefined> {
      return ipcRenderer.invoke(EBackupRequest.getCloudBackupProvider);
    },
    signInWithPopup(
      provider: ECloudBackupProvider,
      nextAction?: string
    ): Promise<ICloudUserInfo | undefined> {
      return ipcRenderer.invoke(EBackupRequest.signInWithPopup, provider, nextAction);
    },
    getCloudUserInfo(): Promise<ICloudUserInfo | undefined> {
      return ipcRenderer.invoke(EBackupRequest.getCloudUserInfo);
    },
    eraseCloudBackupProvider() {
      ipcRenderer.send(EBackupRequest.eraseCloudBackupProvider);
    },
    backupToCloud(): Promise<undefined> {
      return ipcRenderer.invoke(EBackupRequest.backupToCloud);
    },
    restoreFromCloud(): Promise<undefined> {
      return ipcRenderer.invoke(EBackupRequest.restoreFromCloud);
    },
    save() {
      ipcRenderer.send(EOBSHandlerRequest.save);
    }
  },
  preset: {
    createPreset(camIndex: number, name: string): Promise<ITemplate[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.createPreset, camIndex, name);
    },
    savePreset(camIndex: number, id: string): Promise<ITemplate[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.savePreset, camIndex, id);
    },
    renamePreset(camIndex: number, id: string, name: string): Promise<ITemplate[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.renamePreset, camIndex, id, name);
    },
    removePreset(camIndex: number, id: string | string[]): Promise<ITemplate[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.removePreset, camIndex, id);
    },
    getPresetOptions(camIndex: number): Promise<ITemplate[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getPresetOptions, camIndex);
    },
    getPresetOption(camIndex: number): Promise<ITemplate | undefined> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getPresetOptions, camIndex);
    },
    setPreset(camIndex: number, name?: string): Promise<ITemplate[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setPreset, camIndex, name);
    },
    compareTemplate(camIndex: number): Promise<boolean> {
      return ipcRenderer.invoke(EOBSHandlerRequest.compareTemplate, camIndex);
    }
  },
  output: {
    getOutputResolutionOptions(): Promise<INumberOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getOutputResolutionOptions);
    },
    setOutputResolution(value: number): Promise<INumberOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setOutputResolution, value);
    },
    getOutputFrameRateOptions(): Promise<IStringOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getOutputFrameRateOptions);
    },
    setOutputFrameRate(value: number): Promise<INumberOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setOutputFrameRate, value);
    }
  },
  camera: {
    getCamInputResolution(camIndex: number): Promise<IWidthHeight> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getCamInputResolution, camIndex);
    },
    resetCamSettings(camIndex: number): Promise<void> {
      return ipcRenderer.invoke(EOBSHandlerRequest.resetCamSettings, camIndex);
    },
    getCamDeviceOptions(camIndex?: number): Promise<IDeviceOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getCamDeviceOptions, camIndex);
    },
    setCamDevice(camIndex: number, value: string): Promise<IDeviceOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setCamDevice, camIndex, value);
    },
    /* getCamDeviceModelName(camIndex: number): Promise<string | undefined> {
      return ipcRenderer.invoke(EOBSHandlerP1Request.getCamName, camIndex);
    }, */
    getCamEffectOptions(camIndex?: number): Promise<IEffectOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getCamEffectOptions, camIndex);
    },
    setCamEffect(camIndex: number, value: Dictionary<any>): Promise<IEffectOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setCamEffect, camIndex, value);
    },
    getCamRatioOptions(camIndex?: number): Promise<IRatioOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getCamRatioOptions, camIndex);
    },
    setCamRatio(camIndex: number, value: Dictionary<any>): Promise<IRatioOptionUI[]> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setCamRatio, camIndex, value);
    },
    getCamVerticalFlip(camIndex?: number): Promise<boolean | undefined> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getCamVerticalFlip, camIndex);
    },
    setCamVerticalFlip(camIndex: number, value?: boolean): Promise<boolean | undefined> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setCamVerticalFlip, camIndex, value);
    },
    getCamHorizontalFlip(camIndex?: number): Promise<boolean> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getCamHorizontalFlip, camIndex);
    },
    setCamHorizontalFlip(camIndex: number, value: boolean): Promise<boolean> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setCamHorizontalFlip, camIndex, value);
    },
    resetCamAdjusts(camIndex: number): Promise<Dictionary<IAdjustUI>> {
      return ipcRenderer.invoke(EOBSHandlerRequest.resetCamAdjusts, camIndex);
    },
    getCamAdjusts(camIndex: number): Promise<Dictionary<IAdjustUI>> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getCamAdjusts, camIndex);
    },
    setCamAdjusts(camIndex: number, value: Dictionary<IAdjustUI>): Promise<Dictionary<IAdjustUI>> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setCamAdjusts, camIndex, value);
    },
    getCamAdjust(camIndex: number, adjustName: string): Promise<IAdjustUI> {
      return ipcRenderer.invoke(EOBSHandlerRequest.getCamAdjust, camIndex, adjustName);
    },
    setCamAdjust(camIndex: number, adjustName: string, value: Dictionary<any>): Promise<IAdjustUI> {
      return ipcRenderer.invoke(EOBSHandlerRequest.setCamAdjust, camIndex, adjustName, value);
    }
  },
  notification: {
    updateCamDeviceOptions(func: () => void) {
      const listener = (event: Electron.IpcRendererEvent) => {
        func();
      };
      ipcRenderer.on(EOBSHandlerNotification.updateCamDeviceOptions, listener);
      return () => {
        ipcRenderer.removeListener(EOBSHandlerNotification.updateCamDeviceOptions, listener);
      };
    },
    updateOBSOutputResolution(func: (outputResolution: IWidthHeight) => void) {
      const listener = (event: Electron.IpcRendererEvent, outputResolution: IWidthHeight) => {
        func(outputResolution);
      };
      ipcRenderer.on(EOBSHandlerNotification.updateOBSOutputResolution, listener);
      return () => {
        ipcRenderer.removeListener(EOBSHandlerNotification.updateOBSOutputResolution, listener);
      };
    },
    updatePresetOptions(func: (presetOptions: ITemplate[]) => void) {
      const listener = (event: Electron.IpcRendererEvent, presetOptions: ITemplate[]) => {
        func(presetOptions);
      };
      ipcRenderer.on(EOBSHandlerNotification.updatePresetOptions, listener);
      return () => {
        ipcRenderer.removeListener(EOBSHandlerNotification.updatePresetOptions, listener);
      };
    },
    updatePreset(func: () => void) {
      const listener = (event: Electron.IpcRendererEvent) => {
        func();
      };
      ipcRenderer.on(EOBSHandlerNotification.updatePreset, listener);
      return () => {
        ipcRenderer.removeListener(EOBSHandlerNotification.updatePreset, listener);
      };
    },
    updateDisplay(func: (bounds: IBounds) => void) {
      const listener = (event: Electron.IpcRendererEvent, bounds: IBounds) => {
        func(bounds);
      };
      ipcRenderer.on(EDisplayNotification.updateDisplay, listener);
      return () => {
        ipcRenderer.removeListener(EDisplayNotification.updateDisplay, listener);
      };
    },
    updateTemplateChangedState(func: (hasChanged: boolean) => void) {
      const listener = (event: Electron.IpcRendererEvent, hasChanged: boolean) => {
        func(hasChanged);
      };
      ipcRenderer.on(EOBSHandlerNotification.updateTemplateChangedState, listener);
      return () => {
        ipcRenderer.removeListener(EOBSHandlerNotification.updateTemplateChangedState, listener);
      };
    }
  },
  virtualCam: {
    get virtualCamName() {
      return virtualCamName;
    },
    startVirtualCam() {
      ipcRenderer.send(EOBSHandlerRequest.startVirtualCam);
    },
    stopVirtualCam() {
      ipcRenderer.send(EOBSHandlerRequest.stopVirtualCam);
    }
  },
  display: {
    startDisplay(camIndex: number, bounds: IBounds): Promise<void> {
      return ipcRenderer.invoke(EDisplayRequest.startDisplay, camIndex, bounds);
    },
    updateDisplay(camIndex: number, bounds?: IBounds, unhide = false) {
      ipcRenderer.send(EDisplayRequest.updateDisplay, camIndex, bounds, unhide);
    },
    hideDisplay(camIndex: number, disablePreview = false) {
      ipcRenderer.send(EDisplayRequest.hideDisplay, camIndex, disablePreview);
    },
    endDisplay(camIndex: number) {
      ipcRenderer.send(EDisplayRequest.endDisplay, camIndex);
    },
    setPreviewCrop(camIndex: number, previewCrop?: ICropInfo): Promise<boolean | undefined> {
      return ipcRenderer.invoke(ECropUIEvents.setPreviewCrop, camIndex, previewCrop);
    }
  }
});

contextBridge.exposeInMainWorld('updateHandler', {
  getIsUpdateAvailable(): Promise<boolean> {
    return ipcRenderer.invoke(EUpdateRequest.getIsUpdateAvailable);
  },
  getVersionInfo(): Promise<IVersionData | undefined> {
    return ipcRenderer.invoke(EUpdateRequest.getVersionInfo);
  },
  startDownloadUpdate(): Promise<boolean> {
    return ipcRenderer.invoke(EUpdateRequest.startDownloadUpdate);
  },
  cancelDownloadUpdate() {
    ipcRenderer.send(EUpdateRequest.cancelDownloadUpdate);
  },
  onDownloadUpdateStarted(func: (item: IDownloadItem) => void) {
    const listener = (event: Electron.IpcRendererEvent, item: IDownloadItem) => {
      func(item);
    };
    ipcRenderer.once(EUpdateNotification.onDownloadUpdateStarted, listener);
    return () => {
      ipcRenderer.removeListener(EUpdateNotification.onDownloadUpdateStarted, listener);
    };
  },
  onDownloadUpdateProgress(func: (progress: Progress) => void) {
    const listener = (event: Electron.IpcRendererEvent, progress: Progress) => {
      func(progress);
    };
    ipcRenderer.on(EUpdateNotification.onDownloadUpdateProgress, listener);
    return () => {
      ipcRenderer.removeListener(EUpdateNotification.onDownloadUpdateProgress, listener);
    };
  },
  onDownloadUpdateCancel(func: () => void) {
    const listener = (event: Electron.IpcRendererEvent) => {
      func();
    };
    ipcRenderer.once(EUpdateNotification.onDownloadUpdateCancel, listener);
    return () => {
      ipcRenderer.removeListener(EUpdateNotification.onDownloadUpdateCancel, listener);
    };
  },
  onDownloadUpdateCompleted(func: (item: IDownloadItem) => void) {
    const listener = (event: Electron.IpcRendererEvent, item: IDownloadItem) => {
      func(item);
    };
    ipcRenderer.once(EUpdateNotification.onDownloadUpdateCompleted, listener);
    return () => {
      ipcRenderer.removeListener(EUpdateNotification.onDownloadUpdateCompleted, listener);
    };
  }
});

const _updateClipBoundSend = (camIndex: number, clipBound: ICropInfo) => {
  ipcRenderer.send(ECropUIEvents.updateClipBound, camIndex, clipBound);
};
/* const updateClipBoundSend = _.debounce(_updateClipBoundSend, 10, {
  maxWait: 10,
  trailing: true,
}); */

contextBridge.exposeInMainWorld('cropUIHandler', {
  updateClipBound: {
    send(camIndex: number, clipBound: ICropInfo) {
      _updateClipBoundSend(camIndex, clipBound);
    },
    on(func: (clipBound: ICropInfo) => void) {
      const listener = (event: Electron.IpcRendererEvent, clipBound: ICropInfo) => {
        func(clipBound);
      };
      ipcRenderer.on(ECropUIEvents.updateClipBound, listener);
      return () => {
        ipcRenderer.removeListener(ECropUIEvents.updateClipBound, listener);
      };
    }
  },
  show(func: () => void) {
    const listener = (event: Electron.IpcRendererEvent) => {
      func();
    };
    ipcRenderer.on(ECropUIEvents.show, listener);
    return () => {
      ipcRenderer.removeListener(ECropUIEvents.show, listener);
    };
  },
  hide(func: () => void) {
    const listener = (event: Electron.IpcRendererEvent) => {
      func();
    };
    ipcRenderer.on(ECropUIEvents.hide, listener);
    return () => {
      ipcRenderer.removeListener(ECropUIEvents.hide, listener);
    };
  }
});
