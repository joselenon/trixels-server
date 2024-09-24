/* Refatorar para classe que recebe parâmetros da bet (necessário refatoração da estrutura da bet para ser um registro genérico de aposta) */

import {
  GameAlreadyFinishedError,
  TicketAlreadyTakenError,
  TicketBuyLimitReachedError,
} from '../../config/errors/classes/ClientErrors';
import { IBuyRaffleTicketsPayloadRedis } from '../../config/interfaces/IBet';
import { IRaffleToFrontEnd } from '../../config/interfaces/RaffleInterfaces/IRaffles';

export default class TicketValidatorService {
  userId: string;
  buyRaffleTicketPayload: IBuyRaffleTicketsPayloadRedis;
  raffle: IRaffleToFrontEnd;

  constructor(userId: string, buyRaffleTicketPayload: IBuyRaffleTicketsPayloadRedis, raffle: IRaffleToFrontEnd) {
    this.userId = userId;
    this.buyRaffleTicketPayload = buyRaffleTicketPayload;
    this.raffle = raffle;
  }

  private validateGameStatus() {
    const { createdAt: betCreatedAt } = this.buyRaffleTicketPayload;
    const { finishedAt: raffleFinishedAt } = this.raffle;

    if (raffleFinishedAt) {
      const raffleFinishedAtInt = parseInt(raffleFinishedAt);
      if (betCreatedAt > raffleFinishedAtInt) {
        throw new GameAlreadyFinishedError({ reqType: 'BUY_RAFFLE_TICKET', userId: this.userId });
      }
    }
  }

  private validateTicketsAvailability() {
    const { info: buyRaffleTicketPayloadInfo } = this.buyRaffleTicketPayload;
    const { randomTicket } = buyRaffleTicketPayloadInfo;

    if (!randomTicket) {
      const { bets } = this.raffle.info;
      const { ticketNumbers } = this.buyRaffleTicketPayload.info;

      for (const betData of bets) {
        const { tickets } = betData.info;

        const ticketsAlreadyUsed = tickets.filter((num) => ticketNumbers.includes(num));
        if (ticketsAlreadyUsed.length > 0)
          throw new TicketAlreadyTakenError(ticketsAlreadyUsed, { reqType: 'BUY_RAFFLE_TICKET', userId: this.userId });
      }
    }
  }

  private validateTicketsAmount() {
    const { bets, maxTicketsPerUser } = this.raffle.info;
    const { ticketNumbers } = this.buyRaffleTicketPayload.info;

    const allUserTickets = bets
      .filter((bet) => bet.userRef.userId === this.userId)
      .reduce((acc, bet) => acc + bet.info.tickets.length, 0);

    if (
      maxTicketsPerUser &&
      (allUserTickets === maxTicketsPerUser || allUserTickets + ticketNumbers.length > maxTicketsPerUser)
    ) {
      throw new TicketBuyLimitReachedError({ reqType: 'BUY_RAFFLE_TICKET', userId: this.userId });
    }
  }

  public validate() {
    this.validateGameStatus();
    this.validateTicketsAmount();
    this.validateTicketsAvailability();
  }
}
