import * as admin from 'firebase-admin';

import FirebaseCredentials from './config/app/FirebaseCredentials';
import ENVIRONMENT from './config/constants/ENVIRONMENT';
import AppService from './services/AppService';
import FirestoreService from './services/FirestoreService';
import RedisService from './services/RedisService';
import { RaffleUtils } from './services/RafflesServices';
import BalanceUpdateService from './services/BalanceUpdateService';

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(FirebaseCredentials),
});
const FirebaseInstance = new FirestoreService();

const RedisInstance = new RedisService(
  ENVIRONMENT.REDIS_HOST,
  parseInt(ENVIRONMENT.REDIS_PORT),
  ENVIRONMENT.REDIS_PASSWORD,
);

async function init() {
  await RedisInstance.flushAll();

  BalanceUpdateService.startService();

  await RaffleUtils.startRafflesServices();
  await AppService.initialize();

  return { FirebaseInstance, RedisInstance };
}

init();

export { FirebaseInstance, RedisInstance, firebaseApp };
