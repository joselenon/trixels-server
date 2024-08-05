import { FirebaseInstance, RabbitMQInstance } from '../..';
import { CreateRaffleUnexpectedError } from '../../config/errors/classes/SystemErrors';
import { IRaffleInDb, IRaffleToFrontEnd } from '../../config/interfaces/IRaffles';
import { IRaffleCreationPayload } from '../../config/interfaces/IRaffleCreation';
import formatIrrationalCryptoAmount from '../../common/formatIrrationalCryptoAmount';
import BalanceUpdateService, { ISpendActionEnv } from '../BalanceUpdateService';
import PubSubEventManager, { IPubSubCreateRaffleData } from '../PubSubEventManager';
import BetsService from '../BetsService';
import { IFirebaseResponse } from '../../config/interfaces/IFirebase';
import { IUser } from '../../config/interfaces/IUser';
import RaffleUtils from './RaffleUtils';
import ProcessRaffleQueueService from './ProcessRaffleQueueService';

export default class CreateRaffleService {
  private discountPercentage: IRaffleCreationPayload['discountPercentage'];
  private privacy: IRaffleCreationPayload['privacy'];
  private prizes: IRaffleCreationPayload['prizes'];
  private totalTickets: IRaffleCreationPayload['totalTickets'];
  private maxTicketsPerUser: IRaffleCreationPayload['maxTicketsPerUser'];
  private userDoc: IFirebaseResponse<IUser>;
  private description: string;
  private request: string;

  constructor({
    raffleCreationPayload,
    userDoc,
  }: {
    raffleCreationPayload: IRaffleCreationPayload;
    userDoc: IFirebaseResponse<IUser>;
  }) {
    const { discountPercentage, privacy, prizes, totalTickets, description, request, maxTicketsPerUser } =
      raffleCreationPayload;

    this.discountPercentage = discountPercentage;
    this.privacy = privacy;
    this.prizes = prizes;
    this.totalTickets = totalTickets;
    this.userDoc = userDoc;
    this.description = description;
    this.request = request;
    this.maxTicketsPerUser = maxTicketsPerUser;
  }

  async startRabbitMQQueue(newRaffleId: string, raffle: IRaffleToFrontEnd) {
    const queueName = `raffle:${newRaffleId}`;
    const ProcessTicketsBuyInstance = new ProcessRaffleQueueService(raffle);

    await RabbitMQInstance.createQueue(queueName);
    await RabbitMQInstance.consumeMessages(queueName, ProcessTicketsBuyInstance.start);
  }

  async checkAndSubtractCreatorBalance(raffleOwnerCost: number) {
    const rpcResponse = await BalanceUpdateService.sendBalanceUpdateRPCMessage<ISpendActionEnv, null>({
      userId: this.userDoc.docId,
      type: 'createRaffle',
      env: {
        totalAmountBet: raffleOwnerCost,
        pubSubConfig: { userId: this.userDoc.docId, reqType: 'CREATE_RAFFLE', request: this.request },
      },
    });
    RabbitMQInstance.checkForErrorsAfterRPC(rpcResponse);
  }

  makeRaffleCreationObj(payload: IRaffleCreationPayload, raffleCalcs: any) {
    const nowTime = Date.now();

    const { privacy, totalTickets, description, maxTicketsPerUser } = payload;
    const { winnersPrizesObj, prizesTotalValue, ticketPrice } = raffleCalcs;

    const roundedTicketPrice = formatIrrationalCryptoAmount(ticketPrice);

    const raffleObjToDb: IRaffleInDb = {
      createdAt: nowTime,
      createdBy: this.userDoc.docRef,
      updatedAt: nowTime,
      type: 'raffles',
      status: 'active',
      description,
      info: {
        bets: [],
        ticketPrice: roundedTicketPrice,
        totalTickets,
        ticketsBought: 0,
        prizesTotalValue,
        privacy,
        prizes: winnersPrizesObj,
        maxTicketsPerUser,
      },
    };

    return raffleObjToDb;
  }

  async createBet(
    transaction: FirebaseFirestore.Transaction,
    raffleRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>,
    raffleOwnerCost: number,
  ) {
    /* Checar se é necessario fazer outra requisição do usuário */
    const { docRef: userRef } = await FirebaseInstance.getDocumentRefWithData('users', this.userDoc.docId);

    const betsCollectionRef = await FirebaseInstance.getCollectionRef('bets');
    const newBetRef = betsCollectionRef.doc();

    const betInDbObj = await BetsService.makeBetObjToDb({
      userRef,
      gameRef: raffleRef,
      gameType: 'raffles',
      amountBet: raffleOwnerCost,
    });
    transaction.set(newBetRef, betInDbObj);
  }

  async createRaffle(transaction: FirebaseFirestore.Transaction, raffleObjToDb: IRaffleInDb) {
    const rafflesCollectionRef = await FirebaseInstance.getCollectionRef('raffles');
    const newRaffleRef = rafflesCollectionRef.doc();
    const newRaffleId = newRaffleRef.id;

    transaction.set(newRaffleRef, raffleObjToDb);

    return { newRaffleId, newRaffleRef };
  }

  async updateRedis(raffleId: string, raffleObjToDb: IRaffleInDb) {
    const raffleToFrontEndObj: IRaffleToFrontEnd = await RaffleUtils.filterRaffleToFrontEnd(raffleId, raffleObjToDb);
    await RaffleUtils.updateSpecificRaffleInRedis(raffleId, raffleToFrontEndObj, 'active');
  }

  sendPSub(gameId: string) {
    const pubSubData: IPubSubCreateRaffleData = { gameId };

    PubSubEventManager.publishEvent(
      'GET_LIVE_MESSAGES',
      {
        success: true,
        message: 'RAFFLE_CREATION_SUCCESS',
        type: 'CREATE_RAFFLE',
        data: JSON.stringify(pubSubData),
        request: this.request,
      },
      this.userDoc.docId,
    );
  }

  async create(): Promise<void> {
    const payload: IRaffleCreationPayload = {
      discountPercentage: this.discountPercentage,
      privacy: this.privacy,
      prizes: this.prizes,
      totalTickets: this.totalTickets,
      description: this.description,
      request: this.request,
      maxTicketsPerUser: this.maxTicketsPerUser,
    };

    const raffleCalcs = RaffleUtils.getRaffleDetails(payload);
    const { raffleOwnerCost } = raffleCalcs;

    try {
      const raffleObjToDb = this.makeRaffleCreationObj(payload, raffleCalcs);
      await this.checkAndSubtractCreatorBalance(raffleOwnerCost);

      await FirebaseInstance.firestore.runTransaction(async (transaction) => {
        const { newRaffleId, newRaffleRef } = await this.createRaffle(transaction, raffleObjToDb);

        await this.createBet(transaction, newRaffleRef, raffleOwnerCost);
        await this.updateRedis(newRaffleId, raffleObjToDb);

        const raffleInRedis = await RaffleUtils.filterRaffleToFrontEnd(newRaffleId, raffleObjToDb);
        await this.startRabbitMQQueue(newRaffleId, raffleInRedis);

        this.sendPSub(newRaffleId);
      });
    } catch (err) {
      throw new CreateRaffleUnexpectedError(JSON.stringify(payload));
    }
  }
}
