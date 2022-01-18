const MuiSlider = {
    styleOverrides: {
      root: {
        width: 'calc(100% - 2px)',
        height: 3,
        marginBottom: '3px',
        padding: '0',
        '& .MuiSlider-thumb': {
            '&:hover, &.Mui-focusVisible': {
                boxShadow: '0px 0px 0px 4px rgb(0 120 174 / 16%)'
            },
            '&.Mui-active': {
                boxShadow: '0px 0px 0px 6px rgb(0 120 174 / 16%)',
            },
        },
        '& .MuiSlider-rail': {
          opacity: 1,
          backgroundColor: '#C0C0C0',
        },
        '& .Mui-disabled, &.MuiSlider-root.Mui-disabled': {
            color: '#C4C4C4'
        }
      }
    }
  }
  export default MuiSlider