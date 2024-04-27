/* Refatorar para classe que recebe parâmetros da bet (necessário refatoração da estrutura da bet para ser um registro genérico de aposta) */

import {
  GameAlreadyFinished,
  InsufficientBalanceError,
  TicketAlreadyTaken,
} from '../config/errors/classes/ClientErrors';
import { IBuyRaffleTicketsPayload } from '../config/interfaces/IBet';
import { IRaffleToFrontEnd } from '../config/interfaces/IRaffles';
import BalanceService from './BalanceService';

class BetValidatorService {
  async validateUserBalanceForBet(userDocId: string, totalAmountBet: number): Promise<void> {
    const { balance: userBalance } = await BalanceService.getUserBalance(userDocId);
    if (userBalance < totalAmountBet) {
      throw new InsufficientBalanceError();
    }
  }

  async checkIfTicketNumbersAreAvailable(
    raffleInDb: IRaffleToFrontEnd,
    buyRaffleTicketPayloadInfo: IBuyRaffleTicketsPayload['info'],
  ) {
    const { bets } = raffleInDb.info;
    const { ticketNumbers } = buyRaffleTicketPayloadInfo;

    for (const betData of bets) {
      const { tickets } = betData.info;

      const ticketAlreadyUsed = tickets.filter((num) => ticketNumbers.includes(num));
      if (ticketAlreadyUsed.length > 0) throw new TicketAlreadyTaken(ticketAlreadyUsed);
    }
  }

  async checkRaffleBuyRequestValidity({
    userId,
    userBalance,
    betMadeAt,
    buyRaffleTicketPayload,
    raffleInRedis,
  }: {
    userId: string;
    userBalance: number;
    betMadeAt: number;
    buyRaffleTicketPayload: IBuyRaffleTicketsPayload;
    raffleInRedis: IRaffleToFrontEnd;
  }) {
    const { info, finishedAt } = raffleInRedis;
    const { ticketPrice } = info;

    if (finishedAt) {
      const finishedAtToInt = parseInt(finishedAt);
      if (finishedAtToInt < betMadeAt) throw new GameAlreadyFinished();
    }

    const { info: buyRaffleTicketPayloadInfo } = buyRaffleTicketPayload;
    const { randomTicket, ticketNumbers, quantityOfTickets } = buyRaffleTicketPayloadInfo;

    const quantityOfTicketsFiltered = randomTicket ? quantityOfTickets! : ticketNumbers.length;

    const totalAmountBet = ticketPrice * quantityOfTicketsFiltered;
    if (totalAmountBet > userBalance) throw new InsufficientBalanceError({ userId, reqType: 'CREATE_RAFFLE' });

    if (!randomTicket) {
      await this.checkIfTicketNumbersAreAvailable(raffleInRedis, buyRaffleTicketPayloadInfo);
    }
  }
}

export default new BetValidatorService();
