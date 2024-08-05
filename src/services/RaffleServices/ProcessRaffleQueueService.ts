import { FirebaseInstance, RabbitMQInstance } from '../..';
import { UnknownError } from '../../config/errors/classes/SystemErrors';
import { IBetInDB, IBuyRaffleTicketsPayloadRedis } from '../../config/interfaces/IBet';
import { IRaffleInDb, IRaffleToFrontEnd } from '../../config/interfaces/IRaffles';
import BalanceUpdateService, { IReceiveActionEnv, ISpendActionEnv } from '../BalanceUpdateService';
import BetsService from '../BetsService';
import RaffleBetValidatorService from './RaffleBetValidatorService';
import RaffleUtils from './RaffleUtils';
import TicketNumbersService from './TicketNumbersService';
import UpdateRaffleService from './UpdateRaffleService';

export default class ProcessRaffleQueueService {
  raffle: IRaffleToFrontEnd;
  userId: string | undefined;
  buyRafflePayload: IBuyRaffleTicketsPayloadRedis | undefined;
  amountBet: number | undefined;

  constructor(raffle: IRaffleToFrontEnd) {
    this.raffle = raffle;

    this.userId = undefined;
    this.buyRafflePayload = undefined;
    this.amountBet = undefined;

    this.start = this.start.bind(this);
  }

  private getVariables(message: string) {
    const buyRafflePayload: IBuyRaffleTicketsPayloadRedis = JSON.parse(message);
    this.buyRafflePayload = buyRafflePayload;
    if (!this.buyRafflePayload) throw new UnknownError('buyRaffleTicketPayload not applied');

    this.userId = this.buyRafflePayload.userId;

    this.amountBet =
      this.buyRafflePayload.info.quantityOfTickets ??
      this.buyRafflePayload.info.ticketNumbers.length * this.raffle.info.ticketPrice;
  }

  private async checkAndSubtractUserBalance() {
    const amountBet =
      this.buyRafflePayload!.info.quantityOfTickets ||
      this.buyRafflePayload!.info.ticketNumbers.length * this.raffle.info.ticketPrice;

    const rpcResponse = await BalanceUpdateService.sendBalanceUpdateRPCMessage<ISpendActionEnv, null>({
      type: 'buyRaffleTicket',
      userId: this.userId!,
      env: { totalAmountBet: amountBet, pubSubConfig: { reqType: 'BUY_RAFFLE_TICKET', userId: this.userId! } },
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
    const { ticketsBought, totalTickets } = this.raffle.info;

    if (ticketsBought + ticketNumbersFiltered.length === totalTickets) {
      const UpdateRaffleInstance = new UpdateRaffleService(this.raffle.gameId);
      await UpdateRaffleInstance.finishRaffle();
    }
  }

  private async runTransaction(
    raffleInDb: IRaffleInDb,
    gameRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
    ticketNumbersFiltered: number[],
  ) {
    await FirebaseInstance.firestore.runTransaction(async (transaction) => {
      const { betObjToDb, newBetRef } = await this.createBet(transaction, gameRef, ticketNumbersFiltered);
      await this.updateRaffle(transaction, newBetRef, gameRef, raffleInDb, betObjToDb);

      const filteredBet = await BetsService.filterBetObjToFrontend(betObjToDb, newBetRef.id);
      await RaffleUtils.updateBetOnRaffleInRedis(this.raffle.gameId, filteredBet);
    });
  }

  private async handleError(wasAuthorized: boolean) {
    if (wasAuthorized) {
      await BalanceUpdateService.addToQueue<IReceiveActionEnv>({
        type: 'refund',
        userId: this.userId!,
        env: { totalAmountToReceive: this.amountBet || 0 },
      });
    }
  }

  async start(message: string) {
    let wasAuthorized: boolean = false;

    this.getVariables(message);

    const { gameId, userId } = this.buyRafflePayload!;

    try {
      const raffleInRedis = await RaffleUtils.getSpecificRaffleInRedis({
        gameId,
        findIn: 'active',
        userId,
        reqType: 'BUY_RAFFLE_TICKET',
      });

      const RaffleBetValidator = new RaffleBetValidatorService(userId, this.buyRafflePayload!, raffleInRedis);
      RaffleBetValidator.firstValidation();

      const TicketNumberInstance = new TicketNumbersService(userId, raffleInRedis.info);
      const ticketNumbersFiltered = TicketNumberInstance.getTicketNumbersFiltered(this.buyRafflePayload!.info);

      const rpcResponse = await this.checkAndSubtractUserBalance();
      wasAuthorized = rpcResponse.authorized;

      RaffleBetValidator.finalValidation();

      const { docRef: raffleRef, docData: raffleInDb } = await FirebaseInstance.getDocumentRefWithData<IRaffleInDb>(
        'raffles',
        gameId,
      );

      await this.runTransaction(raffleInDb, raffleRef, ticketNumbersFiltered);
      await this.checkForRaffleFinishing(ticketNumbersFiltered);
    } catch (err: unknown) {
      this.handleError(wasAuthorized);
      throw err;
    }
  }
}
