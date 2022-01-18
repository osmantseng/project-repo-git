import SettingCollection from "../setting/settingCollection";
import { IDependencies } from "../setting/interface";
import { IInput, IScene, ISceneItem } from "obs-studio-node";

export interface ICamSet extends IDependencies {
  readonly input: IInput;
  readonly scene: IScene;
  readonly sceneItem: ISceneItem;
  readonly settings: SettingCollection;
}