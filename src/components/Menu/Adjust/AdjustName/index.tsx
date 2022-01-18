import { makeStyles } from "@material-ui/styles";
import { ColorData } from '../../../../helpers/const/color.const';
import { FontSize, FontWeight } from '../../../../helpers/const/font.const';
import { useTranslation } from "react-i18next";
const useStyles = makeStyles({
    title: {
        display: 'flex'
    },
    name: {
        color: ColorData.textColor,
        fontSize: FontSize.menuText,
        fontWeight: FontWeight.controlNameWeight,
        margin: '2px 0'
    },
    icon: {
        fontSize: FontSize.menuIcon,
        paddingRight: '2px'
    },
})
const AdjustName = (props: { iconName: string; name: string }) => {
    const { t } = useTranslation();
    const classes = useStyles();
    const { iconName, name } = props;
    return (
        <div className={classes.title}>
            <span className={`${iconName} ${classes.icon}`}></span>
            <span className={classes.name}>{t(`adjust.${name}`)}</span>
        </div>
    )
}

export default AdjustName