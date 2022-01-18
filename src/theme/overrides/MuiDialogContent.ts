const MuiDialogContent = {
    styleOverrides: {
      root: {
        width: '80%',
        margin: '0 auto 15px',
        '& .MuiOutlinedInput-root': {
          padding: 0,
          height: '100%',
          fontWeight: 600
        },
        '& .MuiOutlinedInput-input': {
          padding: '4px 0 5px',
          fontSize: '12px'
        },
        '& .MuiTextField-root': {
            // width: '70%'
        },
        '& .MuiSelect-root': {
            width: '100%'
        },
        '& .MuiInputAdornment-root': {
           '& p': {
            fontSize: '12px',
            color: '#979797',
            fontWeight: 600
           }
        }
      }
    }
  }
  export default MuiDialogContent