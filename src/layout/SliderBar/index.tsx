import React, { useState, useEffect, useCallback } from "react";
import { Box, MenuList } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import MenuArea from "../../components/MenuArea";
import { ColorData } from "../../helpers/const/color.const";
import { konnectUIEvent, KonnectUIEvents } from "../../helpers/util/uiEvent";
import { iconList, otherIcon } from "../../helpers/const/slider-icon.const";
import SliderMenuItem from "./SliderMenuItem";
import { cropEvent, CropEvents } from "../../helpers/util/crop";
import { MenuNameEnum } from "../../helpers/enum/menu-name.enum";
import _ from "lodash";
import { IRatioOptionUI } from "../../global";
/**
 * 侧边栏区域
 */

// 側邊欄數據類型定義
interface SliderBarData {
  // 当前菜单是否被选择
  selected: boolean;
  // 当前是展开还是收回按钮: isShow=true為展開並顯示菜單
  showArrowButton: boolean;
  // 是否展示菜单内容
  display: string;
}

// 樣式定義
const useStyles = makeStyles({
  root: {
    display: "flex",
    boxShadow: "2px 0px 2px rgba(0, 0, 0, 0.1)",
    zIndex: 1,
  },
  div: {
    // borderRight: `1px solid ${ColorData.lineColor}`,
    backgroundColor: ColorData.sliderBackgroundColor,
  },
  menuList: {
    width: 69,
  },
  foldIcon: {
    textAlign: "center",
    cursor: "pointer",
  },
  otherMenu: {
    width: 69,
    padding: 0,
    margin: 0,
    position: "absolute",
    bottom: 28,
  },
});
// 初始側邊欄數據
const initData: SliderBarData = {
  selected: true,
  showArrowButton: !window.globalDisabled,
  display: window.globalDisabled ? "none" : "block",
};
// 組件定義
const SliderBar = (props: any) => {
  // 引用樣式
  const classes = useStyles();
  const [data, setData] = useState(initData);
  // 上一次所選菜單項值
  const [prevValue, setPrevValue] = useState(MenuNameEnum.device);
  // 当前所选菜单项值
  const [value, setValue] = useState(
    window.globalDisabled ? MenuNameEnum.settings : MenuNameEnum.device
  );
  // 存储当前所选的Crop Ratio，以便在展开Control菜单时可以实时将选框显示
  const [currentRatio, setCurrentRatio] = useState<IRatioOptionUI>();
  const [onClick, setOnClick] = useState(false);
  // 菜單選項改變事件
  const handleChange = (event: any, newValue: any) => {
    if (!onClick) {
      props.menuChange(newValue);
      setPrevValue(value);
      setValue(newValue);
      // 如果点击的是两次点击的是同一个菜单项此时的display取反
      // isShow所代表的菜单按钮，根据菜单项display情况判断是展开按钮还是收回按钮
      if (value === newValue) {
        let nextShowArrowButton = !data.showArrowButton;
        setData({
          selected: true,
          display: nextShowArrowButton ? "block" : "none",
          showArrowButton: nextShowArrowButton,
        });
        konnectUIEvent.once(KonnectUIEvents.CurrentUpdateMenu, () => {
          setTimeout(() => {
            setOnClick(false);
          }, 300);
        });
      } else {
        setData({
          selected: true,
          display: "block",
          showArrowButton: true,
        });
        setTimeout(() => {
          setOnClick(false);
        }, 300);
      }
      setOnClick(true);
    }
  };

  // 菜單展開收縮按鈕點擊事件
  const clickUnfold = () => {
    console.log("SliberBar", "clickUnfold");
    if (!onClick) {
      // 如果用户没有点击收回按钮，而是点击菜单项进行收回，则此时的按钮需要变成展开按钮
      let nextShowArrowButton = !data.showArrowButton;
      setData({
        selected: true,
        // 通过当前按钮状态控制菜单是展开还是收回
        display: nextShowArrowButton ? "block" : "none",
        showArrowButton: nextShowArrowButton,
      });
      setOnClick(true);
      konnectUIEvent.once(KonnectUIEvents.CurrentUpdateMenu, () => {
        setTimeout(() => {
          setOnClick(false);
        }, 200);
      });
    }
  };

  // 处理有无Camera情况下菜单的展示
  const handleNoCamera = (hasCamera: boolean) => {
    if (!hasCamera) {
      setValue(MenuNameEnum.settings);
      setData({
        selected: true,
        // 通过当前按钮状态控制菜单是展开还是收回
        display: "none",
        showArrowButton: false,
      });
    } else {
    }
  };

  const applyCrop = useCallback(() => {
    let nextShowArrowButton = !data.showArrowButton;
    setData({
      selected: true,
      // 通过当前按钮状态控制菜单是展开还是收回
      display: nextShowArrowButton ? "block" : "none",
      showArrowButton: nextShowArrowButton,
    });
    setOnClick(true);
    konnectUIEvent.once(KonnectUIEvents.CurrentUpdateMenu, () => {
      setTimeout(() => {
        setOnClick(false);
      }, 200);
    });
  }, [data]);

  useEffect(() => {
    // 通知菜單切換
    // 存储当前所选的Ratio值，以便下次展开Control菜单时直接展示相应Ratio的Crop选框
    cropEvent.on(CropEvents.CurrentRatio, setCurrentRatio);
    // 执行Control Crop Apply后需要收回菜单栏
    cropEvent.on(CropEvents.ApplyCrop, applyCrop);
    let event =
      data.display === "none"
        ? KonnectUIEvents.MenuFold
        : KonnectUIEvents.MenuUnfold;
    konnectUIEvent.emit(event);
    if (prevValue !== value) {
      console.log(KonnectUIEvents.Switch2Menu, value);
      konnectUIEvent.emit(KonnectUIEvents.Switch2Menu, value);
    }
    // 当菜单项为ratio，需要控制video界面上的padding值的显示与隐藏
    if (value === MenuNameEnum.ratio && !window.globalDisabled) {
      konnectUIEvent.emit(KonnectUIEvents.ShowPadding, data.showArrowButton);
      if (data.showArrowButton && !_.isNil(currentRatio)) {
        cropEvent.emit(CropEvents.BeginCrop, currentRatio);
      } else {
        cropEvent.emit(CropEvents.EndCrop);
      }
    }
    konnectUIEvent.on(KonnectUIEvents.SetHasCams, handleNoCamera);
    return () => {
      cropEvent.removeListener(CropEvents.ApplyCrop, applyCrop);
      cropEvent.removeListener(CropEvents.CurrentRatio, setCurrentRatio);
      konnectUIEvent.removeListener(KonnectUIEvents.SetHasCams, handleNoCamera);
    };
  }, [data, value, applyCrop]);

  return (
    <Box className={classes.root}>
      <div className={classes.div}>
        <MenuList className={classes.menuList} disableListWrap>
          <div className={classes.foldIcon}>
            <i
              className={
                data.showArrowButton ? "icon-ic_arrow" : "icon-ic_menu"
              }
              onClick={clickUnfold}
            ></i>
          </div>
          <SliderMenuItem
            list={iconList}
            handleChange={handleChange}
            value={value}
            selected={data.selected}
          />
        </MenuList>
        <div className={`${classes.menuList} ${classes.otherMenu}`}>
          <SliderMenuItem
            list={otherIcon}
            handleChange={handleChange}
            value={value}
            selected={data.selected}
          />
        </div>
      </div>
      {!_.isNil(value) && <MenuArea value={value} display={data.display} />}
    </Box>
  );
};
export default SliderBar;
