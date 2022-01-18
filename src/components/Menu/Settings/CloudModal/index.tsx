import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  DialogTitle,
  List,
  ListItemButton
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { ColorData } from '../../../../helpers/const/color.const';
import { FontWeight } from '../../../../helpers/const/font.const';
import { CloudTypeEnum } from '../../../../helpers/enum/cloud-type.enum';
import { cloudEvent, CloudEvents } from '../../../../helpers/util/cloudEvent';
import LoadingDialog from '../LoadingDialog';
import BindAccount from '../BindAccount';
/**
 * 還原/備份至雲端彈窗
 */

// 父組件傳遞數據類型
type IProp = {
  setShowDialog: () => void;
  isRestore: boolean;
};

const { obsHandler } = window;
// 樣式定義
const useStyles = makeStyles({
  root: {
    '& .MuiDialogContentText-root': {
      color: ColorData.dialogText,
      marginBottom: '15px',
      fontWeight: FontWeight.dialogTextWeight
    }
  },
  content: {
    marginTop: '20px'
  },
  list: {
    '& .MuiListItemButton-root': {
      fontWeight: 500,
      padding: '5px 0',
      justifyContent: 'flex-start'
    }
  },
  text: {
    marginLeft: '5px'
  }
});
class abc{
  cloud:CloudTypeEnum=CloudTypeEnum.google
}
// 組件定義
const CloudModal = (props: IProp) => {
  const { t } = useTranslation();
  // 獲取父組件傳入的數據
  const { setShowDialog, isRestore } = props;
  // 引用樣式
  const classes = useStyles();
  // 当前绑定的账号
  const bindAccount = useRef<string>();
  // 是否展示彈窗 open: 展示選擇備份或還原至Google還是OneDrive彈窗; showBindSuccess：展示綁定賬號成功的彈窗
  const [showCloudDialog, setShowCloudDialog] = useState({
    open: true,
    showLoading: false,
    showBindSuccess: false
  });
  /**
   * 选择绑定某账号弹窗关闭事件
   */
  const handleClose = () => {
    setShowCloudDialog({
      open: false,
      showLoading: false,
      showBindSuccess: showCloudDialog.showBindSuccess
    });
    // 执行父组件中的关闭事件
    setShowDialog();
  };

  /**
   * 点击绑定某个账号
   */
   const handleBindAccount = (flag: CloudTypeEnum) => () => {
    // 绑定账号，向后台请求账号权限
    setShowCloudDialog({
      open: false,
      showLoading: true,
      showBindSuccess: false
    });

     let _isRestore = isRestore ? 'restore' : 'backup';
    obsHandler.backend
      .signInWithPopup(flag, _isRestore)
      .then((res) => {
        console.log(res);
        if (_.isNil(res)) {
          // 綁定失敗
          setShowCloudDialog({
            open: false,
            showLoading: false,
            showBindSuccess: false
          });
        } else {
          cloudEvent.emit(CloudEvents.bind, res.email, flag);
          bindAccount.current = res.email;
          setShowCloudDialog({
            open: false,
            showLoading: false,
            showBindSuccess: true
          });
        }
      })
      .catch(() => {
        console.log('signInWithPopup', 'failed');
      });
  };

  /**
   * 关闭当前绑定弹窗
   */
  const handleCloseBind = () => {
    setShowCloudDialog({
      open: false,
      showLoading: false,
      showBindSuccess: false
    });
  };
  return (
    <>
      <Dialog className={classes.root} open={showCloudDialog.open} disableEscapeKeyDown>
        <DialogTitle>
          {isRestore ? t('settings.retoreFromCloudAccount') : t('settings.backupToCloudAccount')}
        </DialogTitle>
        <DialogContent sx={{ m: 0 }}>
          <DialogContentText>
            {isRestore ? t('settings.restoreAccountTip') : t('settings.backupAccountTip')}
          </DialogContentText>
          <List className={classes.list} disablePadding>
            <ListItemButton onClick={handleBindAccount(CloudTypeEnum.google)}>
              <span className="icon-ic_googledrive">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <span key={item} className={`path${item}`}></span>
                ))}
              </span>
              <span className={classes.text}>{t('settings.bindGoogle')}</span>
            </ListItemButton>
            <ListItemButton onClick={handleBindAccount(CloudTypeEnum.oneDrive)}>
              <span className="icon-ic_onedrive">
                {[1, 2, 3, 4].map((item) => (
                  <span key={item} className={`path${item}`}></span>
                ))}
              </span>
              <span className={classes.text}>{t('settings.bindOneDrive')}</span>
            </ListItemButton>
          </List>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="primary" size="small" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
      {showCloudDialog.showLoading && <LoadingDialog />}
      {showCloudDialog.showBindSuccess && (
        <BindAccount handleClose={handleCloseBind} currentAccount={bindAccount.current} />
      )}
    </>
  );
};
export default CloudModal;
