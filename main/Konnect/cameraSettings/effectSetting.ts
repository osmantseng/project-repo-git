import { EOBSFilterType } from "../obs/const";
import _, { Dictionary } from "lodash";
import { EKonnectEffect, EKonnectEffectTone } from "./const";
import {
  IEffectValue,
  IEffectOptionUI,
  IEffectSubOption,
  IEffectOption,
} from "./interface";
import SettingBase from "../setting/settingBase";
import { logger, resolveResourcePath } from "../util";
import * as osn from "obs-studio-node";
import { ESettingType } from "../setting/const";

const lutImagePath: Dictionary<any> = {
  [EKonnectEffect.bwContrast]: resolveResourcePath(
    "filters",
    "konnect",
    "Presets A Lighter Skin Tone",
    "BW Contrast_18.2021-06-24 15-11-15.cube"
  ),
  [EKonnectEffect.cool]: {
    [EKonnectEffectTone.Lighter]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets A Lighter Skin Tone",
      "Cool v1_23.2021-06-18 12-03-14.cube"
    ),
    [EKonnectEffectTone.Medium]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets C Medium Skin Tone",
      "Cool v3_38.Med Skin 1.cube"
    ),
    [EKonnectEffectTone.Darker]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets B Darker Skin Tone",
      "Cool v2_24.2021-06-15 11-45-45.cube"
    ),
  },
  [EKonnectEffect.warm]: {
    [EKonnectEffectTone.Lighter]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets A Lighter Skin Tone",
      "Warm v1_21.2021-06-18 12-03-14.cube"
    ),
    [EKonnectEffectTone.Medium]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets C Medium Skin Tone",
      "Warm v3_38.Med Skin 1.cube"
    ),
    [EKonnectEffectTone.Darker]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets B Darker Skin Tone",
      "Warm v2_22.2021-06-15 11-45-45.cube"
    ),
  },
  [EKonnectEffect.captivate]: {
    [EKonnectEffectTone.Lighter]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets A Lighter Skin Tone",
      "Captivate v1_29.2021-06-18 12-03-14.cube"
    ),
    [EKonnectEffectTone.Medium]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets C Medium Skin Tone",
      "Captivate v3_38.Med Skin 1.cube"
    ),
    [EKonnectEffectTone.Darker]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets B Darker Skin Tone",
      "Captivate v2_30.2021-06-15 11-45-45.cube"
    ),
  },
  [EKonnectEffect.stylish]: {
    [EKonnectEffectTone.Lighter]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets A Lighter Skin Tone",
      "Stylish 1.5.cube_31.2021-06-18 12-03-14.cube"
    ),
    [EKonnectEffectTone.Medium]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets C Medium Skin Tone",
      "Stylish v3_38.Med Skin 1.cube"
    ),
    [EKonnectEffectTone.Darker]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets B Darker Skin Tone",
      "Stylish v2.cube_32.2021-06-15 11-45-45.cube"
    ),
  },
  [EKonnectEffect.vibrant]: {
    [EKonnectEffectTone.Lighter]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets A Lighter Skin Tone",
      "Vibrant 1.2_25.2021-06-18 12-03-14.cube"
    ),
    [EKonnectEffectTone.Medium]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets C Medium Skin Tone",
      "Vibrant v3_38.Med Skin 1.cube"
    ),
    [EKonnectEffectTone.Darker]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets B Darker Skin Tone",
      "Vibrant v2_26.2021-06-15 11-45-45.cube"
    ),
  },
  [EKonnectEffect.highlight]: {
    [EKonnectEffectTone.Lighter]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets A Lighter Skin Tone",
      "Highlight v1.2_27.2021-06-18 12-03-14.cube"
    ),
    [EKonnectEffectTone.Medium]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets C Medium Skin Tone",
      "Highlite v3_39.Med Skin 3.cube"
    ),
    [EKonnectEffectTone.Darker]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets B Darker Skin Tone",
      "Highlights v2_28.2021-06-15 11-45-45.cube"
    ),
  },
  [EKonnectEffect.contrast]: {
    [EKonnectEffectTone.Lighter]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets A Lighter Skin Tone",
      "Contrast v1_19.2021-06-18 12-03-14.cube"
    ),
    [EKonnectEffectTone.Medium]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets C Medium Skin Tone",
      "Contrast v3_38.Med Skin 1.cube"
    ),
    [EKonnectEffectTone.Darker]: resolveResourcePath(
      "filters",
      "konnect",
      "Presets B Darker Skin Tone",
      "Contrast v2_20.2021-06-15 11-45-45.cube"
    ),
  },
};

export const effectDefault = {
  name: EKonnectEffect.none,
  filterType: EOBSFilterType.None,
  subOptionIndex: -1,
  settings: {},
} as IEffectValue;

export const effectOptionDefault = {
  ...effectDefault,
  imgPath: "./images/graphic_none.png",
  subOptions: [] as IEffectSubOption[],
} as IEffectOption;

/* export const effectOptionDefault = {
  name: EKonnectEffect.none,
  imgPath: "./images/graphic_none.png",
  filterType: EOBSFilterType.None,
  subOptionIndex: -1,
  subOptions: [],
  settings: {},
} as IEffectOption; */

export const effectOptions = [
  effectOptionDefault,
  {
    name: EKonnectEffect.bwContrast,
    imgPath: "./images/graphic_bw_contrast.png",
    filterType: EOBSFilterType.Clut,
    subOptionIndex: undefined,
    subOptions: [],
    settings: {
      image_path: EKonnectEffect.bwContrast,
      clut_amount: 1,
    },
  },
  {
    name: EKonnectEffect.cool,
    imgPath: "./images/graphic_cool.png",
    filterType: EOBSFilterType.Clut,
    subOptionIndex: 1,
    subOptions: [
      {
        name: EKonnectEffectTone.Lighter,
        settings: {
          image_path: [EKonnectEffect.cool, EKonnectEffectTone.Lighter],
        },
      },
      {
        name: EKonnectEffectTone.Medium,
        settings: {
          image_path: [EKonnectEffect.cool, EKonnectEffectTone.Medium],
        },
      },
      {
        name: EKonnectEffectTone.Darker,
        settings: {
          image_path: [EKonnectEffect.cool, EKonnectEffectTone.Darker],
        },
      },
    ] as IEffectSubOption[],
    settings: {
      image_path: [EKonnectEffect.cool, EKonnectEffectTone.Lighter],
      clut_amount: 0.5,
    },
  },
  {
    name: EKonnectEffect.warm,
    imgPath: "./images/graphic_warm.png",
    filterType: EOBSFilterType.Clut,
    subOptionIndex: 1,
    subOptions: [
      {
        name: EKonnectEffectTone.Lighter,
        settings: {
          image_path: [EKonnectEffect.warm, EKonnectEffectTone.Lighter],
        },
      },
      {
        name: EKonnectEffectTone.Medium,
        settings: {
          image_path: [EKonnectEffect.warm, EKonnectEffectTone.Medium],
        },
      },
      {
        name: EKonnectEffectTone.Darker,
        settings: {
          image_path: [EKonnectEffect.warm, EKonnectEffectTone.Darker],
        },
      },
    ] as IEffectSubOption[],
    settings: {
      image_path: [EKonnectEffect.warm, EKonnectEffectTone.Lighter],
      clut_amount: 0.5,
    },
  },
  {
    name: EKonnectEffect.captivate,
    imgPath: "./images/graphic_captivate.png",
    filterType: EOBSFilterType.Clut,
    subOptionIndex: 1,
    subOptions: [
      {
        name: EKonnectEffectTone.Lighter,
        settings: {
          image_path: [EKonnectEffect.captivate, EKonnectEffectTone.Lighter],
        },
      },
      {
        name: EKonnectEffectTone.Medium,
        settings: {
          image_path: [EKonnectEffect.captivate, EKonnectEffectTone.Medium],
        },
      },
      {
        name: EKonnectEffectTone.Darker,
        settings: {
          image_path: [EKonnectEffect.captivate, EKonnectEffectTone.Darker],
        },
      },
    ] as IEffectSubOption[],
    settings: {
      image_path: [EKonnectEffect.captivate, EKonnectEffectTone.Lighter],
      clut_amount: 0.5,
    },
  },
  {
    name: EKonnectEffect.stylish,
    imgPath: "./images/graphic_stylish.png",
    filterType: EOBSFilterType.Clut,
    subOptionIndex: 1,
    subOptions: [
      {
        name: EKonnectEffectTone.Lighter,
        settings: {
          image_path: [EKonnectEffect.stylish, EKonnectEffectTone.Lighter],
        },
      },
      {
        name: EKonnectEffectTone.Medium,
        settings: {
          image_path: [EKonnectEffect.stylish, EKonnectEffectTone.Medium],
        },
      },
      {
        name: EKonnectEffectTone.Darker,
        settings: {
          image_path: [EKonnectEffect.stylish, EKonnectEffectTone.Darker],
        },
      },
    ] as IEffectSubOption[],
    settings: {
      image_path: [EKonnectEffect.stylish, EKonnectEffectTone.Lighter],
      clut_amount: 0.5,
    },
  },
  {
    name: EKonnectEffect.vibrant,
    imgPath: "./images/graphic_vibrant.png",
    filterType: EOBSFilterType.Clut,
    subOptionIndex: 1,
    subOptions: [
      {
        name: EKonnectEffectTone.Lighter,
        settings: {
          image_path: [EKonnectEffect.vibrant, EKonnectEffectTone.Lighter],
        },
      },
      {
        name: EKonnectEffectTone.Medium,
        settings: {
          image_path: [EKonnectEffect.vibrant, EKonnectEffectTone.Medium],
        },
      },
      {
        name: EKonnectEffectTone.Darker,
        settings: {
          image_path: [EKonnectEffect.vibrant, EKonnectEffectTone.Darker],
        },
      },
    ] as IEffectSubOption[],
    settings: {
      image_path: [EKonnectEffect.vibrant, EKonnectEffectTone.Lighter],
      clut_amount: 0.5,
    },
  },
  {
    name: EKonnectEffect.highlight,
    imgPath: "./images/graphic_highlight.png",
    filterType: EOBSFilterType.Clut,
    subOptionIndex: 1,
    subOptions: [
      {
        name: EKonnectEffectTone.Lighter,
        settings: {
          image_path: [EKonnectEffect.highlight, EKonnectEffectTone.Lighter],
        },
      },
      {
        name: EKonnectEffectTone.Medium,
        settings: {
          image_path: [EKonnectEffect.highlight, EKonnectEffectTone.Medium],
        },
      },
      {
        name: EKonnectEffectTone.Darker,
        settings: {
          image_path: [EKonnectEffect.highlight, EKonnectEffectTone.Darker],
        },
      },
    ] as IEffectSubOption[],
    settings: {
      image_path: [EKonnectEffect.highlight, EKonnectEffectTone.Lighter],
      clut_amount: 0.5,
    },
  },
  {
    name: EKonnectEffect.contrast,
    imgPath: "./images/graphic_contrast.png",
    filterType: EOBSFilterType.Clut,
    subOptionIndex: 1,
    subOptions: [
      {
        name: EKonnectEffectTone.Lighter,
        settings: {
          image_path: [EKonnectEffect.contrast, EKonnectEffectTone.Lighter],
        },
      },
      {
        name: EKonnectEffectTone.Medium,
        settings: {
          image_path: [EKonnectEffect.contrast, EKonnectEffectTone.Medium],
        },
      },
      {
        name: EKonnectEffectTone.Darker,
        settings: {
          image_path: [EKonnectEffect.contrast, EKonnectEffectTone.Darker],
        },
      },
    ] as IEffectSubOption[],
    settings: {
      image_path: [EKonnectEffect.contrast, EKonnectEffectTone.Lighter],
      clut_amount: 0.5,
    },
  },
] as IEffectOption[];

export default class EffectSetting extends SettingBase<
  IEffectValue,
  IEffectOptionUI[],
  Dictionary<any>
> {
  get settingType() {
    return ESettingType.CamEffect;
  }
  static filterName = "KonnectFilter";
  static defaultValue = effectDefault;
  get defaultValue() {
    return _.cloneDeep(EffectSetting.defaultValue);
  }
  private _value = this.defaultValue;
  get value() {
    return _.cloneDeep(this._value);
  }
  set value(value) {
    this._value = value;
  }
  updateAction() {
    let input = this.dependencies.input;
    if (_.isNil(input)) {
      return;
    }

    let filter = input.findFilter(EffectSetting.filterName);

    if (this._value.filterType === EOBSFilterType.None) {
      // Remove existing filter.
      if (!_.isNil(filter)) {
        logger.verbose("effectOption is none. Remove existing filter.");
        input.removeFilter(filter);
        this._value = this.defaultValue; // Default value is None filter.
      }
      this._value = this.defaultValue; // Default value is None filter.
    } else {
      let filterSettings = _.clone(this._value.settings);
      if (
        this._value.filterType === EOBSFilterType.Clut &&
        _.has(filterSettings, "image_path")
      ) {
        filterSettings["image_path"] = _.get(
          lutImagePath,
          filterSettings["image_path"],
          ""
        );
      }
      if (_.isNil(filter)) {
        // filter does not exist. Add a new one.
        logger.verbose("filter does not exist. Add a new one.");
        filter = osn.FilterFactory.create(
          this._value.filterType,
          EffectSetting.filterName,
          filterSettings
        );
        input.addFilter(filter);
      } else {
        // filter existed. Update its setting.
        logger.verbose("filter existed. Update its setting.");
        filter.update(filterSettings);
      }
    }
  }
  updatePartially(value: any) {
    let newValue = this.value;

    let newName = _.get(value, "name");
    if (_.isString(newName)) {
      newValue.name = newName;
    }

    let newFilterType = _.get(value, "filterType");
    if (
      _.isString(newFilterType) &&
      _.indexOf(_.values<string>(EOBSFilterType), newFilterType) > -1
    ) {
      newValue.filterType = newFilterType as EOBSFilterType;
    }

    let newSettings = _.get(value, "settings");
    if (_.isPlainObject(newSettings)) {
      newValue.settings = newSettings;
    }

    let newSubOptionIndex = _.get(value, "subOptionIndex");
    if (_.isNumber(newSubOptionIndex)) {
      newValue.subOptionIndex = newSubOptionIndex;
    }

    this.update(newValue);
  }
  serialize() {
    let value = this.value;
    return {
      name: value.name,
      filterType: value.filterType.toString(),
      settings: value.settings,
      subOptionIndex: value.subOptionIndex,
    };
  }
  static get valueUI() {
    return _.map(effectOptions, (effectOption, index) => {
      return {
        ...effectOption,
        id: index.toString(),
        isChecked: false,
      } as IEffectOptionUI;
    });
  }
  get valueUI() {
    return _.map(effectOptions, (effectOption, index) => {
      return effectOption.name === this._value.name
        ? ({
            ...effectOption,
            settings: this._value.settings,
            subOptionIndex: this._value.subOptionIndex,
            id: index.toString(),
            isChecked: true,
          } as IEffectOptionUI)
        : ({
            ...effectOption,
            id: index.toString(),
            isChecked: false,
          } as IEffectOptionUI);
    });
  }
  get requiresVCRestartOnChange() {
    return false;
  }
  get requiresReloadOnVidSwitch() {
    return false;
  }
}
