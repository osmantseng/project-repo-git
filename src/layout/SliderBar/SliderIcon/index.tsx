import React from "react";
import { Badge, Tooltip } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { ColorData } from '../../../helpers/const/color.const';
import { useTranslation } from "react-i18next";
import * as _ from 'lodash';
/**
 * 側邊欄Icon及text
 */

// 父組件傳遞參數類型
type IProps = {
    iconName: string,
    menuName: string,
    selected: boolean | undefined
}
// 引入updateHandler向后台发送获取是否可以更新软件的请求
const { updateHandler } = window;
// 樣式定義
const useStyles = makeStyles({
    icon: {
        '&:hover': {
            backgroundColor: ColorData.hoverColor,
            borderRadius: 40,
        }
    },
    selected: {
        color: ColorData.mainColor,
        backgroundColor: ColorData.selectedBackgroundColor,
        borderRadius: 40
    },
    selectedText: {
        color: ColorData.mainColor
    },
    text: {
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
    },
    badge: {
        '& .MuiBadge-badge': {
            minWidth: 10, 
            height: 10, 
            borderRadius: 5, 
            top: 8, 
            right: 3
        }
    }

})

// 侧边栏图标及名称显示区
const Icon = (props: IProps) => {
    // 國際化
    const { t } = useTranslation();
    // 引用樣式
    const classes = useStyles();
    // 獲取父組件傳遞的參數
    const { iconName, menuName, selected } = props;
    // Setting圖標處的徽標是否顯示 true不顯示，false顯示
    const [invisible, setInvisible] = React.useState(true);
    React.useEffect(() => {
        // 监听检测到的软件更新事件,更改徽标显示状态
        updateHandler.getIsUpdateAvailable().then((res) => {
            if(res !== invisible) {
                setInvisible(!!res)
            }
        })
    }, [invisible])
    return (
        <>
            {
                menuName === 'Settings' ?
                    <Badge color="error" variant="dot" invisible={!invisible} className={classes.badge}>
                        <span className={`${iconName} ${classes.icon} ${selected ? classes.selected : ''}`}></span>
                    </Badge>
                    :
                    <span className={`${iconName} ${classes.icon} ${selected ? classes.selected : ''}`}></span>
            }
            <Tooltip title={<span>{t(`menu.${menuName.toLowerCase()}`)}</span>} placement="right-start">
                <span className={`${selected ? classes.selectedText : ''}`}>{_.truncate(t(`menu.${menuName.toLowerCase()}`), { length: 8 })}</span>
            </Tooltip>
        </>
    )
}
export default Icon;