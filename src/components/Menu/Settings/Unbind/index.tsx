import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  DialogTitle,
  Stack,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { ColorData } from "../../../../helpers/const/color.const";
import { useTranslation } from "react-i18next";
import { CloudTypeEnum } from "../../../../helpers/enum/cloud-type.enum";
import { cloudEvent, CloudEvents } from "../../../../helpers/util/cloudEvent";
/**
 * 綁定雲端賬號成功/解綁彈窗
 */
const { obsHandler } = window;
// 樣式定義
const useStyles = makeStyles({
  unbindDialog: {
    "& .MuiDialog-paper": {
      width: "80%",
    },
  },
  content: {
    marginTop: "20px",
  },
  list: {
    "& .MuiListItemButton-root": {
      fontWeight: 500,
    },
  },
});
// 組件定義
const Unbind = (props: any) => {
  // 國際化
  const { t } = useTranslation();
  // 引用樣式
  const classes = useStyles();
  // 獲取父組件傳遞的數據 handleClose關閉彈窗
  const { handleClose } = props;
  // 顯示與隱藏彈窗事件 open绑定到某一账号成功弹窗 unbindDialog詢問是否解綁 unbindSuccess解綁成功
  const [showDialog, setShowDialog] = useState({
    open: true,
    unbindSuccess: false,
  });
  // 當前選擇綁定到哪個雲端
  const [isBindGoogle, setIsBindGoogle] = useState<boolean>();

  useEffect(() => {
    // 获取当前绑定的账号类型
    obsHandler.backend.getCloudBackupProvider().then((res) => {
      setIsBindGoogle(() => res === CloudTypeEnum.google);
    });
  }, []);

  /**
   * 選擇繼續解綁事件
   */
  const handleUnbindSuccess = () => {
    setShowDialog({
      open: false,
      unbindSuccess: true,
    });
    cloudEvent.emit(CloudEvents.unbind);
    obsHandler.backend.eraseCloudBackupProvider();
  };

  /**
   * 选择綁定完成
   */
  const handleOk = () => {
    setShowDialog({ unbindSuccess: false, open: false });
    cloudEvent.emit(CloudEvents.unbind);
    handleClose();
  };

  return (
    <>
      {/* 询问是否解绑弹窗 */}
      <Dialog open={showDialog.open} disableEscapeKeyDown>
        <DialogTitle>
          {isBindGoogle? t("settings.unbindGoogle"): t("settings.unbindOneDrive")}?
         </DialogTitle>
        <DialogContent sx={{ margin: 0, width: "80%" }}>
          <DialogContentText>
            {isBindGoogle? t("settings.unbindGoogleTip"): t("settings.unbindOneDriveTip")}
            </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              sx={{ color: ColorData.mainColor }}
              onClick={handleClose}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleUnbindSuccess}
            >
              {t("settings.unbind")}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
      {/* 解绑成功弹窗 */}
      <Dialog
        open={showDialog.unbindSuccess}
        className={classes.unbindDialog}
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ textAlign: "center" }}>
          <span className="icon-ic_unbind"></span>
          <br />
          {t("settings.unboundSuccess")}
        </DialogTitle>
        <DialogActions sx={{ justifyContent: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={handleOk}
          >
            {t("settings.ok")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
export default Unbind;
