import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  DialogTitle,
  Stack
} from '@material-ui/core';
import { ColorData } from '../../../../helpers/const/color.const';
import { useTranslation } from 'react-i18next';
import Unbind from '../Unbind';
/**
 * 绑定账号以后查看数据是否储存成功，可以进行解绑操作
 */
const { obsHandler } = window;
// 組件定義
const SetAccount = (props: any) => {
  // 國際化
  const { t } = useTranslation();
  // 獲取父組件傳遞的數據 handleClose關閉彈窗 isSuccessBackup是否成功备份 open是否打开弹窗
  const { isRestore, handleClose, bindAccount, isSuccessBackup, open} = props;
  // 顯示與隱藏彈窗事件 open绑定到某一账号成功弹窗 unbindDialog詢問是否解綁 unbindSuccess解綁成功
  const [showDialog, setShowDialog] = useState({ open: true, unbindDialog: false });
  // 当前是否读取设定/备份成功
  // const [isSuccessBackup, setIsSuccessBackup] = useState<null | boolean>(null);

  // const restoreOrBackupFunc = !isRestore ? obsHandler.backend.backupToCloud(): obsHandler.backend.restoreFromCloud();
  // useEffect(() => {
  //   console.log('setAccount');
  //   // 判断当前是否备份云端成功
  //   if (isRestore) {
  //     obsHandler.backend.restoreFromCloud().then(() => {
  //       setIsSuccessBackup(true);
  //     })
  //     .catch(() => {
  //       setIsSuccessBackup(false);
  //     });
  //   } else {
  //     obsHandler.backend.backupToCloud().then(() => {
  //       setIsSuccessBackup(true);
  //     })
  //     .catch(() => {
  //       setIsSuccessBackup(false);
  //     });
  //   }
  // }, []);

  /**
   * 選擇解綁事件
   */
  const handleUnbind = () => {
    setShowDialog({
      open: false,
      unbindDialog: true
    });
    handleClose();
  };

  /**
   * 解綁彈窗點擊關閉事件
   */
  const handleCloseDialog = () => {
    setShowDialog({
      open: false,
      unbindDialog: false
    });
    handleClose();
  };

  /**
   * 設置當前彈窗標題
   */
  const setAccountTitle = () => {
    if (isSuccessBackup) {
      return isRestore ? t('settings.restoreSuccess') : t('settings.backupSuccess');
    } else {
      return isRestore ? t('settings.restoreError') : t('settings.backupError');
    }
  };

  /**
   * 設置當前彈窗標題下方提示
   */
  const setAccountTip = () => {
    if (isSuccessBackup) {
      return `${t('settings.boundTo')} ${bindAccount}`;
    } else {
      return isRestore ? t('settings.restoreErrorTip') : t('settings.backupErrorTip');
    }
  };

  return (
    <>
      <Dialog open={open} disableEscapeKeyDown>
        <DialogTitle>{setAccountTitle()}</DialogTitle>
        <DialogContent sx={{ margin: 0 }}>
          <DialogContentText>{setAccountTip()}</DialogContentText>
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
              {t('settings.unbind')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              sx={{ marginLeft: '5px' }}
              onClick={handleClose}
            >
              {t('settings.ok')}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
      {showDialog.unbindDialog && <Unbind handleClose={handleCloseDialog} />}
    </>
  );
};
export default SetAccount;
