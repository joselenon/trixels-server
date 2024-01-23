import ENVIRONMENT from './ENVIRONMENT';

const PROTOCOL = ENVIRONMENT.HTTPS ? 'https://' : 'http://';

const SERVER_URL = `${PROTOCOL}${ENVIRONMENT.SERVER_DOMAIN}`;
const SERVER_PORT = ENVIRONMENT.SERVER_PORT;
const SERVER_FULL_URL =
  ENVIRONMENT.MODE === 'DEVELOPMENT' ? `${SERVER_URL}:${SERVER_PORT}` : SERVER_URL;

const CLIENT_URL = `${PROTOCOL}${ENVIRONMENT.CLIENT_DOMAIN}`;
const CLIENT_PORT = ENVIRONMENT.CLIENT_PORT;
const CLIENT_FULL_URL =
  ENVIRONMENT.MODE === 'DEVELOPMENT' ? `${CLIENT_URL}:${CLIENT_PORT}` : CLIENT_URL;

export const API_BASE = '/api';
const API_URL = `${SERVER_FULL_URL}${API_BASE}`;

const ENDPOINTS = {
  AUTH: '/auth',
};

const API_ENDPOINTS = {
  AUTH: {
    DISCORD: {
      initial: `${ENDPOINTS.AUTH}/discord`,
      callback: `${ENDPOINTS.AUTH}/discord/callback`,
    },
    USERNAME: `${ENDPOINTS.AUTH}/username`,
  },
  USER: {
    GET: `/user`,
  },
  ITEM_HISTORY_PRICES: {
    GET: `/historyprices`,
  },
  SAVE_RESOURCES: {
    POST: `/saveresources`,
  },
  ITEM_LISTINGS: {
    GET: `/itemslistings`,
  },
};

const URLS = {
  MAIN_URLS: {
    CLIENT_PORT,
    CLIENT_URL,
    SERVER_PORT,
    SERVER_URL,
    API_URL,
    CLIENT_FULL_URL,
    SERVER_FULL_URL,
  },
  ENDPOINTS: API_ENDPOINTS,
};

export default URLS;
