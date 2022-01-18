import * as osn from "obs-studio-node";
import { BrowserWindow } from "electron";
import { IWidthHeight } from "../obs/interface";

export interface IBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IDisplayHandler {
  regisgerDisplay(
    mainWindow: BrowserWindow,
    displayId: string,
    previewInput: osn.IInput
  ): void;

  endDisplay(displayId: string): void;
}
