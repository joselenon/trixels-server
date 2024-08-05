/* Refatorar para classe que recebe parâmetros da bet (necessário refatoração da estrutura da bet para ser um registro genérico de aposta) */

import {
  GameAlreadyFinishedError,
  TicketAlreadyTakenError,
  TicketBuyLimitReachedError,
} from '../../config/errors/classes/ClientErrors';
import { IBuyRaffleTicketsPayloadRedis } from '../../config/interfaces/IBet';
import { IRaffleToFrontEnd } from '../../config/interfaces/IRaffles';

export default class RaffleBetValidatorService {
  userId: string;
  buyRaffleTicketPayload: IBuyRaffleTicketsPayloadRedis;
  raffle: IRaffleToFrontEnd;

  constructor(userId: string, buyRaffleTicketPayload: IBuyRaffleTicketsPayloadRedis, raffle: IRaffleToFrontEnd) {
    this.userId = userId;
    this.buyRaffleTicketPayload = buyRaffleTicketPayload;
    this.raffle = raffle;
  }

  private checkGameStatus() {
    const { createdAt } = this.buyRaffleTicketPayload;
    const { finishedAt } = this.raffle;

    if (finishedAt) {
      const finishedAtToInt = parseInt(finishedAt);
      if (finishedAtToInt < createdAt)
        throw new GameAlreadyFinishedError({ reqType: 'BUY_RAFFLE_TICKET', userId: this.userId });
    }
  }

  private checkTicketsAvailability() {
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

  private validateTickets() {
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

  public firstValidation() {
    this.checkGameStatus();
    this.validateTickets();
  }

  public finalValidation() {
    this.checkTicketsAvailability();
  }
}
