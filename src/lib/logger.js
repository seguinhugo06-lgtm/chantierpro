/**
 * Logger utility - suppresses debug/info logs in production
 * Keeps warn and error always visible
 */
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args) => isDev && console.log(...args),
  info: (...args) => isDev && console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export default logger;
