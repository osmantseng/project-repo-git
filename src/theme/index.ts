import { createTheme } from '@material-ui/core/styles';
import CustomComponents from './overrides';
const theme = createTheme({
    components: CustomComponents,
    palette: {
        primary: {
            main: "#0078AE",
        },
        secondary: {
            main: '#FFFFFF'
        },
        error: {
            main: '#FF0000'
        }
    },
    typography: {
        fontFamily: ['Open Sans', 'SimHei'].join(','),
    }
});

export default theme;