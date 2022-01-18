/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import "core-js/stable";
import "regenerator-runtime/runtime";
import path from "path";
import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import { resolveHtmlPath } from "./util";
//import * as obsHandler from './OBS/obsHandler';
import * as obsHandler from "./Konnect/obs/obsHandlerP1";
import * as updateHandler from "./Konnect/update/updateHandler";

let mainWindow: BrowserWindow;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  const isDevelopment =
    process.env.NODE_ENV === "development" || process.env.DEBUG_PROD === "true";

  if (isDevelopment) {
    require("electron-debug")({ showDevTools: false });
  }

  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  ipcMain.on("ipc-example", async (event, arg) => {
    const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
    console.log(msgTemplate(arg));
    event.reply("ipc-example", msgTemplate("pong"));
  });

  if (process.env.NODE_ENV === "production") {
    const sourceMapSupport = require("source-map-support");
    sourceMapSupport.install();
  }

  const installExtensions = async () => {
    const installer = require("electron-devtools-installer");
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    const extensions = ["REACT_DEVELOPER_TOOLS"];
    return installer
      .default(
        extensions.map((name) => installer[name]),
        forceDownload
      )
      .catch(console.log);
  };

  const windowStateKeeper = require("electron-window-state");
  const createWindow = async () => {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_PROD === "true"
    ) {
      await installExtensions();
    }

    // const RESOURCES_PATH = app.isPackaged
    //   ? path.join(process.resourcesPath, 'assets')
    //   : path.join(__dirname, '../../assets');

    // const getAssetPath = (...paths: string[]): string => {
    //   return path.join(RESOURCES_PATH, ...paths);
    // };
    let mainWindowState = windowStateKeeper({
      defaultWidth: 1280,
      defaultHeight: 768,
    });
    mainWindow = new BrowserWindow({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      minWidth: 800,
      minHeight: 550,
      frame: false,
      show: false,
      icon: "public/images/kensington_software_logo.png",
      title: "Konnect",
      webPreferences: {
        nativeWindowOpen: true,
        contextIsolation: true,
        preload: path.join(__dirname, "./Konnect/preload.js"),
        devTools: isDevelopment,
      },
    });

    obsHandler.setupObsHandler(ipcMain, mainWindow);
    obsHandler.setupBackupHandler(ipcMain, mainWindow);
    obsHandler.setupDisplayHandler(ipcMain, mainWindow);
    updateHandler.setup(ipcMain, mainWindow);
    mainWindow.loadURL(resolveHtmlPath("index.html"));

    // @TODO: Use 'ready-to-show' event
    //        https://github.com/electron/electron/blob/main/docs/api/browser-window.md#using-ready-to-show-event
    mainWindow.webContents.on("did-finish-load", () => {
      if (!mainWindow) {
        throw new Error('"mainWindow" is not defined');
      }
      if (process.env.START_MINIMIZED) {
        mainWindow.minimize();
      } else {
        mainWindow.show();
        mainWindow.focus();
        if (isDevelopment) {
          mainWindow.webContents.openDevTools();
        }
      }
    });
    // 监听窗口最大化以及从最大化退出事件
    mainWindow.on("maximize", () => {
      mainWindow.webContents.send("main-window-max");
    });
    mainWindow.on("unmaximize", () => {
      mainWindow.webContents.send("main-window-unmax");
    });
    // mainWindow.on('closed', () => {
    //   mainWindow = null;
    // });

    // Remove this if your app does not use auto updates
    // eslint-disable-next-line
    if (isDevelopment) {
      const { autoUpdater } = require("electron-updater");
      const log = require("electron-log");
      class AppUpdater {
        constructor() {
          log.transports.file.level = "info";
          autoUpdater.logger = log;
          autoUpdater.checkForUpdatesAndNotify();
        }
      }
      new AppUpdater();
    }
    mainWindowState.manage(mainWindow);
  };
  /**
   * Add event listeners...
   */
  app.on("window-all-closed", () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
  
  app.on("quit", () => {
    obsHandler.endOBS();
  })

  app.whenReady().then(createWindow).catch(console.log);

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow();
  });

  // 监听最大化\最小化\关闭事件
  ipcMain.on("min", () => mainWindow.minimize());
  ipcMain.on("max", () => {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on("close", () => mainWindow.close());
  // 监听打开指定链接
  ipcMain.on("open-url", (event, url) => {
    shell.openExternal(url);
  });

  // 监听打开文件管理器
  ipcMain.handle("open-file-dialog", async (value) => {
    const btnName = value ? "Open" : "Save";
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Open",
      buttonLabel: btnName,
      properties: ["openFile"],
    });
    return result;
  });
}
