import { FirebaseInstance, RedisInstance } from '..';
import { UnknownError } from '../config/errors/classes/SystemErrors';
import { IBetInDB, IBetToFrontEnd, IBuyRaffleTicketsPayloadRedis } from '../config/interfaces/IBet';
import { TDBGamesCollections } from '../config/interfaces/IFirebase';
import { IRafflesInRedis } from '../config/interfaces/IRaffles';
import { IUser } from '../config/interfaces/IUser';
import getRedisKeyHelper from '../helpers/redisHelper';
import BalanceUpdateService, { IBuyRaffleTicketEnv } from './BalanceUpdateService';

class BetsService {
  async makeBetObjToFrontEnd(betInDb: IBetInDB, betId: string): Promise<IBetToFrontEnd> {
    const { gameRef, userRef, amountBet, createdAt, info, prize } = betInDb;

    const gameId = gameRef.id;

    const getUserInfo = async (): Promise<IBetToFrontEnd['userRef'] | undefined> => {
      const userDocId = userRef.id;
      const docData = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);

      if (docData) {
        const { avatar, username } = docData.result;
        return { avatar, username, userId: userDocId };
      }
    };

    const filteredUserRef = await getUserInfo();
    if (!filteredUserRef) throw new UnknownError('ERROR WITH BETTER INFO');

    return { gameId, amountBet, createdAt, info, prize, userRef: filteredUserRef, betId };
  }

  /* Checar se realmente é necessário criar um documento em bets para criação de raffles */
  async makeBetObjToDb(betOptions: {
    userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
    gameRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
    gameType: TDBGamesCollections;
    amountBet: number;
  }) {
    const { amountBet, gameRef, gameType, userRef } = betOptions;

    const nowTime = new Date().getTime();

    const betObjToDb: IBetInDB = {
      createdAt: nowTime,
      amountBet,
      info: { randomTicket: true, tickets: [], type: gameType },
      prize: 0,
      gameRef,
      userRef,
    };

    return betObjToDb;
  }

  /* Colocar para utilizar o que tiver no Redis como raffles ativas (Fazer sistema para que ao ligamento do servidor, seja feito uma varredura das raffles ativas e um save no redis) */
  async buyRaffleTicket(userDocId: string, buyRaffleTicketPayload: IBuyRaffleTicketsPayloadRedis, betMadeAt: number) {
    const { gameId } = buyRaffleTicketPayload;

    const allRafflesRedisKey = getRedisKeyHelper('allRaffles');
    const rafflesInRedis = await RedisInstance.get<IRafflesInRedis>(allRafflesRedisKey, { isJSON: true });
    if (!rafflesInRedis) throw new UnknownError('No raffle in Redis');

    const { activeRaffles } = rafflesInRedis;

    const raffleInRedis = activeRaffles.find((raffle) => raffle.gameId === gameId);
    if (!raffleInRedis) throw new UnknownError('Raffle not found while searching on Redis active raffles list.');

    await BalanceUpdateService.addToQueue<IBuyRaffleTicketEnv>({
      type: 'buyRaffleTicket',
      userId: userDocId,
      env: { buyRaffleTicketPayload, raffleInRedis: raffleInRedis, betMadeAt },
    });
  }
}

export default new BetsService();
