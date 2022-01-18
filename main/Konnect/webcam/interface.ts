export interface ICamInfo {
  name: string;
  serialNumber: string;
  vid: string;
  pid: string;
}

export interface ICamInfoExtra extends ICamInfo {
  isVirtual: boolean;
  isValid: boolean;
}
