import { createLogger, format, transports, Logger } from "winston";

export const logger: Logger = createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "error",
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    format.printf((info) => `${info.timestamp}[${info.level}] ${info.message}`)
  ),
  transports: [new transports.Console()],
});
