import React, { useState, useEffect, useRef } from 'react'
import { Box, Avatar, FormControl, Select, MenuItem, Typography, Button, Link } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles";
import { ColorData } from "../../../helpers/const/color.const";
import { secondaryTitleStyle } from "../../../helpers/const/secondary-title.const";
import { FontSize, FontWeight } from '../../../helpers/const/font.const';
import SettingList from './SettingList';
import UpdateModal from './UpdateModal';
import i18n from '../../../react-i18next-config';
import { useTranslation } from "react-i18next";
import { languageList } from '../../../helpers/const/language-list.const';
import { IVersionData } from '../../../global';
import _ from 'lodash';
import { I18NEXTLNG } from '../../../helpers/const/storage.const';
import { SUPPORT_URL, SOFTWARE_URL, OFFICIAL_URL } from '../../../helpers/const/setting-url.const';
const { ipcRenderer } = window.electron;
const { updateHandler } = window;
const useStyles = makeStyles({
    root: {
        height: 'calc(100vh - 94px)',
        overflowY: "auto",
        overflowX: 'hidden',
        paddingBottom: '10px'
    },
    select: {
        height: 45,
        padding: '0 15px',
        '& .MuiSelect-icon': {
            position: 'absolute',
            right: '15px'
        }
    },
    borderBottom: {
        width: 220,
        borderBottom: `1px solid ${ColorData.lineColor}`,
        '& span': {
            display: 'inline-block',
            width: '100%',
            height: 45,
            lineHeight: '45px',
            padding: '0 16px'
        }
    },
    update: {
        padding: '10px 16px',
        '& button': {
            padding: '0 10px',
            textTransform: 'capitalize',
            fontSize: '13px',
            margin: '5px 0'
        }
    },
    message: {
        height: 40,
        display: 'flex',
    },
    font: {
        fontSize: FontSize.menuText,
        color: ColorData.textColor,
        fontWeight: FontWeight.sliderTextWeight
    },
    text: {
        color: ColorData.settingInfo,
        fontSize: FontSize.settingInfo
    },
    info: {
        margin: '0 16px',
        '& p': {
            margin: 0
        }
    },
    messageInfo: {
        fontSize: FontSize.sliderTextSize,
        color: ColorData.textColor,
        fontWeight: FontWeight.sliderTextWeight
    }
})

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 200,
        },
    },
};
const Settings = () => {
    const isInitialized = useRef(false);
    const { t } = useTranslation();
    const classes = useStyles();
    const [language, setLanguage] = useState("en-US");
    const [versionData, setVersionData] = useState<IVersionData>({
        currentVersion: '0.1.5',
        updateVersion: '0.1.6'
    });
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
    const [showUpdate, setShowUpdate] = useState(false);
    useEffect(() => {
        // 检查更新
        // 设置Update按钮状态
        let type = localStorage.getItem(I18NEXTLNG);
        if (type) {
            setLanguage(type)
        } else {
            //如果被清空了 那么当前语言会被设置为默认语言 en-US 
        }

        if (!isInitialized.current) {
            isInitialized.current = true;

            updateHandler.getVersionInfo().then((res) => {
                if (!_.isNil(res)) {
                    setVersionData(res)
                }
            });

            updateHandler.getIsUpdateAvailable().then((res) => {
                setIsUpdateAvailable(!!res);
            })
        }

        return () => {

        }
    }, [versionData, isUpdateAvailable]);

    const handleChange = (event: any) => {
        setLanguage(event.target.value);
        i18n.changeLanguage(event.target.value)
    };

    // 点击链接打开
    const handleJumpLink = (event: any, url?: string) => {
        event.preventDefault();
        // 向主进程发送消息，以便在默认浏览器中打开该链接
        ipcRenderer.send('open-url', event.target.href ? event.target.href : url);
    }

    return (
        <Box className={classes.root}>
            {/* 语言切换 */}
            <Box className={classes.borderBottom}>
                <Typography sx={secondaryTitleStyle}>{t('settings.language')}</Typography>
                <FormControl sx={{ width: '100%' }}>
                    <Select
                        className={classes.select}
                        variant="standard"
                        value={language}
                        onChange={handleChange}
                        MenuProps={MenuProps}
                        displayEmpty
                    >
                        {
                            languageList.map(item => (
                                <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>
            </Box>
            {/* Restore / Backup */}
            <SettingList isRestore={true} />
            <SettingList isRestore={false} />
            {/* 当前软件版本 */}
            <Box className={classes.borderBottom}>
                <Typography sx={secondaryTitleStyle}>{t('settings.currentSoftwareVersion')}</Typography>
                <span className={classes.font}>{versionData.currentVersion}</span>
            </Box>
            <Box className={classes.borderBottom}>
                <Typography sx={secondaryTitleStyle}>{t('settings.softwareUpdate')}</Typography>
                <div className={classes.update}>
                    {/* 展示软件信息，版本 */}
                    <div className={classes.message}>
                        <Avatar
                            sx={{ width: '35%', height: 36 }}
                            alt=""
                            src="./images/kensington_software_logo.png"
                            variant="square"
                        />
                        <Box display="flex" flexDirection="column">
                            <Typography sx={{ fontSize: FontSize.sliderTextSize, color: ColorData.sliderTextColor, fontWeight: FontWeight.sliderTextWeight }}>Kensington Konnect</Typography>
                            <Typography sx={{ color: ColorData.settingInfo }}>{versionData.updateVersion}</Typography>
                        </Box>
                    </div>
                    {
                        isUpdateAvailable ?
                            <p className={classes.messageInfo}>{t('settings.version')} {versionData.updateVersion} {t('settings.available')}</p> :
                            <p className={classes.messageInfo}>{t('settings.noUpdate')}.</p>
                    }
                    {/* Update按钮 */}
                    <Button disabled={!isUpdateAvailable} variant="contained" fullWidth onClick={() => setShowUpdate(true)}>{t('settings.update')}</Button>
                </div>
            </Box>
            <Box width="220px">
                <Typography sx={secondaryTitleStyle}>{t('settings.support')}</Typography>
                <div className={classes.update}>
                    <p className={classes.messageInfo}>{t('settings.supportTip')}!</p>
                    <Button variant="outlined"  onClick={(e) => handleJumpLink(e, SUPPORT_URL)} fullWidth>{t('settings.getSupport')}</Button>
                    <p className={classes.messageInfo}>{t('settings.softwareManual')}</p>
                    <Button variant="outlined" onClick={(e) =>handleJumpLink(e, SOFTWARE_URL)} fullWidth>{t('settings.openPdf')}</Button>
                </div>
                <div className={classes.info}>
                    <p className={classes.text}>
                        @2021 Kensington Computer Product Group, a division of ACCO Brands.
                        <br />
                        <Link href={OFFICIAL_URL} underline="none"
                            sx={{
                                fontSize: FontSize.settingInfo,
                                '&:hover': {
                                    color: '#003D5B'
                                }
                            }}
                            onClick={(e) => handleJumpLink(e)}>www.kensington.com</Link>
                    </p>
                </div>
            </Box>
            {/* 点击Update按钮时打开弹窗更新应用程序 */}
            {showUpdate && <UpdateModal handleClose={() => setShowUpdate(false)} />}
        </Box>
    )
}
export default Settings