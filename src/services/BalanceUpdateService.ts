import { FirebaseInstance, RabbitMQInstance, RedisInstance } from '..';
import { UnknownError } from '../config/errors/classes/SystemErrors';
import { IBetInDB, IBetToFrontEnd, IBuyRaffleTicketsPayloadRedis } from '../config/interfaces/IBet';
import { IRaffleInDb, IRaffleToFrontEnd } from '../config/interfaces/IRaffles';
import getRedisKeyHelper from '../helpers/redisHelper';
import BalanceService from './BalanceService';
import BetValidatorService from './BetValidatorService';
import { RaffleUtils } from './RafflesServices';
import { IUser } from '../config/interfaces/IUser';
import calcWithDecimalsService from '../common/calcWithDecimals';
import { ClientError } from '../config/errors/classes/ClientErrors';
import PubSubEventManager, { IPubSubCreateRaffleData } from './PubSubEventManager';
import RaffleTicketNumbersService from './RaffleTicketNumbersService';
import BetsService from './BetsService';
import { ITransactionInDb } from '../config/interfaces/ITransaction';
import { IWalletVerificationInRedis } from '../config/interfaces/IWalletVerification';

export interface IBuyRaffleTicketEnv {
  buyRaffleTicketPayload: IBuyRaffleTicketsPayloadRedis;
  raffleInRedis: IRaffleToFrontEnd;
  betMadeAt: number;
}

export interface IPayWinnersEnv {
  betUpdatedObj: IBetToFrontEnd;
}

export interface ICreateRaffleEnv {
  raffleObjToDb: IRaffleInDb;
  raffleOwnerCost: number;
}

export interface IDepositEnv {
  transactionInfo: {
    createdAt: number;
    symbol: 'RON' | 'PIXEL' | 'AXS' | unknown;
    type: 'deposit' | 'withdraw';
    value: number;
    fromAddress: string;
  };
}

/* Item refers to the item in the queue */

interface IBalanceUpdateItemPayload<Env> {
  userId: string;
  type: 'buyRaffleTicket' | 'payWinners' | 'createRaffle' | 'deposit';
  env: Env;
  sendInTimestamp?: number;
}

class BalanceUpdateService {
  private balanceUpdateQueueRedisKey: string;

  constructor() {
    this.balanceUpdateQueueRedisKey = getRedisKeyHelper('balanceUpdateQueue');
  }

  async addToQueue<Env>(balanceUpdatePayload: IBalanceUpdateItemPayload<Env>) {
    await RabbitMQInstance.sendMessage(this.balanceUpdateQueueRedisKey, JSON.stringify(balanceUpdatePayload));
  }

  processBalanceUpdateQueue() {
    const handleMessage = async (message: string) => {
      try {
        const messageToJS = JSON.parse(message) as IBalanceUpdateItemPayload<unknown>;

        switch (messageToJS.type) {
          case 'deposit':
            await this.processDeposit({ ...messageToJS, env: messageToJS.env as IDepositEnv });
            break;

          case 'payWinners':
            await this.processPayWinnersItem({ ...messageToJS, env: messageToJS.env as IPayWinnersEnv });
            break;

          case 'buyRaffleTicket':
            await this.processBuyRaffleTicketItem({ ...messageToJS, env: messageToJS.env as IBuyRaffleTicketEnv });
            break;

          case 'createRaffle':
            await this.processCreateRaffleItem({ ...messageToJS, env: messageToJS.env as ICreateRaffleEnv });
            break;
        }
      } catch (err: unknown) {
        if (!(err instanceof ClientError)) {
          throw err;
        }
      }
    };

    RabbitMQInstance.consumeMessages(this.balanceUpdateQueueRedisKey, handleMessage);
  }

  async processCreateRaffleItem(item: IBalanceUpdateItemPayload<ICreateRaffleEnv>) {
    const { userId, env } = item;
    const { raffleObjToDb, raffleOwnerCost } = env;

    let newRaffleId = '';

    await FirebaseInstance.firestore.runTransaction(async (transaction) => {
      const userBalance = await RaffleUtils.verifyRaffleOwnerBalance(userId, raffleOwnerCost, {
        userId,
        reqType: 'CREATE_RAFFLE',
      });

      const rafflesCollectionRef = await FirebaseInstance.getCollectionRef('raffles');
      const newRaffleRef = rafflesCollectionRef.doc();
      newRaffleId = newRaffleRef.id;

      const betsCollectionRef = await FirebaseInstance.getCollectionRef('bets');
      const newBetRef = betsCollectionRef.doc();

      const raffleToFrontEndObj: IRaffleToFrontEnd = await RaffleUtils.filterRaffleToFrontEnd(
        newRaffleId,
        raffleObjToDb,
      );
      await RaffleUtils.updateSpecificRaffleInRedis(newRaffleId, raffleToFrontEndObj, 'active');

      const userRefResult = (await FirebaseInstance.getDocumentRef('users', userId)).result;
      const newUserBalance = calcWithDecimalsService(userBalance, 'subtract', raffleOwnerCost);

      transaction.set(newRaffleRef, raffleObjToDb);
      transaction.update(userRefResult, { balance: newUserBalance });

      const betInDbObj = await BetsService.makeBetObjToDb({
        userRef: userRefResult,
        gameRef: newRaffleRef,
        gameType: 'raffles',
        amountBet: raffleOwnerCost,
      });
      transaction.set(newBetRef, betInDbObj);

      BalanceService.sendBalancePubSubEvent(userId, newUserBalance);
    });

    const pubSubData: IPubSubCreateRaffleData = { gameId: newRaffleId };
    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: true,
        message: 'RAFFLE_CREATION_SUCCESS',
        type: 'CREATE_RAFFLE',
        data: JSON.stringify(pubSubData),
      },
      userId,
    );
  }

  async processBuyRaffleTicketItem(item: IBalanceUpdateItemPayload<IBuyRaffleTicketEnv>) {
    const { userId, env } = item;

    await FirebaseInstance.firestore.runTransaction(async (transaction) => {
      const { buyRaffleTicketPayload, raffleInRedis, betMadeAt } = env;
      const { gameId } = raffleInRedis;

      const { ticketPrice } = raffleInRedis.info;
      const { info } = buyRaffleTicketPayload;
      const { randomTicket } = info;

      const { result: userRef, docData: userDocumentData } = await FirebaseInstance.getDocumentRefWithData<IUser>(
        'users',
        userId,
      );
      if (!userDocumentData) throw new UnknownError('User not found.');

      const raffleRefResult = (await FirebaseInstance.getDocumentRef('raffles', gameId)).result;

      const TicketNumberInstance = new RaffleTicketNumbersService(userId, env.raffleInRedis);
      const ticketNumbersFiltered = await TicketNumberInstance.getTicketNumbersFiltered(buyRaffleTicketPayload);
      const amountBet = ticketPrice * info.ticketNumbers.length;

      await BetValidatorService.checkRaffleBuyRequestValidity({
        userId,
        userBalance: userDocumentData.balance,
        betMadeAt,
        buyRaffleTicketPayload,
        raffleInRedis,
      });

      const betObjToDb: IBetInDB = {
        gameRef: raffleRefResult,
        amountBet,
        prize: 0,
        info: { type: 'raffles', tickets: ticketNumbersFiltered, randomTicket },
        userRef: userRef,
        createdAt: betMadeAt,
      };

      const { result: raffleDocumentRef, docData: raffleDocumentData } =
        await FirebaseInstance.getDocumentRefWithData<IRaffleInDb>('raffles', gameId);

      const collectionRef = await FirebaseInstance.getCollectionRef('bets');
      const newBetRef = collectionRef.doc();
      transaction.set(newBetRef, betObjToDb);

      const betCreatedDocId = newBetRef.id;

      if (raffleDocumentData && userDocumentData) {
        transaction.update(raffleDocumentRef, {
          'info.bets': [...raffleDocumentData.info.bets, newBetRef],
          'info.ticketsBought': (raffleDocumentData.info.ticketsBought += betObjToDb.info.tickets.length),
        });

        const newUserBalance = calcWithDecimalsService(userDocumentData.balance, 'subtract', amountBet);
        transaction.update(userRef, { balance: newUserBalance });
        BalanceService.sendBalancePubSubEvent(userId, newUserBalance);

        const filteredBet = await BetsService.makeBetObjToFrontEnd(betObjToDb, betCreatedDocId);
        await RaffleUtils.addBetInRaffle(gameId, filteredBet);
      }
    });
  }

  async processPayWinnersItem(item: IBalanceUpdateItemPayload<IPayWinnersEnv>) {
    await FirebaseInstance.firestore.runTransaction(async (transaction) => {
      const { userId, sendInTimestamp, env } = item;
      const { betUpdatedObj } = env;

      const { betId, prize } = betUpdatedObj;

      const { result: userRefResult, docData: userData } = await FirebaseInstance.getDocumentRefWithData<IUser>(
        'users',
        userId,
      );
      const betRefResult = (await FirebaseInstance.getDocumentRef('bets', betId)).result;

      const { balance } = userData;
      const newBalance = calcWithDecimalsService(balance, 'add', prize);

      transaction.update(betRefResult, { prize });
      transaction.update(userRefResult, { balance: newBalance });

      BalanceService.sendBalancePubSubEvent(userId, newBalance, sendInTimestamp);
    });
  }

  async checkForWalletVerification({
    userId,
    wallet,
    transactionValue,
    symbol,
  }: {
    userId: string;
    wallet: string;
    transactionValue: number;
    symbol: unknown;
  }): Promise<{ wasAVerification: boolean; successfulVerification?: boolean }> {
    if (symbol !== 'PIXEL') {
      return { wasAVerification: false };
    }

    const redisKey = getRedisKeyHelper('walletVerification', userId);
    const walletVerificationItem = await RedisInstance.get<IWalletVerificationInRedis>(redisKey, { isJSON: true });

    if (walletVerificationItem) {
      const { randomValue, roninWallet } = walletVerificationItem;

      /* A way to fix the round value that sky mavis webhook returns */
      const randomNumberRounded = parseFloat(randomValue.toFixed(7));

      if (transactionValue === randomNumberRounded && wallet === roninWallet) {
        return { wasAVerification: true, successfulVerification: true };
      }

      return { wasAVerification: true, successfulVerification: false };
    }

    return { wasAVerification: false };
  }

  async processDeposit(item: IBalanceUpdateItemPayload<IDepositEnv>) {
    console.log('Processing Deposit...');

    await FirebaseInstance.firestore.runTransaction(async (transaction) => {
      const { env, userId } = item;
      const { transactionInfo } = env;
      const { value, symbol, fromAddress } = transactionInfo;

      const userRefQuery = await FirebaseInstance.getDocumentRefWithData<IUser>('users', userId);
      const { docData: userData, result: userRef } = userRefQuery;

      const transactionsCollectionRef = await FirebaseInstance.getCollectionRef('transactions');
      const newTransactionRef = transactionsCollectionRef.doc();

      const transactionInDbPayload: ITransactionInDb = {
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
          wallet: fromAddress,
        });

        if (wasAVerification && successfulVerification) {
          transaction.update(userRef, { 'roninWallet.verified': true });
        }
      }

      BalanceService.sendBalancePubSubEvent(userId, newBalance);
      console.log('Paid to depositor');
    });
  }
}

export default new BalanceUpdateService();
