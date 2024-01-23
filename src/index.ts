import * as admin from 'firebase-admin';

import FirebaseCredentials from './config/app/FirebaseCredentials';
import ENVIRONMENT from './config/constants/ENVIRONMENT';
import AppService from './services/AppService';
import FirestoreService from './services/FirestoreService';
import RedisService from './services/RedisService';
import UpdateItemsInfoService from './services/UpdateItemsInfoService';
import UsersResourcesStartTimeService from './services/UsersResourcesStartTimeService';

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(FirebaseCredentials),
});
const FirebaseInstance = new FirestoreService();

const RedisInstance = new RedisService(
  ENVIRONMENT.REDIS_HOST,
  parseInt(ENVIRONMENT.REDIS_PORT),
  ENVIRONMENT.REDIS_PASSWORD,
);

/* UpdateItemsListingsRedisService.itemsListingsAutoRefresh(); */

async function init() {
  await AppService.initialize();
  await UsersResourcesStartTimeService.initiateService();

  await UpdateItemsInfoService();

  setInterval(
    () => UpdateItemsInfoService(),
    ENVIRONMENT.DELAY_BETWEEN_ITEMS_ATT_IN_MINUTES * 60 * 1000,
  );

  return { FirebaseInstance, RedisInstance };
}

init();

export { FirebaseInstance, RedisInstance, firebaseApp };
