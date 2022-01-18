import React, { useRef, useState } from "react";
import { Typography } from "@material-ui/core";
import { secondaryTitleStyle } from '../../../helpers/const/secondary-title.const';
import OutputList from './OutputList';
import { INumberOptionUI } from "../../../global";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import { konnectUIEvent, KonnectUIEvents } from "../../../helpers/util/uiEvent";
const { obsHandler } = window;

/* Output菜单内容 */
const Output = () => {
    const { t } = useTranslation();
    const frameDataChanged = useRef(false);
    const [frameData, setFrameData] = useState([] as INumberOptionUI[]);
    const resolutionDataChanged = useRef(false);
    const [resolutionData, setResolutionData] = useState([] as INumberOptionUI[]);
    /* const [data, setData] = useState({
        resolutionData: ResolutionData,
        frameData: FrameData
    }); */
    // Resolution Frame共用一个单选框勾选改变事件 
    // currentDataItem 当前所选数据 isFrame 区分当前修改的单选框是Resolution还是Frame
    /* const handleChange = (currentDataItem: any, isFrame: boolean) => {
        //const currentData = isFrame ? data.frameData : data.resolutionData;
        const currentData = data.resolutionData;
        const newData = currentData.map((item: any) => {
            return {...item, isChecked: item.name === currentDataItem.name}
        })
        setData({
            resolutionData: isFrame ? data.resolutionData : newData,
            //frameData: isFrame ? newData : data.frameData,
        })
    } */

    const compareResolutionData = (newData: INumberOptionUI[]) => {
        // 檢查是否需要更新
        if (
            newData.length !== frameData.length ||
            _.differenceWith(frameData, newData, _.isEqual).length > 0
        ) {
            setResolutionData(newData);
            // 向Ratio发出改变Output resolution值的事件
            konnectUIEvent.emit(KonnectUIEvents.ChangeResolution);
        }
    }

    const handleResolutionChange = (tragetItem: INumberOptionUI) => {
        console.log("handleResolutionChange", tragetItem);
        const newData = resolutionData.map((item) => {
            return { ...item, isChecked: item.name === tragetItem.name } as INumberOptionUI;
        });
        resolutionDataChanged.current = true;
        setResolutionData(newData);
    }

    const compareFrameData = (newData: INumberOptionUI[]) => {
        // 檢查是否需要更新
        if (
            newData.length !== frameData.length ||
            _.differenceWith(frameData, newData, _.isEqual).length > 0
        ) {
            setFrameData(newData);
        }
    }

    const handleFrameChange = (tragetItem: INumberOptionUI) => {
        console.log("handleFrameChange", tragetItem);
        const newData = frameData.map((item) => {
            return { ...item, isChecked: item.name === tragetItem.name } as INumberOptionUI;
        });
        frameDataChanged.current = true;
        setFrameData(newData);
    }

    React.useEffect(() => {
        if (resolutionData.length === 0) {
            // 獲取Filter列表
            obsHandler.output.getOutputResolutionOptions().then((newData) => {
                compareResolutionData(newData);
            });
        }
        else if (resolutionDataChanged.current) {
            resolutionDataChanged.current = false;
            let selectedResolutionOption = _.find(resolutionData, { "isChecked": true });
            if (!_.isNil(selectedResolutionOption)) {
                obsHandler.backend.save();
                obsHandler.output.setOutputResolution(selectedResolutionOption.value).then((newData) => {
                    compareResolutionData(newData);
                });
            }
        }

        if (frameData.length === 0) {
            // 獲取Filter列表
            obsHandler.output.getOutputFrameRateOptions().then((newData) => {
                compareFrameData(newData);
            });
        }
        else if (frameDataChanged.current) {
            frameDataChanged.current = false;
            let selectedFrameOption = _.find(frameData, { "isChecked": true });
            if (!_.isNil(selectedFrameOption)) {
                obsHandler.backend.save();
                obsHandler.output.setOutputFrameRate(selectedFrameOption.value).then((newData) => {
                    compareFrameData(newData);
                });
            }
        }
    }, [frameData, resolutionData]);

    return (
        <>
            <Typography sx={secondaryTitleStyle}>{t('output.resolution')}</Typography>
            <OutputList data={resolutionData} handleChange={handleResolutionChange} isFrame={false}/>
            <Typography sx={secondaryTitleStyle}>{t('output.frameRate')}</Typography>
            <OutputList data={frameData} handleChange={handleFrameChange} isFrame={true}/>
        </>
    )
}
export default Output