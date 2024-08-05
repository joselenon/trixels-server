import { FirebaseInstance, RedisInstance } from '../..';
import itemsInfo, { IItemsInfo } from '../../assets/itemsInfo';
import { getAllPrizesItems } from '../../common/raffleObjInteractions';
import { GameAlreadyFinishedError, IPubSubConfig } from '../../config/errors/classes/ClientErrors';
import { InvalidPayloadError, RaffleLostError, UnknownError } from '../../config/errors/classes/SystemErrors';
import { IBetInDB, IBetToFrontEnd, IBuyRaffleTicketsPayload } from '../../config/interfaces/IBet';
import {
  IRaffleInDb,
  IRaffleToFrontEnd,
  TRaffleWinnersPrizes,
  TRaffleWinnerPrizes,
  IRafflesInRedis,
  TWinnerBetsInRedis,
  TWinnerBetsInDb,
} from '../../config/interfaces/IRaffles';
import {
  IRaffleCreationPayload,
  TRaffleCreationPrizeX,
  TRaffleCreationPrizesWinners,
  TRaffleCreationWinnerPrizes,
} from '../../config/interfaces/IRaffleCreation';
import getRedisKeyHelper from '../../helpers/redisHelper';
import formatIrrationalCryptoAmount from '../../common/formatIrrationalCryptoAmount';
import calcWithDecimalsService from '../../common/calcWithDecimals';
import PubSubEventManager from '../PubSubEventManager';
import BetsService from '../BetsService';
import { IUser } from '../../config/interfaces/IUser';

type TDrawnNumbersInfo = {
  number: number;
  hash: string;
}[];

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

  static getWinnersBets({ bets, drawnNumbers }: { bets: IBetToFrontEnd[]; drawnNumbers: TDrawnNumbersInfo }) {
    const winnersBetsFound = bets.filter((bet) =>
      bet.info.tickets.some((betTicketNumber) =>
        drawnNumbers.some((drawnNumberInfo) => drawnNumberInfo.number === betTicketNumber),
      ),
    );

    return winnersBetsFound;
  }

  static async filterBetsDBToData(raffleBetsInDb: IRaffleInDb['info']['bets']): Promise<IBetToFrontEnd[]> {
    const results = await Promise.all(
      raffleBetsInDb.map(async (betRef) => {
        const docId = betRef.id;
        /*         const betInDb = await FirebaseInstance.getDocumentById<IBetInDB>('bets', docId); */
        const betInDb = (await betRef.get()).data() as IBetInDB;
        /*         if (!betInDb || !betInDb.docData) return undefined; */

        const betToFrontEnd = await BetsService.filterBetObjToFrontend(betInDb, docId);
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

      const filteredWinnerBet = await BetsService.filterBetObjToFrontend(betInDb, betDocId);

      winnersBetsFiltered.push({ betRef: filteredWinnerBet, hash, drawnNumber });
    }

    return winnersBetsFiltered;
  }

  static async filterRaffleToFrontEnd(gameId: string, raffleInDb: IRaffleInDb): Promise<IRaffleToFrontEnd> {
    try {
      if (!raffleInDb) throw new UnknownError('Raffle not found while filtering to Front End');

      const raffleInDbData = raffleInDb;

      const { createdAt, createdBy, finishedAt } = raffleInDbData;
      const { bets, winnersBetsInfo, prizes } = raffleInDbData.info;

      const filteredFinishedAt = finishedAt ? finishedAt.toString() : undefined;
      const filteredCreatedAt = createdAt.toString();

      let filteredCreatedBy: IRaffleToFrontEnd['createdBy'] = {
        avatar: '',
        userId: 'USER_DELETED',
        username: 'USER_DELETED',
      };
      const createdByUserData = (await createdBy.get()).data() as IUser | undefined;
      if (createdByUserData) {
        const createdByUserId = createdBy.id;
        const { avatar, username } = createdByUserData;
        filteredCreatedBy = { avatar, userId: createdByUserId, username };
      }

      const filteredBets = await RaffleUtils.filterBetsDBToData(bets);

      const filteredPrizes = JSON.stringify(prizes);
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
        createdBy: filteredCreatedBy,
        gameId,
        createdAt: filteredCreatedAt,
        finishedAt: filteredFinishedAt,
      };
    } catch (err: unknown) {
      console.log('filterRaffleToFrontEnd err: ', err);
      throw err;
    }
  }

  static async getAllRafflesAndSaveInRedis() {
    const allActiveRaffles = await FirebaseInstance.getManyDocumentsByParam<IRaffleInDb>('raffles', 'status', 'active');
    const lastTenEndedRaffles = await FirebaseInstance.getManyDocumentsByParamInChunks<IRaffleInDb>({
      collection: 'raffles',
      param: 'status',
      paramValue: 'ended',
      chunkSize: 10,
      orderByField: 'createdAt',
      config: { forward: false },
    });

    const allRafflesRedisKey = getRedisKeyHelper('allRaffles');

    if (!allActiveRaffles && lastTenEndedRaffles.documents.length <= 0) {
      return await RedisInstance.set(allRafflesRedisKey, { activeRaffles: [], endedRaffles: [] }, { isJSON: true });
    }

    const allRaffles = [...allActiveRaffles.documents, ...lastTenEndedRaffles.documents];

    const filteredRaffles = await Promise.all(
      allRaffles.map(async (raffle) => {
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

  static async getRafflesFromRedis(): Promise<IRafflesInRedis | null> {
    const rafflesRedisKey = getRedisKeyHelper('allRaffles');
    const rafflesFromRedis = await RedisInstance.get<IRafflesInRedis>(rafflesRedisKey, { isJSON: true });
    if (!rafflesFromRedis) return null;

    return rafflesFromRedis;
  }

  static async getAllRaffles(): Promise<IRafflesInRedis> {
    /* FIX - race condition */

    const rafflesFromRedis = await RaffleUtils.getRafflesFromRedis();
    if (rafflesFromRedis) return rafflesFromRedis;

    const allRaffles = await RaffleUtils.getAllRafflesAndSaveInRedis();
    return allRaffles;
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
          throw new GameAlreadyFinishedError({ reqType, userId });
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

  static async updateBetOnRaffleInRedis(gameToUpdateId: string, betToAdd: IBetToFrontEnd) {
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

        const { docRef } = await FirebaseInstance.getDocumentRefWithData<IBetInDB>('bets', relatedBet.betId);
        return { drawnNumber: drawnNumberInfo.number, hash: drawnNumberInfo.hash, betRef: docRef };
      }),
    );

    return { winnersBetsObjToRedis, winnersBetsObjToDB };
  }
}

export default RaffleUtils;
