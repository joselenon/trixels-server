import { FirebaseInstance, RedisInstance } from '..';
import { UnknownError } from '../config/errors/classes/SystemErrors';
import { IBuyRaffleTicketsPayload, IBuyRaffleTicketsPayloadRedis } from '../config/interfaces/IBet';
import { IRaffleInDb } from '../config/interfaces/IRaffles';
import { RaffleUtils, UpdateRaffle } from './RafflesServices';
import getRedisKeyHelper from '../helpers/redisHelper';
import BetsService from './BetsService';

class ProcessRaffleBetsInstance {
  async processBet(betInQueue: IBuyRaffleTicketsPayloadRedis) {
    try {
      const { userId, createdAt } = betInQueue;
      await BetsService.buyRaffleTicket(userId, betInQueue, createdAt);
    } catch (err: any) {
      console.log(err);
    }
  }

  async startProcessLoop(betsQueueRedisKey: string, gameId: string) {
    /* Enquanto todos os tickets não forem preenchidos, o loop para checagem e processamente continua */
    const raffleInRedis = await RaffleUtils.getSpecificRaffleInRedis(gameId, 'active');
    const { ticketsBought, totalTickets } = raffleInRedis.info;

    let updatedTicketsBought = ticketsBought;
    let updatedTotalTickets = totalTickets;

    while (updatedTicketsBought < updatedTotalTickets) {
      try {
        const betsQueueArray = await RedisInstance.lRange<IBuyRaffleTicketsPayloadRedis>(
          betsQueueRedisKey,
          { start: 0, end: -1 },
          {
            isJSON: true,
          },
        );

        if (!betsQueueArray || betsQueueArray.length <= 0) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          const raffleInRedis = await RaffleUtils.getSpecificRaffleInRedis(gameId, 'active');
          const { ticketsBought, totalTickets } = raffleInRedis.info;

          updatedTicketsBought = ticketsBought;
          updatedTotalTickets = totalTickets;
          continue;
        }

        for (let i = 0; i < betsQueueArray.length; i++) {
          try {
            const nextBet = await RedisInstance.lPop<IBuyRaffleTicketsPayloadRedis>(betsQueueRedisKey, 1, {
              isJSON: true,
            });
            if (!nextBet) break;

            await this.processBet(nextBet);
          } catch (err) {
            console.log(err);
            continue;
          }
        }

        const raffleInRedis = await RaffleUtils.getSpecificRaffleInRedis(gameId, 'active');
        const { ticketsBought, totalTickets } = raffleInRedis.info;

        updatedTicketsBought = ticketsBought;
        updatedTotalTickets = totalTickets;
      } catch (err) {
        console.log(err);
        continue;
      }
    }

    const UpdateRaffleInstance = new UpdateRaffle(gameId);
    await UpdateRaffleInstance.finishRaffle();
  }

  async processQueue(gameId: string) {
    const isBetsQueueProcessingRedisKey = getRedisKeyHelper('isBetsQueueProcessing', gameId);
    const isQueueProcessing = await RedisInstance.get(isBetsQueueProcessingRedisKey);
    if (isQueueProcessing === 'true') return;

    await RedisInstance.set(isBetsQueueProcessingRedisKey, 'true');

    const raffleDoc = await FirebaseInstance.getDocumentById<IRaffleInDb>('raffles', gameId);
    if (!raffleDoc) throw new UnknownError('Raffle not found while start processing queue.');

    const betsQueueRedisKey = getRedisKeyHelper('betsQueue', gameId);

    await this.startProcessLoop(betsQueueRedisKey, gameId);
  }

  async addRaffleTicketBuyToQueue(
    buyRaffleTicketPayload: IBuyRaffleTicketsPayload,
    userId: string,
    betCreatedAt: number,
  ) {
    const { gameId, info } = buyRaffleTicketPayload;

    const BuyRaffleTicketsPayloadRedis: IBuyRaffleTicketsPayloadRedis = {
      createdAt: betCreatedAt,
      userId,
      gameId,
      info,
    };

    const betsQueueRedisKey = getRedisKeyHelper('betsQueue', gameId);
    await RedisInstance.rPush<IBuyRaffleTicketsPayloadRedis>(betsQueueRedisKey, BuyRaffleTicketsPayloadRedis, {
      isJSON: true,
    });

    this.processQueue(gameId);
  }
}

export default new ProcessRaffleBetsInstance();
