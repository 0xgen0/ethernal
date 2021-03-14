const logger = console;

/**
 *  set `?logLevel=level` query param to change filtering
 *  default level is `info` (40) and for tests `error` (20)
 */

const logLevel = typeof window !== 'undefined' ? window.params.logLevel || 40 : 20;

module.exports = {
  silent(...args) {
    if (process.browser && logLevel >= 70) {
      logger.silent(...args);
    }
  },
  trace(...args) {
    if (process.browser && logLevel >= 60) {
      logger.info(...args); // logger.trace(...args); // @TODO: configure levels
    }
  },
  debug(...args) {
    if (process.browser && logLevel >= 50) {
      logger.info(...args);
    }
  },
  info(...args) {
    if (process.browser && logLevel >= 40) {
      logger.info(...args);
    }
  },
  warn(...args) {
    if (process.browser && logLevel >= 30) {
      logger.error(...args);
    }
  },
  error(...args) {
    if (process.browser && logLevel >= 20) {
      logger.error(...args);
    }
  },
  fatal(...args) {
    if (process.browser && logLevel >= 10) {
      logger.fatal(...args);
    }
  },
};
