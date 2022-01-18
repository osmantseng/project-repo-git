import { useCallback, useEffect, useState } from 'react';
import { Box, Button, Stack, Typography, Tooltip } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import * as _ from 'lodash';
import { makeStyles } from '@material-ui/styles';
import { ColorData } from '../../helpers/const/color.const';
import { IRatioOptionUI } from '../../global';
import { cropEvent, CropEvents } from '../../helpers/util/crop';
import { konnectUIEvent, KonnectUIEvents } from '../../helpers/util/uiEvent';
import { FontSize, FontWeight } from '../../helpers/const/font.const';

/**
 * Crop操作頁面
 */
// 樣式定義
const useStyles = makeStyles({
  root: {
    width: '100%',
    paddingBottom: '10px',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 0,
    zIndex: 2
  },
  buttonGroup: {
    height: 36,
    '& button': {
      width: 120,
      backgroundColor: ColorData.cropColor,
      color: ColorData.sliderTextColor,
      textTransform: 'capitalize',
      '& p': {
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        fontSize: FontSize.buttonText,
        fontWeight: FontWeight.sliderTextWeight,
        whiteSpace: 'nowrap'
      },
      '& .MuiButton-startIcon': {
        marginRight: '3px',
        '& span': {
          color: ColorData.sliderTextColor,
          fontSize: '26px'
        }
      }
    }
  }
});

// 提取button组件
const RewriteButton = (props: any) => {
  // 國際化
  const { t } = useTranslation();
  const { text, handleClick } = props;
  return (
    <Tooltip title={<div>{t(text)}</div>} placement="top">
      <Button
        variant="contained"
        size="medium"
        // startIcon={<span className={iconName}></span>}
        onClick={handleClick}
      >
        {/* {_.truncate(t(text), { length: 8, omission: '..' })} */}
        <Typography>{t(text)}</Typography>
      </Button>
    </Tooltip>
  );
};

// 組件定義
const CropOperate = () => {
  // 引用樣式
  const classes = useStyles();
  // 当前展示的Cropping选框的数据
  const [isCropping, setIsCropping] = useState(false);
  // 当前是Preview还是Cancel按钮
  const [clickPreview, setClickPreview] = useState(false);
  // 当前是否显示Reset按钮
  const [showReset, setShowReset] = useState(false);
  // 当前是否有Camera
  const [hasCamera, setHasCamera] = useState(true);

  const updateHasCamera = useCallback((_hasCamera: boolean) => {
    setHasCamera(_hasCamera);
    if (!_hasCamera) {
      setIsCropping(false);
    }
  }, [])

  useEffect(() => {
    cropEvent.on(CropEvents.BeginCrop, beginCrop);
    cropEvent.on(CropEvents.EndCrop, endCrop);
    konnectUIEvent.on(KonnectUIEvents.Switch2Menu, endCrop);
    konnectUIEvent.emit(KonnectUIEvents.UIChanged);
    cropEvent.on(CropEvents.ShowResetButton, setShowReset);
    konnectUIEvent.on(KonnectUIEvents.SetHasCams, updateHasCamera);
    return () => {
      cropEvent.removeListener(CropEvents.BeginCrop, beginCrop);
      cropEvent.removeListener(CropEvents.EndCrop, endCrop);
      konnectUIEvent.removeListener(KonnectUIEvents.Switch2Menu, endCrop);
      konnectUIEvent.removeListener(CropEvents.ShowResetButton, setShowReset);
      konnectUIEvent.removeListener(KonnectUIEvents.SetHasCams, updateHasCamera);
    };
  }, [isCropping, clickPreview, updateHasCamera]);

  /**
   * 開始Crop
   * @param selectedRatio 当前所选的ratio值
   */
  const beginCrop = (selectedRatio: IRatioOptionUI) => {
    !_.isNil(selectedRatio) && setIsCropping(true);
  };

  /**
   * 結束Crop
   */
  const endCrop = () => {
    setIsCropping(false);
    setClickPreview(false);
  };

  /**
   * 点击Preview事件
   */
  const handlePreview = () => {
    cropEvent.emit(CropEvents.PreviewCrop, !clickPreview);
    setClickPreview(!clickPreview);
  };

  /**
   * 点击Apply事件
   */
  const handleApply = () => {
    cropEvent.emit(CropEvents.ApplyCrop);
    //endCrop();
    setShowReset(true);
  };

  /**
   * 点击Reset事件
   */
  const handleReset = () => {
    cropEvent.emit(CropEvents.ResetCrop);
    setShowReset(false);
  };

  /**
   * 处理当前Crop操作按钮的显示状态
   */
  const handleIsDisplay = () => {
    if (hasCamera) {
      return isCropping;
    } else {
      return false;
    }
  };
  return (
    <Box className={classes.root} sx={{ display: handleIsDisplay() ? 'flex' : 'none' }}>
      <Stack spacing={2} direction="row" className={classes.buttonGroup}>
        {showReset && (
          <RewriteButton
            /* iconName="icon-ic_reset_n" */
            text="ratio.reset"
            handleClick={handleReset}
          />
        )}
        {clickPreview ? (
          <RewriteButton
            /* iconName="icon-ic_cancelpreview" */
            text="common.cancel"
            handleClick={handlePreview}
          />
        ) : (
          <RewriteButton
            /* iconName="icon-ic_preview" */
            text="ratio.preview"
            handleClick={handlePreview}
          />
        )}
        <RewriteButton
          /* iconName="icon-ic_apply" */
          text="common.apply"
          handleClick={handleApply}
        />
      </Stack>
    </Box>
  );
};
export default CropOperate;
