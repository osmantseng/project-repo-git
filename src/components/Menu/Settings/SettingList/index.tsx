import { useState, useEffect, useRef } from 'react';
import { Box, Typography, List, ListItem, ListItemButton, ListItemText } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { secondaryTitleStyle } from '../../../../helpers/const/secondary-title.const';
import { ArrowIcon } from '../../../../icons';
import { ColorData } from '../../../../helpers/const/color.const';
import { FontSize, FontWeight } from '../../../../helpers/const/font.const';
import CloudModal from '../CloudModal';
import SetAccount from '../SetAccount';
import LoadingDialog from '../LoadingDialog';
import { cloudEvent, CloudEvents } from '../../../../helpers/util/cloudEvent';
import { CloudTypeEnum } from '../../../../helpers/enum/cloud-type.enum';
//import { ECloudBackupProvider } from "../../../../global";

/**
 * Restore/Backup的兩個選擇項
 */
const { obsHandler } = window;
// 樣式定義
const useStyles = makeStyles({
  listItem: {
    width: 220,
    padding: '0 15px',
    fontSize: FontSize.menuText,
    color: ColorData.textColor,
    fontWeight: FontWeight.sliderTextWeight
  }
});

// SettingList組件
const SettingList = (props: { isRestore: boolean }) => {
  const isInitialized = useRef(false);
  // 國際化
  const { t } = useTranslation();
  // 引入樣式定義
  const classes = useStyles();
  // 父組件傳遞的判斷是restore還是backup，true: Restore
  const { isRestore } = props;
  // 是否展示From/To cloud彈窗
  const [showDialog, setShowDialog] = useState(false);
  // 當前綁定的賬號名稱
  const [bindAccount, setBindAccount] = useState<string>();
  const [backupProvider, setBackupProvider] = useState<CloudTypeEnum>();
  const [showSuccessorError, setShowSuccessOrError] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  // 当前是否读取设定/备份成功
  const [isSuccessBackup, setIsSuccessBackup] = useState<boolean>(true);
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      // 獲取當前備份或讀取賬號的提供者，res: google/one drive
      obsHandler.backend.getCloudBackupProvider().then((res) => {
        setBackupProvider(res);
        if (!_.isNil(res)) {
          // 獲取當前的雲端賬號信息
          obsHandler.backend.getCloudUserInfo().then((res) => {
            if (!_.isNil(res)) {
              setBindAccount(res.email);
            }
          });
        }
      });
    }
    cloudEvent.on(CloudEvents.bind, handleBindAccount);
    cloudEvent.on(CloudEvents.unbind, handleUnbindAccount);
    return () => {
      cloudEvent.removeListener(CloudEvents.unbind, handleUnbindAccount);
      cloudEvent.removeListener(CloudEvents.bind, handleBindAccount);
    };
  }, [bindAccount]);

  /**
   * 點擊選擇備份或讀取事件
   * value： true 選擇為Cloud false 選擇為Local
   */
  const handleClick = (value: boolean) => () => {
    if (value) {
      if (_.isNil(backupProvider) && _.isNil(bindAccount)) {
        setShowDialog((showDialog) => !showDialog);
      } else {
        setShowLoading(true);
        let restoreOrBackupFunc = !isRestore ? obsHandler.backend.backupToCloud() : obsHandler.backend.restoreFromCloud();
        // 判断当前是否备份云端成功
        restoreOrBackupFunc
          .then(() => {
            isShowSetAccount(true);
          })
          .catch(() => {
            isShowSetAccount(false);
          });
      }
    } else {
      if (isRestore) {
        obsHandler.backend.restoreFromLocal().then((result) => {
          // 讀取是否成功?
        });
      } else {
        obsHandler.backend.backupToLocal().then((result) => {
          // 儲存是否成功?
        });
      }
    }
  };

  /**
   * 控制loading以及已经绑定账号的弹窗显示，是否备份/读取成功的值
   * @param success 备份成功true
   */
  const isShowSetAccount = (success: boolean) => {
    setShowSuccessOrError(true);
    setShowLoading(false);
    setIsSuccessBackup(success);
  }
  /**
   * 綁定賬號
   * @param accountName  當前綁定賬號的名稱
   * @param backupProvider 綁定的賬號來源 google/one drive
   */
  const handleBindAccount = (accountName: string, backupProvider: CloudTypeEnum) => {
    setBindAccount(accountName);
    setBackupProvider(backupProvider);
  };

  /**
   * 解绑账号
   */
  const handleUnbindAccount = () => {
    setBindAccount(undefined);
    setBackupProvider(undefined);
  };
  return (
    <>
      <Typography sx={secondaryTitleStyle}>
        {isRestore ? t('settings.restoreSetting') : t('settings.backupSetting')}
      </Typography>
      <List disablePadding>
        <ListItem divider disablePadding className={classes.listItem}>
          <ListItemButton disableGutters disableTouchRipple onClick={handleClick(false)}>
            <ListItemText primary={isRestore ? t('settings.fromLocal') : t('settings.toLocal')} />
            <ArrowIcon />
          </ListItemButton>
        </ListItem>
        <ListItem divider disablePadding className={classes.listItem}>
          <ListItemButton disableGutters disableTouchRipple onClick={handleClick(true)}>
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                flexDirection: 'column'
              }}
            >
              <ListItemText primary={isRestore ? t('settings.fromCloud') : t('settings.toCloud')} />
              <Typography variant="body1" color="primary">
                {bindAccount}
              </Typography>
            </Box>
            <ArrowIcon />
          </ListItemButton>
        </ListItem>
      </List>
      {/* 没有账号绑定时显示 */}
      {showDialog && (
        <CloudModal setShowDialog={() => setShowDialog(false)} isRestore={isRestore} />
      )}
      {/* 已绑定账号时显示 */}
        <SetAccount
          open={showSuccessorError}
          isRestore={isRestore}
          handleClose={() => setShowSuccessOrError(false)}
          bindAccount={bindAccount}
          isSuccessBackup={isSuccessBackup}
        />
      {/* {showSuccessorError && (
        <SetAccount
          isRestore={isRestore}
          handleClose={() => setShowSuccessOrError(false)}
          bindAccount={bindAccount}
        />
      )} */}
      {/* 已綁定賬號時需要先展示loading彈窗 */}
      {showLoading && <LoadingDialog />}
    </>
  );
};
export default SettingList;
