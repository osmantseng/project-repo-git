import { useCallback, useEffect, useRef, useState } from "react";
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
import { useTranslation } from "react-i18next";
import { auto } from "async";

const { obsHandler } = window;

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

const Device2 = () => {
  const { t } = useTranslation();
  const classes = useStyles();

  const isInitialized = useRef(false);

  const [hasCams, setHasCams] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const cameraDataChanged = useRef(false);
  const [cameraData, setCameraData] = useState([] as IDeviceOptionUI[]);
  const focusAdjustDataChanged = useRef(false);
  const [focusAdjustData, setFocusAdjustData] = useState<IAdjustUI>();

  const compareCamData = useCallback(
    (newData: IDeviceOptionUI[]) => {
      // 檢查是否需要更新
      if (
        newData.length !== cameraData.length ||
        _.differenceWith(cameraData, newData, _.isEqual).length > 0
      ) {
        setCameraData(newData);
        let newHasCams = newData.length > 0;
        if (hasCams !== newHasCams) {
          setHasCams(newHasCams);
        }
      }
    },
    [hasCams, cameraData]
  );

  const compareFocusData = useCallback(
    (newData?: IAdjustUI) => {
      if (!_.isEqual(focusAdjustData, newData)) {
        setFocusAdjustData(newData);
      }
    },
    [focusAdjustData]
  );

  const setNoCams = useCallback(() => {
    setHasCams(false);
    setCameraData([] as IDeviceOptionUI[]);
    setFocusAdjustData(undefined);
  }, []);

  const getOrSetCamData = useCallback(
    (selectedCam?: IDeviceOptionUI) => {
      // https://caolan.github.io/async/v3/docs.html#auto
      // 依序取得攝像頭清單及focus資料
      auto<
        {
          camData: IDeviceOptionUI[];
          focusAdjustData?: IAdjustUI;
        },
        Error
      >(
        {
          camData: (callback: Function) => {
            if (_.isNil(selectedCam)) {
              obsHandler.camera.getCamDeviceOptions(0).then((newData) => {
                callback(null, newData);
              });
            } else {
              obsHandler.camera
                .setCamDevice(0, selectedCam.value)
                .then((newData) => {
                  callback(null, newData);
                });
            }
          },
          focusAdjustData: [
            "camData",
            (results, callback: Function) => {
              let selectedCam = _.find(results.camData, "isChecked");
              if (_.isNil(selectedCam)) {
                callback(null, undefined);
              } else {
                obsHandler.camera.getCamAdjust(0, "focus").then((newData) => {
                  callback(null, newData);
                });
              }
            },
          ],
        },
        (err, results) => {
          isInitialized.current = true;
          cameraDataChanged.current = false;
          focusAdjustDataChanged.current = false;
          if (!_.isNil(err) || _.isNil(results)) {
            console.warn(err);
            setNoCams();
          } else {
            if (results.camData.length > 0) {
              compareCamData(results.camData);
              compareFocusData(results.focusAdjustData);
            } else {
              setNoCams();
            }
          }
          setIsLoading(false);
        }
      );
    },
    [setNoCams, compareCamData, compareFocusData]
  );

  const getFocusData = useCallback(() => {
    obsHandler.camera.getCamAdjust(0, "focus").then((newData) => {
      compareFocusData(newData);
    });
  }, [compareFocusData]);

  const setFocusData = useCallback(() => {
    focusAdjustDataChanged.current = false;
    if (!_.isNil(focusAdjustData)) {
      obsHandler.camera
        .setCamAdjust(0, "focus", focusAdjustData)
        .then((newData) => {
          compareFocusData(newData);
        });
    }
  }, [focusAdjustData, compareFocusData]);

  const updateCamData = useCallback(() => {
    setTimeout(() => {
      getOrSetCamData();
      setIsLoading(true);
    }, 2 * 1000);
  }, [getOrSetCamData]);

  const handleChange = (currentCamera: IDeviceOptionUI) => {
    const newData = _.map(cameraData, (item) => {
      return {
        ...item,
        isChecked: item.value === currentCamera.value,
      } as IDeviceOptionUI;
    });

    cameraDataChanged.current = true;
    setCameraData(newData);
    setIsLoading(true);
  };

  const handleToggle = () => {
    if (!_.isNil(focusAdjustData) && focusAdjustData.isAutoSupported) {
      focusAdjustDataChanged.current = true;
      setFocusAdjustData({
        ...focusAdjustData,
        isAuto: !focusAdjustData.isAuto,
      });
    }
  };

  const handleSliderChange = (e: any) => {
    if (!_.isNil(focusAdjustData)) {
      focusAdjustDataChanged.current = true;
      setFocusAdjustData({
        ...focusAdjustData,
        value: e.target.value,
      } as IAdjustUI);
    }
  };

  useEffect(() => {
    if (!isInitialized.current) {
      getOrSetCamData();
    } else {
      if (cameraDataChanged.current) {
        let selectedCam = _.find(cameraData, "isChecked");
        getOrSetCamData(selectedCam);
      } else if (focusAdjustDataChanged.current) {
        setFocusData();
      }
    }

    // 攝影機清單有變動時會由後台通知
    let removeDeviceListenerFunc =
      obsHandler.notification.updateCamDeviceOptions(updateCamData);
    let removePresetListenerFunc =
      obsHandler.notification.updatePreset(getFocusData);

    return () => {
      removeDeviceListenerFunc();
      removePresetListenerFunc();
    };
  }, [
    isLoading,
    hasCams,
    cameraData,
    focusAdjustData,
    getOrSetCamData,
    updateCamData,
    setFocusData,
    getFocusData,
  ]);

  return (
    <>
      {!hasCams ? (
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
                  disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      {!_.isNil(focusAdjustData) &&
        !isLoading &&
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

export default Device2;
