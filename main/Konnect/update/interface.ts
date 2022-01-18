export interface IVersion {
  version_major: number;
  version_minor: number;
  version_build: number;
  toString(): string;
}

export interface IVersionData {
  currentVersion: string;
  updateVersion: string;
}

export interface IDownloadItem {
  filename: string;
  savePath: string;
  totalBytes: number;
}
