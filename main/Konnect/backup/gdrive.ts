import { BrowserWindow } from "electron";
import { parse } from "url";
import axios from "axios";
import qs from "qs";
import FormData from "form-data";
import settings from "electron-settings";
import { ICloudUserInfo } from "./interface";
import { UserCancellation } from "./errors";
import { getCloudBackupFilename, clearCookies } from "./helper";
import _ from "lodash";
import { logger } from "../util";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://www.googleapis.com/oauth2/v4/token";
const GOOGLE_PROFILE_URL = "https://www.googleapis.com/userinfo/v2/me";
// Installed apps that do not have a platform browser page to launch for
// displaying the required authentication credentials, can use iOS client id.
// Refer to https://developers.google.com/identity/protocols/OAuth2InstalledApp
// for details.
//const GOOGLE_SMALLPEARL_IOS_CLIENT_ID = '603210057319-82aubqmj2d2bmra462v49ks0fardk7e5.apps.googleusercontent.com';
/* const GOOGLE_KENSINGTON_IOS_CLIENT_ID =
  "966282534708-jvbp3c4ituo0jhlvm4alrd6cei8hra4f.apps.googleusercontent.com"; */
const GOOGLE_KENSINGTON_IOS_CLIENT_ID =
  "691045745598-4dcu5mcjn0ltqaplnttdia9j2cmapo9d.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID = GOOGLE_KENSINGTON_IOS_CLIENT_ID;

// This is the iOS app Bundle ID with the :/oauth2redirect
// Refer to https://developers.google.com/identity/protocols/OAuth2InstalledApp#request-parameter-redirect_uri
// for details on the format of this string.
const GOOGLE_IOS_REDIRECT_URI = "com.kensington.konnect:/oauth2redirect";
const API_SCOPES =
  "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.appdata";

const USERINFO_SETTINGS_KEY = "googleInfo";
const FILEID_SETTINGS_KEY = "gdriveFileId";

let _authWindow: BrowserWindow | undefined;

/**
 * Tries to refresh the token and return the refreshed token.
 * Upon success, returns the new access_token.
 *
 * @param token refreshToken
 */
async function refreshToken(token: string): Promise<any> {
  const REFRESH_URL = "https://www.googleapis.com/oauth2/v4/token";
  if (!token) {
    throw Error("Invalid refresh token");
  }
  return axios
    .post(REFRESH_URL, {
      refresh_token: token,
      client_id: GOOGLE_IOS_CLIENT_ID,
      grant_type: "refresh_token",
    })
    .then((response) => {
      //console.log('Refresh token response:', response.data);
      return response.data.access_token;
    });
}

/**
 * Returns the google refresh_token from last succesfull login,
 * saved in permantent storage. Or empty string, if it does not exist.
 */
function getSavedRefreshToken(): string {
  try {
    if (settings.hasSync(USERINFO_SETTINGS_KEY)) {
      let googleInfo: any = settings.getSync(USERINFO_SETTINGS_KEY);
      return googleInfo.refreshToken;
    }
  } catch (error) {}
  return "";
}

/**
 * Integrated refreshToken & signInPopup function
 */
async function googleSignIn(mainWindow: BrowserWindow) {
  return refreshToken(getSavedRefreshToken())
    .then((token) => {
      return token;
    })
    .catch((err) => {
      // do nothing
      console.log("Refresh token failed:", err);
      return googleSignInWithPopup(mainWindow);
    });
}

function signInWithPopup(mainWindow: BrowserWindow): Promise<string> {
  return new Promise((resolve, reject) => {
    //let image = nativeImage.createEmpty();
    let windowOptions: any = {
      parent: mainWindow,
      width: 500,
      height: 650,
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

    // TODO: Generate and validate PKCE code_challenge value
    const urlParams = {
      response_type: "code",
      client_id: GOOGLE_IOS_CLIENT_ID,
      redirect_uri: GOOGLE_IOS_REDIRECT_URI,
      scope: API_SCOPES, // 'profile email',
      prompt: "consent",
    };
    const authUrl = `${GOOGLE_AUTHORIZATION_URL}?${qs.stringify(urlParams)}`;

    function handleNavigation(url: string) {
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
          // } else {
          //     reject(new Error('Unknown error - user possibly cancelled login'));
        }
      }
    }

    _authWindow.on("closed", () => {
      reject(new UserCancellation());
    });

    // _authWindow.webContents.on('will-redirect', (event, url, isInPlace, isMainFrame) => {
    //     console.log('will-redirect - url:', url);
    //     if (url.startsWith(GOOGLE_IOS_REDIRECT_URI)) {
    //         console.log('\tblocking redirection');
    //         event.preventDefault();
    //     }
    // });
    // _authWindow.webContents.on('did-start-navigation', (event, url) => {
    //     console.log('did-start-navigation - url:', url);
    //     if (url.startsWith(GOOGLE_IOS_REDIRECT_URI)) {
    //         console.log('\tblocking redirection');
    //         event.preventDefault();
    //     }
    // });
    // _authWindow.webContents.on('will-redirect', (event, url) => {
    //     console.log('will-redirect - url:', url);
    //     if (url.startsWith(GOOGLE_IOS_REDIRECT_URI)) {
    //         console.log('\tblocking redirection');
    //         event.preventDefault();
    //     }
    // });
    _authWindow.webContents.on("will-navigate", (event, url) => {
      // console.log('will-navigate - url:', url);
      if (url.startsWith(GOOGLE_IOS_REDIRECT_URI)) {
        // console.log('\tblocking redirection');
        event.preventDefault();
      }
      handleNavigation(url);
    });

    // remote.session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    //     console.log('webRequest.onBeforeRequest - details:', details);
    //     if (details.url.startsWith(GOOGLE_IOS_REDIRECT_URI)) {
    //         console.log('\tredirect url - block?');
    //     }
    //     callback({});
    // });
    // @ts-ignore 2345
    // _authWindow.webContents.on('did-get-redirect-request', (event: any, oldUrl: any, newUrl: any) => {
    //     console.log('did-get-redirect-request - oldUrl:', oldUrl, ", newUrl:", newUrl);
    //     handleNavigation(newUrl)
    // })

    //_authWindow.once('ready-to-show', () => { _authWindow.show(); });

    _authWindow
      .loadURL(authUrl, { userAgent: "Chrome" })
      .then(() => {
        if (!_.isNil(_authWindow)) {
          _authWindow.show();
        }
      })
      .catch((err) => {
        //console.log('Error loading google login URL:', err);
        reject(err);
      });
  });
}

async function fetchAccessTokens(code: string) {
  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    qs.stringify({
      code,
      client_id: GOOGLE_IOS_CLIENT_ID,
      redirect_uri: GOOGLE_IOS_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return response.data;
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await axios.get(GOOGLE_PROFILE_URL, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.data;
}

/**
 * Save the google drive file id to app settings.
 *
 * @param fileId Google drive file id returned by drive API.
 */
function setGoogleBackupFileId(fileId: string) {
  settings.setSync(FILEID_SETTINGS_KEY, fileId); // last used cloud backup
}

/**
 * Returns the fiel id of the previous back up.
 * If previous backup does not exist, return empty string.
 */
function getGoogleBackupFileId() {
  try {
    if (settings.hasSync(FILEID_SETTINGS_KEY)) {
      return settings.getSync(FILEID_SETTINGS_KEY);
    }
  } catch (error) {}
  return "";
}

function cloudBackupFileName() {}

// upload settings to Google Drive
async function uploadSettings(token: string, settings: string) {
  let form = new FormData();

  // file metadata
  let fileMetaData = {
    name: getCloudBackupFilename(),
    platform: process.platform,
    parents: ["appDataFolder"],
  };
  form.append("resource", JSON.stringify(fileMetaData), {
    contentType: "application/json; charset=UTF-8",
  });

  // actual settings content
  form.append("media", settings, {
    contentType: "application/json; charset=UTF-8",
  });

  let headers = form.getHeaders();
  // add Google token to the header
  headers["Authorization"] = `Bearer ${token}`;
  headers["Content-Length"] = form.getLengthSync();

  let fileId = getGoogleBackupFileId();
  if (fileId) {
    // backup already exists, update it (PATCH request)
    const UPLOAD_URL = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    let response = await axios.patch(UPLOAD_URL, settings, {
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Content-Length": settings.length.toString(),
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } else {
    // First time settings is being backed up, create it (POST request).
    const UPLOAD_URL =
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    let response = await axios.post(UPLOAD_URL, form.getBuffer(), {
      headers: headers,
    });
    return response.data;
  }
}

/**
 * Returns a promise which resolves to resturn the id of google backup file
 * from a previous backup operation. If no previous backup data was found,
 * the promise is rejected with a simple error message.
 * @param token Google API access token.
 */
async function getPreviousBackupFileId(token: string) {
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder`;
  return axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      //console.log('Google drive get app data:', response.data);
      let backupFilename = getCloudBackupFilename();
      if (response.data.files.length > 0) {
        //console.log('Google backup files info:', response.data.files);
        for (let index = 0; index < response.data.files.length; index++) {
          const element = response.data.files[index];
          if (element.name == backupFilename) {
            return element.id;
          }
        }
      }
      throw Error("Previous backup does not exist");
    });
}

/**
 * Download TbwSettings from application's config folder.
 *
 * @param token Google API authorization token
 * @returns A Promise that upon resolution retunrs the settings
 *  JSON object last saved.
 */
async function downloadSettings(token: string) {
  let fileId = await getPreviousBackupFileId(token);
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  return axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    .then((response) => {
      //console.log('Google drive get file:', response);
      return response.data;
    });
}

/**
 * Save settings to google drive.
 *
 * Logic:
 *  1. Get settings from TBW helper
 *  2. Login to google
 *  3. Check if file exists
 *  4. If exists, PUT it to update the current file
 *  5. If does not exist, POST the settings, creating the file
 *  6. Done
 */
export async function saveSettingsToGoogle(
  mainWindow: BrowserWindow,
  data: any
) {
  return googleSignIn(mainWindow)
    .then((token) => {
      // settings is JSON in string form
      return uploadSettings(token, JSON.stringify(data));
    })
    .then((data) => {
      // console.log('Settings backed up with Google server:', data);
      setGoogleBackupFileId(data.id);
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
 * Restore settings previously saved with Google.
 */
export async function restoreSettingsFromGoogle(
  mainWindow: BrowserWindow,
  setDataFunc: (data: any) => void
) {
  // let fileId = getGoogleBackupFileId();
  // if (!fileId) {
  //     throw Error('Previous backup does not exist!');
  // }

  return googleSignIn(mainWindow)
    .then((token) => {
      return downloadSettings(token);
    })
    .then((data) => {
      // settings is the json string
      //console.log('Settings read from Google:', JSON.stringify(data));
      return setDataFunc(data);
    })
    .catch((err) => {
      //console.log('restoreSettingsFromGoogle error:', err);
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
 * Google Drive storage service.
 *
 * @returns ICloudUserInfo
 */
export function getGoogleUserInfo(): ICloudUserInfo | undefined {
  try {
    if (settings.hasSync(USERINFO_SETTINGS_KEY)) {
      let googleInfo: any = settings.getSync(USERINFO_SETTINGS_KEY);
      let userInfo: ICloudUserInfo = {
        name: googleInfo.name,
        email: googleInfo.email,
      };
      return userInfo;
    }
  } catch (error) {}
  return undefined;
}

export async function removeGoogleUserInfo() {
  try {
    if (settings.hasSync(FILEID_SETTINGS_KEY)) {
      settings.unsetSync(FILEID_SETTINGS_KEY);
    }
    if (settings.hasSync(USERINFO_SETTINGS_KEY)) {
      let googleInfo: any = settings.getSync(USERINFO_SETTINGS_KEY);
      settings.unsetSync(USERINFO_SETTINGS_KEY);
      // TODO: sign out revoking the refreshToken
      clearCookies();
    }
  } catch (error) {}
}

/**
 * Signin to Google and returns promise which upon resolution contains the
 * API access token.
 */
export async function googleSignInWithPopup(mainWindow: BrowserWindow) {
  const code = await signInWithPopup(mainWindow);
  const tokens = await fetchAccessTokens(code);
  logger.debug(`Access tokens: ${tokens}`);
  const profile = await fetchGoogleProfile(tokens["access_token"]);
  logger.debug(`Google profile: ${profile}`);
  const providerUser = {
    name: "",
    email: profile.email,
    refreshToken: tokens.refresh_token,
  };
  settings.setSync(USERINFO_SETTINGS_KEY, providerUser);

  return tokens.access_token;
}
