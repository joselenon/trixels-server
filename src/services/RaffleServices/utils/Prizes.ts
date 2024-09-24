import itemsInfo, { IItemsInfo } from '../../../assets/itemsInfo';
import {
  TRaffleCreationItem,
  TRaffleCreationItemsWinners,
  TRaffleCreationWinnerPrizes,
} from '../../../config/interfaces/RaffleInterfaces/IRaffleCreation';
import { TRaffleWinnerPrizes, TRaffleWinnersPrizes } from '../../../config/interfaces/RaffleInterfaces/IRaffles';

export function CalculateItemValue(item: TRaffleCreationItem): number {
  /* Parar de chamar toda hora e colocar somente uma propriedade de availableItems na classe toda */
  const availableItems = itemsInfo as IItemsInfo;

  const { itemId, quantity } = item;
  const itemValue = availableItems[itemId].price;
  return itemValue * quantity;
}

export function GetWinnerItems(items: TRaffleCreationWinnerPrizes['items']) {
  const winnerItems: TRaffleWinnerPrizes['items'] = [];

  const winnerPrizesTotalValue = items.reduce((totalValueWinnerXPrizes, item) => {
    const totalValuePrizeX = CalculateItemValue(item);
    winnerItems.push({ itemId: item.itemId, quantity: item.quantity, totalValue: totalValuePrizeX });

    return totalValueWinnerXPrizes + totalValuePrizeX;
  }, 0);

  const winnerPrizeObj: TRaffleWinnerPrizes = {
    items: winnerItems,
    totalValue: winnerPrizesTotalValue,
  };

  return { winnerPrizeObj };
}

export function GetPrizesValues(items: TRaffleCreationItemsWinners) {
  const winnersPrizesObj: TRaffleWinnersPrizes = [];

  const prizesTotalValue = items.reduce((total, prize) => {
    const prizeInfo = prize.items;
    const { winnerPrizeObj } = GetWinnerItems(prizeInfo);
    const { totalValue } = winnerPrizeObj;

    winnersPrizesObj.push(winnerPrizeObj);

    return total + totalValue;
  }, 0);

  return { prizesTotalValue, winnersPrizesObj };
}
