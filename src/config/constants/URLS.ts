import ENVIRONMENT from './ENVIRONMENT';

const PROTOCOL = ENVIRONMENT.HTTPS ? 'https://' : 'http://';
const DOMAIN = ENVIRONMENT.DOMAIN;

// SERVER
// https://serverdomain.com OU http://localhost
const SERVER_URL_WITH_PROTOCOL = `${PROTOCOL}${ENVIRONMENT.SERVER_URL}`;

// SERVER PORT
const SERVER_PORT = ENVIRONMENT.SERVER_PORT;

// https://serverdomain.com OU http://localhost:PORT
const SERVER_FULL_URL =
  ENVIRONMENT.MODE === 'DEVELOPMENT' ? `${SERVER_URL_WITH_PROTOCOL}:${SERVER_PORT}` : SERVER_URL_WITH_PROTOCOL;

// https://serverdomain.com/api OU http://localhost:PORT/api
export const API_BASE = '';
export const API_URL = `${SERVER_FULL_URL}${API_BASE}`;

// CLIENT
// https://clientdomain.com OU http://localhost
const CLIENT_URL_WITH_PROTOCOL = `${PROTOCOL}${ENVIRONMENT.CLIENT_URL}`;
// CLIENT PORT
const CLIENT_PORT = ENVIRONMENT.CLIENT_PORT;
// https://client.domain.com OU http://localhost:PORT
export const CLIENT_FULL_URL =
  ENVIRONMENT.MODE === 'PRODUCTION' ? CLIENT_URL_WITH_PROTOCOL : `${CLIENT_URL_WITH_PROTOCOL}:${CLIENT_PORT}`;

export const WS_PROTOCOL = ENVIRONMENT.HTTPS ? 'wss://' : 'ws://';
const WS_API_URL_WITH_PROTOCOl = `${WS_PROTOCOL}${ENVIRONMENT.SERVER_URL}:${
  ENVIRONMENT.MODE === 'PRODUCTION' ? '' : SERVER_PORT
}${API_BASE}`;

const ENDPOINTS = {
  AUTH: '/auth',
  USER: '/user',
  RAFFLES: '/raffles',
  GRAPHQL: '/graphql',
  WEBHOOKS: '/webhooks',
  DEPOSIT: '/deposit',
  TRANSACTIONS: '/transactions',
};

const API_ENDPOINTS = {
  AUTH: {
    DISCORD: {
      initial: `${ENDPOINTS.AUTH}/discord`,
      callback: `${ENDPOINTS.AUTH}/discord/callback`,
    },
    REGISTER: `${ENDPOINTS.AUTH}/register`,
    LOGIN: `${ENDPOINTS.AUTH}/login`,
    LOGOUT: `${ENDPOINTS.AUTH}/logout`,
    REFRESH_ACCESS_TOKEN: `${ENDPOINTS.AUTH}/accesstoken/refresh`,
    VALIDATE_ACCESS_TOKEN: `${ENDPOINTS.AUTH}/accesstoken/validate`,
    GOOGLE_LOGIN: {
      initial: `${ENDPOINTS.AUTH}/google`,
      callback: `${ENDPOINTS.AUTH}/google/callback`,
    },
  },
  USER: {
    GET_USER_INFO: `${ENDPOINTS.USER}`,
    GET_USER_CREDENTIALS: `${ENDPOINTS.USER}/credentials`,
    UPDATE_USER_CREDENTIALS: `${ENDPOINTS.USER}/credentials`,
    VERIFY_WALLET: `${ENDPOINTS.USER}/verifywallet`,
    VERIFY_WALLET_CHECK: `${ENDPOINTS.USER}/verifywallet/check`,
    GET_USER_TRANSACTIONS: `${ENDPOINTS.TRANSACTIONS}`,
  },
  RAFFLES: {
    GET_AVAILABLE_ITEMS: `${ENDPOINTS.RAFFLES}/items`,
    CREATE_RAFFLE: `${ENDPOINTS.RAFFLES}/create`,
    BUY_TICKETS: `${ENDPOINTS.RAFFLES}/buy`,
  },
  GRAPHQL: `${ENDPOINTS.GRAPHQL}`,
  WEBHOOKS: {
    SKY_MAVIS: `${ENDPOINTS.WEBHOOKS}/skymavis`,
  },
  DEPOSIT: {
    REDEEM_CODE: `${ENDPOINTS.DEPOSIT}/redeemcode`,
    GET_DEPOSIT_WALLET: `${ENDPOINTS.DEPOSIT}/getwallet`,
  },
  TRANSACTIONS: {},
};

const URLS = {
  MAIN_URLS: {
    CLIENT_PORT,
    CLIENT_URL_WITH_PROTOCOL,
    SERVER_PORT,
    SERVER_URL_WITH_PROTOCOL,
    API_URL,
    CLIENT_FULL_URL,
    SERVER_FULL_URL,
    DOMAIN,
  },
  ENDPOINTS: API_ENDPOINTS,
};

export default URLS;
