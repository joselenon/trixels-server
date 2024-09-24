import { QuantityExceedsAvailableTicketsError } from '../../config/errors/classes/ClientErrors';
import { InvalidPayloadError } from '../../config/errors/classes/SystemErrors';
import { IBuyRaffleTicketsPayloadRedis } from '../../config/interfaces/IBet';
import { IRaffleToFrontEnd } from '../../config/interfaces/RaffleInterfaces/IRaffles';

class TicketNumbersService {
  userId: string;
  raffleInfo: IRaffleToFrontEnd['info'];

  constructor(userId: string, raffleInfo: IRaffleToFrontEnd['info']) {
    this.userId = userId;
    this.raffleInfo = raffleInfo;
  }

  private getAvailableTicketNumbers(betsData: IRaffleToFrontEnd['info']['bets'], totalTickets: number) {
    const allTicketsTaken = betsData.map((bet) => bet.info.tickets);
    const concatenatedTicketsTaken = ([] as number[]).concat(...allTicketsTaken);

    const allTicketsSet = new Set<number>();
    for (let i = 1; i <= totalTickets; i++) {
      allTicketsSet.add(i);
    }
    concatenatedTicketsTaken.forEach((ticket) => allTicketsSet.delete(ticket));
    return Array.from(allTicketsSet);
  }

  private genRandomTicketNumbers(availableTicketNumbers: number[], quantityToGen: number) {
    if (availableTicketNumbers.length < quantityToGen) {
      throw new QuantityExceedsAvailableTicketsError({ reqType: 'CREATE_RAFFLE', userId: this.userId });
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

  getTicketNumbersFiltered(buyRaffleTicketInfoPayload: IBuyRaffleTicketsPayloadRedis['info']): {
    ticketNumbersFiltered: number[];
  } {
    const { bets, totalTickets } = this.raffleInfo;
    const { randomTicket, ticketNumbers } = buyRaffleTicketInfoPayload;

    if (randomTicket) {
      const availableTicketNumbers = this.getAvailableTicketNumbers(bets, totalTickets);
      if (!availableTicketNumbers.length) {
        throw new QuantityExceedsAvailableTicketsError({ reqType: 'CREATE_RAFFLE', userId: this.userId });
      }

      return { ticketNumbersFiltered: this.genRandomTicketNumbers(availableTicketNumbers, 1) };
    }

    if (!ticketNumbers || !ticketNumbers.length) throw new InvalidPayloadError();
    return { ticketNumbersFiltered: ticketNumbers };
  }
}

export default TicketNumbersService;
