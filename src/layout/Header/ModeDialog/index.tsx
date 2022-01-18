import React, { useState, useEffect } from "react";
import {
    Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, IconButton, InputAdornment, Stack,
    List, ListItemButton, ListItemText, ListItem, DialogContentText
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { FontSize } from "../../../helpers/const/font.const";
import { ModeData } from "../../../helpers/util/preset";
import { ColorData } from "../../../helpers/const/color.const";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import { PresetOperateType } from "../../../helpers/enum/preset-operate-type.enum";
const { obsHandler } = window;

type IProps = {
    modeData: ModeData[],
    currentCamera: string | undefined,
    closeDialog: () => void,
    changeData: (currentData: any, type: string) => void,
    currentSelectedMode: string;
}
// 样式定义
const useStyles = makeStyles({
    input: {
        display: 'flex',
        marginBottom: '10px',
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        fontSize: FontSize.nameInfo,
        marginTop: '20px',
        fontWeight: 400,
    },
    select: {
        '& .MuiListItemSecondaryAction-root': {
            color: '#ffffff',
            top: '55%',
            '& span': {
                fontSize: '24px'
            }
        }
    },
    listItem: {
        width: 240,
        height: 42,
        borderRadius: '4px',
        fontWeight: 600,
        margin: '15px auto',
        flexWrap: 'wrap',
        '& .MuiListItemButton-root': {
            padding: '8px 14px'
        },
        '& .MuiTypography-root': {
            fontSize: '12px',
            fontWeight: 600,
        }
    },
    camera: {
        fontSize: '12px',
        fontWeight: 600,
        marginRight: '8px'
    }
})

// 删除按钮样式
const deleteBtnStyles = {
    width: 42,
    height: 42,
    color: 'white',
    backgroundColor: ColorData.mainColor,
    marginLeft: '5px',
    marginTop: '3px',
    borderRadius: '8px',
    '&:hover': {
        backgroundColor: ColorData.buttonHover
    },
    '&.Mui-disabled': {
        backgroundColor: ColorData.deleteBtnBackground,
    }
}

/**
 * 弹窗按钮组件
 */
const BtnGroup = (props: any) => {
    const { t } = useTranslation();
    const { handleClose, handleSave, disabled } = props;
    return (
        <Stack direction="row" spacing={2}>
            <Button variant="outlined"
                color="primary"
                size="small"
                sx={{ color: ColorData.mainColor }}
                onClick={handleClose}>
                {t('common.cancel')}
            </Button>
            {/* 当输入的名称超过24个字符或输入的名称为空(名称全为空格)时Save按钮不可点击 */}
            <Button variant="contained"
                color="primary"
                size="small"
                onClick={handleSave}
                disabled={disabled}> {t('common.save')}</Button>
        </Stack>
    )
}
/**
 * 弹窗标题组件
 */
const Title = (props: any) => {
    const { t } = useTranslation();
    return (
        <>
            <DialogTitle sx={{ fontSize: '14px' }}>
                {t(`preset.${props.title}`)}
                {
                    !(props.tip === "editTips" && props.dataLength === 0)&&
                    <DialogContentText sx={{ color: ColorData.settingInfo, marginTop: '5px' }}>
                    {t(`preset.${props.tip}`)}
                    </DialogContentText>
                }
            </DialogTitle>

        </>
    )
}

/**
 * input框中的label组件
 */
const CurrentLabel = (props: any) => {
    return (
        <InputAdornment position="start" sx={{ '& p': { marginLeft: '14px' } }}>
            {props.currentCamera}
        </InputAdornment>
    )
}

/**
 * mode弹窗
 */
const ModeDialog = (props: IProps) => {
    const { t } = useTranslation();
    // modeData当前存储的数据
    const { modeData, currentSelectedMode, currentCamera, closeDialog, changeData } = props;
    const classes = useStyles();
    // 设置展示哪个弹窗
    const [showDialog, setShowDialog] = useState({
        add: modeData.length === 0,
        select: modeData.length !== 0,
        edit: false,
    });
    // 当前所选的mode name
    // const [selectedMode, setSelectedMode] = useState(currentSelectedMode);
    const [selectedModeId, setSelectedModeId] = useState(currentSelectedMode);
    // 当前添加的mode name
    const [addMode, setAddMode] = useState({
        addName: '',
        // 控制是否显示error文本
        error: false
    });
    // 当前选择/编辑状态下的mode数据
    const [selectModeData, setSelectModeData] = useState(modeData);
    const [editModeData, setEditModeData] = useState(modeData);
    // 当前编辑状态下 error info的显示，同时控制save按钮是否可点击
    const [errorInfo, setErrorInfo] = useState(false);
    // 未做修改时不可点击
    const [editNotSave, setEditNotSave] = useState(true);
    // 保存移出掉的Id
    const [deleteModeIds, setDeleteModeIds] = useState([] as string[]);
    useEffect(() => {
        if (selectModeData.length !== 0 && selectedModeId === 'Default') {
            setSelectedModeId(selectModeData[0].id)
        }
    })

    // Select mode弹窗中的下拉选框改变事件
    const handleModeChange = (currentMode: ModeData) => {
        setSelectedModeId(currentMode.id);
    }
    // Select mode弹窗中的edit按钮点击事件
    const handleEdit = () => {
        setEditModeData(selectModeData);
        setShowDialog({
            add: false,
            select: false,
            edit: true,
        })
    }
    // 弹窗关闭事件
    const handleClose = () => {
        // 從Edit頁面 或者 從select進入的add彈窗 點擊Cancel會回到select
        setShowDialog({
            add: false,
            select: showDialog.edit,
            edit: false,
        });
        // 此时编辑下存在的error信息都消失
        setErrorInfo(false);
        !showDialog.edit && closeDialog();
    };
    // 保存数据，关闭select弹窗
    const handleSave = () => {
        if (showDialog.edit) {
            // Edit点击保存时需要判断当前mode数据是否为空，为空返回add dialog, 不为空返回 select dialog
            setShowDialog({
                add: editModeData.length === 0,
                select: editModeData.length !== 0,
                edit: false,
            })
            // 需要设置返回到select dialog页面时，默认选择第一条数据
            setSelectModeData(editModeData);
            if (editModeData.length !== 0) {
                const selectedId = editModeData.find(item => item.id === selectedModeId);
                if (_.isNil(selectedId)) {
                    setSelectedModeId(editModeData[0].id);
                    setAddMode({
                        addName: '',
                        error: false
                    })
                }
            }
            // 判断数据是否有修改，如果有修改再去改变底层的数据
            if (!_.isEqual(modeData, editModeData)) {
                if (deleteModeIds.length !== 0) {
                    obsHandler.preset.removePreset(0, deleteModeIds);
                }
                changeData(editModeData, PresetOperateType.edit);
            }
            // Edit点击保存后下次进来未做修改Apply不可点击
            setEditNotSave(true);
        } else {
            // 对于add dialog和select dialog弹窗点击保存直接关闭按钮
            // 通知父组件当前新建或选择的mode name
            closeDialog();
            // 对于新建的mode
            showDialog.add && changeData(addMode.addName, PresetOperateType.add);
            // 对于select的mode
            if (showDialog.select) {
                if (selectModeData.some(item => item.id === selectedModeId)) {
                    changeData(selectedModeId, PresetOperateType.select);
                } else {
                    changeData(addMode.addName, PresetOperateType.add);
                }
            }
        }
    }

    // Add mode弹窗中输入mode name变化事件
    const handleAddModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedModeId(e.target.value + '1')
        const hasRepeatName = (!_.isNil(selectModeData) && selectModeData.some(item => item.name === e.target.value)) || e.target.value === "Default";
        setAddMode({
            addName: e.target.value,
            error: hasRepeatName,
        })
    }

    // Add mode弹窗中输入框失去焦点时判断此时名称是否为空，若为空显示提示信息
    const handleAddBlur = () => {
        if (addMode.addName === '') {
            setAddMode({
                addName: '',
                error: true,
            })
        }
    }
    // 当edit mode时编辑mode name
    const handleEditModeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, id: string) => {
        // 是否有同名的mode
        const hasRepeatName = editModeData.some(item => item.name === e.target.value) || e.target.value === "Default";
        const newData = editModeData.map(item => {
            return {
                ...item,
                name: item.id === id ? e.target.value : item.name,
                error: item.id === id ? (e.target.value === '' || hasRepeatName) : (hasRepeatName && item.error),
            }
        })
        setEditModeData(newData)
        // 每次editModeData发生改变时都需要设置save按钮的状态
        setErrorInfo(newData.some(item => item.error))
        setEditNotSave(false);
    }

    // 当edit mode时删除mode操作
    const handleDeleteMode = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, id: string) => {
        const newData = editModeData.filter(item => {
            return item.id !== id;
        });
        setEditModeData(newData)
        // 每次editModeData发生改变时都需要设置save按钮的状态
        setErrorInfo(newData.some(item => item.error))
        setEditNotSave(false);
        let modeIds = deleteModeIds;
        modeIds.push(id);
        setDeleteModeIds(modeIds);
    }


    // 当edit mode时获取失去焦点给input取消Label
    const handleBlur = () => {
        const newData = editModeData.map(item => {
            return { ...item, label: '' }
        })
        setEditModeData(newData)
    }
    // 当edit mode时给当前所选的input框添加Label
    const handleInputClick = (e: any, id: string) => {
        const newData = editModeData.map(item => {
            return { ...item, label: item.id === id ? 'name' : '' }
        })
        setEditModeData(newData)
    }

    const handleAddFocus = (e: any) => {
        setSelectedModeId(e.target.value);
    }
    /**
     * 展示Select mode dialog
     */
    if (showDialog.select) {
        const isAdd = !selectModeData.some(item => item.id === selectedModeId);
        return (
            <>
                <Dialog open={true} >
                    <Title title="saveAdjustments" tip="saveTips"/>
                    <DialogContent>
                        <List className={classes.select} disablePadding>
                            {
                                selectModeData.map(item => (
                                    <ListItem
                                        sx={{
                                            backgroundColor: selectedModeId === item.id ? ColorData.mainColor : '#FFFFFF',
                                            border: selectedModeId === item.id ? 'none' : '1px solid #979797',
                                            color: selectedModeId === item.id ? '#FFFFFF' : '#605E5C',
                                        }}
                                        className={classes.listItem}
                                        key={item.id}
                                        secondaryAction={
                                            selectedModeId === item.id && <span className="icon-ic_apply"></span>
                                        }
                                        disablePadding
                                    >
                                        <ListItemButton onClick={() => handleModeChange(item)}>
                                            <ListItemText>
                                                <span className={classes.camera} style={{ color: selectedModeId === item.id ? '#FFFFFF' : '#979797' }}>{currentCamera}</span>
                                                {item.name}
                                            </ListItemText>
                                        </ListItemButton>
                                    </ListItem>
                                ))
                            }
                            {
                                selectModeData.length < 4 && <ListItem className={classes.listItem} disablePadding>
                                    <TextField
                                        sx={{
                                            height: 42, width: 240,
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: isAdd ? ColorData.mainColor : '#979797',
                                                borderWidth: isAdd ? '2px' : '1px',
                                            },
                                            '& .MuiInputLabel-root': {
                                                color: isAdd && !addMode.error ? ColorData.mainColor : ''
                                            }
                                        }}
                                        size="small"
                                        label={isAdd && 'Name'}
                                        error={addMode.error}
                                        value={addMode.addName}
                                        onChange={handleAddModeChange}
                                        onFocus={handleAddFocus}
                                        onBlur={handleAddBlur}
                                        inputProps={{ maxLength: 17 }}
                                        placeholder={t('preset.createOne')}
                                        InputProps={{
                                            startAdornment:
                                                <CurrentLabel currentCamera={currentCamera} />
                                        }}
                                    />
                                    <Box className={classes.info} sx={{ color: addMode.error ? ColorData.errorColor : ColorData.settingInfo, marginLeft: '14px' }}>
                                        {!addMode.error ? t('preset.correctInfo') : t('preset.errorInfo')}
                                    </Box>
                                </ListItem>
                            }
                        </List>
                    </DialogContent>
                    <DialogActions sx={{ justifyContent: 'space-between' }}>
                        <Button
                            sx={{ color: ColorData.mainColor }}
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={handleEdit}>{t('preset.edit')}</Button>
                        <BtnGroup handleClose={handleClose} handleSave={handleSave} disabled={selectedModeId === ''} />
                    </DialogActions>
                </Dialog>
            </>
        )
    } else if (showDialog.edit) {
        /**
         * 修改mode弹窗
         */
        return (
            <>
                <Dialog open={true} >
                    <Title title="editPresetMode" tip="editTips" dataLength={editModeData.length} />
                    {
                            editModeData.length !== 0 ?
                            <DialogContent>
                                <Box>
                                    {editModeData.map(item => (
                                        <div className={classes.input} key={item.id}>
                                            <TextField
                                                key={item.id}
                                                sx={{ height: 42 }}
                                                margin="dense"
                                                size="small"
                                                error={item.error}
                                                label={item.label ? t(`preset.${item.label}`) : item.label}
                                                value={item.name}
                                                onChange={(e) => handleEditModeChange(e, item.id)}
                                                onBlur={handleBlur}
                                                onClick={(e) => handleInputClick(e, item.id)}
                                                inputProps={{ maxLength: 17 }}
                                                InputProps={{
                                                    startAdornment:
                                                        <CurrentLabel currentCamera={currentCamera} />
                                                }}
                                            />
                                            <IconButton sx={deleteBtnStyles}
                                                onClick={(e) => handleDeleteMode(e, item.id)}
                                                disabled={item.id === currentSelectedMode}
                                            >
                                                <span style={{ fontSize: '32px' }} className="icon-ic_delete"></span>
                                            </IconButton>
                                        </div>
                                    ))
                                    }
                                    <Box className={classes.info} sx={{ color: !errorInfo ? ColorData.settingInfo : ColorData.errorColor, marginLeft: '67px' }}>
                                        {!errorInfo ? t('preset.correctInfo') : t('preset.errorInfo')}
                                    </Box>
                                </Box>
                            </DialogContent>
                            :
                            <DialogContentText sx={{mb: 3, ml: 3}}>{t('preset.deleteAllTip')}.</DialogContentText>
                    }

                    <DialogActions>
                        <Stack direction="row" spacing={2}>
                            <Button variant="outlined"
                                color="primary"
                                size="small"
                                sx={{ color: ColorData.mainColor }}
                                onClick={handleClose}>
                                {t('common.cancel')}
                            </Button>
                            <Button variant="contained"
                                color="primary"
                                size="small"
                                onClick={handleSave}
                                disabled={errorInfo || editModeData.some(item => item.name.trim() === '') || editNotSave}
                            > {t('common.apply')}</Button>
                        </Stack>
                    </DialogActions>
                </Dialog>
            </>
        )
    } else {
        /**
         * 新增mode弹窗
         */
        return (
            <>
                <Dialog open={true}>
                    <DialogTitle sx={{ fontSize: '14px' }}>{t('preset.saveAdjustments')}</DialogTitle>
                    <DialogContent>
                        <Box className={classes.input} sx={{ marginTop: '15px', marginBottom: '0' }}>
                            <TextField
                                autoFocus
                                label={t('preset.name')}
                                sx={{ height: 42, width: 240 }}
                                size="small"
                                error={addMode.error}
                                value={addMode.addName}
                                onChange={handleAddModeChange}
                                onBlur={handleAddBlur}
                                inputProps={{ maxLength: 17 }}
                                placeholder={t('preset.createOne')}
                                InputProps={{
                                    startAdornment:
                                        <CurrentLabel currentCamera={currentCamera} />
                                }}
                            />
                        </Box>
                        <Box className={classes.info} sx={{ color: addMode.error ? ColorData.errorColor : ColorData.settingInfo, marginLeft: '64px' }}>
                            {!addMode.error ? t('preset.correctInfo') : t('preset.errorInfo')}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <BtnGroup handleClose={handleClose}
                            handleSave={handleSave}
                            disabled={addMode.error || addMode.addName.trim() === ''} />
                    </DialogActions>
                </Dialog>
            </>
        )
    }
}
export default ModeDialog