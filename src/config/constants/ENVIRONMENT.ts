import dotenv from 'dotenv';
import path from 'path';
import { EnvVariablesMissingError } from '../errors/classes/SystemErrors';

const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const ENVIRONMENT = {
  MODE: process.env.MODE as 'DEVELOPMENT' | 'PRODUCTION',
  DOMAIN: process.env.DOMAIN || 'localhost',
  HTTPS: process.env.HTTPS === 'true' ? true : false,
  SERVER_DOMAIN: process.env.SERVER_DOMAIN || 'localhost',
  SERVER_PORT: process.env.SERVER_PORT || '4000',
  CLIENT_DOMAIN: process.env.CLIENT_DOMAIN || 'localhost',
  CLIENT_PORT: process.env.CLIENT_PORT || '3000',
  REDIS_HOST: process.env.REDIS_HOST as string,
  REDIS_PORT: process.env.REDIS_PORT as string,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD as string,
  SENTRY_DSN: process.env.SENTRY_DSN as string,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID as string,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY as string,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL as string,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  WALLETS_ENCRYPTION_KEY: process.env.WALLETS_ENCRYPTION_KEY as string,
  WALLETS_ENCRYPTION_KEY_VERSION: process.env.WALLETS_ENCRYPTION_KEY as string,
};

const requiredVariables = [
  'MODE',
  'DOMAIN',
  'HTTPS',
  'SERVER_DOMAIN',
  'SERVER_PORT',
  'CLIENT_DOMAIN',
  'REDIS_HOST',
  'REDIS_PORT',
  'SENTRY_DSN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'GOOGLE_API_KEY',
  'JWT_SECRET',
  'WALLETS_ENCRYPTION_KEY',
  'WALLETS_ENCRYPTION_KEY_VERSION',
];

const missingVariables = requiredVariables.filter((variable) => !process.env[variable]);

if (missingVariables.length > 0) {
  throw new EnvVariablesMissingError(missingVariables);
}

export default ENVIRONMENT;
