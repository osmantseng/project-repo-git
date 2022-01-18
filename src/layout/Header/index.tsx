import React, { useEffect } from "react";
import { IconButton, Avatar } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import {
    MinimizeIcon,
    MaximizeIcon,
    CloseIcon,
    RestoreIcon
} from "../../icons";
import _ from "lodash";
import { Box } from "@material-ui/system";

import Preset from "./Preset";
import { GUIDE } from "../../helpers/const/storage.const";
import { konnectUIEvent, KonnectUIEvents } from "../../helpers/util/uiEvent";
// 向主进程发送消息的ipcRenderer
const { ipcRenderer } = window.electron;
// 样式定义
const useStyles = makeStyles({
    avatar: {
        transform: 'translate(-50%, -50%)',
        top: '50%',
        left: '50%'
    },
    logo: {
        position: 'absolute',
        left: 10,
        top: 2,
    },
    icon: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'end'
    }
});

/**
 * Header组件
 */
const Header = () => {
    const classes = useStyles();
    // 设置显示restore图标还是max图标
    const [showRestore, setShowRestore] = React.useState(false);
    const [showPreset, setShowPreset] = React.useState(
        _.isNil(localStorage.getItem(GUIDE)) ? false : true
    );
    // window关闭，缩小，放大事件
    const setWin = (type: string) => {
        ipcRenderer.send(type);
    };
    const mainWindowMax = () => {
        setShowRestore(true);
    }
    const mainWindowUnmax = () => {
        setShowRestore(false);
    }

    // set window the max icon or restore icon
    useEffect(() => {
        let removeMaxListener = ipcRenderer.on("main-window-max", mainWindowMax);
        let removeUnmaxListener = ipcRenderer.on("main-window-unmax", mainWindowUnmax);
        konnectUIEvent.on(KonnectUIEvents.GuideShowPreset, setShowPreset)
        return () => {
            if (_.isFunction(removeMaxListener)) {
                removeMaxListener();
            }
            if (_.isFunction(removeUnmaxListener)) {
                removeUnmaxListener();
            }
            konnectUIEvent.removeListener(KonnectUIEvents.GuideShowPreset, setShowPreset)
        }
    });
    return (
        <>
            <Avatar
                className={classes.avatar}
                sx={{ position: 'absolute', 
                width: 36,
                height: 36}}
                alt=""
                src="./images/kensington_software_logo.png"
            />
            <div className={classes.logo}><img width="50" height="46" src="./images/kensington_logo.svg" alt=""/></div>
            <Box className={classes.icon}>
                <Box className='select-mode' sx={{display: showPreset ? 'flex' : 'none'}}>
                    <Preset />
                </Box>
                <IconButton aria-label="minimize" size="small" onClick={() => setWin('min')} disableTouchRipple>
                    <MinimizeIcon />
                </IconButton>
                <IconButton aria-label="max" size="small" onClick={() => setWin('max')} disableTouchRipple>
                    {showRestore ? <RestoreIcon /> : <MaximizeIcon />}
                </IconButton>
                <IconButton aria-label="close" size="small" onClick={() => setWin('close')} disableTouchRipple>
                    <CloseIcon />
                </IconButton>
            </Box>
        </>
    );
}
export default Header;