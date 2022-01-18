import React, { useRef, useState } from "react";
import {
  Box,
  Radio,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
  Typography,
  Grid,
  FormControlLabel,
  Slider,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { ColorData } from "../../../helpers/const/color.const";
import { FontSize, FontWeight } from "../../../helpers/const/font.const";
import _ from "lodash";
import { IAdjustUI, IDeviceOptionUI } from "../../../global";
import { secondaryTitleStyle } from "../../../helpers/const/secondary-title.const";
import { konnectUIEvent, KonnectUIEvents } from "../../../helpers/util/uiEvent";
import { useTranslation } from "react-i18next";
/**
 * Device菜單內容組件
 */
const { obsHandler } = window;
// 樣式定義
const useStyles = makeStyles({
  root: {
    padding: "10px 16px",
  },
  container: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  listItem: {
    flexWrap: "wrap",
    padding: "10px 16px",
  },
  checkBox: {
    "& .MuiFormControlLabel-label": {
      fontSize: FontSize.adjustValue,
      color: ColorData.textColor,
      paddingLeft: "2px",
    },
  },
  value: {
    display: "flex",
    justifyContent: "end",
    width: "100%",
    fontSize: FontSize.adjustValue,
    color: ColorData.mainColor,
    fontWeight: FontWeight.titleWeight,
    marginTop: "5px",
  },
  disabled: {
    color: ColorData.sliderDisabled,
  },
  name: {
    color: ColorData.textColor,
    fontSize: FontSize.menuText,
    fontWeight: FontWeight.controlNameWeight,
  },
});

// 組件定義
const Device = () => {
  // 國際化
  const { t } = useTranslation();
  // 引入樣式
  const classes = useStyles();
  // 判斷Camera數據是否變化
  const cameraDataChanged = useRef(false);
  // camera數據
  const [cameraData, setCameraData] = useState([] as IDeviceOptionUI[]);
  // 判斷 Camera Focus數據變化
  const focusAdjustDataChanged = useRef(false);
  // Focus 數據
  const [focusAdjustData, setFocusAdjustData] = useState<IAdjustUI>();

  // 對比Camera數據
  const compareData = (newData: IDeviceOptionUI[]) => {
    // 檢查是否需要更新
    newData = _.filter(
      newData,
      (item) => item.value !== obsHandler.virtualCam.virtualCamName + ":"
    );
    konnectUIEvent.emit(KonnectUIEvents.ChangeCamera);
    if (
      newData.length !== cameraData.length ||
      _.differenceWith(cameraData, newData, _.isEqual).length > 0
    ) {
      setCameraData(newData);
    }
    // konnectUIEvent.emit(KonnectUIEvents.SetVideoShow, newData.length > 0);
  };

  // 切換Camera事件處理
  const handleChange = (currentCamera: IDeviceOptionUI) => {
    const newData = cameraData.map((item) => {
      return {
        ...item,
        isChecked: item.value === currentCamera.value,
      } as IDeviceOptionUI;
    });
    cameraDataChanged.current = true;
    setCameraData(newData);
  };

  // 對比Focus數據
  const compareFocusData = (newData: IAdjustUI) => {
    if (_.isNil(focusAdjustData) || !_.isEqual(newData, focusAdjustData)) {
      setFocusAdjustData(newData);
    }
  };

  // Focus 勾選與不勾選Auto事件
  const handleToggle = () => {
    if (!_.isNil(focusAdjustData) && focusAdjustData.isAutoSupported) {
      focusAdjustDataChanged.current = true;
      setFocusAdjustData({
        ...focusAdjustData,
        isAuto: !focusAdjustData.isAuto,
      });
    }
  };

  // Focus滑塊數據改變事件
  const handleSliderChange = (e: any) => {
    focusAdjustDataChanged.current = true;
    setFocusAdjustData({
      ...focusAdjustData,
      value: e.target.value,
    } as IAdjustUI);
  };

  // 更新攝像頭清單並且獲取新的Focus資料
  const fetchCamData = (newData: IDeviceOptionUI[]) => {
    compareData(newData);
    fetchFocusData();
  };

  // 獲取新的Focus資料
  const fetchFocusData = () => {
    obsHandler.camera.getCamAdjust(0, "focus").then((newData) => {
      compareFocusData(newData);
    });
  };

  // 更新Camera數據
  const updateCamData = () => {
    setTimeout(() => {
      obsHandler.camera.getCamDeviceOptions(0).then((newData) => {
        console.log("updateCamDeviceOptions", newData);
        compareData(newData);
      });
    }, 2 * 1000);
  };

  React.useEffect(() => {
    // 攝影機清單有變動時會由後台通知
    let removeDeviceListenerFunc =
      obsHandler.notification.updateCamDeviceOptions(updateCamData);
    let removePresetListenerFunc =
      obsHandler.notification.updatePreset(fetchFocusData);
    // 与后台对接后，该处Camera列表从后台获取
    if (cameraData.length === 0) {
      // 獲取Camera列表
      obsHandler.camera.getCamDeviceOptions(0).then((newData) => {
        compareData(newData);
      });
    } else if (cameraDataChanged.current) {
      cameraDataChanged.current = false;
      // 設定攝像頭來源，並獲取Camera列表
      let selectedCamera = _.find(cameraData, { isChecked: true });
      obsHandler.backend.save();
      if (!_.isNil(selectedCamera)) {
        obsHandler.camera
          .setCamDevice(0, selectedCamera.value)
          .then((newData) => {
            // 更新攝像頭清單並且獲取新的Focus資料
            fetchCamData(newData);
          });
      }
    }

    if (_.isNil(focusAdjustData)) {
      fetchFocusData();
    } else if (focusAdjustDataChanged.current) {
      focusAdjustDataChanged.current = false;
      obsHandler.backend.save();
      obsHandler.camera
        .setCamAdjust(0, "focus", focusAdjustData)
        .then((newData) => {
          compareFocusData(newData);
        });
    }
    return () => {
      removeDeviceListenerFunc();
      removePresetListenerFunc();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraData, focusAdjustData]);

  return (
    <>
      {/* 无Camera数据的情况 */}
      {window.globalDisabled ? (
        <List disablePadding>
          <ListItem className={classes.root} divider disablePadding>
            <ListItemText
              primary={t("device.noCamera")}
              sx={{ color: ColorData.disabledColor }}
            />
            <Radio edge="end" disableRipple disabled />
          </ListItem>
        </List>
      ) : (
        <Box>
          <Typography sx={secondaryTitleStyle}>{t("device.camera")}</Typography>
          <List disablePadding>
            {cameraData.map((item) => (
              <ListItem className={classes.root} divider key={item.id}>
                <ListItemButton
                  sx={{ p: 0 }}
                  onClick={() => handleChange(item)}
                  disableGutters
                  disableTouchRipple
                >
                  <div
                    className="label-overflow"
                    style={{
                      color: `${item.isChecked ? ColorData.mainColor : ""}`,
                    }}
                  >
                    {item.name}
                  </div>
                  <Radio
                    edge="end"
                    checked={item.isChecked}
                    disableRipple
                    color="primary"
                    inputProps={{ "aria-labelledby": item.id }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      {!_.isNil(focusAdjustData) &&
        (focusAdjustData.isAutoSupported || focusAdjustData.isSupported) && (
          <List disablePadding>
            <ListItem className={classes.listItem} divider disablePadding>
              <Grid container className={classes.container}>
                <span className={classes.name}>{t("device.focus")}</span>
                {!_.isNil(focusAdjustData) &&
                  focusAdjustData.isAutoSupported && (
                    <FormControlLabel
                      sx={{ margin: 0, padding: 0 }}
                      className={classes.checkBox}
                      control={
                        <Checkbox
                          checked={
                            !_.isNil(focusAdjustData) &&
                            focusAdjustData.isAutoSupported &&
                            focusAdjustData.isAuto
                          }
                          edge="end"
                          tabIndex={-1}
                          disableRipple
                          sx={{ padding: 0, margin: 0 }}
                          onChange={handleToggle}
                        />
                      }
                      label={t("adjust.auto")}
                      labelPlacement="end"
                      disabled={
                        !_.isNil(focusAdjustData) &&
                        !focusAdjustData.isAutoSupported
                      }
                    />
                  )}
              </Grid>
              <Slider
                size="small"
                color="primary"
                disabled={
                  _.isNil(focusAdjustData) ||
                  !focusAdjustData.isSupported ||
                  focusAdjustData.isAuto
                }
                value={
                  !_.isNil(focusAdjustData) && _.isNumber(focusAdjustData.value)
                    ? focusAdjustData.value
                    : 0
                }
                max={
                  !_.isNil(focusAdjustData) && focusAdjustData.isSupported
                    ? focusAdjustData.range.max
                    : 0
                }
                min={
                  !_.isNil(focusAdjustData) && focusAdjustData.isSupported
                    ? focusAdjustData.range.min
                    : 0
                }
                step={
                  !_.isNil(focusAdjustData) && focusAdjustData.isSupported
                    ? focusAdjustData.range.step
                    : 0
                }
                onChange={handleSliderChange}
              />
              <div
                className={`${classes.value} ${
                  !_.isNil(focusAdjustData) &&
                  focusAdjustData.isAuto &&
                  classes.disabled
                }`}
              >
                {!_.isNil(focusAdjustData) &&
                focusAdjustData.isSupported &&
                _.isNumber(focusAdjustData.value)
                  ? focusAdjustData.value
                  : ""}
              </div>
            </ListItem>
          </List>
        )}
    </>
  );
};
export default Device;
