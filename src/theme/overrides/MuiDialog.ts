import { FontSize, FontWeight } from "../../helpers/const/font.const"
const MuiDialog = {
    styleOverrides: {
      root: {
        width: 550,
        margin: '0 auto',
        '& .MuiDialog-paper': {
            width: '100%',
            borderRadius: '8px'
        },
        '& .MuiDialogTitle-root' : {
          fontSize:  FontSize.dialogTitle,
          fontWeight: FontWeight.dialogTitleWeight
        },
        '& .MuiDialogContent-root': {
            overflowY: 'visible',
        },
        '& .MuiDialogActions-root': {
          padding: '15px',
          '& button': {
            width: 85,
            height: 26,
            fontWeight: 600,
            borderRadius: '4px',
            textTransform: 'capitalize',
            fontSize: '12px'
          }
        }
      }
    }
  }
  export default MuiDialog