import { EventEmitter } from "events";
import { MenuNameEnum } from "../enum/menu-name.enum";
export const enum KonnectUIEvents {
  SetVideoShow = "SetVideoShow",
  MenuAreaChanged = "MenuAreaChanged",
  MenuFold = "MenuFold",
  MenuFolded = "MenuFolded",
  MenuUnfold = "MenuUnfold",
  MenuUnfolded = "MenuUnfolded",
  Switch2Menu = "Switch2Menu",
  SetHasCams = "SetHasCams",
  AdjustResetClick = "AdjustResetClick",
  SetIsResetButtonEnabled = "SetIsResetButtonEnabled",
  UIChanged = "UIChanged",
  /**
   * 判斷是否顯示Preset 可保存的紅點Badge
   */
  ShowPreset = "ShowPreset",
  ShowPadding = "ShowPadding",
  ChangeResolution = "ChangeResolution",
  ChangeCamera = "ChangeCamera",
  /**
   * 用戶引導頁面不顯示preset,關閉用戶引導後才顯示
   */
  GuideShowPreset = "GuideShowPreset",
  PresetDialogOpen = "PresetDialogOpen",
  PresetDialogClose = "PresetDialogClose",
  /**
   * 当前进行了菜单展开收回操作
   */
  CurrentUpdateMenu = "CurrentUpdateMenu"
}

export interface IMenuAreaEvent {
  menu: MenuNameEnum; // 當前選單
  isSwitched: boolean; // 是否切換到不同的選單
  isFold: boolean; // 選單是否摺疊
  isTransitioning: boolean; // 選單是否正在移動
}

export const konnectUIEvent = new EventEmitter();
