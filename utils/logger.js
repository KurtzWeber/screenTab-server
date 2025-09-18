import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import clc from "cli-color"; // Import the cli-color package

const logColors = {
    error: clc.red,
    warn: clc.yellow,
    info: clc.green,
    verbose: clc.cyan,
    debug: clc.magenta,
    silly: clc.blue,
};

const jsonFormat = winston.format((info) => {
    if (typeof info.message === "object") {
        info.message = JSON.stringify(info.message);
    }
    return info;
});

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        jsonFormat(),
        winston.format.errors({ stack: true }),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf((info) => {
                    const timestamp = info.timestamp
                        .slice(0, 19)
                        .replace("T", " ");
                    const level = logColors[info.level](
                        info.level.toUpperCase() + ":"
                    );
                    const message = info.message.replace(
                        /{"stack":"(.*?)(?= at)/,
                        (match) => clc.red(match)
                    );
                    return `${timestamp} ${level} ${message}`;
                })
            ),
        }),
        new DailyRotateFile({
            filename: "logs/error-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            level: "error",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.printf((info) => {
                    return `${info.timestamp} ${info.level}: ${info.message}`;
                })
            ),
        }),
    ],
});

export default logger;
