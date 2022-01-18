import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  DialogTitle,
  Stack,
} from "@material-ui/core";
import { useTranslation } from "react-i18next";
import { ColorData } from "../../../../helpers/const/color.const";
import Unbind from "../Unbind";
/**
 * 綁定雲端賬號成功/解綁彈窗
 */
const BindAccount = (props: any) => {
  // 國際化
  const { t } = useTranslation();
  // 獲取父組件傳遞的數據 handleClose關閉彈窗, currentAccount当前绑定的账号
  const { handleClose, currentAccount } = props;
  // 顯示與隱藏彈窗事件 open绑定到某一账号成功弹窗 unbindDialog詢問是否解綁 unbindSuccess解綁成功
  const [showDialog, setShowDialog] = useState({
    open: true,
    unbindDialog: false,
  });

  /**
   * 選擇解綁事件
   */
  const handleUnbind = () => {
    setShowDialog({
      open: false,
      unbindDialog: true,
    });
  };

  /**
   * 解綁彈窗點擊關閉事件
   */
  const handleCloseDialog = () => {
    setShowDialog({
      open: false,
      unbindDialog: false,
    });
  };

  /**
   * 绑定成功关闭弹窗
   */
  const handleBindSuccess = () => {
    handleClose();
  };
  return (
    <>
      <Dialog open={showDialog.open} disableEscapeKeyDown>
        <DialogTitle>{t("settings.boundSuccess")}</DialogTitle>
        <DialogContent sx={{ margin: 0 }}>
          <DialogContentText>
            {t("settings.boundTo")} {currentAccount}.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              sx={{ color: ColorData.mainColor }}
              onClick={handleUnbind}
            >
              {t("settings.unbind")}
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              sx={{ marginLeft: "5px" }}
              onClick={handleBindSuccess}
            >
              {t("settings.ok")}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
      {showDialog.unbindDialog && <Unbind handleClose={handleCloseDialog} />}
    </>
  );
};
export default BindAccount;
