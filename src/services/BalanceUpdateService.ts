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
import PubSubEventManager from './PubSubEventManager';

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
  request?: string;
}

/* Item refers to the item in the queue */

export interface IBalanceUpdateItemPayload<Env> {
  userId: string;
  type: 'buyRaffleTicket' | 'payWinners' | 'createRaffle' | 'deposit' | 'refund' | 'walletVerification';
  env: Env;
}

class BalanceUpdateService {
  public balanceUpdateQueueRedisKey: string;

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
    } catch (error: unknown) {
      console.log('ERROR', error);
      if (error instanceof SystemError) {
        throw new ProcessRefundError(JSON.stringify(item));
      }
    }
  }

  async sendBalanceUpdateRPCMessage<Env, RPCDataReturned>(balanceUpdatePayload: IBalanceUpdateItemPayload<Env>) {
    return await RabbitMQInstance.sendRPCMessage<RPCDataReturned>(
      this.balanceUpdateQueueRedisKey,
      balanceUpdatePayload,
    );
  }

  async addToQueue<Env>(balanceUpdatePayload: IBalanceUpdateItemPayload<Env>) {
    return await RabbitMQInstance.sendMessage(this.balanceUpdateQueueRedisKey, balanceUpdatePayload);
  }

  async processBalanceUpdateQueue() {
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

    RabbitMQInstance.consumeMessages(this.balanceUpdateQueueRedisKey, async (msg) => {
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
    } catch (error: unknown) {
      console.log('ERROR', error);
      if (error instanceof SystemError) {
        throw new ProcessCreateRaffleItemError(JSON.stringify(item));
      }
      throw error;
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
    } catch (error: unknown) {
      if (error instanceof SystemError) {
        throw new ProcessBuyRaffleTicketItemError(JSON.stringify(item));
      }
      throw error;
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
    } catch (error: unknown) {
      console.log('ERROR', error);
      if (error instanceof SystemError) {
        throw new ProcessPayWinnersItemError(JSON.stringify(item));
      }
      throw error;
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
  }): Promise<{ wasAVerification: boolean; userIdRelatedToVerifiedAddress?: string; request?: string }> {
    if (symbol !== 'PIXEL' || !fromAddress) {
      return { wasAVerification: false };
    }

    const redisKey = getRedisKeyHelper('walletVerification');
    const walletVerificationsInRedis = await RedisInstance.get<IWalletVerificationInRedis[]>(redisKey, {
      isJSON: true,
    });

    if (walletVerificationsInRedis) {
      const findExactVerification = walletVerificationsInRedis.find((wvs) => {
        const roundedTransactionValue = parseFloat(transactionValue.toFixed(6));
        const roundedRandomValue = parseFloat(wvs.randomValue.toFixed(6));

        return wvs.roninWallet === fromAddress && roundedTransactionValue === roundedRandomValue;
      });
      if (!findExactVerification) return { wasAVerification: false };

      return {
        wasAVerification: true,
        userIdRelatedToVerifiedAddress: findExactVerification.userId,
        request: findExactVerification.request,
      };
    }

    return { wasAVerification: false };
  }

  /* Creates the transaction document and update user balance (both in DB and Client) */
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
    } catch (error) {
      console.log('ERROR', error);
      if (error instanceof SystemError) {
        throw new ProcessDepositError(JSON.stringify(item));
      }
      throw error;
    }
  }

  async processWalletVerification(item: IBalanceUpdateItemPayload<IDepositEnv>) {
    try {
      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const nowTime = Date.now();

        const { env, userId } = item;
        const { transactionInfo, request } = env;
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
        await PubSubEventManager.publishEvent(
          'GET_LIVE_MESSAGES',
          {
            success: true,
            type: 'WALLET_VERIFICATION',
            message: 'WALLET_VERIFICATION_SUCCESS',
            request,
            data: '',
          },
          userId,
        );
      });
    } catch (error) {
      console.log('ERROR', error);
      if (error instanceof SystemError) {
        throw new ProcessDepositError(JSON.stringify(item));
      }
    }
  }
}

export default new BalanceUpdateService();
