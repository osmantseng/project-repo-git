import React, { useRef, useState, useEffect } from 'react';
import {
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Typography,
  Slider,
  ListItem,
  List,
  Tooltip,
  ListItemButton,
  Grid
} from '@material-ui/core';
import { IEffectOptionUI } from '../../../global';
import _ from 'lodash';
import { secondaryTitleStyle } from '../../../helpers/const/secondary-title.const';
import { makeStyles, styled } from '@material-ui/styles';
import { ColorData } from '../../../helpers/const/color.const';
import { FontSize, FontWeight } from '../../../helpers/const/font.const';
import { useTranslation } from 'react-i18next';
// import { konnectUIEvent, KonnectUIEvents } from "../../../helpers/util/uiEvent";
/**
 * Effect菜单页面
 */
const { obsHandler } = window;
const useStyles = makeStyles({
  root: {
    height: 'calc(100vh - 94px)',
    flexWrap: 'nowrap',
    justifyContent: 'space-between'
  },
  imgItem: {
    width: 84,
    height: 96,
    marginBottom: '10px',
    marginRight: '15px',
    cursor: 'pointer'
  },
  imgItemBar: {
    textAlign: 'center'
  },
  intensity: {
    width: '100%',
    backgroundColor: ColorData.sliderBackgroundColor,
    borderTop: `1px solid ${ColorData.lineColor}`
  },
  name: {
    color: ColorData.textColor,
    fontSize: FontSize.menuText,
    fontWeight: FontWeight.controlNameWeight
  },
  value: {
    display: 'flex',
    justifyContent: 'end',
    width: '100%',
    marginBottom: '10px',
    fontSize: FontSize.adjustValue,
    color: ColorData.mainColor,
    fontWeight: FontWeight.titleWeight
  },
  disabled: {
    color: ColorData.sliderDisabled
  },
  checkBox: {
    '& .MuiFormControlLabel-label': {
      fontSize: FontSize.adjustValue,
      color: ColorData.textColor,
      paddingLeft: '2px'
    }
  },
  listItem: {
    height: 80,
    flexWrap: 'wrap',
    padding: '10px 16px 0 16px'
  },
  slider: {
    marginTop: '6px',
    padding: 0
  }
});

// Tone Optimizer滑块样式修改
const ToneSlider = styled(Slider)({
  marginRight: '6px',
  '& .MuiSlider-mark': {
    backgroundColor: '#ffffff',
    height: 4,
    width: 4,
    borderRadius: '50%',
    border: '2px solid #C0C0C0'              
  }
});

// 初始化可調整數據
const initAdjustData = {
  sliderValue: 0,
  silderDisable: true,
  toneValue: 0,
  toneDisable: true,
  toneMax: 0
};

// Effect组件定義
const Effect = () => {
  const { t } = useTranslation();
  const classes = useStyles();
  const dataChanged = useRef(false);
  const selectedEffectOption = useRef<IEffectOptionUI>();
  const [effectOptions, setEffectOptions] = useState([] as IEffectOptionUI[]);
  const [adjustData, setAdjustData] = useState(initAdjustData);
  // 放置img的Grid所佔高度
  const gridHeight1 = adjustData.silderDisable && adjustData.toneDisable ? 12 : 10;
  useEffect(() => {
    let removePresetListenerFunc = obsHandler.notification.updatePreset(fetchData);
    if (effectOptions.length === 0) {
      // 獲取Filter列表
      fetchData();
    } else if (dataChanged.current) {
      // 設定Effect，並獲取Filter列表
      /* let effectOption = composeEffectOption();
      if (!_.isNil(effectOption)) {
        obsHandler.backend.save();
        obsHandler.camera.setCamEffect(0, effectOption).then((newData) => {
          compareData(newData);
        });
      } */
      sendUpdate();
      // konnectUIEvent.emit(KonnectUIEvents.ShowPreset, {key: 'effect', value: false});
    }

    return () => {
      if (_.isFunction(removePresetListenerFunc)) {
        removePresetListenerFunc();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectOptions, adjustData]);

  /**
   * 获取当前所选Filter数据
   */
  const findSelectedFilterData = (_filterData: IEffectOptionUI[]) => {
    return _.find(_filterData, { isChecked: true });
  };
  /* const compareData = _.throttle((newData: IEffectOptionUI[], fetchData?: boolean) => {
    // 檢查是否需要更新
    if (
      newData.length !== effectOptions.length ||
      _.differenceWith(effectOptions, newData, _.isEqual).length > 0
    ) {
      selectedEffectOption.current = findSelectedFilterData(newData);
      fetchData && checkedSubOptions();
      setEffectOptions(newData);
    }
  }, 500); */
  /**
   * 檢查是否需要更新
   */
  const compareData = (newData: IEffectOptionUI[], fetchData?: boolean) => {
    if (
      newData.length !== effectOptions.length ||
      _.differenceWith(effectOptions, newData, _.isEqual).length > 0
    ) {
      selectedEffectOption.current = findSelectedFilterData(newData);
      fetchData && checkedSubOptions();
      setEffectOptions(newData);
    }
  };

  /**
   * 获取当前非None filter下的tone和intensity的初始值（包含变更preset）
   */
  const checkedSubOptions = () => {
    let effectOption = selectedEffectOption.current;
    if (_.isNil(effectOption) || effectOption.filterType !== 'clut_filter') {
      setAdjustData(initAdjustData);
      return;
    }
    if (effectOption.filterType === 'clut_filter') {
      let toneMax = effectOption.subOptions.length - 1;
      let sliderValue = _.round(_.get(effectOption.settings, 'clut_amount', 0) * 100);
      setAdjustData({
        sliderValue: sliderValue,
        silderDisable: false,
        toneValue:
          effectOption.subOptionIndex >= 0 && toneMax >= 0 ? effectOption.subOptionIndex : 0,
        toneDisable: toneMax < 0,
        toneMax: toneMax < 0 ? 0 : toneMax
      });
    }
  };

  /**
   * 设置点击后的图像是否点击
   */
  const handleFilterClick = (e: any, name: string) => {
    const newData = effectOptions.map((item) => {
      return { ...item, isChecked: item.name === name } as IEffectOptionUI;
    });
    dataChanged.current = true;
    selectedEffectOption.current = findSelectedFilterData(newData);
    checkedSubOptions();
    setEffectOptions(newData);
  };

  /**
   * Tone Optimizer滑块數據改變事件
   */
  const handleToneChange = (e: any) => {
    let value = e.target.value;
    if (!_.isNumber(value)) {
      return;
    }
    dataChanged.current = true;
    setAdjustData({ ...adjustData, toneValue: value });
  };

  /**
   * intensity滑塊改變事件
   */
  const _handleSliderChange = (e: any) => {
    let value = e.target.value;
    if (!_.isNumber(value)) {
      return;
    }
    dataChanged.current = true;
    setAdjustData({ ...adjustData, sliderValue: value });
  };

  /**
   * intensity滑塊改變事件
   */
  const handleSliderChange = _.debounce(_handleSliderChange, 30, {
    maxWait: 60
  });

  /* const composeEffectOption = _.throttle(() => {
    let effectOption = selectedEffectOption.current;
    if (_.isNil(effectOption)) {
      return undefined;
    }
    let effectSettings = effectOption.settings;
    if (effectSettings["clut_amount"] === _.clamp(adjustData.sliderValue / 100, 0, 1)) {
      dataChanged.current = false;
    }
    switch (effectOption.filterType) {
      case "clut_filter":
        effectSettings["clut_amount"] = _.clamp(adjustData.sliderValue / 100, 0, 1);
        if (adjustData.toneValue < effectOption.subOptions.length) {
          let toneSettings = effectOption.subOptions[adjustData.toneValue].settings;
          effectSettings = _.defaults(toneSettings, effectSettings);
        }
        break;
    }
    return {
      name: effectOption.name,
      filterType: effectOption.filterType,
      settings: effectSettings,
      subOptionIndex: adjustData.toneValue
    }
  }, 500) */

  /**
   * 處理Effect數據
   */
  const composeEffectOption = () => {
    let effectOption = selectedEffectOption.current;
    if (_.isNil(effectOption)) {
      return undefined;
    }
    let effectSettings = effectOption.settings;
    // 当点击到的filter为none时也需要设置dataChanged.current为false
    if (
      effectOption.filterType === '' ||
      effectSettings['clut_amount'] === _.clamp(adjustData.sliderValue / 100, 0, 1)
    ) {
      dataChanged.current = false;
    }
    switch (effectOption.filterType) {
      case 'clut_filter':
        effectSettings['clut_amount'] = _.clamp(adjustData.sliderValue / 100, 0, 1);
        if (adjustData.toneValue < effectOption.subOptions.length) {
          let toneSettings = effectOption.subOptions[adjustData.toneValue].settings;
          effectSettings = _.defaults(toneSettings, effectSettings);
        }
        break;
    }
    return {
      name: effectOption.name,
      filterType: effectOption.filterType,
      settings: effectSettings,
      subOptionIndex: adjustData.toneValue
    };
  };

  /**
   * 更新數據
   */
  const sendUpdate = () => {
    let effectOption = composeEffectOption();
    if (!_.isNil(effectOption)) {
      obsHandler.backend.save();
      obsHandler.camera.setCamEffect(0, effectOption).then((newData) => {
        compareData(newData);
      });
    }
  };

  /**
   * 獲取最新數據
   */
  const fetchData = () => {
    obsHandler.camera.getCamEffectOptions(0).then((newData) => {
      compareData(newData, true);
    });
  };

  return (
    <>
      <Grid container direction="column" className={classes.root}>
        <Grid item xs={gridHeight1} sx={{ overflowY: 'auto' }}>
          <Typography sx={secondaryTitleStyle}>{t('effects.filter')}</Typography>
          <ImageList
            sx={{ padding: '5px 16px 0px 16px', overflowX: 'hidden' }}
            gap={2}
            rowHeight={96}
          >
            {effectOptions.map((item) => (
              <ListItemButton
                sx={{ p: 0 }}
                key={item.id}
                disabled={window.globalDisabled}
                onClick={(e) => handleFilterClick(e, item.name)}
              >
                <ImageListItem
                  className={classes.imgItem}
                  sx={{
                    outline: `${item.isChecked ? '4px solid #0078AE' : ''}`
                  }}
                >
                  <img src={item.imgPath} srcSet={item.imgPath} alt={item.name} loading="lazy" />
                  <ImageListItemBar
                    className={classes.imgItemBar}
                    title={
                      <Tooltip title={<span>{t(`effects.${item.name}`)}</span>} placement="bottom">
                        <span>{t(`effects.${item.name}`)}</span>
                      </Tooltip>
                    }
                  />
                </ImageListItem>
              </ListItemButton>
            ))}
          </ImageList>
        </Grid>
        {!(adjustData.silderDisable && adjustData.toneDisable) && (
          <Grid className={classes.intensity} item>
            <List disablePadding sx={{ position: 'sticky' }}>
              {!adjustData.toneDisable && (
                <ListItem divider disablePadding className={classes.listItem}>
                  <span className={classes.name}>{t('effects.toneOptimizer')}</span>
                  <ToneSlider
                    className={classes.slider}
                    size="small"
                    disableSwap
                    disabled={adjustData.toneDisable || window.globalDisabled}
                    value={adjustData.toneValue}
                    onChange={(e) => handleToneChange(e)}
                    defaultValue={0}
                    max={adjustData.toneMax}
                    track={false}
                    marks
                  />
                  <div className={classes.value}></div>
                </ListItem>
              )}

              <ListItem disablePadding className={classes.listItem}>
                <span className={classes.name}>{t('effects.intensity')}</span>
                <Slider
                  className={classes.slider}
                  size="small"
                  color="primary"
                  disabled={adjustData.silderDisable || window.globalDisabled}
                  value={adjustData.sliderValue}
                  onChange={(e) => handleSliderChange(e)}
                />
                <div
                  className={`${classes.value} ${
                    (adjustData.silderDisable || window.globalDisabled) && classes.disabled
                  }`}
                >
                  {!adjustData.silderDisable ? adjustData.sliderValue : ' '}
                </div>
              </ListItem>
            </List>
          </Grid>
        )}
      </Grid>
    </>
  );
};
export default Effect;
