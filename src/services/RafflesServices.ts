import { FirebaseInstance, RabbitMQInstance, RedisInstance } from '..';
import itemsInfo, { IItemsInfo } from '../assets/itemsInfo';
import { getAllPrizesItems } from '../common/raffleObjInteractions';
import { TotalTimeToRoll } from '../config/app/games/RaffleConfig';
import { GameAlreadyFinished, IPubSubConfig, InsufficientBalanceError } from '../config/errors/classes/ClientErrors';
import { InvalidPayloadError, RaffleLostError, UnknownError } from '../config/errors/classes/SystemErrors';
import {
  IBetInDB,
  IBetToFrontEnd,
  IBuyRaffleTicketsPayload,
  IBuyRaffleTicketsPayloadRedis,
} from '../config/interfaces/IBet';
import {
  IRaffleInDb,
  IRaffleToFrontEnd,
  TRaffleWinnersPrizes,
  TRaffleWinnerPrizes,
  IRafflesInRedis,
  TWinnerBetsInRedis,
  TWinnerBetsInDb,
} from '../config/interfaces/IRaffles';
import {
  IRaffleCreationPayload,
  TRaffleCreationPrizeX,
  TRaffleCreationPrizesWinners,
  TRaffleCreationWinnerPrizes,
} from '../config/interfaces/IRaffleCreation';
import getRedisKeyHelper from '../helpers/redisHelper';
import formatIrrationalCryptoAmount from '../common/formatIrrationalCryptoAmount';
import BalanceService from './BalanceService';
import calcWithDecimalsService from '../common/calcWithDecimals';
import BalanceUpdateService, {
  IBalanceAuthorization,
  IReceiveActionEnv,
  ISpendActionEnv,
} from './BalanceUpdateService';
import PubSubEventManager, { IPubSubCreateRaffleData } from './PubSubEventManager';
import BetsService from './BetsService';
import RaffleTicketNumbersService from './RaffleTicketNumbersService';
import BetValidatorService from './BetValidatorService';

class RaffleUtils {
  static verifyItemsAvailability(prizesIds: string[]) {
    const itemsAvailableKeys = Object.keys(itemsInfo);

    prizesIds.forEach((prizeId) => {
      if (!itemsAvailableKeys.includes(prizeId)) {
        throw new InvalidPayloadError();
      }
    });
  }

  static verifyBuyRaffleTicketPayload(payload: any): void {
    const hasProperty = (obj: any, key: any) => {
      return key in obj;
    };

    const isValidPayload = (payload: any): payload is IBuyRaffleTicketsPayload => {
      return (
        hasProperty(payload, 'gameId') &&
        hasProperty(payload, 'info') &&
        typeof payload.gameId === 'string' &&
        typeof payload.info === 'object' &&
        typeof payload.info.randomTicket === 'boolean' &&
        (typeof payload.info.quantityOfTickets === 'number' || payload.info.quantityOfTickets === undefined) &&
        Array.isArray(payload.info.ticketNumbers) &&
        payload.info.ticketNumbers.every((ticket: any) => typeof ticket === 'number')
      );
    };

    if (!payload.info.randomTicket && (!payload.info.ticketNumbers || payload.info.ticketNumbers.length <= 0)) {
      throw new InvalidPayloadError();
    }

    if (!isValidPayload(payload)) {
      throw new InvalidPayloadError();
    }
  }

  static verifyRaffleCreationPayloadRules(payload: IRaffleCreationPayload) {
    const { discountPercentage, prizes, totalTickets } = payload;

    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new InvalidPayloadError();
    }
    if (totalTickets > 50 || totalTickets < 5) {
      throw new InvalidPayloadError();
    }

    const allPrizesItems = getAllPrizesItems(prizes);
    this.verifyItemsAvailability(allPrizesItems);
  }

  /* Rever a necessidade de passar 'findIn' como parâmetro */
  static async getSpecificRaffleInRedis(payload: {
    reqType: IPubSubConfig['reqType'] | 'FINISH_RAFFLE';
    gameId: string;
    findIn: 'active' | 'ended';
    userId?: string;
  }): Promise<IRaffleToFrontEnd> {
    const { gameId, findIn, reqType, userId } = payload;

    const rafflesRedisKey = getRedisKeyHelper('allRaffles');
    const allRaffles = await RedisInstance.get<IRafflesInRedis>(rafflesRedisKey, { isJSON: true });
    if (!allRaffles) throw new UnknownError('No raffles in Redis.');

    const { activeRaffles, endedRaffles } = allRaffles;

    if (findIn === 'active') {
      const raffleFound = activeRaffles.find((raffle) => raffle.gameId === gameId);
      if (!raffleFound) {
        if ((reqType === 'BUY_RAFFLE_TICKET' || reqType === 'CREATE_RAFFLE') && userId) {
          throw new GameAlreadyFinished({ reqType, userId });
        }

        throw new RaffleLostError(JSON.stringify(payload));
      }

      return raffleFound;
    }

    if (findIn === 'ended') {
      const raffleFound = endedRaffles.find((raffle) => raffle.gameId === gameId);
      if (!raffleFound) throw new UnknownError('Raffle not found.');

      return raffleFound;
    }

    throw new UnknownError('Invalid request');
  }

  static async verifyRaffleOwnerBalance(
    userDocId: string,
    raffleOwnerCost: number,
    pubSubConfig: IPubSubConfig,
  ): Promise<number> {
    const { balance: raffleOwnerBalance } = await BalanceService.getUserBalance(userDocId);
    if (raffleOwnerCost > raffleOwnerBalance) throw new InsufficientBalanceError(pubSubConfig);

    return raffleOwnerBalance;
  }

  static calculatePrizeX(prizeX: TRaffleCreationPrizeX): number {
    /* Parar de chamar toda hora e colocar somente uma propriedade de availableItems na classe toda */
    const availableItems = itemsInfo as IItemsInfo;

    const { prizeId, quantity } = prizeX;
    const itemValue = availableItems[prizeId].price;
    return itemValue * quantity;
  }

  static getWinnerXPrize(info: TRaffleCreationWinnerPrizes['info']) {
    const prizesWinnerXKeys = Object.keys(info);

    const winnerXPrizeInfo: TRaffleWinnerPrizes['info'] = {};

    const totalValueOfWinnerXPrizes = prizesWinnerXKeys.reduce((totalValueWinnerXPrizes, prizeXKey) => {
      const prizeX = info[prizeXKey];
      const { prizeId, quantity } = prizeX;

      const totalValuePrizeX = RaffleUtils.calculatePrizeX(prizeX);
      winnerXPrizeInfo[prizeXKey] = { prizeId, quantity, totalValue: totalValuePrizeX };

      return totalValueWinnerXPrizes + totalValuePrizeX;
    }, 0);

    const winnerXPrizeObj: TRaffleWinnerPrizes = {
      info: winnerXPrizeInfo,
      totalValue: totalValueOfWinnerXPrizes,
    };

    return { winnerXPrizeObj };
  }

  static getPrizesValues(prizes: TRaffleCreationPrizesWinners) {
    const winnersKeys = Object.keys(prizes);

    const winnersPrizesObj: TRaffleWinnersPrizes = {};

    const prizesTotalValue = winnersKeys.reduce((total, winnerXKey) => {
      const winnerXInfo = prizes[winnerXKey]['info'];
      const { winnerXPrizeObj } = RaffleUtils.getWinnerXPrize(winnerXInfo);
      const { totalValue } = winnerXPrizeObj;

      winnersPrizesObj[winnerXKey] = winnerXPrizeObj;

      return total + totalValue;
    }, 0);

    return { prizesTotalValue, winnersPrizesObj };
  }

  static calculateTicketPriceAndRaffleOwnerCost(
    prizesTotalValue: number,
    discountPercentage: number,
    totalTickets: number,
  ) {
    const raffleDiscountValue = calcWithDecimalsService(prizesTotalValue, 'multiply', discountPercentage) / 100;
    const raffleDiscountValueRounded = formatIrrationalCryptoAmount(raffleDiscountValue);

    const totalRafflePriceAfterDiscount = calcWithDecimalsService(
      prizesTotalValue,
      'subtract',
      raffleDiscountValueRounded,
    );

    const ticketPrice = calcWithDecimalsService(totalRafflePriceAfterDiscount, 'divide', totalTickets);

    return { ticketPrice, raffleOwnerCost: raffleDiscountValueRounded };
  }

  static getRaffleDetails(payload: IRaffleCreationPayload) {
    const { prizes, discountPercentage, totalTickets } = payload;

    const { prizesTotalValue, winnersPrizesObj } = RaffleUtils.getPrizesValues(prizes);

    const { ticketPrice, raffleOwnerCost } = RaffleUtils.calculateTicketPriceAndRaffleOwnerCost(
      prizesTotalValue,
      discountPercentage,
      totalTickets,
    );

    return {
      raffleOwnerCost,
      winnersPrizesObj,
      prizesTotalValue,
      ticketPrice,
    };
  }

  static async filterBetsDBToData(raffleBetsInDb: IRaffleInDb['info']['bets']): Promise<IBetToFrontEnd[]> {
    const results = await Promise.all(
      raffleBetsInDb.map(async (betRef) => {
        const docId = betRef.id;
        const betInDb = await FirebaseInstance.getDocumentById<IBetInDB>('bets', docId);
        if (!betInDb || !betInDb.docData) return undefined;

        const betToFrontEnd = await BetsService.makeBetObjToFrontEnd(betInDb.docData, docId);
        return betToFrontEnd;
      }),
    );
    return results.filter((result): result is IBetToFrontEnd => result !== undefined);
  }

  static async filterWinnersBets(
    winnersBets: IRaffleInDb['info']['winnersBetsInfo'],
  ): Promise<IRaffleToFrontEnd['info']['winnersBetsInfo'] | undefined> {
    if (!winnersBets) return undefined;

    const winnersBetsFiltered: IRaffleToFrontEnd['info']['winnersBetsInfo'] = [];

    for (const winnerBet of winnersBets) {
      const { betRef, hash, drawnNumber } = winnerBet;
      const betResponse = await FirebaseInstance.getDocumentById<IBetInDB>('bets', betRef.id);
      if (!betResponse) throw new UnknownError('Winner bet not found while filtering winners bets.');

      const { docId: betDocId, docData: betInDb } = betResponse;

      const filteredWinnerBet = await BetsService.makeBetObjToFrontEnd(betInDb, betDocId);

      winnersBetsFiltered.push({ betRef: filteredWinnerBet, hash, drawnNumber });
    }

    return winnersBetsFiltered;
  }

  static async filterRaffleToFrontEnd(gameId: string, raffleInDb: IRaffleInDb): Promise<IRaffleToFrontEnd> {
    if (!raffleInDb) throw new UnknownError('Raffle not found while filtering to Front End');

    const raffleInDbData = raffleInDb;

    const { createdAt, finishedAt } = raffleInDbData;
    const { bets, winnersBetsInfo, prizes } = raffleInDbData.info;

    const filteredFinishedAt = finishedAt ? finishedAt.toString() : undefined;
    const filteredCreatedAt = createdAt.toString();

    const filterPrizes = (prizes: TRaffleWinnersPrizes) => {
      return JSON.stringify(prizes);
    };

    const filteredBets = await RaffleUtils.filterBetsDBToData(bets);

    const filteredPrizes = await filterPrizes(prizes);
    const filteredWinnersBets = await RaffleUtils.filterWinnersBets(winnersBetsInfo);

    const filteredInfo: IRaffleToFrontEnd['info'] = {
      ...raffleInDbData.info,
      bets: filteredBets,
      winnersBetsInfo: filteredWinnersBets,
      prizes: filteredPrizes,
    };

    return {
      ...raffleInDbData,
      info: filteredInfo,
      gameId,
      createdAt: filteredCreatedAt,
      finishedAt: filteredFinishedAt,
    };
  }

  static async getRafflesFromRedis(): Promise<IRafflesInRedis | null> {
    const rafflesRedisKey = getRedisKeyHelper('allRaffles');
    const rafflesFromRedis = await RedisInstance.get<IRafflesInRedis>(rafflesRedisKey, { isJSON: true });
    if (!rafflesFromRedis) return null;

    return rafflesFromRedis;
  }

  static async updateSpecificRaffleInRedis(
    gameId: string,
    raffleObj: IRaffleToFrontEnd,
    statusToPutUpdatedRaffle: 'active' | 'ended',
  ) {
    const allRafflesRedisKey = getRedisKeyHelper('allRaffles');
    const allExistantRaffles = await RedisInstance.get<IRafflesInRedis>(allRafflesRedisKey, { isJSON: true });
    if (!allExistantRaffles) throw new UnknownError('Raffles not in Redis.');

    const { activeRaffles, endedRaffles } = allExistantRaffles;

    const updatedActiveRaffles = activeRaffles.filter((raffle) => raffle.gameId !== gameId);
    const updatedEndedRaffles = endedRaffles.filter((raffle) => raffle.gameId !== gameId);

    switch (statusToPutUpdatedRaffle) {
      case 'active':
        updatedActiveRaffles.push(raffleObj);
        break;
      case 'ended':
        updatedEndedRaffles.push(raffleObj);
        break;
    }

    const updatedRafflesObj: IRafflesInRedis = {
      activeRaffles: updatedActiveRaffles,
      endedRaffles: updatedEndedRaffles,
    };

    await RedisInstance.set(allRafflesRedisKey, updatedRafflesObj, { isJSON: true });
    PubSubEventManager.publishEvent('GET_LIVE_RAFFLES', {
      success: true,
      type: 'GET_LIVE_RAFFLES',
      message: 'GET_MSG',
      data: updatedRafflesObj,
    });

    return updatedRafflesObj;
  }

  static async updateSpecificRaffleInDb(gameId: string, raffleObj: IRaffleInDb) {
    await FirebaseInstance.firestore.runTransaction(async (transaction) => {
      const { docRef } = await FirebaseInstance.getDocumentRefWithData('raffles', gameId);
      transaction.update(docRef, { ...raffleObj });
    });
  }

  static async addBetInRaffle(gameToUpdateId: string, betToAdd: IBetToFrontEnd) {
    const rafflesFromRedis = await RaffleUtils.getRafflesFromRedis();
    if (!rafflesFromRedis) throw new UnknownError('Raffle not found to update bets.');

    const raffleToUpdate = rafflesFromRedis.activeRaffles.find((raffle) => raffle.gameId === gameToUpdateId);
    if (!raffleToUpdate) throw new UnknownError('Raffle not found to update bets.');

    const raffleInfoUpdatedObj: IRaffleToFrontEnd['info'] = {
      ...raffleToUpdate.info,
      bets: [betToAdd, ...raffleToUpdate.info.bets],
      ticketsBought: (raffleToUpdate.info.ticketsBought += betToAdd.info.tickets.length),
    };
    const raffleUpdatedObj: IRaffleToFrontEnd = { ...raffleToUpdate, info: raffleInfoUpdatedObj };

    await RaffleUtils.updateSpecificRaffleInRedis(gameToUpdateId, raffleUpdatedObj, 'active');
  }

  static async getAllRafflesAndSaveInRedis() {
    const raffles = await FirebaseInstance.getAllDocumentsByCollection<IRaffleInDb>('raffles');
    const allRafflesRedisKey = getRedisKeyHelper('allRaffles');

    if (!raffles) {
      return await RedisInstance.set(allRafflesRedisKey, { activeRaffles: [], endedRaffles: [] }, { isJSON: true });
    }

    const filteredRaffles = await Promise.all(
      raffles.result.map(async (raffle) => {
        const gameId = raffle.docId;
        const raffleInDb = raffle.docData;
        return await RaffleUtils.filterRaffleToFrontEnd(gameId, raffleInDb);
      }),
    );

    const validRaffles = filteredRaffles.filter((raffle): raffle is IRaffleToFrontEnd => raffle !== undefined);

    const activeRaffles = validRaffles.filter((raffle) => raffle.finishedAt === undefined);
    const endedRaffles = validRaffles.filter((raffle) => raffle.finishedAt);

    await RedisInstance.set(allRafflesRedisKey, { activeRaffles, endedRaffles }, { isJSON: true });

    return { activeRaffles, endedRaffles };
  }

  static async getAllRaffles(): Promise<IRafflesInRedis> {
    const rafflesFromRedis = await RaffleUtils.getRafflesFromRedis();
    if (rafflesFromRedis) return rafflesFromRedis;

    const allRaffles = await RaffleUtils.getAllRafflesAndSaveInRedis();
    return allRaffles;
  }

  static async processRafflesTicketsQueue(message: string) {
    let authorization: IBalanceAuthorization | null = null;
    let amountBet: number = 0;

    const messageToObj: IBuyRaffleTicketsPayloadRedis = JSON.parse(message);
    const { gameId, userId, createdAt, info } = messageToObj;
    const { randomTicket } = info;

    try {
      const raffleInRedis = await RaffleUtils.getSpecificRaffleInRedis({
        gameId,
        findIn: 'active',
        userId,
        reqType: 'BUY_RAFFLE_TICKET',
      });
      const { ticketsBought, totalTickets, ticketPrice } = raffleInRedis.info;

      const TicketNumberInstance = new RaffleTicketNumbersService(userId, raffleInRedis);
      const ticketNumbersFiltered = await TicketNumberInstance.getTicketNumbersFiltered(messageToObj);
      amountBet = ticketPrice * ticketNumbersFiltered.length;

      authorization = await BalanceUpdateService.addToQueue<ISpendActionEnv>({
        type: 'buyRaffleTicket',
        userId,
        env: { totalAmountBet: amountBet },
      });

      if (authorization && !authorization.authorized) {
        return; /* In case something goes wrong with 'processBuyRaffleTicketItem' */
      }

      await BetValidatorService.checkRaffleBuyRequestValidity({
        userId,
        betMadeAt: createdAt,
        buyRaffleTicketPayload: messageToObj,
        raffleInRedis,
      });

      const { docRef: userRef } = await FirebaseInstance.getDocumentRefWithData('users', userId);
      const { docRef: gameRef, docData: gameData } = await FirebaseInstance.getDocumentRefWithData<IRaffleInDb>(
        'raffles',
        gameId,
      );

      const betObjToDb: IBetInDB = {
        gameRef,
        amountBet,
        prize: 0,
        info: { type: 'raffles', tickets: ticketNumbersFiltered, randomTicket },
        userRef: userRef,
        createdAt,
      };

      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const collectionRef = await FirebaseInstance.getCollectionRef('bets');
        const newBetRef = collectionRef.doc();

        transaction.set(newBetRef, betObjToDb);

        const betCreatedDocId = newBetRef.id;

        transaction.update(gameRef, {
          'info.bets': [...gameData.info.bets, newBetRef],
          'info.ticketsBought': (gameData.info.ticketsBought += betObjToDb.info.tickets.length),
        });

        const filteredBet = await BetsService.makeBetObjToFrontEnd(betObjToDb, betCreatedDocId);
        await RaffleUtils.addBetInRaffle(gameId, filteredBet);
      });

      if (ticketsBought + ticketNumbersFiltered.length === totalTickets) {
        const UpdateRaffleInstance = new UpdateRaffle(gameId);
        await UpdateRaffleInstance.finishRaffle();
      }
    } catch (err: unknown) {
      if (authorization && authorization.authorized) {
        await BalanceUpdateService.addToQueue<IReceiveActionEnv>({
          type: 'refund',
          userId,
          env: { totalAmountToReceive: amountBet },
        });
      }

      throw err;
    }
  }

  static async startRafflesServices(): Promise<void> {
    await RaffleUtils.getAllRaffles();
    await RabbitMQInstance.consumeMessages('evenRafflesQueue', RaffleUtils.processRafflesTicketsQueue);

    console.log('Raffles Services Initialized.');
  }

  static getWinnersBets({ bets, drawnNumbers }: { bets: IBetToFrontEnd[]; drawnNumbers: TDrawnNumbersInfo }) {
    const winnersBetsFound = bets.filter((bet) =>
      bet.info.tickets.some((betTicketNumber) =>
        drawnNumbers.some((drawnNumberInfo) => drawnNumberInfo.number === betTicketNumber),
      ),
    );

    return winnersBetsFound;
  }

  static async getWinnersBetsObjs(bets: IBetToFrontEnd[], drawnNumbersInfo: TDrawnNumbersInfo) {
    const betsRelatedToDrawNumbers = RaffleUtils.getWinnersBets({
      bets,
      drawnNumbers: drawnNumbersInfo,
    });

    const winnersBetsObjToRedis: TWinnerBetsInRedis = drawnNumbersInfo.map((drawnNumberInfo) => {
      const relatedBet = betsRelatedToDrawNumbers.find((bet) => bet.info.tickets.includes(drawnNumberInfo.number));
      if (!relatedBet) throw new UnknownError('Error getting related bet. Bet not found.');

      return { drawnNumber: drawnNumberInfo.number, hash: drawnNumberInfo.hash, betRef: relatedBet };
    });

    const winnersBetsObjToDB: TWinnerBetsInDb = await Promise.all(
      drawnNumbersInfo.map(async (drawnNumberInfo) => {
        const relatedBet = betsRelatedToDrawNumbers.find((bet) => bet.info.tickets.includes(drawnNumberInfo.number));
        if (!relatedBet) throw new UnknownError('Error getting related bet. Bet not found.');

        const { docRef } = await FirebaseInstance.getDocumentRefWithData('bets', relatedBet.betId);
        return { drawnNumber: drawnNumberInfo.number, hash: drawnNumberInfo.hash, betRef: docRef };
      }),
    );

    return { winnersBetsObjToRedis, winnersBetsObjToDB };
  }
}

class CreateRaffle {
  private discountPercentage: IRaffleCreationPayload['discountPercentage'];
  private privacy: IRaffleCreationPayload['privacy'];
  private prizes: IRaffleCreationPayload['prizes'];
  private totalTickets: IRaffleCreationPayload['totalTickets'];
  private userId: string;
  private description: string;

  constructor({ raffleCreationPayload, userId }: { raffleCreationPayload: IRaffleCreationPayload; userId: string }) {
    const { discountPercentage, privacy, prizes, totalTickets, description } = raffleCreationPayload;

    this.discountPercentage = discountPercentage;
    this.privacy = privacy;
    this.prizes = prizes;
    this.totalTickets = totalTickets;
    this.userId = userId;
    this.description = description;
  }

  async create(): Promise<void> {
    const nowTime = Date.now();

    const payload: IRaffleCreationPayload = {
      discountPercentage: this.discountPercentage,
      privacy: this.privacy,
      prizes: this.prizes,
      totalTickets: this.totalTickets,
      description: this.description,
    };

    const { privacy, totalTickets, description } = payload;

    const raffleCalcs = RaffleUtils.getRaffleDetails(payload);
    const { raffleOwnerCost, winnersPrizesObj, prizesTotalValue, ticketPrice } = raffleCalcs;

    const roundedTicketPrice = formatIrrationalCryptoAmount(ticketPrice);

    const raffleObjToDb: IRaffleInDb = {
      createdAt: nowTime,
      updatedAt: nowTime,
      type: 'raffles',
      description,
      info: {
        bets: [],
        ticketPrice: roundedTicketPrice,
        totalTickets,
        ticketsBought: 0,
        prizesTotalValue,
        privacy,
        prizes: winnersPrizesObj,
      },
    };

    const authorization = await BalanceUpdateService.addToQueue<ISpendActionEnv>({
      userId: this.userId,
      type: 'createRaffle',
      env: { totalAmountBet: raffleOwnerCost },
    });
    if (authorization && !authorization.authorized) {
      return;
    }

    let newRaffleId = '';

    await FirebaseInstance.firestore.runTransaction(async (transaction) => {
      const { docRef: userRef } = await FirebaseInstance.getDocumentRefWithData('users', this.userId);

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

      transaction.set(newRaffleRef, raffleObjToDb);

      const betInDbObj = await BetsService.makeBetObjToDb({
        userRef,
        gameRef: newRaffleRef,
        gameType: 'raffles',
        amountBet: raffleOwnerCost,
      });
      transaction.set(newBetRef, betInDbObj);

      const pubSubData: IPubSubCreateRaffleData = { gameId: newRaffleId };
      PubSubEventManager.publishEvent(
        'GET_LIVE_MESSAGES',
        {
          success: true,
          message: 'RAFFLE_CREATION_SUCCESS',
          type: 'CREATE_RAFFLE',
          data: JSON.stringify(pubSubData),
        },
        this.userId,
      );
    });
  }
}

type TDrawnNumbersInfo = {
  number: number;
  hash: string;
}[];

class DrawRaffleWinners {
  private prizes: IRaffleInDb['info']['prizes'];
  private totalTickets: IRaffleInDb['info']['totalTickets'];

  constructor(prizes: IRaffleInDb['info']['prizes'], totalTickets: IRaffleInDb['info']['totalTickets']) {
    this.prizes = prizes;
    this.totalTickets = totalTickets;
  }

  drawNumbers(quantity: number): TDrawnNumbersInfo {
    const from = 1;
    const to = this.totalTickets;

    const drawnNumbersInfo: TDrawnNumbersInfo = [];

    for (let i = 0; i < quantity; i++) {
      const randomNumber = Math.floor(Math.random() * (to - from + 1)) + from;
      drawnNumbersInfo.push({ number: randomNumber, hash: '123' });
    }

    return drawnNumbersInfo;
  }

  async startDraw(): Promise<TDrawnNumbersInfo> {
    const winnersKeys = Object.keys(this.prizes);
    const winnersAmount = winnersKeys.length;

    const drawnNumbers = this.drawNumbers(winnersAmount);
    return drawnNumbers;
  }
}

class UpdateRaffle {
  private gameId: string;
  private raffleInRedis: IRaffleToFrontEnd = {} as IRaffleToFrontEnd;
  private raffleInDb: IRaffleInDb = {} as IRaffleInDb;

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  private async loadRaffle(findIn: 'active' | 'ended') {
    this.raffleInRedis = await RaffleUtils.getSpecificRaffleInRedis({
      gameId: this.gameId,
      findIn,
      reqType: 'FINISH_RAFFLE',
    });

    const raffleInDbResponse = await FirebaseInstance.getDocumentById<IRaffleInDb>('raffles', this.gameId);
    if (!raffleInDbResponse) throw new UnknownError('Raffle not found in DB.');

    this.raffleInDb = raffleInDbResponse.docData;
  }

  async payWinners() {
    const { prizes } = this.raffleInDb.info;
    const { winnersBetsInfo } = this.raffleInRedis.info;

    if (!winnersBetsInfo || winnersBetsInfo.length <= 0) {
      throw new UnknownError("Something went wrong cause winners weren't drawn.");
    }

    for (const [index, winnerBet] of winnersBetsInfo.entries()) {
      const prizesKeys = Object.keys(prizes);
      const { userId } = winnerBet.betRef.userRef;

      const winnerBetPrize = prizes[prizesKeys[index]].totalValue;
      const betUpdatedObj: IBetToFrontEnd = { ...winnerBet.betRef, prize: winnerBetPrize };
      const { betId, prize } = betUpdatedObj;

      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { docRef } = await FirebaseInstance.getDocumentRefWithData('bets', betId);
        transaction.update(docRef, { prize });
      });

      const sendPSubInTimestamp = Date.now() + TotalTimeToRoll;
      await BalanceUpdateService.addToQueue<IReceiveActionEnv>({
        userId,
        type: 'payWinners',
        env: { sendPSubInTimestamp, totalAmountToReceive: prize },
      });
    }
  }

  async finishRaffle() {
    const nowTime = Date.now();
    await this.loadRaffle('active');

    const { gameId, info } = this.raffleInRedis;
    const { prizes, totalTickets } = info;
    const rafflePrizesToJS = JSON.parse(prizes);

    const drawnNumbersInfo = await new DrawRaffleWinners(rafflePrizesToJS, totalTickets).startDraw();

    const { winnersBetsObjToRedis, winnersBetsObjToDB } = await RaffleUtils.getWinnersBetsObjs(
      this.raffleInRedis.info.bets,
      drawnNumbersInfo,
    );

    const raffleInDbResponse = await FirebaseInstance.getDocumentById<IRaffleInDb>('raffles', gameId);
    if (!raffleInDbResponse) throw new UnknownError('Raffle not found in db while updating raffle.');
    const { docData: raffleInDbData } = raffleInDbResponse;
    const raffleObjToDb: IRaffleInDb = {
      ...raffleInDbData,
      info: { ...raffleInDbData.info, winnersBetsInfo: winnersBetsObjToDB },
      finishedAt: nowTime,
    };

    const raffleInRedis = await RaffleUtils.getSpecificRaffleInRedis({
      gameId,
      findIn: 'active',
      reqType: 'FINISH_RAFFLE',
    });
    const raffleObjToRedis: IRaffleToFrontEnd = {
      ...raffleInRedis,
      info: { ...raffleInRedis.info, winnersBetsInfo: winnersBetsObjToRedis },
      finishedAt: nowTime.toString(),
    };

    await RaffleUtils.updateSpecificRaffleInDb(gameId, raffleObjToDb);
    await RaffleUtils.updateSpecificRaffleInRedis(gameId, raffleObjToRedis, 'ended');

    await this.loadRaffle('ended');
    await this.payWinners();
  }
}

export { RaffleUtils, CreateRaffle, UpdateRaffle };
