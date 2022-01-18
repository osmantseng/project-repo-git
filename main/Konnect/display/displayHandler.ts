import { RatioDisplaySet } from "./ratioDisplaySet";
import { Dictionary } from "lodash";
import _ from "lodash";
import { ICollection } from "../interface";

export class RatioDisplayCollection
  implements ICollection<RatioDisplaySet>
{
  private _ratioDisplaySets: Dictionary<RatioDisplaySet> = {};
  get keys() {
    return _.keys(this._ratioDisplaySets);
  }
  get(displayId: string) {
    return _.get(this._ratioDisplaySets, displayId, undefined);
  }
  add(displayId: string, setting: RatioDisplaySet): void {
    this._ratioDisplaySets[displayId] = setting;
  }
  remove(displayId: string) {
    _.unset(this._ratioDisplaySets, displayId);
  }
}
