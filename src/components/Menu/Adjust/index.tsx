import React, { useRef, useState } from 'react';
import { Typography, Box, Switch } from '@material-ui/core';
import SliderOption from './SliderOption';
import { adjustIcons } from '../../../helpers/const/adjust-data.const';
import { makeStyles } from '@material-ui/styles';
import { secondaryTitleStyle } from '../../../helpers/const/secondary-title.const';
import { IAdjustIconUI, IAdjustUI } from '../../../global';
import _, { Dictionary } from 'lodash';
import { konnectUIEvent, KonnectUIEvents } from '../../../helpers/util/uiEvent';
import { useTranslation } from 'react-i18next';
import { ADVANCED_STATUS } from '../../../helpers/const/storage.const';
import async from 'async';
const { obsHandler } = window;

const adjustItems = ['brightness', 'contrast', 'saturation'];
const adjustAdvanceItems = [
  'lowLight',
  'backlight',
  'whiteBalance',
  'exposure',
  'sharpness',
  'hue',
  'gamma'
];

/**
 * Adjust菜单页面
 */
const useStyles = makeStyles({
  root: {
    height: 'calc(100vh - 94px)',
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  advanced: {
    position: 'relative',
    width: '220px'
  },
  switch: {
    position: 'absolute',
    right: 10,
    top: -4
  }
});

// Adjust组件
const Adjust = () => {
  const { t } = useTranslation();
  const classes = useStyles();
  const resetting = useRef(false);
  const adjustDataChanged = useRef({} as Dictionary<boolean>);
  const [adjustData, setAdjustData] = useState({} as Dictionary<IAdjustUI>);
  const [showAdvance, setShowAdvance] = React.useState(
    sessionStorage.getItem(ADVANCED_STATUS) === '1' ? true : false
  );

  const compareData = (newData: Dictionary<IAdjustUI>) => {
    // 檢查是否需要更新
    if (_.has(newData, 'focus')) {
      newData = _.omit(newData, 'focus');
    }
    if (_.size(newData) !== _.size(adjustData) || !_.isEqual(newData, adjustData)) {
      adjustDataChanged.current = _.mapValues(newData, () => false);
      console.log(newData);
      setAdjustData(newData);
    }
  };

  const compareDataItem = (newDataItem: IAdjustUI) => {
    let dataKey = _.findKey(adjustData, ['name', newDataItem.name]);
    if (!_.isNil(dataKey)) {
      adjustDataChanged.current = _.mapValues(adjustDataChanged.current, (value, key) =>
        key === dataKey ? false : value
      );
      if (!_.isEqual(newDataItem, adjustData[dataKey])) {
        setAdjustData(
          _.mapValues(adjustData, (value, key) => (key === dataKey ? newDataItem : value))
        );
      }
    }
  };

  // 设置是否开启advance adjust内容
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowAdvance(event.target.checked);
    sessionStorage.setItem(ADVANCED_STATUS, event.target.checked ? '1' : '0');
  };

  // 勾选auto事件
  const handleAuto = (e: any, targetKey: string) => {
    let dataItem = _.get(adjustData, targetKey);
    // console.log("Adjust", "handleAuto", targetKey, dataItem, e.target.checked);
    if (!_.isNil(dataItem) && dataItem.isAuto !== e.target.checked) {
      adjustDataChanged.current = _.mapValues(adjustDataChanged.current, (value, key) =>
        key === targetKey ? true : value
      ) as Dictionary<boolean>;
      setAdjustData(
        _.mapValues(adjustData, (value, key) =>
          key === targetKey ? ({ ...value, isAuto: e.target.checked } as IAdjustUI) : value
        ) as Dictionary<IAdjustUI>
      );
    }
  };

  // 滑块变化事件
  const handleSliderChange = (e: any, targetKey: string) => {
    let dataItem = _.get(adjustData, targetKey);
    // console.log("Adjust", "handleSliderChange", targetKey, dataItem, e.target.value);
    if (!_.isNil(dataItem) && dataItem.value !== e.target.value) {
      adjustDataChanged.current = _.mapValues(adjustDataChanged.current, (value, key) =>
        key === targetKey ? true : value
      ) as Dictionary<boolean>;
      setAdjustData(
        _.mapValues(adjustData, (value, key) =>
          key === targetKey ? ({ ...value, value: e.target.value } as IAdjustUI) : value
        ) as Dictionary<IAdjustUI>
      );
    }
  };
  const sendChangeRequest = () => {
    console.log('adjust', 'sendChangeRequest');
    let changedCount = _.filter(adjustDataChanged.current).length;
    if (changedCount > 0 && !resetting.current) {
      konnectUIEvent.emit(KonnectUIEvents.SetIsResetButtonEnabled, true);
    }
    resetting.current = false;
    if (changedCount === 1) {
      let changedDataKey = _.findKey(adjustData, (value, key) =>
        _.get(adjustDataChanged.current, key, false)
      );
      if (!_.isNil(changedDataKey)) {
        adjustDataChanged.current = _.mapValues(adjustDataChanged.current, (value, key) =>
          key === changedDataKey ? false : value
        );
        let changedDataItem = adjustData[changedDataKey];
        obsHandler.backend.save();
        obsHandler.camera.setCamAdjust(0, changedDataKey, changedDataItem).then((newDataItem) => {
          compareDataItem(newDataItem);
        });
      }
    } else if (changedCount > 1) {
      adjustDataChanged.current = _.mapValues(adjustData, () => false);
      obsHandler.backend.save();
      obsHandler.camera.setCamAdjusts(0, adjustData).then((newData) => {
        compareData(newData);
      });
    }
  };

  const reset = () => {
    console.log('adjust reset');
    adjustDataChanged.current = _.mapValues(adjustData, () => false);
    let currentPresetAdjust: any = {};
    // 取得template設定值
    obsHandler.preset.getPresetOptions(0).then((newData) => {
      const isCheckedTemplate = newData.find((item) => item.isChecked);
      currentPresetAdjust = !_.isNil(isCheckedTemplate)
        ? isCheckedTemplate.data.CamAdjustCollection
        : {};
      let targetAdjustData = _.mapValues(adjustData, (item, key) => {
        // 讀取template中各個adjust項目的設定值，如果沒有設定則還原為原廠預設值
        let targetValue = _.get(currentPresetAdjust, [key, 'value'], item.range.default);
        let targetAutoValue = _.get(currentPresetAdjust, [key, 'isAuto'], item.isAutoSupported);

        if (
          _.has(adjustDataChanged.current, key) &&
          (targetValue !== item.value || targetAutoValue !== targetAutoValue)
        ) {
          adjustDataChanged.current[key] = true;
          item.value = targetValue;
          item.isAuto = targetAutoValue;
        }

        return item;
      }) as Dictionary<IAdjustUI>;
      //console.log('reset adjust data', targetAdjustData, adjustDataChanged.current);
      if (_.some(adjustDataChanged.current)) {
        resetting.current = true;
        setAdjustData(targetAdjustData);
      }
    });
  };

  const fetchData = () => {
    obsHandler.camera.getCamAdjusts(0).then((newData) => {
      if (!_.isNil(newData)) {
        compareData(newData);
      }
    });
  };

  React.useEffect(() => {
    konnectUIEvent.on(KonnectUIEvents.AdjustResetClick, reset);
    let removePresetListenerFunc = obsHandler.notification.updatePreset(fetchData);

    if (_.size(adjustData) === 0) {
      fetchData();
    }
    sendChangeRequest();

    return () => {
      konnectUIEvent.removeListener(KonnectUIEvents.AdjustResetClick, reset);
      if (_.isFunction(removePresetListenerFunc)) {
        removePresetListenerFunc();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustData, showAdvance]);

  return (
    <Box className={classes.root}>
      <Typography sx={secondaryTitleStyle}>{t('adjust.general')}</Typography>
      <SliderOption
        data={_.transform(
          adjustItems,
          (result, name) => {
            let key = _.findKey(adjustData, ['name', name]);
            if (!_.isNil(key)) {
              let item = adjustData[key];
              result.push({
                ...item,
                key: key,
                iconName: _.get(adjustIcons, name, '')
              } as IAdjustIconUI);
            }
            return true;
          },
          [] as IAdjustIconUI[]
        )}
        handleAuto={handleAuto}
        handleSliderChange={handleSliderChange}
      />
      <div className={classes.advanced}>
        <Typography sx={secondaryTitleStyle}>{t('adjust.advanced')}</Typography>
        <Switch
          className={classes.switch}
          size="small"
          color="primary"
          checked={showAdvance}
          disabled={window.globalDisabled}
          onChange={handleChange}
        />
      </div>
      {showAdvance && (
        <SliderOption
          data={_.transform(
            adjustAdvanceItems,
            (result, name) => {
              let key = _.findKey(adjustData, ['name', name]);
              if (!_.isNil(key)) {
                let item = adjustData[key];
                result.push({
                  ...item,
                  key: key,
                  iconName: _.get(adjustIcons, name, '')
                } as IAdjustIconUI);
              }
              return true;
            },
            [] as IAdjustIconUI[]
          )}
          handleAuto={handleAuto}
          handleSliderChange={handleSliderChange}
        />
      )}
    </Box>
  );
};
export default Adjust;
