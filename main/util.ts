/* eslint import/prefer-default-export: off, import/no-mutable-exports: off */
import { URL } from "url";
import path from "path";
import { createLogger, format, transports, Logger } from "winston";

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
    return `file://${path.resolve(__dirname, "./", htmlFileName)}`;
  };
}

export let resolveResourcePath: (...args: string[]) => string;

if (process.env.NODE_ENV === "development") {
  resolveResourcePath = (...args: string[]) =>
    path.join(path.resolve(__dirname, ".."), "public", ...args);
} else {
  resolveResourcePath = (...args: string[]) => {
    return path.join(__dirname, ...args).replace("app.asar", "app.asar.unpacked");
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
