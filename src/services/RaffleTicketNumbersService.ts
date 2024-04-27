import { QuantityExceedsAvailableTickets } from '../config/errors/classes/ClientErrors';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import { IBuyRaffleTicketsPayloadRedis } from '../config/interfaces/IBet';
import { IRaffleToFrontEnd } from '../config/interfaces/IRaffles';

class RaffleTicketNumbersService {
  userId: string;
  raffleInRedis: IRaffleToFrontEnd;

  constructor(userId: string, raffleInRedis: IRaffleToFrontEnd) {
    this.userId = userId;
    this.raffleInRedis = raffleInRedis;
  }

  public getAvailableTicketNumbers(betsData: IRaffleToFrontEnd['info']['bets'], totalTickets: number) {
    const allTicketsTaken = betsData.map((bet) => bet.info.tickets);
    const concatenatedTicketsTaken = ([] as number[]).concat(...allTicketsTaken);

    const allTicketsSet = new Set<number>();
    for (let i = 1; i <= totalTickets; i++) {
      allTicketsSet.add(i);
    }
    concatenatedTicketsTaken.forEach((ticket) => allTicketsSet.delete(ticket));
    return Array.from(allTicketsSet);
  }

  private async genRandomTicketNumbers(availableTicketNumbers: number[], quantityToGen: number) {
    if (availableTicketNumbers.length < quantityToGen) {
      throw new QuantityExceedsAvailableTickets({ reqType: 'CREATE_RAFFLE', userId: this.userId });
    }

    const getRandomNumbersFromArray = (arr: number[], quantity: number): number[] => {
      const shuffledArray = arr.slice();

      for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
      }
      return shuffledArray.slice(0, quantity);
    };

    return getRandomNumbersFromArray(availableTicketNumbers, quantityToGen);
  }

  async getTicketNumbersFiltered(buyRaffleTicketPayload: IBuyRaffleTicketsPayloadRedis) {
    const { bets, totalTickets } = this.raffleInRedis.info;

    const { info } = buyRaffleTicketPayload;
    const { randomTicket, ticketNumbers, quantityOfTickets } = info;

    if (!randomTicket) {
      if (!ticketNumbers || ticketNumbers.length <= 0) throw new InvalidPayloadError();
      return ticketNumbers;
    }
    if (!quantityOfTickets) throw new InvalidPayloadError();

    const availableTicketNumbers = this.getAvailableTicketNumbers(bets, totalTickets);
    if (availableTicketNumbers.length < quantityOfTickets) {
      throw new QuantityExceedsAvailableTickets({ reqType: 'CREATE_RAFFLE', userId: this.userId });
    }

    return await this.genRandomTicketNumbers(availableTicketNumbers, quantityOfTickets);
  }
}

export default RaffleTicketNumbersService;
