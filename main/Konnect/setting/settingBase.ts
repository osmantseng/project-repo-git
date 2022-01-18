import { ESettingType } from "./const";
import { IDependencies, ISetting } from "./interface";
import _, { update } from "lodash";

export default abstract class SettingBase<
  ValueType = any,
  ValueUIType = ValueType,
  ValueSaveType = ValueType
> implements ISetting<ValueType, ValueUIType, ValueSaveType>
{
  private _dependencies: IDependencies;
  get dependencies() {
    return this._dependencies;
  }
  abstract readonly settingType: ESettingType;
  abstract defaultValue: ValueType;
  abstract value: ValueType;
  protected _changed: boolean = false;
  get changed() {
    return this._changed;
  }
  unChanged() {
    this._changed = false;
  }
  reset() {
    this.update(this.defaultValue);
  }
  reload() {}
  update(value: ValueType) {
    this.value = value;
    this.updateAction();
    this._changed = true;
  }
  updateAction() {}
  abstract updatePartially(value: any): void;
  abstract serialize(): ValueSaveType;
  load(value: any) {
    this.updatePartially(value);
    this._changed = false;
  }
  abstract valueUI: ValueUIType;
  abstract readonly requiresVCRestartOnChange: boolean;
  abstract readonly requiresReloadOnVidSwitch: boolean;

  constructor(dependencies: IDependencies) {
    this._dependencies = dependencies;
  }
}
