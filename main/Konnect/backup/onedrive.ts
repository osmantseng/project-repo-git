import { BrowserWindow, session } from "electron";
import { parse } from "url";
import axios from "axios";
import qs from "qs";
import settings from "electron-settings";
import { ICloudUserInfo } from "./interface";
import { UserCancellation } from "./errors";
import { getCloudBackupFilename, clearCookies } from "./helper";
import _ from "lodash";
import { logger } from "../util";

const ONEDRIVE_AUTHORIZATION_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const ONEDRIVE_TOKEN_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const ONEDRIVE_PROFILE_URL = "https://graph.microsoft.com/v1.0/me";

const ONEDRIVE_CLIENT_ID = "9e761554-2cf1-49fd-919f-6a2297f17252";

const USERINFO_SETTINGS_KEY = "microsoftInfo";
const FILEID_SETTINGS_KEY = "onedriveFileId";

// As of now this is based on MS sample @ https://github.com/OneDrive/onedrive-explorer-js
const ONEDRIVE_REDIRECT_URI =
  "https://login.microsoftonline.com/common/oauth2/nativeclient";
const API_SCOPES =
  "https://graph.microsoft.com/User.Read https://graph.microsoft.com/Files.ReadWrite.AppFolder offline_access";

let _authWindow: BrowserWindow | undefined;

/**
 * Tries to refresh the token and return the refreshed token.
 * Upon success, returns the new access_token.
 *
 * @param token refreshToken
 */
async function refreshToken(token: string): Promise<any> {
  if (!token) {
    throw Error("Invalid refresh token");
  }
  const response = await axios.post(
    ONEDRIVE_TOKEN_URL,
    qs.stringify({
      client_id: ONEDRIVE_CLIENT_ID,
      redirect_uri: ONEDRIVE_REDIRECT_URI,
      refresh_token: token,
      grant_type: "refresh_token",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  //console.log('refreshToken response:', response.data);
  updateSavedRefreshToken(response.data["refresh_token"]);
  return response.data["access_token"];
}

/**
 * Returns the refresh_token from last succesfull login,
 * saved in permantent storage. Or empty string, if it does not exist.
 */
function getSavedRefreshToken(): string {
  try {
    if (settings.hasSync(USERINFO_SETTINGS_KEY)) {
      let microsoftInfo: any = settings.getSync(USERINFO_SETTINGS_KEY);
      return microsoftInfo.refreshToken;
    }
  } catch (error) {}
  return "";
}

/**
 * Signs into OneDrive, by first trying to get a valid access_token from
 * any stored refresh_token, if one exists. If that fails or if the refresh
 * token does not exist, shows the signin popup window.
 */
async function microsoftSignIn(mainWindow: BrowserWindow) {
  return refreshToken(getSavedRefreshToken())
    .then((token) => {
      return token;
    })
    .catch((err) => {
      // do nothing
      console.log("Refresh token failed:", err);
      return microsoftSignInWithPopup(mainWindow);
    });
}

/**
 * Update the refreshToken stored in offline storage.
 *
 * @param refreshToken string New refresh token obtained from server.
 */
function updateSavedRefreshToken(refreshToken: string) {
  if (settings.hasSync(USERINFO_SETTINGS_KEY)) {
    let microsoftInfo: any = settings.getSync(USERINFO_SETTINGS_KEY);
    if (microsoftInfo.refreshToken != refreshToken) {
      microsoftInfo.refreshToken = refreshToken;
      settings.setSync(USERINFO_SETTINGS_KEY, microsoftInfo);
    }
  }
}

/**
 * Shows the modal popup browser window where user can enter their
 * Microsoft passprt email address to start the login process.
 */
function showSignInWithPopup(mainWindow: BrowserWindow): Promise<string> {
  return new Promise((resolve, reject) => {
    //let image = nativeImage.createEmpty();
    let windowOptions: any = {
      parent: mainWindow,
      width: 525,
      height: 525,
      show: false,
      icon: "public/images/kensington_software_logo.png",
    };

    // In Mac, setting modal: true causes the child window to inherit the
    // parent window's titlebar style. So we enable this only for Windows.
    if (process.platform != "darwin") {
      windowOptions.modal = true;
    }
    _authWindow = new BrowserWindow(windowOptions);

    // disable standard window behaviors
    _authWindow.setMenu(null);
    _authWindow.setResizable(false);
    _authWindow.setMaximizable(false);
    _authWindow.setFullScreenable(false);

    const urlParams = {
      response_type: "code",
      client_id: ONEDRIVE_CLIENT_ID,
      redirect_uri: ONEDRIVE_REDIRECT_URI,
      scope: API_SCOPES,
    };
    const authUrl = `${ONEDRIVE_AUTHORIZATION_URL}?${qs.stringify(urlParams)}`;

    function handleRedirect(url: string) {
      // console.log('handleRedirect  - url:', url);
      const query = parse(url, true).query;
      if (query) {
        if (query.error) {
          reject(new Error(`There was an error: ${query.error}`));
        } else if (query.code) {
          // Login is complete
          if (!_.isNil(_authWindow)) {
            _authWindow.removeAllListeners("closed");
            setImmediate(() => {
              if (!_.isNil(_authWindow)) {
                _authWindow.close();
              }
            });
          }
          // This is the authorization code we need to request tokens
          resolve(<string>query.code);
        } else {
          reject(new Error("Unknown error - user possibly cancelled login"));
        }
      }
    }

    _authWindow.on("closed", () => {
      reject(new UserCancellation());
    });

    _authWindow.webContents.on("did-finish-load", () => {
      session.defaultSession.webRequest.onCompleted(
        { urls: [`${ONEDRIVE_REDIRECT_URI}?code=*`] },
        (details) => {
          //console.log('did-finish-load - url:', details.url);
          handleRedirect(details.url);
        }
      );
    });

    // _authWindow.loadURL(authUrl)
    // _authWindow.once('ready-to-show', () => { _authWindow.show(); });

    _authWindow
      .loadURL(authUrl)
      .then(() => {
        if (!_.isNil(_authWindow)) {
          _authWindow.show();
        }
      })
      .catch((err) => {
        //console.log('Error loading microsoft login URL:', err);
        reject(err);
      });
  });
}

/**
 * Step 2 of Code authentication flow, which retrieves the access & refresh
 * tokens with the authentication code.
 *
 * https://docs.microsoft.com/en-us/onedrive/developer/rest-api/getting-started/graph-oauth?view=odsp-graph-online#code-flow
 *
 * @param code string Authentication code received from MSGraph authentication
 * Step 1.
 */
async function fetchAccessTokens(code: string) {
  const response = await axios.post(
    ONEDRIVE_TOKEN_URL,
    qs.stringify({
      grant_type: "authorization_code",
      client_id: ONEDRIVE_CLIENT_ID,
      redirect_uri: ONEDRIVE_REDIRECT_URI,
      code: code,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return response.data;
}

async function fetchUserProfile(accessToken: string) {
  const response = await axios.get(ONEDRIVE_PROFILE_URL, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}

/**
 * Save the onedrive file id to app settings.
 *
 * @param fileId One drive file id returned by drive API.
 */
function setBackupFileId(fileId: string) {
  settings.setSync(FILEID_SETTINGS_KEY, fileId);
}

/**
 * Returns the fiel id of the previous back up.
 * If previous backup does not exist, return empty string.
 */
function getBackupFileId() {
  try {
    if (settings.hasSync(FILEID_SETTINGS_KEY)) {
      return settings.getSync(FILEID_SETTINGS_KEY);
    }
  } catch (error) {}
  return "";
}

// upload settings to OneDrive
async function uploadSettings(token: string, settings: string) {
  logger.debug(`uploadSettings ${settings} ${typeof settings} ${settings.length}`);
  settings = settings + "          ";
  let fileId = getBackupFileId();
  if (fileId) {
    /**
     * Backup already exists, update it
     *
     * PUT /me/drive/items/{item-id}/content
     * Content-Type: <>
     *
     * The contents of the file goes here.
     *
     * This upload mechanism only supports files <= 4MB!
     */
    const UPLOAD_URL = `https://graph.microsoft.com/v1.0/users/me/drive/items/${fileId}/content`;
    let response = await axios.put(UPLOAD_URL, settings, {
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Content-Length": settings.length.toString(),
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } else {
    /**
     * First time settings is being backed up, create it (PUT request).
     *
     * PUT /me/drive/root:/FolderA/FileB.txt:/content
     * Content-Type: <>
     *
     * The contents of the file goes here.
     *
     * This upload mechanism only supports files <= 4MB!
     */
    const UPLOAD_URL = `https://graph.microsoft.com/v1.0/users/me/drive/special/approot:/${getCloudBackupFilename()}:/content`;
    let response = await axios.put(UPLOAD_URL, settings, {
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Content-Length": settings.length.toString(),
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
}

/**
 * Returns a promise which resolves to return the id of backup file
 * from a previous backup operation. If no previous backup data was found,
 * the promise is rejected with a simple error message.
 * @param token OneDrive API access token.
 */
async function getPreviousBackupFileId(token: string) {
  const url = `https://graph.microsoft.com/v1.0/users/me/drive/special/approot:/${getCloudBackupFilename()}`;
  return axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      //console.log('OneDrive get app data:', response.data);
      return response.data.id;
    });
}

/**
 * Download TbwSettings from application's config folder.
 *
 * @param token OneDrive API authorization token
 * @returns A Promise that upon resolution retunrs the settings
 *  JSON object last saved.
 */
async function downloadSettings(token: string) {
  //let fileId = await getPreviousBackupFileId(token);
  const url = `https://graph.microsoft.com/v1.0/users/me/drive/special/approot:/${getCloudBackupFilename()}:/content`;
  return axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      //console.log('OneDrive get file:', response);
      return response.data;
    });
}

/**
 * Save settings to one drive.
 *
 * Logic:
 *  1. Get settings from TBW helper
 *  2. Login to OneDrive
 *  3. Check if file exists
 *  4. If exists, PUT it to update the current file
 *  5. If does not exist, POST the settings, creating the file
 *  6. Done
 */
export async function saveSettingsToOneDrive(
  mainWindow: BrowserWindow,
  settings: any
) {
  return microsoftSignIn(mainWindow)
    .then((token) => {
      // settings is JSON in string form
      logger.debug(`saveSettingsToOneDrive ${JSON.stringify(settings)}`);
      return uploadSettings(token, JSON.stringify(settings));
    })
    .then((data) => {
      //console.log('Settings backed up with OneDrive:', data);
      setBackupFileId(data.id);
    })
    .catch((err) => {
      console.log("Error saving settings:", err);
      throw err;
    })
    .finally(() => {
      if (_authWindow) {
        _authWindow.destroy();
        _authWindow = undefined;
      }
    });
}

/**
 * Restore settings previously saved with OneDrive.
 */
export async function restoreSettingsFromOneDrive(
  mainWindow: BrowserWindow,
  setDataFunc: (settings: any) => void
) {
  return microsoftSignIn(mainWindow)
    .then((token) => {
      return downloadSettings(token);
    })
    .then((settings) => {
      // settings is the json string
      //console.log('Settings read from OneDrive:', settings);
      return setDataFunc(settings);
    })
    .catch((err) => {
      //console.log('restoreSettingsFromOneDrive error:', err);
      throw err;
    })
    .finally(() => {
      if (_authWindow) {
        _authWindow.destroy();
        _authWindow = undefined;
      }
    });
}

/**
 * Returns the cloud user information used to authenticate against
 * Microsoft OneDrive storage service.
 *
 * @returns ICloudUserInfo
 */
export function getMicrosoftUserInfo(): ICloudUserInfo | undefined {
  try {
    if (settings.hasSync(USERINFO_SETTINGS_KEY)) {
      let microsoftInfo: any = settings.getSync(USERINFO_SETTINGS_KEY);
      let userInfo: ICloudUserInfo = {
        name: microsoftInfo.name,
        email: microsoftInfo.email,
      };
      return userInfo;
    }
  } catch (error) {}
  return undefined;
}

export async function removeMicrosoftUserInfo() {
  try {
    if (settings.hasSync(FILEID_SETTINGS_KEY)) {
      settings.unsetSync(FILEID_SETTINGS_KEY);
    }
    if (settings.hasSync(USERINFO_SETTINGS_KEY)) {
      let microsoftInfo: any = settings.getSync(USERINFO_SETTINGS_KEY);
      settings.unsetSync(USERINFO_SETTINGS_KEY);
      // TODO: sign out revoking the refreshToken
      await clearCookies();
    }
  } catch (error) {}
}

/**
 * Signin to OneDrive and returns promise which upon resolution contains the
 * API access token.
 */
export async function microsoftSignInWithPopup(mainWindow: BrowserWindow) {
  const code = await showSignInWithPopup(mainWindow);
  const tokens = await fetchAccessTokens(code);
  //console.log('Access tokens:', tokens);
  const profile = await fetchUserProfile(tokens["access_token"]);
  //console.log('User profile:', profile);
  const microsoftInfo = {
    name: profile.displayName,
    email: profile.mail ? profile.mail : profile.userPrincipalName,
    refreshToken: tokens.refresh_token,
  };
  settings.setSync(USERINFO_SETTINGS_KEY, microsoftInfo);

  return tokens.access_token;
}
