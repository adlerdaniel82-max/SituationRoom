const fs = require('fs');
const path = require('path');
const winston = require('winston');
const config = require('../config/env');

const LOG_DIRECTORY = path.resolve(__dirname, '../../../../logs');
const MAX_LOG_SIZE = 25 * 1024 * 1024;
const MAX_LOG_FILES = 5;

fs.mkdirSync(LOG_DIRECTORY, { recursive: true });

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'situation-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_DIRECTORY, 'error.log'),
      level: 'error',
      maxsize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      tailable: true
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIRECTORY, 'combined.log'),
      maxsize: MAX_LOG_SIZE,
      maxFiles: MAX_LOG_FILES,
      tailable: true
    })
  ]
});

if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
