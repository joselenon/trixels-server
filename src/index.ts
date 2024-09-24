import ENVIRONMENT from './config/constants/ENVIRONMENT';
import AppService from './services/AppService';
import FirestoreService from './services/FirestoreService';
import RedisService from './services/RedisService';
import BalanceUpdateService from './services/BalanceUpdateService';
import RabbitMQService from './services/RabbitMQService';
import DepositService from './services/DepositService';
import RegisterUserService from './services/UserServices/RegisterUserService';
import UserCredentialsService from './services/UserServices/UserCredentialsService';
import StartRafflesQueuesService from './services/RaffleServices/StartRafflesQueuesService';

const FirebaseInstance = new FirestoreService();

const RedisInstance = new RedisService(
  ENVIRONMENT.REDIS_HOST,
  parseInt(ENVIRONMENT.REDIS_PORT),
  ENVIRONMENT.REDIS_PASSWORD,
);

const RabbitMQInstance = new RabbitMQService({ host: 'localhost', password: 'guest', port: 5672, username: 'guest' });

async function init() {
  await RedisInstance.flushAll();

  await RegisterUserService.startRegisterUserQueue();
  await UserCredentialsService.startUpdateUserCredentialsQueue();

  await BalanceUpdateService.processBalanceUpdateQueue();
  await DepositService.startRedeemRedemptionCodeQueue();

  await StartRafflesQueuesService();
  await AppService.initialize();

  return { FirebaseInstance, RedisInstance };
}

init();

export { FirebaseInstance, RedisInstance, RabbitMQInstance };
