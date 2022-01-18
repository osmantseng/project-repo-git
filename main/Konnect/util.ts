/* eslint import/prefer-default-export: off, import/no-mutable-exports: off */
import { URL } from "url";
import path from "path";
import { createLogger, format, transports, Logger } from "winston";
import _ from "lodash";

export let resolveHtmlPath: (htmlFileName: string) => string;

if (process.env.NODE_ENV === "development") {
  const port = process.env.PORT || 1212;
  resolveHtmlPath = (htmlFileName: string) => {
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  };
} else {
  resolveHtmlPath = (htmlFileName: string) => {
    return `file://${path.resolve(__dirname, "../", htmlFileName)}`;
  };
}

export let resolveResourcePath: (...args: string[]) => string;
if (process.env.NODE_ENV === "development") {
  resolveResourcePath = (...args: string[]) =>
    path.join(path.resolve(__dirname, "..", ".."), "public", ...args);
} else {
  resolveResourcePath = (...args: string[]) => {
    return path
      .join(path.resolve(__dirname, ".."), ...args)
      .replace("app.asar", "app.asar.unpacked");
  };
}

export const logger: Logger = createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "error",
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    format.printf((info) => `${info.timestamp}[${info.level}] ${info.message}`)
  ),
  transports: [new transports.Console()],
});

export function innerFit(
  outBox: { width: number; height: number },
  inBox: { width: number; height: number }
): { useMaxHeight: boolean; box: { width: number; height: number } } {
  let useMaxHeight = false;

  if (inBox.height >= inBox.width) {
    // 直式
    // 判斷inBox高度和outBox相同時，寬度是否會超過outBox寬度
    useMaxHeight = inBox.width / inBox.height <= outBox.width / outBox.height;
  } else {
    // 橫式
    // 判斷inBox寬度和outBox相同時，高度是否會超過outBox高度
    let useMaxWidth = inBox.height / inBox.width <= outBox.height / outBox.width;
    useMaxHeight = !useMaxWidth;
  }

  let box = {
    width: outBox.width,
    height: outBox.height,
  };

  if (useMaxHeight) {
    box.width = (outBox.height / inBox.height) * inBox.width;
  } else {
    box.height = (outBox.width / inBox.width) * inBox.height;
  }

  return {
    useMaxHeight: useMaxHeight,
    box: box,
  };
}


