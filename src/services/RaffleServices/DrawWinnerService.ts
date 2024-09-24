import { IRaffleInDb } from '../../config/interfaces/RaffleInterfaces/IRaffles';

type TDrawnNumbersInfo = {
  number: number;
  hash: string;
}[];

export default class DrawRaffleWinners {
  private prizes: IRaffleInDb['info']['prizes'];
  private totalTickets: IRaffleInDb['info']['totalTickets'];

  constructor(prizes: IRaffleInDb['info']['prizes'], totalTickets: IRaffleInDb['info']['totalTickets']) {
    this.prizes = prizes;
    this.totalTickets = totalTickets;
  }

  drawNumbers(quantity: number): TDrawnNumbersInfo {
    const from = 1;
    const to = this.totalTickets;

    const drawnNumbersInfo: TDrawnNumbersInfo = [];

    for (let i = 0; i < quantity; i++) {
      const randomNumber = Math.floor(Math.random() * (to - from + 1)) + from;
      drawnNumbersInfo.push({ number: randomNumber, hash: '123' });
    }

    return drawnNumbersInfo;
  }

  async startDraw(): Promise<TDrawnNumbersInfo> {
    const winnersKeys = Object.keys(this.prizes);
    const winnersAmount = winnersKeys.length;

    const drawnNumbers = this.drawNumbers(winnersAmount);
    return drawnNumbers;
  }
}
