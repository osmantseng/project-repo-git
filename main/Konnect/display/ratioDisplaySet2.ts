import { BrowserWindow } from "electron";
import {
  getInputResolution,
  setSceneItem2Center,
  setSceneItemBounds2FullScreen,
} from "../obs/obsStatic";
import * as osn from "obs-studio-node";
import { IBounds } from "./interface";
import {
  createTransparentChildWindow,
  fitChildWindow2Parent,
  getDisplayInfo,
} from "./util";
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

export class RatioDisplaySet2 {
  private camSet: CamSet;
  private displayInput: osn.IInput;
  private displayScene: osn.IScene;
  private displaySceneItem: osn.ISceneItem;
  private inputResolution = { width: 0, height: 0 } as IWidthHeight;
  private bounds = { x: 0, y: 0, width: 0, height: 0 } as IBounds;
  private scaleFactor = 1;
  private isPreviewing = false;

  private _previewCropInfo: ICropInfo | undefined;
  get previewCropInfo() {
    return this._previewCropInfo;
  }
  set previewCropInfo(value) {
    logger.debug(`set previewCropInfo ${JSON.stringify(value)}`);
    this._previewCropInfo = value;
    if (_.isNil(value)) {
      this.isPreviewing = false;
      this.displaySceneItem.crop = zeroCropInfo;
      this.showUI(true);
    } else {
      this.isPreviewing = true;
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

    // niitialize preview scene
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
    logger.debug(
      `startDisplay ${JSON.stringify(bounds)} ${this._isDisplaying}`
    );
    this.inputResolution = getInputResolution(this.displayInput);

    if (this._isDisplaying) {
      return;
    }

    this._isDisplaying = true;
    this._isHiding = false;
    this.isPreviewing = false;
    this.displaySceneItem.crop = zeroCropInfo;
    setSceneItem2Center(this.displaySceneItem);
    setSceneItemBounds2FullScreen(this.displaySceneItem);

    this._displayWindow = createTransparentChildWindow(
      this.parentWindow,
      false,
      false
    );
    fitChildWindow2Parent(this._displayWindow);

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

    osn.NodeObs.OBS_content_createSourcePreviewDisplay(
      this._displayWindow.getNativeWindowHandle(),
      this.displayScene.name,
      this._displayId
    );
    osn.NodeObs.OBS_content_setShouldDrawUI(this._displayId, false);
    osn.NodeObs.OBS_content_setPaddingSize(this._displayId, 0);
    osn.NodeObs.OBS_content_setPaddingColor(this._displayId, 255, 255, 255);

    this._displayWindow.once("show", () => {
      if (!_.isNil(this._displayWindow)) {
        fitChildWindow2Parent(this._displayWindow);
        //this._displayWindow.setAlwaysOnTop(false);
        this._displayWindow.focus();
        this.showUI();
      }
    });
    this._displayWindow.show();
  }

  showUI(force = false) {
    if (!_.isNil(this._uiWindow) && (!this._uiWindow.isVisible() || force)) {
      this._isHiding = false;
      this._uiWindow.hide();
      this._uiWindow.once("show", () => {
        if (!_.isNil(this._uiWindow)) {
          fitChildWindow2Parent(this._uiWindow);
          this._uiWindow?.restore();
          this._uiWindow?.focus();
          //this._uiWindow?.setAlwaysOnTop(true);
          //this._uiWindow?.setAlwaysOnTop(false);
        }
      });
      this._uiWindow.show();
    }
  }

  /**
   * Update display position
   */
  updateDisplay(bounds?: IBounds, unhide = false) {
    logger.debug(
      `updateDisplay ${JSON.stringify(bounds)} ${unhide} ${this._isHiding}`
    );
    if (!_.isNil(bounds)) {
      this.bounds = bounds;
    }

    if (this._isDisplaying) {
      if (unhide) {
        this._isHiding = false;
        if (!this.isPreviewing) {
          this.showUI(true);
        }
        //this.isPreviewing = false;
        //this.displaySceneItem.crop = zeroCropInfo;
      }
    } else {
      this.startDisplay(this.bounds);
    }

    this.checkFlip();

    logger.debug(
      `updateDisplay2 ${JSON.stringify(bounds)} ${unhide} ${this._isHiding} ${
        this.isPreviewing
      }`
    );
    if (!this._isHiding && !this.isPreviewing) {
      this.showUI();
    }

    let pos = this.parentWindow.getPosition();
    let displayPoint = [
      this.bounds.x + this.bounds.width / 2 + pos[0],
      this.bounds.y + this.bounds.height / 2 + pos[1],
    ];
    let { scaleFactor } = getDisplayInfo(displayPoint[0], displayPoint[1]);
    this.scaleFactor = scaleFactor;

    this.moveDisplay();
    this.resizeDisplay();

    if (!_.isNil(this._uiWindow)) {
      this._uiWindow.webContents.send(
        EDisplayNotification.updateDisplay,
        this.bounds
      );
    }

    if (!_.isNil(this._displayWindow)) {
      fitChildWindow2Parent(this._displayWindow);
    }
    if (!_.isNil(this._uiWindow)) {
      fitChildWindow2Parent(this._uiWindow);
    }
  }

  checkFlip() {
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
  }

  resizeDisplay() {
    if (this.inputResolution.width === 0) {
      osn.NodeObs.OBS_content_resizeDisplay(this.displayId, 0, 0);
      return;
    }

    const displayWidth = this.bounds.width;
    const displayHeight =
      (displayWidth * this.inputResolution.height) / this.inputResolution.width;

    //osn.NodeObs.OBS_content_resizeDisplay(this.displayId, 0, 0);
    if (this._isHiding) {
      osn.NodeObs.OBS_content_resizeDisplay(this.displayId, 0, 0);
    } else {
      osn.NodeObs.OBS_content_resizeDisplay(
        this.displayId,
        _.round(displayWidth * this.scaleFactor), // cannot use negative value
        _.round(displayHeight * this.scaleFactor)
      );
    }
  }

  moveDisplay() {
    const displayX = this.bounds.x;
    const displayY = this.bounds.y;
    osn.NodeObs.OBS_content_moveDisplay(
      this.displayId,
      _.round(displayX * this.scaleFactor),
      _.round(displayY * this.scaleFactor)
    );
  }

  updateClipBound(clipBound: ICropInfo) {
    if (!_.isNil(this._uiWindow)) {
      this._uiWindow.webContents.send(ECropUIEvents.updateClipBound, clipBound);
    }
  }

  hideDisplay(disablePreview = false) {
    if (disablePreview) {
      this.isPreviewing = false;
      this.displaySceneItem.crop = zeroCropInfo;
    }
    this._isHiding = true;
    osn.NodeObs.OBS_content_resizeDisplay(this.displayId, 0, 0);
    if (!_.isNil(this._uiWindow)) {
      this._uiWindow.hide();
      //this._uiWindow.setAlwaysOnTop(false);
    }
  }

  endDisplay() {
    this._isHiding = false;
    this._isDisplaying = false;
    this._previewCropInfo = undefined;
    this.isPreviewing = false;
    this.displaySceneItem.crop = zeroCropInfo;
    osn.NodeObs.OBS_content_resizeDisplay(this.displayId, 0, 0);

    this._uiWindow?.hide();
    this._uiWindow?.close();

    if (!_.isNil(this._displayWindow)) {
      this._displayWindow.once("closed", () => {
        try {
          //this.hideDisplay();
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
      this._displayWindow.hide();
      this._displayWindow.close();
    }
  }

  restore() {
    if (!_.isNil(this._displayWindow)) {
      if (!this._displayWindow.isVisible()) {
        this._displayWindow.restore();
        this._displayWindow.focus();
        //this._displayWindow.setAlwaysOnTop(true);
        //this._displayWindow.setAlwaysOnTop(false);
      }
      this._displayWindow.focus();
      
    }

    if (!_.isNil(this._uiWindow) && !this._isHiding && !this.isPreviewing) {
      if (!this._uiWindow.isVisible()) {
        this._uiWindow.restore();
        //this._uiWindow.setAlwaysOnTop(true);
        //this._uiWindow.setAlwaysOnTop(false);
        this._uiWindow.focus();
      }
      this._uiWindow.focus();
      
    }
  }
}
