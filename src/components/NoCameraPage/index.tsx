import { Box } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { useTranslation } from "react-i18next";
/* 没有Camera时，video区域展示内容 */
const useStyles = makeStyles({
    root: {
        width: "100%",
        height: "100%",
        background: "#ebebeb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
    },
    tip: {
        width: '17em',
        marginTop: '10px'
    }
})
const NoCameraPage = () => {
    const { t } = useTranslation();
    const classes = useStyles();
    return (
        <Box className={classes.root}>
            <img
                src="./images/graphic_empty_state.png"
                srcSet="./images/graphic_empty_state.png"
                alt="No camera found."
                loading="lazy"
            />
            <div className={classes.tip}>
                {t('device.noCameraInfo')}
            </div>
        </Box>
    )
}
export default NoCameraPage