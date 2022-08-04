import {createLogger, format, Logger, transports} from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import {configs} from '../config/config';

import * as _ from 'lodash';
const level = configs.isDev ? 'debug' : 'info';

const defaultLogger = (fileName?: string, moduleId?: string) =>
    createLogger({
      level: level,
      format: format.combine(
          format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
          }),
          format.errors({stack: true}),
          format.splat(),
          format.printf(info => {
            let left = `${info.timestamp} `;
            if (info.modulePrefix) {
              left += `${info.modulePrefix} `;
            }
            if (info.moduleId) {
              left += `[${info.moduleId}] `;
            }
            left += `${_.toUpper(info.level)} `;
            if (typeof info.message === 'string') {
              return `${left} ${info.message}`;
            }
            const m = JSON.stringify(info.message);
            return `${left} ${m}`;
          })
      ),
      transports: [
        new transports.Console(),
        new DailyRotateFile({
          filename: `logs/${moduleId ? `${moduleId}/` : ''}${
              fileName ? fileName + '-error' : 'pinner-error'
          }_%DATE%.log`,
          datePattern: 'YYYYMMDD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error',
        }),
        new DailyRotateFile({
          filename: `logs/${moduleId ? `${moduleId}/` : ''}${
              fileName ? fileName : 'pinner-combined'
          }_%DATE%.log`,
          datePattern: 'YYYYMMDD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),
      ],
    });

export interface ChildLoggerConfig {
  moduleId: string;
  modulePrefix?: string;
  fileName?: string;
}

export const logger = createChildLogger({
  moduleId: 'global',
  modulePrefix: '☄',
});

function createChildLoggerWith(
    config: ChildLoggerConfig,
    loggerParent: Logger
): Logger {
  return loggerParent.child(config);
}

export function createChildLogger(config: ChildLoggerConfig): Logger {
  return createChildLoggerWith(config, defaultLogger(config.fileName, config.moduleId));
}
