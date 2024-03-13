import { FirebaseInstance } from '..';
import itemsInfo, { IItemsInfo } from '../assets/itemsInfo';
import { getAllPrizesItems } from '../common/raffleObjInteractions';
import { InsufficientBalanceError } from '../config/errors/classes/ClientErrors';
import { InvalidPayloadError } from '../config/errors/classes/SystemErrors';
import { IBetInDB, IBetToFrontEnd } from '../config/interfaces/IBet';
import {
  IRaffleCreationPayload,
  IRaffleInDb,
  IRaffleToFrontEnd,
  TRaffleCreationPrizesWinners,
  TRaffleCreationPrizeX,
  TRaffleCreationWinnerPrizes,
  TRaffleWinnersPrizes,
  TRaffleWinnerPrizes,
} from '../config/interfaces/IGames';
import formatIrrationalCryptoAmount from '../utils/formatIrrationalCryptoAmount';
import BalanceService from './BalanceService';
import BetsService from './BetsService';
import calcWithDecimalsService from './calcWithDecimalsService';

class RafflesService {
  /* REVER VERIFICAÇÃO DE PAYLOAD */
  verifyRaffleCreationPayloadTypes(payload: any): void {
    const hasProperty = (obj: any, key: any) => {
      return key in obj;
    };

    if (
      !hasProperty(payload, 'totalTickets') ||
      !hasProperty(payload, 'discountPercentage') ||
      !hasProperty(payload, 'privacy') ||
      !hasProperty(payload.privacy, 'type') ||
      !hasProperty(payload.privacy, 'mode') ||
      !hasProperty(payload, 'prizes')
    ) {
      throw new InvalidPayloadError();
    }

    const isValidPrizes = (prizes: TRaffleCreationPrizesWinners): boolean => {
      return Object.values(prizes).every(
        (winnerXPrizes) =>
          'info' in winnerXPrizes &&
          Object.values(winnerXPrizes.info).every(
            (prizeX: TRaffleCreationPrizeX) =>
              typeof prizeX.prizeId === 'string' && typeof prizeX.quantity === 'number',
          ),
      );
    };

    if (
      typeof payload.totalTickets !== 'number' ||
      typeof payload.discountPercentage !== 'number' ||
      (payload.privacy.type !== 'public' && payload.privacy.type !== 'private') ||
      (payload.privacy.mode !== 'public' && payload.privacy.mode !== 'guildMembers') ||
      typeof payload.prizes !== 'object' ||
      !isValidPrizes(payload.prizes)
    ) {
      throw new InvalidPayloadError();
    }
  }

  verifyItemsAvailability(prizesIds: string[]) {
    const itemsAvailableKeys = Object.keys(itemsInfo);

    prizesIds.forEach((prizeId) => {
      if (!itemsAvailableKeys.includes(prizeId)) {
        throw new InvalidPayloadError();
      }
    });
  }

  verifyRaffleCreationPayloadValidity(payload: IRaffleCreationPayload) {
    const { discountPercentage, privacy, prizes, totalTickets } = payload;

    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new InvalidPayloadError();
    }
    if (privacy.type !== 'public' && privacy.type !== 'private') {
      throw new InvalidPayloadError();
    }
    if (privacy.mode !== 'public' && privacy.mode !== 'guildMembers') {
      throw new InvalidPayloadError();
    }
    if (totalTickets > 50 || totalTickets < 2) {
      throw new InvalidPayloadError();
    }

    const allPrizesItems = getAllPrizesItems(prizes);
    this.verifyItemsAvailability(allPrizesItems);
  }

  calculatePrizeX(prizeX: TRaffleCreationPrizeX): number {
    /* Parar de chamar toda hora e colocar somente uma propriedade de availableItems na classe toda */
    const availableItems = itemsInfo as IItemsInfo;

    const { prizeId, quantity } = prizeX;
    const itemValue = availableItems[prizeId].price;
    return itemValue * quantity;
  }

  getWinnerXPrize(info: TRaffleCreationWinnerPrizes['info']) {
    /* [prize1, prize2, prize3] */
    const prizesWinnerXKeys = Object.keys(info);

    const winnerXPrizeInfo: TRaffleWinnerPrizes['info'] = {};

    const totalValueOfWinnerXPrizes = prizesWinnerXKeys.reduce(
      (totalValueWinnerXPrizes, prizeXKey) => {
        const prizeX = info[prizeXKey];
        const { prizeId, quantity } = prizeX;

        const totalValuePrizeX = this.calculatePrizeX(prizeX);
        winnerXPrizeInfo[prizeXKey] = { prizeId, quantity, totalValue: totalValuePrizeX };

        return totalValueWinnerXPrizes + totalValuePrizeX;
      },
      0,
    );

    const winnerXPrizeObj: TRaffleWinnerPrizes = {
      info: winnerXPrizeInfo,
      totalValue: totalValueOfWinnerXPrizes,
    };

    return { winnerXPrizeObj };
  }

  getPrizesValues(prizes: TRaffleCreationPrizesWinners) {
    const winnersKeys = Object.keys(prizes);

    const winnersPrizesObj: TRaffleWinnersPrizes = {};

    const totalPrizesValue = winnersKeys.reduce((total, winnerXKey) => {
      const winnerXInfo = prizes[winnerXKey]['info'];
      const { winnerXPrizeObj } = this.getWinnerXPrize(winnerXInfo);
      const { totalValue } = winnerXPrizeObj;

      winnersPrizesObj[winnerXKey] = winnerXPrizeObj;

      return total + totalValue;
    }, 0);

    return { totalPrizesValue, winnersPrizesObj };
  }

  calculateTicketPriceAndRaffleOwnerCost(
    totalPrizesValue: number,
    discountPercentage: number,
    totalTickets: number,
  ) {
    const raffleDiscountValue =
      calcWithDecimalsService(totalPrizesValue, 'multiply', discountPercentage) / 100;
    const raffleDiscountValueRounded = formatIrrationalCryptoAmount(raffleDiscountValue);

    const totalRafflePriceAfterDiscount = calcWithDecimalsService(
      totalPrizesValue,
      'subtract',
      raffleDiscountValueRounded,
    );

    const ticketPrice = calcWithDecimalsService(
      totalRafflePriceAfterDiscount,
      'divide',
      totalTickets,
    );

    return { ticketPrice, raffleOwnerCost: raffleDiscountValueRounded };
  }

  filterPrizesToDb(payload: IRaffleCreationPayload) {
    const { prizes, discountPercentage, totalTickets } = payload;

    const { totalPrizesValue, winnersPrizesObj } = this.getPrizesValues(prizes);

    const { ticketPrice, raffleOwnerCost } = this.calculateTicketPriceAndRaffleOwnerCost(
      totalPrizesValue,
      discountPercentage,
      totalTickets,
    );

    return {
      raffleOwnerCost,
      winnersPrizesObj,
      totalPrizesValue,
      ticketPrice,
    };
  }

  async verifyRaffleOwnerBalance(
    userDocId: string,
    raffleOwnerCost: number,
  ): Promise<void> {
    const { balance: raffleOwnerBalance } = await BalanceService.getBalance(userDocId);
    if (raffleOwnerCost > raffleOwnerBalance) throw new InsufficientBalanceError();
  }

  async createRaffle(userDocId: string, payload: IRaffleCreationPayload) {
    this.verifyRaffleCreationPayloadValidity(payload);

    const { privacy, totalTickets } = payload;

    const raffleCalcs = this.filterPrizesToDb(payload);
    const { raffleOwnerCost, winnersPrizesObj, totalPrizesValue, ticketPrice } =
      raffleCalcs;

    const roundedTicketPrice = formatIrrationalCryptoAmount(ticketPrice);
    await this.verifyRaffleOwnerBalance(userDocId, raffleOwnerCost);

    const nowTime = new Date().getTime();

    const rafflePayloadToDb: IRaffleInDb = {
      createdAt: nowTime,
      updatedAt: nowTime,
      type: 'raffles',
      info: {
        bets: [],
        ticketPrice: roundedTicketPrice,
        totalTickets,
        totalPrizesValue,
        privacy,
        prizes: winnersPrizesObj,
      },
    };

    const newRaffleId = await FirebaseInstance.writeDocument(
      'raffles',
      rafflePayloadToDb,
    );

    await BetsService.createBet({
      userDocId,
      gameId: newRaffleId,
      gameType: 'raffles',
      amountBet: raffleOwnerCost,
    });

    await BalanceService.softUpdateBalances(userDocId, {
      option: 'remove',
      value: raffleOwnerCost,
    });
  }

  async filterRaffleToFrontEnd(
    gameId: string,
    raffleInDb: IRaffleInDb,
  ): Promise<IRaffleToFrontEnd | undefined> {
    if (!raffleInDb) return undefined;

    const raffleInDbData = raffleInDb;

    const { bets, winnersBets, prizes } = raffleInDbData.info;

    const filterBets = async (
      refsArray: IRaffleInDb['info']['bets'],
    ): Promise<IBetToFrontEnd[]> => {
      const results = await Promise.all(
        refsArray.map(async (ref) => {
          const docId = ref.id;
          const docData = await FirebaseInstance.getDocumentById<IBetInDB>('bets', docId);

          if (docData && docData.result) {
            const betToFrontEnd = await BetsService.filterBetToFrontEnd({
              betInDb: docData.result,
            });
            return betToFrontEnd;
          }

          return undefined;
        }),
      );
      return results.filter((result): result is IBetToFrontEnd => result !== undefined);
    };

    const filterPrizes = (prizes: TRaffleWinnersPrizes) => {
      return JSON.stringify(prizes);
    };

    const filterWinnersBets = async (
      winnersBets: IRaffleInDb['info']['winnersBets'],
    ): Promise<IRaffleToFrontEnd['info']['winnersBets'] | undefined> => {
      if (!winnersBets) return undefined;

      const winnersBetsFiltered: IRaffleToFrontEnd['info']['winnersBets'] = [];

      for (const winnerBet of winnersBets) {
        const { betRef, hash } = winnerBet;
        const docData = await FirebaseInstance.getDocumentById<IBetInDB>(
          'bets',
          betRef.id,
        );

        if (docData) {
          const betInDb = docData.result;
          const filteredWinnerBet = await BetsService.filterBetToFrontEnd({ betInDb });

          winnersBetsFiltered.push({ betRef: filteredWinnerBet, hash });
        }
      }

      return winnersBetsFiltered;
    };

    const filteredBets = await filterBets(bets);
    const filteredPrizes = await filterPrizes(prizes);
    const filteredWinnersBets = await filterWinnersBets(winnersBets);

    const filteredInfo: IRaffleToFrontEnd['info'] = {
      ...raffleInDbData.info,
      bets: filteredBets,
      winnersBets: filteredWinnersBets,
      prizes: filteredPrizes,
    };

    return { ...raffleInDbData, info: filteredInfo, gameId };
  }

  async getAllRaffles(): Promise<{
    activeRaffles: IRaffleToFrontEnd[];
    endedRaffles: IRaffleToFrontEnd[];
  }> {
    const raffles =
      await FirebaseInstance.getAllDocumentsByCollection<IRaffleInDb>('raffles');

    if (!raffles) return { activeRaffles: [], endedRaffles: [] };

    const filteredRaffles = await Promise.all(
      raffles.result.map(async (raffle) => {
        const gameId = raffle.docId;
        const raffleInDb = raffle.docData;
        return await this.filterRaffleToFrontEnd(gameId, raffleInDb);
      }),
    );

    const validRaffles = filteredRaffles.filter(
      (raffle): raffle is IRaffleToFrontEnd => raffle !== undefined,
    );

    const activeRaffles = validRaffles.filter(
      (raffle) => raffle.finishedAt === undefined,
    );
    const endedRaffles = validRaffles.filter((raffle) => raffle.finishedAt);

    return { activeRaffles, endedRaffles };
  }
}

export default new RafflesService();
