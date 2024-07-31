/* Refatorar para classe que recebe parâmetros da bet (necessário refatoração da estrutura da bet para ser um registro genérico de aposta) */

import {
  GameAlreadyFinishedError,
  InsufficientBalanceError,
  TicketAlreadyTakenError,
} from '../config/errors/classes/ClientErrors';
import { IBuyRaffleTicketsPayload } from '../config/interfaces/IBet';
import { IRaffleToFrontEnd } from '../config/interfaces/IRaffles';
import BalanceService from './BalanceService';

class BetValidatorService {
  async validateUserBalanceForBet(userDocId: string, totalAmountBet: number): Promise<void> {
    const { balance: userBalance } = await BalanceService.getUserBalance(userDocId);
    if (userBalance < totalAmountBet) {
      throw new InsufficientBalanceError({ reqType: 'CREATE_RAFFLE', userId: userDocId });
    }
  }

  async checkIfTicketNumbersAreAvailable(
    raffleInDb: IRaffleToFrontEnd,
    buyRaffleTicketPayloadInfo: IBuyRaffleTicketsPayload['info'],
    userId: string,
  ) {
    const { bets } = raffleInDb.info;
    const { ticketNumbers } = buyRaffleTicketPayloadInfo;

    for (const betData of bets) {
      const { tickets } = betData.info;

      const ticketsAlreadyUsed = tickets.filter((num) => ticketNumbers.includes(num));
      if (ticketsAlreadyUsed.length > 0)
        throw new TicketAlreadyTakenError(ticketsAlreadyUsed, { reqType: 'BUY_RAFFLE_TICKET', userId });
    }
  }

  async checkRaffleBuyRequestValidity({
    userId,
    betMadeAt,
    buyRaffleTicketPayload,
    raffleInRedis,
  }: {
    userId: string;
    betMadeAt: number;
    buyRaffleTicketPayload: IBuyRaffleTicketsPayload;
    raffleInRedis: IRaffleToFrontEnd;
  }) {
    const { finishedAt } = raffleInRedis;

    if (finishedAt) {
      const finishedAtToInt = parseInt(finishedAt);
      if (finishedAtToInt < betMadeAt) throw new GameAlreadyFinishedError({ reqType: 'BUY_RAFFLE_TICKET', userId });
    }

    const { info: buyRaffleTicketPayloadInfo } = buyRaffleTicketPayload;
    const { randomTicket } = buyRaffleTicketPayloadInfo;

    if (!randomTicket) {
      await this.checkIfTicketNumbersAreAvailable(raffleInRedis, buyRaffleTicketPayloadInfo, userId);
    }
  }
}

export default new BetValidatorService();
