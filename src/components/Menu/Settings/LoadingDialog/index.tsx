import {
  Dialog,
  DialogTitle,
  CircularProgress
} from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { ColorData } from '../../../../helpers/const/color.const';
/**
 * Loading彈窗
 */
const LoadingDialog = () => {
  const { t } = useTranslation();
  return (
    <Dialog
      open={true}
      sx={{
        width: 420,
        '& .MuiDialogTitle-root': {
          overflowY: 'hidden',
          height: 195
        }
      }}
    >
      <DialogTitle
        sx={{
          margin: '0 auto',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}
      >
        <CircularProgress sx={{ color: ColorData.mainColor, mb: 2.5 }} size={40} />
        {t('settings.loading')}
      </DialogTitle>
    </Dialog>
  );
};
export default LoadingDialog;
