import { BrowserWindow } from "electron";
import {
  getInputResolution,
  setSceneItem2Center,
  setSceneItemBounds2FullScreen,
} from "../obs/obsStatic";
import * as osn from "obs-studio-node";
import { IBounds } from "./interface";
import { createTransparentChildWindow, getDisplayInfo } from "./util";
import { IWidthHeight } from "../obs/interface";
import _ from "lodash";
import { logger, resolveHtmlPath } from "../util";
import { ECropUIEvents, EDisplayNotification } from "./const";
import path from "path";
import { ICropInfo } from "../cameraSettings/interface";
import CamSet from "../camSet/camSet";
import { ESettingType } from "../setting/const";
import {
  HorizontalFlipSetting,
  VerticalFlipSetting,
} from "../cameraSettings/flipSettings";
import { zeroCropInfo } from "../cameraSettings/ratioSetting";

export class RatioDisplaySet {
  private camSet: CamSet;
  private displayInput: osn.IInput;
  private displayScene: osn.IScene;
  private displaySceneItem: osn.ISceneItem;

  private _bounds = { x: 0, y: 0, width: 0, height: 0 } as IBounds;

  private _previewCropInfo: ICropInfo | undefined;
  get previewCropInfo() {
    return this._previewCropInfo;
  }
  set previewCropInfo(value) {
    this._previewCropInfo = value;
    if (_.isNil(value)) {
      this.displaySceneItem.crop = zeroCropInfo;
      this.showUI();
    } else {
      if (!_.isNil(this._uiWindow)) {
        this._uiWindow.hide();
      }
      let horizontalSetting = this.camSet.settings.get(
        ESettingType.CamHorizintalFlip
      );
      if (!_.isNil(horizontalSetting)) {
        try {
          if ((horizontalSetting as HorizontalFlipSetting).value) {
            let tmp = value.left;
            value.left = value.right;
            value.right = tmp;
          }
        } catch (e) {}
      }

      let verticalSetting = this.camSet.settings.get(
        ESettingType.CamVerticalFlip
      );
      if (!_.isNil(verticalSetting)) {
        try {
          if ((verticalSetting as HorizontalFlipSetting).value) {
            let tmp = value.top;
            value.top = value.bottom;
            value.bottom = tmp;
          }
        } catch (e) {}
      }
      this.displaySceneItem.crop = value;
    }
  }

  private _displayId: string;
  get displayId() {
    return this._displayId;
  }

  private parentWindow: BrowserWindow;

  private _uiWindow: BrowserWindow | undefined;
  get uiWindow() {
    return this._uiWindow;
  }

  private _isDisplaying = false;
  get isDisplaying() {
    return this._isDisplaying;
  }

  private _isShowingUI = false;
  get isShowingUI() {
    return this._isShowingUI;
  }

  private _isHiding = false;
  get isHiding() {
    return this._isHiding;
  }
  set isHiding(value) {
    this._isHiding = value;
  }

  private _displayWindow: BrowserWindow | undefined;
  get displayWindow() {
    return this._displayWindow;
  }

  constructor(camSet: CamSet, parentWindow: BrowserWindow) {
    this.camSet = camSet;
    this._displayId = camSet.input.name;

    // initialize preview scene
    this.displayInput = camSet.input;
    this.displayScene = osn.SceneFactory.create(
      `previewScene-${this.displayInput.name}`
    );
    this.displaySceneItem = this.displayScene.add(this.displayInput);
    setSceneItem2Center(this.displaySceneItem);
    setSceneItemBounds2FullScreen(this.displaySceneItem);

    // initialize ui window
    this.parentWindow = parentWindow;
  }

  startDisplay(bounds?: IBounds) {
    if (this._isDisplaying) {
      return;
    }

    this._isDisplaying = true;
    setSceneItem2Center(this.displaySceneItem);
    setSceneItemBounds2FullScreen(this.displaySceneItem);

    this._displayWindow = createTransparentChildWindow(
      this.parentWindow,
      false,
      false
    );
    this._uiWindow = createTransparentChildWindow(
      this.parentWindow,
      false,
      false,
      path.join(__dirname, "../preload.js")
    );
    let tmp = `${resolveHtmlPath("index.html")}?type=crop`;
    if (!_.isNil(bounds)) {
      tmp =
        tmp +
        `&x=${bounds.x}&y=${bounds.y}&width=${bounds.width}&height=${bounds.height}`;
    }

    this._uiWindow.loadURL(tmp);

    this._displayWindow.once("show", () => {
      if (!_.isNil(this._displayWindow)) {
        this._displayWindow.focus();
        osn.NodeObs.OBS_content_createSourcePreviewDisplay(
          this._displayWindow.getNativeWindowHandle(),
          this.displayScene.name,
          this._displayId
        );
        osn.NodeObs.OBS_content_setShouldDrawUI(this._displayId, false);
        osn.NodeObs.OBS_content_setPaddingSize(this._displayId, 0);
        osn.NodeObs.OBS_content_setPaddingColor(this._displayId, 255, 255, 255);
      }
      this.showUI();
    });
    this._displayWindow.show();
  }

  showUI() {
    if (!_.isNil(this._uiWindow) && !this._uiWindow.isVisible()) {
      this._uiWindow.hide();
      this._uiWindow.once("show", () => {
        this._uiWindow?.focus();
      });
      this._uiWindow.show();
    }
  }

  /**
   * Update display position
   */
  updateDisplay(bounds?: IBounds, unhide = false) {
    if (!this._isDisplaying) {
      this.startDisplay(bounds);
    } else {
      if (unhide) {
        this._isHiding = false;
      }
      if (!this._isHiding) {
        this.showUI();
      }
    }

    let scaleFactorX = 1;
    let horizontalSetting = this.camSet.settings.get(
      ESettingType.CamHorizintalFlip
    );
    if (!_.isNil(horizontalSetting)) {
      try {
        scaleFactorX = (horizontalSetting as HorizontalFlipSetting).value
          ? -1
          : 1;
      } catch (e) {
        scaleFactorX = 1;
      }
    }

    let scaleFactorY = 1;
    let verticalSetting = this.camSet.settings.get(
      ESettingType.CamVerticalFlip
    );
    if (!_.isNil(verticalSetting)) {
      try {
        scaleFactorY = (verticalSetting as VerticalFlipSetting).value ? -1 : 1;
      } catch (e) {
        scaleFactorY = 1;
      }
    }

    this.displaySceneItem.scale = {
      x: Math.abs(this.displaySceneItem.scale.x) * scaleFactorX,
      y: Math.abs(this.displaySceneItem.scale.y) * scaleFactorY,
    };

    if (!_.isNil(bounds)) {
      this._bounds = bounds;
    }

    let inputResolution = getInputResolution(this.displayInput);
    const displayWidth = this._bounds.width;
    const displayHeight =
      (displayWidth * inputResolution.height) / inputResolution.width;

    let { scaleFactor } = getDisplayInfo(/* this._bounds */);
    //this._scaleFactor = scaleFactor;

    if (this._isHiding) {
      osn.NodeObs.OBS_content_resizeDisplay(this.displayId, 0, 0);
    } else {
      osn.NodeObs.OBS_content_resizeDisplay(
        this.displayId,
        _.round(displayWidth * scaleFactor), // cannot use negative value
        _.round(displayHeight * scaleFactor)
      );
    }

    const displayX = this._bounds.x;
    const displayY = this._bounds.y;
    osn.NodeObs.OBS_content_moveDisplay(
      this.displayId,
      _.round(displayX * scaleFactor),
      _.round(displayY * scaleFactor)
    );

    if (!_.isNil(this._uiWindow)) {
      this._uiWindow.webContents.send(
        EDisplayNotification.updateDisplay,
        this._bounds
      );
    }

    return { height: displayHeight, width: displayWidth } as IWidthHeight;
  }

  updateClipBound(clipBound: ICropInfo) {
    if (!_.isNil(this._uiWindow)) {
      this._uiWindow.webContents.send(ECropUIEvents.updateClipBound, clipBound);
    }
  }

  hideDisplay() {
    this._isHiding = true;
    osn.NodeObs.OBS_content_resizeDisplay(this.displayId, 0, 0);
    if (!_.isNil(this._uiWindow)) {
      this._uiWindow.hide();
    }
  }

  endDisplay() {
    this._isHiding = false;
    
    if (!this._isDisplaying) {
      return;
    }

    if (!_.isNil(this._displayWindow)) {
      this._displayWindow.once("closed", () => {
        try {
          this.hideDisplay();
          logger.debug(
            `RatioDisplaySet ${this.displayId} destroying display...`
          );
          osn.NodeObs.OBS_content_destroyDisplay(this.displayId);
          logger.debug(`RatioDisplaySet ${this.displayId} display destroyed.`);
        } catch (e) {
          logger.error(
            `Error occured when destroying RatioDisplaySet ${this.displayId}: ${e}`
          );
        }
        this._displayWindow = undefined;
      });
      this._displayWindow.close();
    }

    if (!_.isNil(this._uiWindow)) {
      this._uiWindow.once("closed", () => {
        this._uiWindow = undefined;
      });
      this._uiWindow.close();
    }

    this.previewCropInfo = undefined;

    this._isDisplaying = false;
  }
}
