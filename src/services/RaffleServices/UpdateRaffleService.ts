import { FirebaseInstance, RabbitMQInstance } from '../..';
import { TotalTimeToRoll } from '../../config/app/games/RaffleConfig';
import { UnknownError } from '../../config/errors/classes/SystemErrors';
import { IBetToFrontEnd } from '../../config/interfaces/IBet';
import { IRaffleInDb, IRaffleToFrontEnd } from '../../config/interfaces/RaffleInterfaces/IRaffles';
import BalanceUpdateService, { IReceiveActionEnv } from '../BalanceUpdateService';
import RaffleUtils from './RaffleUtils';
import DrawWinnerService from './DrawWinnerService';

export default class UpdateRaffleService {
  private gameId: string;
  private raffleCache: IRaffleToFrontEnd = {} as IRaffleToFrontEnd;
  private raffleInDb: IRaffleInDb = {} as IRaffleInDb;

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  private async loadRaffle(findIn: 'active' | 'ended') {
    this.raffleCache = await RaffleUtils.getSpecificRaffleCache({
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
    const { winnersBetsInfo } = this.raffleCache.info;

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

    const { gameId, info } = this.raffleCache;
    const { prizes, totalTickets } = info;
    const rafflePrizesToJS = JSON.parse(prizes);

    const drawnNumbersInfo = await new DrawWinnerService(rafflePrizesToJS, totalTickets).startDraw();

    const { winnersBetsObjToRedis, winnersBetsObjToDB } = await RaffleUtils.getWinnersBetsObjs(
      this.raffleCache.info.bets,
      drawnNumbersInfo,
    );

    const raffleInDbResponse = await FirebaseInstance.getDocumentById<IRaffleInDb>('raffles', gameId);
    if (!raffleInDbResponse) throw new UnknownError('Raffle not found in db while updating raffle.');
    const { docData: raffleInDbData } = raffleInDbResponse;

    const raffleObjBase = {
      status: 'ended' as IRaffleInDb['status'],
    };

    const raffleObjToDb: IRaffleInDb = {
      ...raffleInDbData,
      ...raffleObjBase,
      info: { ...raffleInDbData.info, winnersBetsInfo: winnersBetsObjToDB },
      finishedAt: nowTime,
    };

    const raffleCache = await RaffleUtils.getSpecificRaffleCache({
      gameId,
      findIn: 'active',
      reqType: 'FINISH_RAFFLE',
    });
    const raffleObjToRedis: IRaffleToFrontEnd = {
      ...raffleCache,
      ...raffleObjBase,
      info: { ...raffleCache.info, winnersBetsInfo: winnersBetsObjToRedis },
      finishedAt: nowTime.toString(),
    };

    await FirebaseInstance.updateDocument('raffles', gameId, raffleObjToDb);

    await RaffleUtils.updateSpecificRaffleCache(gameId, raffleObjToRedis, 'ended');

    await this.loadRaffle('ended');
    await this.payWinners();

    await RabbitMQInstance.deleteQueue(`raffle:${gameId}`);
  }
}
