import { ICollection } from "../interface";
import _ from "lodash";
import { Dictionary } from "lodash";
import { ESettingType } from "./const";
import { IDependencies, ISetting } from "./interface";

export default class SettingCollection
  implements
    ICollection<ISetting>,
    ISetting<Dictionary<any>, Dictionary<any>, Dictionary<any>>
{
  protected children: Dictionary<ISetting> = {};
  get keys() {
    return _.keys(this.children);
  }
  get(name: string) {
    return _.get(this.children, name, undefined);
  }
  add(name: string, setting: ISetting): void {
    this.children[name] = setting;
  }
  remove(name: string) {
    _.unset(this.children, name);
  }

  private _dependencies: IDependencies;
  get dependencies() {
    return this._dependencies;
  }
  get settingType() {
    return ESettingType.Collection;
  }
  get defaultValue() {
    return _.mapValues(
      this.children,
      (child) => child.defaultValue
    ) as Dictionary<any>;
  }
  get value() {
    return _.mapValues(
      this.children,
      (child) => child.value
    ) as Dictionary<any>;
  }
  set value(value) {
    _.forEach(value, (_value, key) => {
      let setting = _.get(this.children, key);
      if (!_.isNil(setting)) {
        setting.value = _value;
      }
    });
  }
  get changed() {
    return _.some(this.children, "changed");
  }
  unChanged() {
    _.forEach(this.children, (child) => {
      child.unChanged();
    });
  }
  reset() {
    _.forEach(this.children, (child) => {
      if (child.settingType === ESettingType.CamDevice) {
        return;
      }
      child.reset();
    });
  }
  reload() {
    _.forEach(this.children, (child) => {
      child.reload();
    });
  }
  update(value: Dictionary<any>) {
    _.forEach(value, (_value, key) => {
      let setting = _.get(this.children, key);
      if (!_.isNil(setting)) {
        setting.update(_value);
      }
    });
  }
  updateAction() {}
  updatePartially(value: Dictionary<any>) {
    _.forEach(value, (_value, key) => {
      let setting = _.get(this.children, key);
      if (!_.isNil(setting)) {
        setting.updatePartially(_value);
      }
    });
  }
  serialize() {
    return _.mapValues(this.children, (child) => child.serialize());
  }
  load(value: any) {
    _.forEach(value, (_value, key) => {
      let setting = _.get(this.children, key);
      if (!_.isNil(setting)) {
        if (setting.settingType === ESettingType.CamDevice) {
          return;
        }
        setting.load(_value);
      }
    });
  }
  static get valueUI() {
    return {} as Dictionary<any>;
  }
  get valueUI() {
    return _.mapValues(
      this.children,
      (child) => child.valueUI
    ) as Dictionary<any>;
  }
  get requiresVCRestartOnChange() {
    return true;
  }
  get requiresReloadOnVidSwitch() {
    return true;
  }

  constructor(dependencies: IDependencies) {
    this._dependencies = dependencies;
  }
}
