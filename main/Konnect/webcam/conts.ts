import { Dictionary } from "lodash";
import { ICamInfo } from "./interface";

const W2000 = {
  name: "W2000",
  vid: "047d",
  pid: "80b3",
  serialNumber: "",
} as ICamInfo;

const W2050 = {
  name: "W2050",
  vid: "047d",
  pid: "80b4",
  serialNumber: "",
} as ICamInfo;

export const kensingtonCamInfos = {
  W2000: W2000,
  W2050: W2050,
} as Dictionary<ICamInfo>;

export const emptyCamInfo = {
  name: "",
  vid: "",
  pid: "",
  serialNumber: "",
} as ICamInfo;
