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
import { ICamSet } from "../camSet/interface";

export class RatioDisplaySet3 {
  private camSet: ICamSet;
  private displayInput: osn.IInput;
  private displayScene: osn.IScene;
  private displaySceneItem: osn.ISceneItem;
  private inputResolution = { width: 0, height: 0 } as IWidthHeight;
  private bounds = { x: 0, y: 0, width: 0, height: 0 } as IBounds;
  private scaleFactor = 1;
  private isPreviewing = false;
  private isFirstTime = true;

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
      this._uiWindow.webContents.send(ECropUIEvents.hide);
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

  private _uiWindow: BrowserWindow;
  get uiWindow() {
    return this._uiWindow;
  }

  private _isDisplaying = false; // is display showing?
  get isDisplaying() {
    return this._isDisplaying;
  }

  private _isShowingUI = false; // is UI showing?
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

  /* private _displayWindow: BrowserWindow;
  get displayWindow() {
    return this._displayWindow;
  } */

  constructor(camSet: ICamSet, parentWindow: BrowserWindow) {
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

    /* this._displayWindow = createTransparentChildWindow(
      this.parentWindow,
      true,
      false
    ); */
    //this._displayWindow.setAlwaysOnTop(false);
    //fitChildWindow2Parent(this._displayWindow);
    osn.NodeObs.OBS_content_createSourcePreviewDisplay(
      //this._displayWindow.getNativeWindowHandle(),
      this.parentWindow.getNativeWindowHandle(),
      this.displayScene.name,
      this._displayId
    );
    osn.NodeObs.OBS_content_moveDisplay(this.displayId, 1, 1);
    // display尺寸有劇烈變化時容易出現閃爍，而display的初始尺寸是0, 0，實驗後發現如果display建立後先顯示於螢幕上可以稍微減少閃爍
    osn.NodeObs.OBS_content_resizeDisplay(
      this.displayId,
      1, // cannot use negative value
      1
    );
    setTimeout(() => {
      this._hideDisplay();
    }, 10);

    osn.NodeObs.OBS_content_setShouldDrawUI(this._displayId, false);
    osn.NodeObs.OBS_content_setPaddingSize(this._displayId, 0);
    osn.NodeObs.OBS_content_setPaddingColor(this._displayId, 0, 0, 0);

    this._uiWindow = createTransparentChildWindow(
      this.parentWindow,
      true,
      false,
      path.join(__dirname, "../preload.js")
    );
    this._uiWindow.setAlwaysOnTop(false);
    fitChildWindow2Parent(this._uiWindow);
    let tmp = `${resolveHtmlPath("index.html")}?type=crop`;
    this._uiWindow.loadURL(tmp);
    /* this._uiWindow.once("show", () => {
      this._uiWindow.webContents.openDevTools();
    }); */
    this._uiWindow.show();

    /* this._displayWindow.once("show", () => {
      fitChildWindow2Parent(this._displayWindow);

      this._displayWindow.focus();
      this.showUI();
    });
    this._displayWindow.show(); */

    this.showUI();
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

    //fitChildWindow2Parent(this._displayWindow);
    //this._displayWindow.focus();

    this.showUI();
  }

  _hideDisplay() {
    //osn.NodeObs.OBS_content_resizeDisplay(this.displayId, 0, 0);
    osn.NodeObs.OBS_content_moveDisplay(
      this.displayId,
      _.round(5000 * this.scaleFactor),
      _.round(-5000 * this.scaleFactor)
    );
  }

  showUI(force = false) {
    this._isHiding = false;
    fitChildWindow2Parent(this._uiWindow);
    this._uiWindow.focus();
    this._uiWindow.webContents.send(ECropUIEvents.show);
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

    this._uiWindow.webContents.send(
      EDisplayNotification.updateDisplay,
      this.bounds
    );

    this.resizeDisplay();
    this.moveDisplay();

    this.isFirstTime = false;

    //fitChildWindow2Parent(this._displayWindow);
    fitChildWindow2Parent(this._uiWindow);
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
    if (this.inputResolution.width * this.inputResolution.height <= 0) {
      this._hideDisplay();
      return;
    }

    const displayWidth = this.bounds.width;
    const displayHeight =
      (displayWidth * this.inputResolution.height) / this.inputResolution.width;

    //osn.NodeObs.OBS_content_resizeDisplay(this.displayId, 0, 0);
    if (this._isHiding) {
      this._hideDisplay();
    } else {
      if (this.isFirstTime) {
        // display尺寸有劇烈變化時容易出現閃爍，而display的初始尺寸是0, 0，因此分兩段調整尺寸減少閃爍程度
        let targetSize = [
          displayWidth * this.scaleFactor,
          displayHeight * this.scaleFactor,
        ];
        osn.NodeObs.OBS_content_resizeDisplay(
          this.displayId,
          _.round(targetSize[0]),
          _.round(targetSize[1] * 0.5)
        );
        setTimeout(() => {
          osn.NodeObs.OBS_content_resizeDisplay(
            this.displayId,
            _.round(targetSize[0]),
            _.round(targetSize[1])
          );
          /* setTimeout(() => {
            this.moveDisplay();
          }, 0); */
        }, 0);
      } else {
        osn.NodeObs.OBS_content_resizeDisplay(
          this.displayId,
          _.round(displayWidth * this.scaleFactor), // cannot use negative value
          _.round(displayHeight * this.scaleFactor)
        );
      }
    }
  }

  moveDisplay() {
    const displayX = this.bounds.x;
    const displayY = this.bounds.y;
    if (this.isFirstTime) {
      setTimeout(() => {
        osn.NodeObs.OBS_content_moveDisplay(
          this.displayId,
          _.round(displayX * this.scaleFactor),
          _.round(displayY * this.scaleFactor)
        );
      }, 50);
    } else {
      osn.NodeObs.OBS_content_moveDisplay(
        this.displayId,
        _.round(displayX * this.scaleFactor),
        _.round(displayY * this.scaleFactor)
      );
    }
  }

  updateClipBound(clipBound: ICropInfo) {
    this._uiWindow.webContents.send(ECropUIEvents.updateClipBound, clipBound);
  }

  hideDisplay(disablePreview = false) {
    this._uiWindow.webContents.send(ECropUIEvents.hide);

    if (disablePreview) {
      this.isPreviewing = false;
      this.displaySceneItem.crop = zeroCropInfo;
    }
    this._isHiding = true;
    this._hideDisplay();
  }

  endDisplay() {
    this._isHiding = false;
    this._isDisplaying = false;
    this._previewCropInfo = undefined;
    this.isPreviewing = false;
    this.displaySceneItem.crop = zeroCropInfo;
    this._uiWindow.webContents.send(ECropUIEvents.hide);
    this._hideDisplay();
  }

  restore() {
    //this._displayWindow.focus();
    this._uiWindow.focus();
  }
}
