import { Dictionary } from "lodash";
import AdjustData from "../util/adjust-data-type"
// General部分Adjust数据
const adjustList: AdjustData[] = [
    { iconName: 'icon-ic_brightness', name: 'Brightness', value: 0, auto: false },
    { iconName: 'icon-ic_contrast', name: 'Contrast', value: 0, auto: false },
    { iconName: 'icon-ic_saturation', name: 'Saturation', value: 0, auto: false }
]
// Advance部分Adjust数据
const adjustAdvanceList: AdjustData[] = [
    { iconName: 'icon-ic_lowlightcomp', name: 'Lowlight Comp', value: 0, auto: false },
    { iconName: 'icon-ic_backlightcomp', name: 'Backlight', value: 0, auto: false },
    { iconName: 'icon-ic_white_balance', name: 'White Balance', value: 0, auto: false },
    { iconName: 'icon-ic_exposure', name: 'Exposure', value: 0, auto: false },
    { iconName: 'icon-ic_sharpness', name: 'Sharpness', value: 0, auto: false },
    { iconName: 'icon-ic_hue', name: 'Hue', value: 0, auto: false },
    { iconName: 'icon-ic_gamma', name: 'Gamma', value: 0, auto: false }
]

const adjustIcons: Dictionary<string> = {
    brightness: "icon-ic_brightness",
    contrast: "icon-ic_contrast",
    saturation: "icon-ic_saturation",
    lowLight: "icon-ic_lowlightcomp",
    backlight: "icon-ic_backlightcomp",
    whiteBalance: "icon-ic_white_balance",
    exposure: "icon-ic_exposure",
    sharpness: "icon-ic_sharpness",
    hue: "icon-ic_hue",
    gamma: "icon-ic_gamma",
  };

export {adjustList, adjustAdvanceList, adjustIcons};