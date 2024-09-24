import { FirebaseInstance, RabbitMQInstance } from '../..';
import { UnknownError } from '../../config/errors/classes/SystemErrors';
import { IBetInDB, IBuyRaffleTicketsPayloadRedis } from '../../config/interfaces/IBet';
import { IRaffleInDb, IRaffleToFrontEnd } from '../../config/interfaces/RaffleInterfaces/IRaffles';
import BalanceUpdateService, { IReceiveActionEnv, ISpendActionEnv } from '../BalanceUpdateService';
import BetsService from '../BetsService';
import TicketValidatorService from './TicketValidatorService';
import RaffleUtils from './RaffleUtils';
import TicketNumbersService from './TicketNumbersService';
import UpdateRaffleService from './UpdateRaffleService';
import {
  CheckForRaffleFinishingError,
  GetRaffleDocumentError,
  GetRaffleCacheError,
  GetVariablesError,
  RaffleBuyTransactionError,
  SyncBetWithRaffleCacheError,
} from '../../config/errors/classes/RaffleErrors';

export default class ProcessRaffleQueueService {
  raffleId: string;
  raffle: IRaffleToFrontEnd | undefined;
  userId: string | undefined;
  buyRafflePayload: IBuyRaffleTicketsPayloadRedis | undefined;
  amountBet: number | undefined;

  constructor(raffleId: string) {
    this.raffleId = raffleId;
    this.raffle = undefined;

    this.userId = undefined;
    this.buyRafflePayload = undefined;
    this.amountBet = undefined;

    this.consume = this.consume.bind(this);
  }

  private async getRaffle() {
    try {
      const raffleCache = await RaffleUtils.getSpecificRaffleCache({
        gameId: this.raffleId,
        findIn: 'active',
        reqType: 'BUY_RAFFLE_TICKET',
      });

      this.raffle = raffleCache;
    } catch (error: any) {
      throw new GetRaffleCacheError(error);
    }
  }

  private async getVariables(message: string) {
    try {
      await this.getRaffle();
      if (!this.raffle) throw new UnknownError('no raffle');

      const buyRafflePayload: IBuyRaffleTicketsPayloadRedis = JSON.parse(message);

      let amountBet =
        buyRafflePayload.info.quantityOfTickets ||
        buyRafflePayload.info.ticketNumbers.length * this.raffle!.info.ticketPrice;

      const isRandomTicket = buyRafflePayload.info.randomTicket;

      if (isRandomTicket && buyRafflePayload.info.quantityOfTickets) {
        amountBet = buyRafflePayload.info.quantityOfTickets * this.raffle.info.ticketPrice;
      }

      this.buyRafflePayload = buyRafflePayload;
      this.userId = this.buyRafflePayload.userId;
      this.amountBet = amountBet;
    } catch (error: any) {
      throw new GetVariablesError(error);
    }
  }

  private async checkAndSubtractUserBalance() {
    const rpcResponse = await BalanceUpdateService.sendBalanceUpdateRPCMessage<ISpendActionEnv, null>({
      type: 'buyRaffleTicket',
      userId: this.userId!,
      env: { totalAmountBet: this.amountBet!, pubSubConfig: { reqType: 'BUY_RAFFLE_TICKET', userId: this.userId! } },
    });
    RabbitMQInstance.checkForErrorsAfterRPC(rpcResponse);

    return rpcResponse;
  }

  private async createBet(
    transaction: FirebaseFirestore.Transaction,
    gameRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
    ticketNumbersFiltered: number[],
  ) {
    if (!this.amountBet) throw new UnknownError('Amount bet not applied');

    const { docRef: userRef } = await FirebaseInstance.getDocumentRefWithData('users', this.userId!);
    const collectionRef = await FirebaseInstance.getCollectionRef('bets');
    const newBetRef = collectionRef.doc();

    const betObjToDb: IBetInDB = {
      gameRef,
      amountBet: this.amountBet,
      prize: 0,
      info: { type: 'raffles', tickets: ticketNumbersFiltered, randomTicket: this.buyRafflePayload!.info.randomTicket },
      userRef: userRef,
      createdAt: this.buyRafflePayload!.createdAt,
    };

    transaction.set(newBetRef, betObjToDb);
    return { newBetRef, betObjToDb };
  }

  private async updateRaffle(
    transaction: FirebaseFirestore.Transaction,
    newBetRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
    gameRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
    raffleInDb: IRaffleInDb,
    betObjToDb: IBetInDB,
  ) {
    transaction.update(gameRef, {
      'info.bets': [...raffleInDb.info.bets, newBetRef],
      'info.ticketsBought': (raffleInDb.info.ticketsBought += betObjToDb.info.tickets.length),
    });
  }

  private async checkForRaffleFinishing(ticketNumbersFiltered: number[]) {
    try {
      const { ticketsBought, totalTickets } = this.raffle!.info;

      if (ticketsBought + ticketNumbersFiltered.length === totalTickets) {
        const UpdateRaffleInstance = new UpdateRaffleService(this.raffle!.gameId);
        await UpdateRaffleInstance.finishRaffle();
      }
    } catch (error: any) {
      throw new CheckForRaffleFinishingError(error);
    }
  }

  private async runTransaction(
    raffleInDb: IRaffleInDb,
    gameRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
    ticketNumbersFiltered: number[],
  ) {
    try {
      return await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { betObjToDb, newBetRef } = await this.createBet(transaction, gameRef, ticketNumbersFiltered);
        await this.updateRaffle(transaction, newBetRef, gameRef, raffleInDb, betObjToDb);

        const filteredBetObj = await BetsService.filterBetObjToFrontend(betObjToDb, newBetRef.id);
        return { filteredBetObj };
      });
    } catch (error: any) {
      throw new RaffleBuyTransactionError(error);
    }
  }

  private async handleConsumerError(error: any, wasAuthorized: boolean) {
    if (error instanceof GetRaffleDocumentError || error instanceof RaffleBuyTransactionError) {
      if (wasAuthorized) {
        await BalanceUpdateService.addToQueue<IReceiveActionEnv>({
          type: 'refund',
          userId: this.userId!,
          env: { totalAmountToReceive: this.amountBet || 0 },
        });
      }
      throw error;
    }

    if (error instanceof SyncBetWithRaffleCacheError) {
      throw error;
    }
    if (error instanceof CheckForRaffleFinishingError) {
      throw error;
    }
    if (error instanceof GetRaffleCacheError) {
      throw error;
    }
    if (error instanceof GetRaffleCacheError) {
      throw error;
    }
    if (error instanceof GetVariablesError) {
      throw error;
    }
  }

  async getRaffleDocument(gameId: string) {
    try {
      const { docRef: raffleRef, docData: raffleInDb } = await FirebaseInstance.getDocumentRefWithData<IRaffleInDb>(
        'raffles',
        gameId,
      );
      return { raffleRef, raffleInDb };
    } catch (error: any) {
      throw new GetRaffleDocumentError(error);
    }
  }

  async consume(message: string) {
    let wasAuthorized: boolean = false;

    try {
      await this.getVariables(message);

      const { gameId, userId } = this.buyRafflePayload!;

      new TicketValidatorService(userId, this.buyRafflePayload!, this.raffle!).validate();

      const { ticketNumbersFiltered } = new TicketNumbersService(userId, this.raffle!.info).getTicketNumbersFiltered(
        this.buyRafflePayload!.info,
      );

      const rpcResponse = await this.checkAndSubtractUserBalance();
      wasAuthorized = rpcResponse.authorized;

      const { raffleRef, raffleInDb } = await this.getRaffleDocument(gameId);
      const { filteredBetObj } = await this.runTransaction(raffleInDb, raffleRef, ticketNumbersFiltered);

      await RaffleUtils.syncBetWithRaffleCache(this.raffle!.gameId, filteredBetObj);

      await this.checkForRaffleFinishing(ticketNumbersFiltered);
    } catch (error: unknown) {
      await this.handleConsumerError(error, wasAuthorized);
    }
  }
}
