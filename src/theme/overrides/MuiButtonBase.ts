const MuiButtonBase = {
  styleOverrides: {
    root: {
      '& .MuiButton-root': {
        textTransform: 'capitalize',
      },
      '&:hover': {
        backgroundColor: 'transparent'
      }
    }
  },
  defaultProps: {
    disableRipple: true,
    disableTouchRipple: true
  }
}
export default MuiButtonBase