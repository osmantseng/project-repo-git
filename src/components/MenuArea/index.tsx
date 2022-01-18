import React, { useEffect, useRef, useState } from "react";
import {
  ControlMenu,
  DeviceMenu,
  AdjustMenu,
  EffectMenu,
  OutputMenu,
  SettingsMenu,
} from "../Menu";
import { makeStyles, createStyles } from "@material-ui/styles";
import { Box, IconButton, Grow } from "@material-ui/core";
import { ColorData } from "../../helpers/const/color.const";
import { FontSize, FontWeight } from "../../helpers/const/font.const";
import {
  IMenuAreaEvent,
  konnectUIEvent,
  KonnectUIEvents,
} from "../../helpers/util/uiEvent";
import { MenuNameEnum } from "../../helpers/enum/menu-name.enum";
import { useTranslation } from "react-i18next";
import {RESET_BUTTON_STATUS} from "../../helpers/const/storage.const";
/**
 * 菜单区域
 */
// 父組件傳參類型定義
interface IProps {
  value: MenuNameEnum;
  display: string;
}
// 樣式定義
const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: (props: IProps) => {
        return props.display === "block" ? 221 : 0;
      },
      opacity: (props: IProps) => {
        return props.display === "block" ? 1 : 0;
      },
      transition: "width 0.3s",
      position: "relative",
      // 只有需要展示菜单内容时才会有右边框
      borderLeft: (props: IProps) => {
        return props.display === "block"
          ? `1px solid ${ColorData.lineColor}`
          : "";
      },
    },
    title: {
      textTransform: "capitalize",
      height: 48,
      display: "flex",
      justifyContent: "space-between",
      fontSize: FontSize.titleSize,
      color: ColorData.titleColor,
      fontWeight: FontWeight.titleWeight,
      padding: "0 15px",
      alignItems: "center",
      borderBottom: `1px solid ${ColorData.lineColor}`,
      "& i": {
        fontSize: FontSize.adjustIcon,
        color: ColorData.mainColor,
      },
    },
    checkBox: {
      "& .MuiFormControlLabel-label": {
        fontSize: FontSize.adjustValue,
        color: ColorData.textColor,
        paddingLeft: "2px",
      },
    },
  })
);

// 組件定義
const MenuArea = (props: IProps) => {
  const { value, display } = props;
  const classes = useStyles(props);
  const { t } = useTranslation();
  const transitionRef = useRef<HTMLDivElement>(null);
  const prevValue = useRef(MenuNameEnum.device);
  const prevDisplay = useRef("block");
  // 重置按钮是否可点击
  const [isResetButtonEnabled, setIsResetButtonEnabled] = useState(
    localStorage.getItem(RESET_BUTTON_STATUS) === "1"
  );
  // 设置菜单内容透明度
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    let menuAreaEvent = {
      menu: value, // 當前選單
      isSwitched: value !== prevValue.current, // 是否切換到不同的選單
      isFold: display === "none", // 選單是否摺疊
      isTransitioning: display !== prevDisplay.current, // 選單是否正在移動
    } as IMenuAreaEvent;
    konnectUIEvent.emit(KonnectUIEvents.MenuAreaChanged, menuAreaEvent);
    prevValue.current = value;
    prevDisplay.current = display;
    konnectUIEvent.on(
      KonnectUIEvents.SetIsResetButtonEnabled,
      handleResetButtonStatus
    );

    return () => {
      konnectUIEvent.removeListener(
        KonnectUIEvents.SetIsResetButtonEnabled,
        handleResetButtonStatus
      );
    };
  }, [display, value, isResetButtonEnabled, opacity]);

  // 處理Adjust reset按鈕的狀態
  const handleResetButtonStatus = (status: boolean) => {
    setIsResetButtonEnabled(status);
    localStorage.setItem(RESET_BUTTON_STATUS, isResetButtonEnabled ? "1" : "0")
  }
  // Adjust菜單點擊Reset按鈕
  const handleReset = () => {
    konnectUIEvent.emit(KonnectUIEvents.AdjustResetClick);
    setIsResetButtonEnabled(false);
    localStorage.setItem(RESET_BUTTON_STATUS, "0")
    // 点击Reset后，Preset的徽标不显示有过调整
    // konnectUIEvent.emit(KonnectUIEvents.ShowPreset, true);
  };

  // 處理菜單淡入淡出事件
  const handleOnEnterOrExited = (enter: boolean) => {
    konnectUIEvent.emit(KonnectUIEvents.UIChanged);
    setOpacity(() => enter ? 1 : 0);
    let menuAreaEvent = {
      menu: value,
      isSwitched: false,
      isFold: !enter,
      isTransitioning: false,
    } as IMenuAreaEvent;
    konnectUIEvent.emit(KonnectUIEvents.MenuAreaChanged, menuAreaEvent);
    // 告知展開收回菜單事件進行節流處理
    konnectUIEvent.emit(KonnectUIEvents.CurrentUpdateMenu);
  };
  return (
    <Box id="MenuArea" className={classes.root} ref={transitionRef}>
      <Grow
        in={display === "block"}
        style={{ transformOrigin: "0 0 0" }}
        //onEnter={onEnter}
        onEntered={() => handleOnEnterOrExited(true)}
        //onExit={onExit}
        onExited={() => handleOnEnterOrExited(false)}
        {...(display === "block" ? { timeout: 300 } : {})}
      >
        <div
          style={{
            width: 220,
            height: "100%",
            opacity: opacity,
            overflow: "hidden",
          }}
        >
          <div className={classes.title}>
            <span>{t(`menu.${value}`)}</span>
            {value === MenuNameEnum.adjust && (
              <IconButton
                sx={{ p: 0 }}
                disabled={!isResetButtonEnabled}
                onClick={handleReset}
              >
                <i
                  className={
                    isResetButtonEnabled ? "icon-ic_reset_n" : "icon-ic_reset_d"
                  }
                ></i>
              </IconButton>
            )}
          </div>
          {value === MenuNameEnum.device && <DeviceMenu />}
          {value === MenuNameEnum.ratio && <ControlMenu />}
          {value === MenuNameEnum.effects && <EffectMenu />}
          {value === MenuNameEnum.adjust && <AdjustMenu />}
          {value === MenuNameEnum.output && <OutputMenu />}
          {value === MenuNameEnum.settings && <SettingsMenu />}
        </div>
      </Grow>
    </Box>
  );
};
export default MenuArea;
