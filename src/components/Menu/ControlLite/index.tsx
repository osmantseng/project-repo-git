import React, { useEffect, useRef, useState } from "react";
import {
  Radio,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Typography,
} from "@material-ui/core";
import { cropEvent, CropEvents } from "../../../helpers/util/crop";
import { makeStyles } from "@material-ui/styles";
import { ColorData } from "../../../helpers/const/color.const";
import { secondaryTitleStyle } from "../../../helpers/const/secondary-title.const";
import LabelName from "./LabelName";
import { IRatioOptionUI, ICropInfo } from "../../../global";
import _, { Dictionary } from "lodash";
import VerticalMirrorBtn from "./VerticalMirrorBtn";
import HorizontalMirrorBtn from "./HorizontalMirrorBtn";
import { useTranslation } from "react-i18next";
/**
 * Ratio菜单内容
 */
const { obsHandler } = window;
// ratio icon数据
const ratioIcons: Dictionary<{ iconName: string; selectedIcon: string }> = {
  "16:9": {
    iconName: "icon-ic_l_16_9_n",
    selectedIcon: "icon-ic_l_16_9_s",
  },
  "9:16": {
    iconName: "icon-ic_p_16_9_n",
    selectedIcon: "icon-ic_p_16_9_s",
  },
  "4:3": {
    iconName: "icon-ic_l_4_3_n",
    selectedIcon: "icon-ic_l_4_3_s",
  },
  "3:4": {
    iconName: "icon-ic_p_4_3_n",
    selectedIcon: "icon-ic_p_4_3_s",
  },
  "1:1": {
    iconName: "icon-ic_1_1_n",
    selectedIcon: "icon-ic_1_1_s",
  },
  "Free ratio": {
    iconName: "icon-ic_free_ratio_n",
    selectedIcon: "icon-ic_free_ratio_s",
  },
};

// 樣式定義
const useStyles = makeStyles({
  root: {
    height: 50,
    padding: "0 15px 0 10px",
  },
  buttonGroup: {
    padding: "12px 15px",
    display: "flex",
    justifyContent: "space-between",
    "& button": {
      width: "48%",
      height: 30,
      fontSize: 14,
      textTransform: "capitalize",
      border: "2px solid #0078AE",
      borderRadius: "40px",
      lineHeight: 1,
    },
  },
});

// 組件定義
const ControlLite = () => {
  // 國際化
  const { t } = useTranslation();
  // 引用樣式
  const classes = useStyles();

  const isInitialized = useRef(false);

  const [data, setData] = useState({
    changed: false, // 是否曾變更選項
    cropData: [] as IRatioOptionUI[], // Crop Ratio列表
  });

  // 對比數據，選擇是否更新
  const compareData = (newData: IRatioOptionUI[], fetchData?: boolean) => {
    console.log("compareData", newData);
    // 檢查是否需要更新
    if (
      newData.length !== data.cropData.length ||
      _.differenceWith(data.cropData, newData, _.isEqual).length > 0
    ) {
      setData({
        changed: false,
        cropData: newData,
      });
      // 重新獲取新數據時需要得到當前的Ratio，更新Crop選框
      if (fetchData && !window.globalDisabled) {
        const selectedRatio = _.find(newData, { isChecked: true });
        !_.isNil(selectedRatio) &&
          cropEvent.emit(CropEvents.BeginCrop, selectedRatio);
      }
    }
  };

  // Ratio改變事件
  const handleChangeRatio = (selectedRatio: IRatioOptionUI) => {
    let currentSelectedRatio = _.find(data.cropData, "isChecked");
    console.log("handleChangeRatio", data.cropData, selectedRatio);
    let newData = [] as IRatioOptionUI[];
    if (_.isNil(currentSelectedRatio)) {
      newData = data.cropData.map((item) => {
        return {
          ...item,
          isChecked: item.name === selectedRatio.name,
        } as IRatioOptionUI;
      });
    } else {
      let cropInfo = currentSelectedRatio.cropInfo;
      if (currentSelectedRatio.name !== selectedRatio.name) {
        newData = data.cropData.map((item) => {
          return {
            ...item,
            cropInfo: null,
            isChecked: item.name === selectedRatio.name,
          } as IRatioOptionUI;
        });
        setData({
          changed: false,//true,
          cropData: newData,
        });
      }
      /* newData = data.cropData.map((item) => {
        return {
          ...item,
          cropInfo: item.name === selectedRatio.name ? cropInfo : null,
          isChecked: item.name === selectedRatio.name,
        } as IRatioOptionUI;
      }); */
    }
    
    /* setData({
      changed: false,//true,
      cropData: newData,
    }); */
    cropEvent.emit(CropEvents.BeginCrop, selectedRatio);
  };

  // 更新Camera ratio數據
  const updateCropInfo = (cropInfo: ICropInfo) => {
    console.log("Control", cropInfo);
    let selectedRatioOption = _.find(data.cropData, { isChecked: true });
    if (!_.isNil(selectedRatioOption)) {
      obsHandler.backend.save();
      obsHandler.camera
        .setCamRatio(0, { ...selectedRatioOption, cropInfo: cropInfo })
        .then((newData) => {
          compareData(newData);
        });
    }
  };

  // Crop Reset操作事件
  const reset = () => {
    console.log("ControlLite", "reset");
    let selectedRatioOption = _.find(data.cropData, { isChecked: true });
    if (!_.isNil(selectedRatioOption)) {
      obsHandler.backend.save();
      obsHandler.camera
        .setCamRatio(0, {
          ...selectedRatioOption,
          cropInfo: null,
        })
        .then((newData) => {
          compareData(newData);
          selectedRatioOption = _.find(newData, { isChecked: true });
          cropEvent.emit(CropEvents.BeginCrop, selectedRatioOption);
        });
    }
  };

  const fetchData = () => {
    obsHandler.camera.getCamRatioOptions(0).then((newData) => {
      isInitialized.current = true;
      compareData(newData, true);
      if(newData.find(item => !_.isNil(item.cropInfo))) {
        cropEvent.emit(CropEvents.ShowResetButton, true);
      }
    });
  };

  useEffect(() => {
    cropEvent.on(CropEvents.UpdateCropInfo, updateCropInfo);
    cropEvent.on(CropEvents.ResetCrop, reset);

    if (data.cropData.length === 0) {
      // 獲取Crop列表
      fetchData();
    } else if (data.changed) {
      // 設定Crop，並獲取Filter列表
      let selectedRatioOption = _.find(data.cropData, { isChecked: true });
      if (!_.isNil(selectedRatioOption)) {
        obsHandler.backend.save();
        obsHandler.camera
          .setCamRatio(0, selectedRatioOption)
          .then((newData) => {
            compareData(newData);
          });
      } else {
        setData({
          changed: false,
          cropData: data.cropData,
        });
      }
    }

    // 发送当前所选Ratio，由Sliderbar组件进行接收存储该数据
    let currentCropRatio = data.cropData.find((item) => item.isChecked);
    if (!_.isNil(currentCropRatio)) {
      cropEvent.emit(CropEvents.CurrentRatio, currentCropRatio);
    }

    if (!isInitialized.current) {
      fetchData();
    } else {
    }
    return () => {
      cropEvent.removeListener(CropEvents.UpdateCropInfo, updateCropInfo);
      cropEvent.removeListener(CropEvents.ResetCrop, reset);
    };
  }, [data]);

  return (
    <>
      <Typography sx={secondaryTitleStyle}>{t("ratio.crop")}</Typography>
      <List disablePadding>
        {data.cropData.map((item) => (
          <ListItem
            className={classes.root}
            divider
            key={item.id}
            disablePadding
          >
            <ListItemButton
              role={undefined}
              onClick={() => handleChangeRatio(item)}
              disabled={window.globalDisabled}
              disableGutters
              disableTouchRipple
            >
              <ListItemText
                sx={{ color: `${item.isChecked ? ColorData.mainColor : ""}` }}
                id={item.id}
                primary={
                  <LabelName
                    name={
                      item.name === "Free ratio"
                        ? t("ratio.freeRatio")
                        : item.name
                    }
                    iconName={
                      item.isChecked
                        ? _.get(ratioIcons, [item.name, "selectedIcon"], "")
                        : _.get(ratioIcons, [item.name, "iconName"], "")
                    }
                    checked={item.isChecked}
                  />
                }
              />
              <Radio
                edge="start"
                checked={item.isChecked}
                disabled={window.globalDisabled}
                disableRipple
                color="primary"
                inputProps={{ "aria-labelledby": item.id }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Typography sx={secondaryTitleStyle}>{t("ratio.mirror")}</Typography>
      <div className={classes.buttonGroup}>
        <VerticalMirrorBtn />
        <HorizontalMirrorBtn />
      </div>
    </>
  );
};
export default ControlLite;
