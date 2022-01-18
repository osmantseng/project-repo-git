import React, { useEffect, useRef, useState } from "react";
import {
  MenuItem,
  TextField,
  Badge,
  Tooltip,
  Typography,
  InputAdornment,
  IconButton,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { ModeData } from "../../../helpers/util/preset";
import ModeDialog from "../ModeDialog";
import { ColorData } from "../../../helpers/const/color.const";
import { PresetOperateType } from "../../../helpers/enum/preset-operate-type.enum";
import { konnectUIEvent, KonnectUIEvents } from "../../../helpers/util/uiEvent";
import { IDeviceOptionUI, ITemplate } from "../../../global";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import { FontSize, FontWeight } from "../../../helpers/const/font.const";
import { parallel } from "async";
import { PRESET_BADGE_STATUS } from "../../../helpers/const/storage.const";
/**
 * Preset區域
 */
// 引入後台處理數據
const { obsHandler } = window;
// 样式定义
const useStyles = makeStyles({
  select: {
    "& .MuiOutlinedInput-root": {
      height: 24,
      fontSize: FontSize.nameInfo,
    },
    "& .MuiSelect-icon": {
      width: 24,
      height: 24,
    },
    "& .MuiInputAdornment-root": {
      "& p": {
        fontSize: "12px",
        color: "#979797",
        fontWeight: 600,
      },
    },
  },
  icon: {
    fontSize: "22px",
    color: "#605e5c",
    border: "1px solid #605E5C",
    borderRadius: "5px",
  },
  selected: {
    color: "#FFFFFF",
    backgroundColor: ColorData.mainColor,
  },
  disabled: {
    color: "#C4C4C4",
    border: "1px solid #c4C4C4",
  },
});

// disabled狀態下的下拉選框樣式
const disabledTextField = {
  width: 165,
  marginRight: "4px",
  color: "#C4C4C4",
  "& .MuiOutlinedInput-root": {
    fontSize: "11px",
    fontWeight: "700",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#C4C4C4",
    },
  },
};

const Test = (props: any) => {
  useEffect(() => {
    konnectUIEvent.emit(KonnectUIEvents.PresetDialogOpen);
    return () => {
      konnectUIEvent.emit(KonnectUIEvents.PresetDialogClose);
    };
  }, []);

  return <>{props.name}</>;
};

// 組件定義
const Preset = () => {
  // 國際化
  const { t } = useTranslation();
  // 引用樣式
  const classes = useStyles();

  const isInitialized = useRef(false);
  // 当前的mode数据
  const [modeData, setModeData] = useState([] as ModeData[]);
  // 當前所選mode id
  const [selectedModeId, setSelectedModeId] = useState(
    modeData.length > 0 ? modeData[0].id : "Default"
  );
  // 是否展示弹窗
  const [showDialog, setShowDialog] = useState(false);
  // 当前所关闭的弹窗类型，用于判断当前展示的提示信息
  const [currentType, setCurrentType] = useState("");
  // 徽标是否显示, true为不显示，false为显示
  const [badgeInvisible, setBadgeInvisible] = useState(
    localStorage.getItem(PRESET_BADGE_STATUS) === "0"
  );
  // tooltip是否显示
  const [openTooltip, setOpenTooltip] = useState(false);
  // 当前Camera type
  const [currentCamera, setCurrentCamera] = useState<string | undefined>("");
  // 当前Preset是否disabled
  const [noDisabledPreset, setNoDisabledPreset] = useState(true);

  // 當前所選mode是否發生改變
  const selectedModeChanged = useRef(false);

  // 下拉框的顯示樣式
  const textFieldStyles = {
    minWidth: 165,
    maxWidth: modeData.length !== 0 ? 250 : 164,
    marginRight: "4px",
    "& .MuiOutlinedInput-root": {
      fontWeight: !badgeInvisible ? 400 : FontWeight.titleWeight,
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "#605E5C",
      },
    },
  };

  // 對比數據
  const compareData = (newData: ITemplate[]) => {
    let _newData = _.map(newData, (mode) => {
      return {
        id: mode.id,
        name: mode.name,
      } as ModeData;
    });
    if (
      _newData.length !== modeData.length ||
      _.differenceWith(modeData, _newData, _.isEqual).length > 0
    ) {
      let selectedPreset = _.find(newData, "isChecked");
      if (_.isNil(selectedPreset)) {
        setSelectedModeId("Default");
      } else {
        setSelectedModeId(selectedPreset.id);
      }
      setModeData(_newData);
    }
  };

  // 获取当前Camera类型简称 W2000、W2050
  const changeCamera = () => {
    parallel(
      [
        (callback) => {
          // 重新获取当前Camera类型简称 W2000、W2050
          obsHandler.camera
            .getCamDeviceOptions(0)
            .then((newData: IDeviceOptionUI[]) => {
              const selectedCamera = newData.find((item) => item.isChecked);
              if (
                !_.isNil(selectedCamera) &&
                selectedCamera.shortName !== currentCamera
              ) {
                const shortName =
                  !_.isNil(selectedCamera.shortName) &&
                  ["W2000", "W2050"].includes(selectedCamera.shortName)
                    ? selectedCamera.shortName
                    : "Local";
                setCurrentCamera(shortName);
              }
              callback(null);
            });
        },
        (callback) => {
          // 重新获取当前preset選項
          obsHandler.preset.getPresetOptions(0).then((newData) => {
            compareData(newData);
            callback(null);
          });
        },
      ],
      (err, results) => {}
    );
  };

  // 處理Adjust Effect以及點擊Reset之後Preset處的徽標顯示
  let showBadgeData: any[] = [];
  const handleShowBadge = (data: any) => {
    showBadgeData = Array.from(new Set(showBadgeData));
    if (typeof data === "boolean") {
      if (data) {
        const effectChange = showBadgeData.find(
          (item) => item.key === "effect" && !item.value
        );
        setBadgeInvisible(_.isNil(effectChange));
        return;
      }
      setBadgeInvisible(data);
    } else {
      showBadgeData.push(data);
      if (showBadgeData.every((item) => !item.value)) {
        setBadgeInvisible(false);
      }
    }
  };

  // 处理徽标的显示与隐藏
  const handleBadgeShowOrHidden = (hasChange: boolean) => {
    setBadgeInvisible(!hasChange);
  }
  useEffect(() => {
    // konnectUIEvent.on(KonnectUIEvents.ShowPreset, handleShowBadge);
    konnectUIEvent.on(KonnectUIEvents.ChangeCamera, changeCamera);
    konnectUIEvent.on(KonnectUIEvents.SetHasCams, setNoDisabledPreset);
    let removeListenerFunc =
      obsHandler.notification.updatePresetOptions(compareData);
    let removeListenerFuncBadge =
      obsHandler.notification.updateTemplateChangedState(handleBadgeShowOrHidden);
    if (!isInitialized.current) {
      isInitialized.current = true;
      obsHandler.preset.compareTemplate(0).then(handleBadgeShowOrHidden);
    }
    if (modeData.length === 0) {
      obsHandler.preset.getPresetOptions(0).then((newData) => {
        compareData(newData);
      });
    }

    if (selectedModeChanged.current) {
      selectedModeChanged.current = false;
      if (selectedModeId !== "Default") {
        obsHandler.preset.setPreset(0, selectedModeId);
      }
    }
    // 初始化时获取camera当前简称
    if (currentCamera === "") {
      changeCamera();
    }
    if(noDisabledPreset) {
      localStorage.setItem(PRESET_BADGE_STATUS, badgeInvisible ? "0" : "1");
    }
    return () => {
      konnectUIEvent.removeListener(KonnectUIEvents.ChangeCamera, changeCamera);
      // konnectUIEvent.removeListener(KonnectUIEvents.ShowPreset, handleShowBadge);
      konnectUIEvent.removeListener(KonnectUIEvents.SetHasCams, setNoDisabledPreset);
      if (_.isFunction(removeListenerFunc)) {
        removeListenerFunc();
      }
      if (_.isFunction(removeListenerFuncBadge)) {
        removeListenerFuncBadge();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeData, selectedModeId, currentCamera, noDisabledPreset, badgeInvisible]);

  // 打开弹窗事件
  const openDialog = () => {
    konnectUIEvent.emit(KonnectUIEvents.PresetDialogOpen);
    setShowDialog(true);
  };

  // 关闭弹窗事件
  const closeDialog = () => {
    console.log("konnectUIEvent.emit(KonnectUIEvents.PresetDialogClose);");
    setTimeout(() => {
      konnectUIEvent.emit(KonnectUIEvents.PresetDialogClose);
    }, 0);

    setShowDialog(false);
  };

  // 保存当前的template数据(新接口暂时处理)
  const changeData = (currentData: any, type: string) => {
    if (type === PresetOperateType.add) {
      // 当前currentData 是新增的name
      obsHandler.preset
        .createPreset(0, currentData as string)
        .then((resultData) => {
          setModeData(resultData);
          compareData(resultData);
        });
    } else if (type === PresetOperateType.select) {
      // 当前currentData 是选择的template的id
      obsHandler.preset
        .savePreset(0, currentData as string)
        .then((resultData) => {
          setModeData(resultData);
        });
      setSelectedModeId(currentData);
    } else {
      // 修改后的mode data存储起来
      modeData.forEach((item) => {
        currentData.forEach((_item: ModeData) => {
          if (item.id === _item.id && item.name !== _item.name) {
            obsHandler.preset.renamePreset(0, _item.id, _item.name);
          }
        });
      });
      // 当前currentData是所有template数据
      setModeData(currentData);
      if (currentData.length !== 0) {
        const selectedMode = currentData.find(
          (item: ModeData) => item.id === selectedModeId
        );
        setSelectedModeId(
          _.isNil(selectedMode) ? currentData[0].id : selectedMode.id
        );
      }
    }
    setCurrentType(type);
    // 如果是add/select操作后点击save，则需要展示提示信息，且2秒后提示信息消失
    if (type === PresetOperateType.add || type === PresetOperateType.select) {
      setOpenTooltip(true);
      setTimeout(() => {
        handleTooltipClose();
      }, 2000);
      setBadgeInvisible(true);
      // 將當前改動存到新的Template中，Adjust Reset按鈕置灰
      konnectUIEvent.emit(KonnectUIEvents.SetIsResetButtonEnabled, false);
    }
  };

  // 选择mode change事件
  const handleModeChange = (e: any) => {
    console.log("Preset", "handleModeChange", selectedModeId, e.target.value);
    selectedModeChanged.current = true;
    setSelectedModeId(e.target.value);
    setBadgeInvisible(true);
    // 切換template時，Adjust Reset按鈕置灰
    konnectUIEvent.emit(KonnectUIEvents.SetIsResetButtonEnabled, false);
    if (e.target.value === "Default") {
      obsHandler.preset.setPreset(0);
    }
  };

  // 提示信息关闭事件
  const handleTooltipClose = () => {
    setOpenTooltip(false);
  };

  return (
    <>
      <Tooltip
        title={
          <div>
            {currentType === PresetOperateType.add && (
              <Typography>{t("preset.createdMode")}.</Typography>
            )}
            {currentType === PresetOperateType.select && (
              <Typography>{t("preset.saveMode")}.</Typography>
            )}
          </div>
        }
        arrow
        onClose={handleTooltipClose}
        open={openTooltip}
        disableFocusListener
        disableHoverListener
        disableTouchListener
      >
        {noDisabledPreset ? (
          <TextField
            sx={textFieldStyles}
            select={modeData.length !== 0}
            size="small"
            className={classes.select}
            value={selectedModeId}
            onChange={handleModeChange}
            disabled={modeData.length === 0}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {currentCamera}
                </InputAdornment>
              ),
            }}
            onClick={(e) => {
              console.log("onClick");
              //konnectUIEvent.emit(KonnectUIEvents.PresetDialogClose);
            }}
          >
            {modeData.map((mode) => (
              <MenuItem
                key={mode.id}
                value={mode.id}
                id={mode.id}
                onClick={(e) => {
                  handleModeChange({
                    target: { value: (e.target as HTMLDivElement).id },
                  });
                }}
              >
                <Test name={mode.name} />
              </MenuItem>
            ))}
            <MenuItem
              value="Default"
              onClick={() => {
                handleModeChange({ target: { value: "Default" } });
              }}
            >
              {t("preset.default")}
            </MenuItem>
          </TextField>
        ) : (
          <TextField
            sx={disabledTextField}
            className={classes.select}
            value={t("preset.noCamera")}
            disabled
          />
        )}
      </Tooltip>
      <Badge
        color="error"
        variant="dot"
        invisible={badgeInvisible || !noDisabledPreset}
        sx={{ marginRight: "17px" }}
      >
        <IconButton
          sx={{ p: 0 }}
          disabled={!noDisabledPreset}
          onClick={openDialog}
        >
          <span
            className={`icon-ic_save ${classes.icon} ${
              !badgeInvisible && noDisabledPreset && classes.selected
            } ${!noDisabledPreset && classes.disabled}`}
          ></span>
        </IconButton>
      </Badge>
      {showDialog && (
        <ModeDialog
          modeData={modeData}
          closeDialog={closeDialog}
          changeData={changeData}
          currentCamera={currentCamera}
          currentSelectedMode={selectedModeId}
        />
      )}
    </>
  );
};
export default Preset;
