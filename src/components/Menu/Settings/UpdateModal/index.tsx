import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  LinearProgress,
  Typography,
} from "@material-ui/core";
import { ColorData } from "../../../../helpers/const/color.const";
import _ from "lodash";
import { useTranslation } from "react-i18next";
const { updateHandler } = window;
const MB = 1024 * 1024;
/**
 * 下载更新软件包弹窗
 */
const UpdateModal = (props: { handleClose: () => void }) => {
  const { t } = useTranslation();
  const { handleClose } = props;
  const isUpdateStarted = useRef(false);
  // 当前已下载大小
  const [updateValue, setUpdateValue] = useState(0);
  // 安装包总大小
  const [totalValue, setTotalValue] = useState(0);
  // 下载是否出现错误
  const [updateError, setUpdateError] = useState(false);
  // 關閉彈窗事件
  const handleCloseDialog = () => {
    updateHandler.cancelDownloadUpdate();
    handleClose();
  };
  // 计算出的整体下载进度
  const getValue = () => {
    if (totalValue) {
      const currentProgress = (updateValue * 100) / totalValue;
      // 将value更改为保留两位小数
      return Math.floor(currentProgress);
    } else {
      return 0;
    }
  };
  useEffect(() => {
    let rmOnDownloadUpdateStarted = updateHandler.onDownloadUpdateStarted(
      (item) => {
        let totalMb = _.floor(item.totalBytes / MB, 1);
        setTotalValue(totalMb);
      }
    );
    let rmOnDownloadUpdateProgress = updateHandler.onDownloadUpdateProgress(
      (progress) => {
        console.log(props);
        let updateMB = _.floor(progress.transferredBytes / MB, 1);
        let totalMb = _.floor(progress.totalBytes / MB, 1);
        setUpdateValue(updateMB);
        setTotalValue(totalMb);
      }
    );
    let rmOnDownloadUpdateCancel = updateHandler.onDownloadUpdateCancel(() => {
      handleClose();
    });
    let rmOnDownloadUpdateCompleted = updateHandler.onDownloadUpdateCompleted(
      (item) => {
        handleClose();
      }
    );

    if (!isUpdateStarted.current) {
      isUpdateStarted.current = true;
      updateHandler.startDownloadUpdate().then((res) => {
        if (res) {
          // 開始下載
        } else {
          // 無法開始下載
        }
      });
    }

    return () => {
      if (_.isFunction(rmOnDownloadUpdateStarted)) {
        rmOnDownloadUpdateStarted();
      }
      if (_.isFunction(rmOnDownloadUpdateProgress)) {
        rmOnDownloadUpdateProgress();
      }
      if (_.isFunction(rmOnDownloadUpdateCancel)) {
        rmOnDownloadUpdateCancel();
      }
      if (_.isFunction(rmOnDownloadUpdateCompleted)) {
        rmOnDownloadUpdateCompleted();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateValue, totalValue]);

  return (
    <Dialog open={true}>
      <DialogTitle sx={{ p: "20px 30px" }}>
        {!updateError ? t("settings.updateSuccess") : t("settings.updateError")}
      </DialogTitle>
      <DialogContent sx={{ width: "100%", p: "28px 17px 28px 30px", m: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ width: 310, mr: "15px" }}>
            <LinearProgress
              sx={{
                height: 10,
                borderRadius: "5px",
                backgroundColor: updateError ? ColorData.hoverColor : "",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: updateError ? ColorData.disabledColor : "",
                },
              }}
              variant="determinate"
              value={getValue()}
            />
          </Box>
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: updateError ? ColorData.errorColor : ColorData.textColor,
                fontWeight: 500,
              }}
            >
              {updateValue.toFixed(1)}MB/{totalValue}MB
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          color="primary"
          size="small"
          sx={{ color: ColorData.mainColor }}
          onClick={handleCloseDialog}
        >
          {t("common.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default UpdateModal;
