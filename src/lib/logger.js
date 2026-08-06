/**
 * Logger utility - suppresses debug/info logs in production
 * Keeps warn and error always visible
 */
const isDev = import.meta.env.DEV;

export const logger = {
  // Seul endroit de l'app autorisé à appeler console.log : ailleurs, la règle
  // ESLint no-console l'interdit, pour que rien ne fuite dans la console d'un
  // artisan en production.
  // eslint-disable-next-line no-console
  debug: (...args) => isDev && console.log(...args),
  // eslint-disable-next-line no-console
  info: (...args) => isDev && console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

export default logger;
