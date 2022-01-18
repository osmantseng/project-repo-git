const { contextBridge, ipcRenderer } = require("electron");
import _, { Dictionary } from "lodash";

contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send("ipc-example", "ping");
    },
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
    },
    /* removeListener(channel: string, listener: (...args: any[]) => void) {
      ipcRenderer.removeListener(channel, listener);
    }, */
  },
});

import { UIEvents, OBSHandlerEvents, virtualCamName } from "./OBS/obsConst";
import {
  IVideoDeviceUI,
  IFilterOptionUI,
  ICropOptionUI,
  IWidthHeight,
  ICropInfo,
  IAdjust,
  INumberOptionUI,
  IStringOptionUI,
} from "./OBS/obsInterface";

contextBridge.exposeInMainWorld("obsHandler", {
  backend: {
    r2mInitOBS() {
      ipcRenderer.send(OBSHandlerEvents.InitOBS);
    },
    m2rInitOBS(func: (result: boolean) => void) {
      ipcRenderer.once(OBSHandlerEvents.InitOBS, (event, result: boolean) =>
        func(result)
      );
    },
    getFramerateOptions(): Promise<IStringOptionUI[]> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetFramerate);
    },
    setFramerate(framerateOption: IStringOptionUI): Promise<IStringOptionUI[]> {
      return ipcRenderer.invoke(OBSHandlerEvents.SetFramerate, framerateOption);
    },
    getResolutionOptions(): Promise<INumberOptionUI[]> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetResolution);
    },
    setResolution(
      resolutionOption: INumberOptionUI
    ): Promise<INumberOptionUI[]> {
      return ipcRenderer.invoke(
        OBSHandlerEvents.SetResolution,
        resolutionOption
      );
    },
  },
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
    },
    m2rUIResized(func: () => void) {
      const listener = () => {
        func();
      };
      ipcRenderer.on(UIEvents.UIResized, listener);
      return () => {
        ipcRenderer.removeListener(UIEvents.UIResized, listener);
      };
    },
  },
  camera: {
    getCamDeviceOptions(camIndex?: number): Promise<IVideoDeviceUI[]> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetCamDeviceOptions, camIndex);
    },
    setCamDevice(
      camIndex: number,
      deviceId: string | number
    ): Promise<IVideoDeviceUI[]> {
      return ipcRenderer.invoke(
        OBSHandlerEvents.SetCamDevice,
        camIndex,
        deviceId
      );
    },
    getCamResolution(camIndex: number): Promise<IWidthHeight> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetCamResolution, camIndex);
    },
    getCamFilterOptions(camIndex?: number): Promise<IFilterOptionUI[]> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetCamFilterOptions, camIndex);
    },
    setCamFilter(
      camIndex: number,
      filterName: string,
      settings: Dictionary<any> = {}
    ): Promise<IFilterOptionUI[]> {
      return ipcRenderer.invoke(
        OBSHandlerEvents.SetCamFilter,
        camIndex,
        filterName,
        settings
      );
    },
    getCamCropOptions(camIndex?: number): Promise<ICropOptionUI[]> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetCamCropOptions, camIndex);
    },
    getCamCrop(camIndex: number): Promise<ICropOptionUI> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetCamCrop, camIndex);
    },
    setCamCrop(
      camIndex: number,
      cropName: string,
      cropInfo?: ICropInfo
    ): Promise<IFilterOptionUI[]> {
      return ipcRenderer.invoke(
        OBSHandlerEvents.SetCamCrop,
        camIndex,
        cropName,
        cropInfo
      );
    },
    getCamVerticalFlip(camIndex: number): Promise<boolean | undefined> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetCamVerticalFlip, camIndex);
    },
    setCamVerticalFlip(
      camIndex: number,
      value?: boolean
    ): Promise<boolean | undefined> {
      return ipcRenderer.invoke(
        OBSHandlerEvents.SetCamVerticalFlip,
        camIndex,
        value
      );
    },
    getCamHorizontalFlip(camIndex: number): Promise<boolean | undefined> {
      return ipcRenderer.invoke(
        OBSHandlerEvents.GetCamHorizontalFlip,
        camIndex
      );
    },
    setCamHorizontalFlip(
      camIndex: number,
      value: boolean
    ): Promise<boolean | undefined> {
      return ipcRenderer.invoke(
        OBSHandlerEvents.SetCamHorizontalFlip,
        camIndex,
        value
      );
    },
    resetCamAdjusts(
      camIndex: number
    ): Promise<Dictionary<IAdjust> | undefined> {
      return ipcRenderer.invoke(OBSHandlerEvents.ResetCameraAdjusts, camIndex);
    },
    getCamAdjusts(camIndex: number): Promise<Dictionary<IAdjust> | undefined> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetCamAdjusts, camIndex);
    },
    setCamAdjusts(
      camIndex: number,
      value: Dictionary<IAdjust>
    ): Promise<Dictionary<IAdjust> | undefined> {
      return ipcRenderer.invoke(
        OBSHandlerEvents.SetCamAdjusts,
        camIndex,
        value
      );
    },
    getCamAdjust(camIndex: number, name: string): Promise<IAdjust | undefined> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetCamAdjust, camIndex, name);
    },
    setCamAdjust(
      camIndex: number,
      name: string,
      value: number,
      isAuto: boolean
    ): Promise<IAdjust | undefined> {
      return ipcRenderer.invoke(
        OBSHandlerEvents.SetCamAdjust,
        camIndex,
        name,
        value,
        isAuto
      );
    },
  },
  virtualCam: {
    get virtualCamName() {
      return virtualCamName;
    },
    startVirtualCam() {
      ipcRenderer.send(OBSHandlerEvents.StartVirtualCam);
    },
    getOutputResolution(): Promise<IWidthHeight> {
      return ipcRenderer.invoke(OBSHandlerEvents.GetOutputResolution);
    },
    r2mUpdateOutputResolution() {
      ipcRenderer.send(OBSHandlerEvents.UpdateOutputResolution);
    },
    m2rUpdateOutputResolution(
      func: (resolution: IWidthHeight) => void
    ): Function {
      const listener = (
        event: Electron.IpcRendererEvent,
        resolution: IWidthHeight
      ) => {
        func(resolution);
      };
      ipcRenderer.on(OBSHandlerEvents.UpdateOutputResolution, listener);
      return () => {
        ipcRenderer.removeListener(
          OBSHandlerEvents.UpdateOutputResolution,
          listener
        );
      };
    },
  },
});
