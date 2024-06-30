import { FirebaseInstance, RabbitMQInstance, RedisInstance } from '..';
import getRedisKeyHelper from '../helpers/redisHelper';
import BalanceService from './BalanceService';
import { IUser } from '../config/interfaces/IUser';
import calcWithDecimalsService from '../common/calcWithDecimals';
import { IPubSubConfig, InsufficientBalanceError } from '../config/errors/classes/ClientErrors';
import { IWalletVerificationInRedis } from '../config/interfaces/IWalletVerification';
import { IDepositTransactionsInDb, ITransactionBase } from '../config/interfaces/ITransaction';
import {
  ProcessBuyRaffleTicketItemError,
  ProcessCreateRaffleItemError,
  ProcessDepositError,
  ProcessPayWinnersItemError,
  ProcessRefundError,
} from '../config/errors/classes/BalanceUpdateServiceErrors';
import { SystemError } from '../config/errors/classes/SystemErrors';

export interface ISpendActionEnv {
  totalAmountBet: number;
}

export interface IReceiveActionEnv {
  totalAmountToReceive: number;
  sendPSubInTimestamp?: number;
}

export interface IDepositEnv {
  transactionInfo: {
    createdAt: ITransactionBase['createdAt'];
    symbol: ITransactionBase['symbol'];
    type: ITransactionBase['type'];
    value: ITransactionBase['value'];
    fromAddress: string | null;
  };
}

/* Item refers to the item in the queue */

interface IBalanceUpdateItemPayload<Env> {
  userId: string;
  type: 'buyRaffleTicket' | 'payWinners' | 'createRaffle' | 'deposit' | 'refund';
  env: Env;
}

export interface IBalanceAuthorization {
  authorized: boolean;
}

class BalanceUpdateService {
  private balanceUpdateQueueRedisKey: string;

  constructor() {
    this.balanceUpdateQueueRedisKey = getRedisKeyHelper('balanceUpdateQueue');
  }

  static async validateBalance(userDocId: string, raffleOwnerCost: number, pubSubConfig: IPubSubConfig) {
    const userBalanceAndData = await BalanceService.getUserBalance(userDocId);
    if (raffleOwnerCost > userBalanceAndData.balance) throw new InsufficientBalanceError(pubSubConfig);

    return userBalanceAndData;
  }

  async processRefund(item: IBalanceUpdateItemPayload<IReceiveActionEnv>) {
    try {
      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { userId, env } = item;
        const { totalAmountToReceive } = env;

        const { docRef: userRef, docData: userData } = await FirebaseInstance.getDocumentRefWithData<IUser>(
          'users',
          userId,
        );

        const { balance } = userData;
        const newBalance = calcWithDecimalsService(balance, 'add', totalAmountToReceive);

        transaction.update(userRef, { balance: newBalance });

        BalanceService.sendBalancePubSubEvent(userId, newBalance);
      });
    } catch (err: unknown) {
      if (err instanceof SystemError) {
        throw new ProcessRefundError(JSON.stringify(item));
      }
    }
  }

  async addToQueue<Env>(balanceUpdatePayload: IBalanceUpdateItemPayload<Env>): Promise<null | IBalanceAuthorization> {
    if (balanceUpdatePayload.type === 'buyRaffleTicket' || balanceUpdatePayload.type === 'createRaffle') {
      return (await RabbitMQInstance.sendRPCMessage('balanceUpdateQueue', balanceUpdatePayload)) as {
        authorized: boolean;
      };
    }

    await RabbitMQInstance.sendMessage('balanceUpdateQueue', balanceUpdatePayload);
    return null;
  }

  processBalanceUpdateQueue() {
    const handleMessage = async (message: string) => {
      const messageToJS = JSON.parse(message) as IBalanceUpdateItemPayload<unknown>;

      switch (messageToJS.type) {
        case 'deposit':
          await this.processDeposit({ ...messageToJS, env: messageToJS.env as IDepositEnv });
          break;

        case 'payWinners':
          await this.processPayWinnersItem({ ...messageToJS, env: messageToJS.env as IReceiveActionEnv });
          break;

        case 'buyRaffleTicket':
          await this.processBuyRaffleTicketItem({ ...messageToJS, env: messageToJS.env as ISpendActionEnv });
          break;

        case 'createRaffle':
          await this.processCreateRaffleItem({ ...messageToJS, env: messageToJS.env as ISpendActionEnv });
          break;

        case 'refund':
          await this.processRefund({ ...messageToJS, env: messageToJS.env as IReceiveActionEnv });
          break;
      }
    };

    RabbitMQInstance.consumeMessages('balanceUpdateQueue', async (msg) => {
      await handleMessage(msg);
    });
  }

  async processCreateRaffleItem(item: IBalanceUpdateItemPayload<ISpendActionEnv>) {
    try {
      const { userId, env } = item;
      const { totalAmountBet } = env;

      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { balance: userBalance, docRef: userRef } = await BalanceUpdateService.validateBalance(
          userId,
          totalAmountBet,
          {
            userId,
            reqType: 'CREATE_RAFFLE',
          },
        );

        const newUserBalance = calcWithDecimalsService(userBalance, 'subtract', totalAmountBet);

        transaction.update(userRef, { balance: newUserBalance });

        BalanceService.sendBalancePubSubEvent(userId, newUserBalance);
      });
    } catch (err: unknown) {
      if (err instanceof SystemError) {
        throw new ProcessCreateRaffleItemError(JSON.stringify(item));
      }
    }
  }

  async processBuyRaffleTicketItem(item: IBalanceUpdateItemPayload<ISpendActionEnv>) {
    try {
      const { userId, env } = item;

      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { totalAmountBet } = env;

        const { balance, docRef: userRef } = await BalanceUpdateService.validateBalance(userId, totalAmountBet, {
          userId,
          reqType: 'BUY_RAFFLE_TICKET',
        });

        const newUserBalance = calcWithDecimalsService(balance, 'subtract', totalAmountBet);
        transaction.update(userRef, { balance: newUserBalance });

        BalanceService.sendBalancePubSubEvent(userId, newUserBalance);
      });
    } catch (err: unknown) {
      if (err instanceof SystemError) {
        throw new ProcessBuyRaffleTicketItemError(JSON.stringify(item));
      }
    }
  }

  async processPayWinnersItem(item: IBalanceUpdateItemPayload<IReceiveActionEnv>) {
    try {
      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { userId, env } = item;
        const { sendPSubInTimestamp, totalAmountToReceive } = env;

        const { docRef: userRef, docData: userData } = await FirebaseInstance.getDocumentRefWithData<IUser>(
          'users',
          userId,
        );

        const { balance } = userData;
        const newBalance = calcWithDecimalsService(balance, 'add', totalAmountToReceive);

        transaction.update(userRef, { balance: newBalance });

        BalanceService.sendBalancePubSubEvent(userId, newBalance, sendPSubInTimestamp);
      });
    } catch (err: unknown) {
      if (err instanceof SystemError) {
        throw new ProcessPayWinnersItemError(JSON.stringify(item));
      }
    }
  }

  async checkForWalletVerification({
    userId,
    fromAddress,
    transactionValue,
    symbol,
  }: {
    userId: string;
    fromAddress: string | null;
    transactionValue: number;
    symbol: unknown;
  }): Promise<{ wasAVerification: boolean; successfulVerification?: boolean }> {
    if (symbol !== 'PIXEL' || !fromAddress) {
      return { wasAVerification: false };
    }

    const redisKey = getRedisKeyHelper('walletVerification', userId);
    const walletVerificationItem = await RedisInstance.get<IWalletVerificationInRedis>(redisKey, { isJSON: true });

    if (walletVerificationItem) {
      const { randomValue, roninWallet } = walletVerificationItem;

      /* A way to fix the round value that sky mavis webhook returns */
      const randomNumberRounded = parseFloat(randomValue.toFixed(7));

      if (transactionValue === randomNumberRounded && fromAddress === roninWallet) {
        return { wasAVerification: true, successfulVerification: true };
      }

      return { wasAVerification: true, successfulVerification: false };
    }

    return { wasAVerification: false };
  }

  async processDeposit(item: IBalanceUpdateItemPayload<IDepositEnv>) {
    try {
      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { env, userId } = item;
        const { transactionInfo } = env;
        const { value, symbol, fromAddress } = transactionInfo;

        const userRefQuery = await FirebaseInstance.getDocumentRefWithData<IUser>('users', userId);
        const { docData: userData, docRef: userRef } = userRefQuery;

        const transactionsCollectionRef = await FirebaseInstance.getCollectionRef('transactions');
        const newTransactionRef = transactionsCollectionRef.doc();

        const transactionInDbPayload: IDepositTransactionsInDb = {
          ...transactionInfo,
          userRef,
        };

        transaction.set(newTransactionRef, transactionInDbPayload);

        const newBalance = calcWithDecimalsService(userData.balance, 'add', value);
        transaction.update(userRef, { balance: newBalance });

        if (value < 1) {
          const { wasAVerification, successfulVerification } = await this.checkForWalletVerification({
            userId,
            symbol,
            transactionValue: value,
            fromAddress: fromAddress,
          });

          if (wasAVerification && successfulVerification) {
            transaction.update(userRef, { 'roninWallet.verified': true });
          }
        }

        BalanceService.sendBalancePubSubEvent(userId, newBalance);
      });
    } catch (err) {
      if (err instanceof SystemError) {
        throw new ProcessDepositError(JSON.stringify(item));
      }
    }
  }
}

export default new BalanceUpdateService();
