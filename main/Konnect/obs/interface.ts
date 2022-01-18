import { Dictionary } from "lodash";
import { EOBSFilterType } from "./const";

export interface IOBSHandler {
  readonly isOBSBackendInitialized: boolean;
  readonly isVirtualCamStarted: boolean;
  init(): void;
  initOBS(): void;
  endOBS(): void;
  startVirtualCam(): void;
  stopVirtualCam(): void;
  restartVirtualCamTask(task: Function): void;
}

export interface IOBSHandlerChild {
  parentOBSHandler: IOBSHandler | undefined;
}

export interface IWidthHeight {
  width: number;
  height: number;
}

export interface IVideoDevice {
  name: string;
  value: string;
}

export interface IUSBDevice {
  locationId: number;
  vendorId: number;
  productId: number;
  deviceName: string;
  manufacturer: string;
  serialNumber: string;
  deviceAddress: number;
}
