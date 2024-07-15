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
  pubSubConfig: IPubSubConfig;
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
  type: 'buyRaffleTicket' | 'payWinners' | 'createRaffle' | 'deposit' | 'refund' | 'walletVerification';
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

        case 'walletVerification':
          await this.processWalletVerification({ ...messageToJS, env: messageToJS.env as IDepositEnv });
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
      const { totalAmountBet, pubSubConfig } = env;

      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { balance: userBalance, docRef: userRef } = await BalanceUpdateService.validateBalance(
          userId,
          totalAmountBet,
          pubSubConfig,
        );

        const newUserBalance = calcWithDecimalsService(userBalance, 'subtract', totalAmountBet);

        transaction.update(userRef, { balance: newUserBalance });

        BalanceService.sendBalancePubSubEvent(userId, newUserBalance);
      });
    } catch (err: unknown) {
      if (err instanceof SystemError) {
        throw new ProcessCreateRaffleItemError(JSON.stringify(item));
      }
      throw err;
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
      throw err;
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
      throw err;
    }
  }

  /* REVIEW */
  async checkForWalletVerification({
    fromAddress,
    transactionValue,
    symbol,
  }: {
    fromAddress: string | null;
    transactionValue: number;
    symbol: unknown;
  }): Promise<{ wasAVerification: boolean; userIdRelatedToVerifiedAddress?: string }> {
    if (symbol !== 'PIXEL' || !fromAddress) {
      return { wasAVerification: false };
    }

    const redisKey = getRedisKeyHelper('walletVerification', fromAddress);
    const walletVerificationItems =
      (await RedisInstance.lRange<IWalletVerificationInRedis>(redisKey, { start: 0, end: -1 }, { isJSON: true })) || [];
    const walletVerificationItemRelated = walletVerificationItems.find(
      (item) => parseFloat(item.randomValue.toFixed(7)) === transactionValue,
    );

    if (!walletVerificationItemRelated) return { wasAVerification: false };

    return { wasAVerification: true, userIdRelatedToVerifiedAddress: walletVerificationItemRelated.userId };
  }

  async processDeposit(item: IBalanceUpdateItemPayload<IDepositEnv>) {
    try {
      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { env, userId } = item;
        const { transactionInfo } = env;
        const { value } = transactionInfo;

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

        BalanceService.sendBalancePubSubEvent(userId, newBalance);
      });
    } catch (err) {
      if (err instanceof SystemError) {
        throw new ProcessDepositError(JSON.stringify(item));
      }
      throw err;
    }
  }

  async processWalletVerification(item: IBalanceUpdateItemPayload<IDepositEnv>) {
    try {
      console.log('Entrou,', item);
      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const nowTime = Date.now();

        const { env, userId } = item;
        const { transactionInfo } = env;
        const { value } = transactionInfo;

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

        transaction.update(userRef, { 'roninWallet.verified': true, 'roninWallet.verifiedAt': nowTime });

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
