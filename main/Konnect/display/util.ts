import { BrowserWindow, screen } from "electron";
import _ from "lodash";
import { IBounds } from "./interface";

export function createTransparentChildWindow(
  parentWindow: BrowserWindow,
  alwaysOnTop = false,
  devTools = false,
  preloadScript?: string
) {
  let previewWindow = new BrowserWindow({
    minWidth: 800,
    minHeight: 750,
    show: false,
    frame: false,
    transparent: true,
    thickFrame: false,
    hasShadow: false,
    webPreferences: {
      preload: preloadScript,
      devTools: devTools,
    },
    alwaysOnTop: alwaysOnTop,
    parent: parentWindow,
    backgroundColor: "#00000000",
  });

  previewWindow.setMenu(null);
  previewWindow.setIgnoreMouseEvents(true);

  return previewWindow;
}

export function fitChildWindow2Parent(childWindow: BrowserWindow) {
  let parentWindow = childWindow.getParentWindow();
  if (_.isNil(parentWindow)) {
    return;
  }

  let pos = parentWindow.getPosition();
  let size = parentWindow.getSize();

  if (parentWindow.isMaximized()) {
    let display = screen.getDisplayNearestPoint({
      x: pos[0] + size[0] / 2,
      y: pos[1] + size[1] / 2,
    });

    pos[0] += _.round((size[0] - display.workAreaSize.width) / 2);
    pos[1] += _.round((size[1] - display.workAreaSize.height) / 2);
    size[0] = display.workAreaSize.width;
    size[1] = display.workAreaSize.height;
  }

  childWindow.setPosition(pos[0], pos[1]);
  childWindow.setSize(size[0], size[1]);

  if (parentWindow.isMinimized()) {
    childWindow.minimize();
  }
}

export function getDisplayInfo(x?: number, y?: number/* bounds?: IBounds */) {
  let display: Electron.Display;
  if (!_.isNumber(x) || !_.isNumber(y)) {
    display = screen.getPrimaryDisplay();
  } else {
    display = screen.getDisplayNearestPoint({
      x: x,
      y: y,
    });
  }
  const { width, height } = display.size;
  const { scaleFactor } = display;
  const result = {
    width,
    height,
    scaleFactor: scaleFactor,
    //aspectRatio: width / height,
    //physicalWidth: width * scaleFactor,
    //physicalHeight: height * scaleFactor,
  };
  return result;
}
