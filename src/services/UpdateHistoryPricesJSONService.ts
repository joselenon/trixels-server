/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs';
import { join } from 'path';

import gameLibItemsJSON from '../assets/gameLibItems.json';
import { GameLibItemsProps } from '../config/interfaces/GameLibItemsProps';
import { ItemMarketData } from '../config/interfaces/ItemStatsComponentsProps';

const historyPricesLast7DaysJSON = require('../assets/historyPricesLast7Days.json');
const historyPricesLast7Days: {
  [key: string]: Array<{ value: number; time: number }>;
} = historyPricesLast7DaysJSON;

const itemsKeys = Object.keys(historyPricesLast7Days);
const gameLibItems: GameLibItemsProps = gameLibItemsJSON;

export class UpdateHistoryPricesJSONService {
  keys: string[];
  gameLibItems: GameLibItemsProps;

  constructor() {
    this.keys = itemsKeys;
    this.gameLibItems = gameLibItems;
  }

  clear10DaysOldHistoryPrices() {
    const attHistoryPrices = this.keys.reduce((result: any, itemName) => {
      const itemTransactionsFiltered = historyPricesLast7Days[itemName].filter(
        (minPriceInfo) => {
          const nowTime = new Date().getTime() / 1000;
          const priceTime = minPriceInfo.time;

          const transactionAge = nowTime - priceTime;
          const sevenDaysInMillis = 10 * 24 * 60 * 60 * 1000;
          return transactionAge <= sevenDaysInMillis;
        },
      );

      result[itemName] = itemTransactionsFiltered;
      return result;
    }, {});

    this.keys.forEach((itemName) => {
      historyPricesLast7Days[itemName] = attHistoryPrices[itemName];
    });

    const filePath = join(__dirname, '..', 'assets', 'historyPricesLast7Days.json');
    fs.writeFileSync(filePath, JSON.stringify(historyPricesLast7Days));
  }

  async updateHistoryPrices(allItemsListings: { [itemName: string]: ItemMarketData }) {
    console.log('Clearing prices older than 10 days');
    this.clear10DaysOldHistoryPrices();

    const filePath = join(__dirname, '..', 'assets', 'historyPricesLast7Days.json');
    const itemsNames = Object.keys(this.gameLibItems);

    /*     const fetchItem = async (itemName: string, nowTimeFiltered: number) => {
      try { */
    for (const itemName of itemsNames) {
      const nowTimeFiltered = parseInt((new Date().getTime() / 1000).toFixed(0));

      if (allItemsListings[itemName]?.listings?.length > 0) {
        const cheapestValue = allItemsListings[itemName].listings[0].price;
        if (this.gameLibItems[itemName].trade?.disableTrading) return;

        if (!historyPricesLast7Days[itemName]) {
          historyPricesLast7Days[itemName] = [];
        }

        historyPricesLast7Days[itemName].push({
          time: nowTimeFiltered,
          value: cheapestValue,
        });
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(historyPricesLast7Days, null, 2));
    return console.log('History prices updated successfully!');
  }
}

export default new UpdateHistoryPricesJSONService();
